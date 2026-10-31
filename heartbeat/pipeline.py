"""One bounded orchestrator; all check functions share a single evidence ledger."""
import asyncio
from datetime import date, timedelta
import re
import time
from urllib.parse import urlparse
from uuid import uuid4
import httpx
from .evidence import Ledger, entity_match, iso_date, previous_year, text_from_html, timeline
from .models import InvestigationRequest, RunConfig, domain_of, load_env, normalize, now, public_url
from .providers import CrustData, ModelClient, StopRun
from .rules import initial_findings, set_finding, score, resolve_candidates, domains_of
from .store import Store, redact
from .research import upstream_intake, add_claim_finding, assess_claims, research_priority, value_at, FIELDS, canonical

def unpack_matches(result):
    data = result.get("data") if result.get("ok") else None
    if not isinstance(data, list):
        return []
    return [m for row in data if isinstance(row, dict) for m in row.get("matches", []) if isinstance(m, dict)]

def company_id(company):
    return company.get("crustdata_company_id") or (company.get("basic_info") or {}).get("crustdata_company_id")

def person_url(person):
    return ((person.get("social_handles") or {}).get("professional_network_identifier") or {}).get("profile_url", "")

# Role classes that ordinarily act for a company; a profile title is not a mandate.
LEADERSHIP = re.compile(r"\b(co-?founder|founder|ceo|chief executive|president|managing director|owner|chairman|cfo|chief financial)\b", re.I)

MAX_CLAIM_QUERIES = 3

def lookalike_of(domain, name, matches):
    """A candidate named exactly as submitted whose domain label is embedded in the submitted domain."""
    label = domain.split(".")[0]
    for m in matches:
        basic = (m.get("company_data") or {}).get("basic_info") or {}
        if normalize(basic.get("name", "")) != normalize(name):
            continue
        for d in domains_of(m):
            own = d.split(".")[0]
            if len(own) >= 4 and own != label and own in label:
                return m
    return None

def roles(person):
    detail = ((person.get("experience") or {}).get("employment_details") or {})
    return [(kind, row) for kind in ("current", "past") for row in (detail.get(kind) or []) if isinstance(row, dict)]

def role_company(role):
    return role.get("crustdata_company_id") or role.get("company_id")

class Investigation:
    def __init__(self, request, config, store, http):
        self.request, self.config, self.store, self.http = request, config, store, http
        self.case_id = str(uuid4())
        self.started = time.monotonic()
        self.started_at = now()
        self.deadline = self.started + config.max_seconds
        # Reserve time for model interpretation and deterministic finalization.
        self.research_deadline = min(self.deadline - .3, self.started + max(.1, config.max_seconds - min(27, config.max_seconds * .32)))
        self.api = CrustData(http, store, self.case_id, config, self.research_deadline)
        self.ledger = Ledger()
        if request.context or request.description or request.disclosures:
            self.ledger.add(path="request.context", value={"context": request.context, "description": request.description, "disclosures": request.disclosures},
                kind="submission", matched=False, state="submitted", note="Investment-team assertions retained for context, not proof")
        self.findings = initial_findings(request, self.ledger)
        self.intake = upstream_intake(request, self.ledger)
        for claim in self.intake["claims"]:
            add_claim_finding(claim, self.findings)
        self.research_plan = []
        self.claim_observations = []
        self.model_raw_paths = []
        self.initial_checks_done = False
        self.identity = {"status": "not_checked", "candidates": []}
        self.company = {}
        self.company_call = None
        self.field_evidence = {}
        self.people = []
        self.entities = []
        self.gaps = []
        self.concerns = []
        self.model_trace = []
        self.stage_trace = []
        self.registry_candidates = []
        self.headcount_trend = []
        self.today = date.fromisoformat(self.started_at[:10])
        self.window_start = previous_year(self.today).isoformat()
        self.store.begin(self.case_id, request.to_dict())

    def gap(self, message):
        if message not in self.gaps:
            self.gaps.append(message)

    async def stage(self, name, work):
        row = {"name": name, "started_at": now(), "status": "running"}
        self.stage_trace.append(row)
        try:
            await work()
            row["status"] = "completed"
        except asyncio.CancelledError:
            row.update(status="failed", reason="Run time budget reached")
            raise
        except StopRun as exc:
            row.update(status="skipped", reason=str(exc))
            self.gap(str(exc))
        except (ValueError, KeyError, TypeError, IndexError, AttributeError, httpx.HTTPError):
            row.update(status="failed", reason="Unavailable or malformed source; partial report retained")
            self.gap(name + " could not complete")
        finally:
            row["finished_at"] = now()

    async def resolve(self):
        r = self.request
        queries = [("domains", [r.domain])] if r.domain else [("names", [r.company_name])]
        if r.domain and r.company_name:
            queries.append(("names", [r.company_name]))
        hinted_ids = list(dict.fromkeys(self.intake["hints"]["company_ids"]))[:1]
        if hinted_ids:
            queries.append(("crustdata_company_ids", hinted_ids))
        results = await asyncio.gather(*(self.api.call("/company/identify", {kind: values}) for kind, values in queries))
        first = results[0]
        matches = unpack_matches(first)
        status, best = resolve_candidates(matches, domain=r.domain, name=r.company_name)
        # A supplied canonical ID is a hint, validated with CrustData and the submitted name/domain.
        if hinted_ids:
            hint_status, hint_best = resolve_candidates(unpack_matches(results[-1]), domain=r.domain)
            hint_data = hint_best["company_data"] if hint_best else {}
            hint_name = (hint_data.get("basic_info") or {}).get("name", "")
            if not best and hint_status == "resolved" and (not r.company_name or normalize(hint_name) == normalize(r.company_name)):
                best, status = hint_best, hint_status
                first = results[-1]
            self.identity["supplied_id_candidates"] = unpack_matches(results[-1])
        self.identity.update(status=status if first["ok"] else "failed", candidates=matches,
                             matching_rule={"minimum_confidence": .95, "minimum_margin": .15, "domain_agreement_required": bool(r.domain)})
        evidence = self.ledger.add(call=first["call"], path="matches", value=matches, matched=bool(best),
                                   record_id="company-identification", state="usable" if best else status)
        if not best and r.domain and r.company_name and results[1]["ok"]:
            # The submitted domain is unknown or ambiguous, but the submitted name strongly
            # resolves to a company that does not use that domain: possible impersonation.
            name_matches = unpack_matches(results[1])
            ns, nb = resolve_candidates(name_matches, name=r.company_name)
            if ns != "resolved":
                nb = lookalike_of(r.domain, r.company_name, name_matches)
            if nb and r.domain not in domains_of(nb):
                nbasic = nb["company_data"].get("basic_info") or {}
                name_ev = self.ledger.add(call=results[1]["call"], path="matches", value=unpack_matches(results[1]),
                                          matched=True, record_id="submitted-name-identification")
                self.identity.update(status="conflicting", name_resolved_company_id=company_id(nb["company_data"]),
                                     name_resolved_domains=sorted(domains_of(nb)))
                set_finding(self.findings, "identity.resolution", "conflicting evidence", [evidence, name_ev],
                            f"Submitted name resolves to {nbasic.get('name')} ({nbasic.get('primary_domain')}), whose known domains exclude the submitted domain {r.domain}; verify the domain belongs to the claimed company",
                            missing=["Evidence that the submitted domain is controlled by the claimed company"], material=True)
                return
        if not best:
            self.gap("Company identity is ambiguous, unmatched or unavailable; dependent conclusions are blocked")
            return
        self.company = best["company_data"]
        cid = company_id(self.company)
        self.identity.update(company_id=cid, confidence=best["confidence_score"], matched_on=first["data"][0].get("matched_on"),
                             match_type=first["data"][0].get("match_type"))
        self.entities.append({"id": f"company:{cid}", "type": "company", "crustdata_company_id": cid,
                              "name": (self.company.get("basic_info") or {}).get("name"), "evidence_ids": [evidence]})
        set_finding(self.findings, "identity.resolution", "supported", [evidence], "CrustData identity passes confidence, candidate-margin and supplied-domain gates")
        if r.domain and r.company_name:
            name_matches = unpack_matches(results[1])
            self.identity["name_candidates"] = name_matches
            ns, nb = resolve_candidates(name_matches, name=r.company_name)
            if ns == "resolved" and company_id(nb["company_data"]) != cid:
                second_ev = self.ledger.add(call=results[1]["call"], path="matches", value=name_matches,
                                            matched=True, record_id="submitted-name-identification")
                set_finding(self.findings, "identity.resolution", "conflicting evidence", [evidence, second_ev],
                            "Submitted name and domain resolve strongly to different canonical company IDs; verify the intended company", material=True)
                self.identity["status"] = "conflicting"
        if hinted_ids and best and hinted_ids[0] != cid:
            self.gap("Supplied CrustData company ID differs from the company resolved by name/domain; upstream ID was not trusted")

    async def enrich(self):
        cid = company_id(self.company)
        requested_fields = ["basic_info", "locations", "headcount.total", "headcount.timeseries", "funding", "people", "news", "metadata"]
        for root in ("revenue", "web_traffic", "seo", "employee_reviews"):
            if any(root in str(c.get("input_path", "")) or str(c.get("field", "")).startswith(root + ".") for c in self.intake["claims"]):
                requested_fields.append(root)
        fields = self.api.allowed_fields("/company/enrich", requested_fields)
        if not fields:
            raise StopRun("No relevant company enrichment fields permitted")
        result = await self.api.call("/company/enrich", {"crustdata_company_ids": [cid], "exact_match": True, "fields": fields})
        matches = unpack_matches(result)
        data = next((m.get("company_data") for m in matches if company_id(m.get("company_data", {})) == cid), None)
        if data:
            self.company.update(data)
            self.company_call = result["call"]
        else:
            self.gap("Company enrichment failed or did not return the resolved canonical ID")
            return
        target = normalize((self.company.get("basic_info") or {}).get("name", ""))
        for i, item in enumerate((self.company.get("news") or [])[:10]):
            if not isinstance(item, dict) or not public_url(item.get("article_url", "")):
                continue
            text = f"{item.get('article_title', '')} ({item.get('article_publisher_name', '')}, {item.get('article_publish_date', '')})"
            # Provider news is name-matched and often a namesake: a review lead, never a fact.
            self.ledger.add(call=result["call"], path=f"matches[].company_data.news[{i}]", value=text, url=item["article_url"],
                            kind="provider_news", matched=False, source_date=iso_date(item.get("article_publish_date")),
                            state="discovery_only", record_id=f"company:{cid}", note="CrustData news record; entity linkage unverified")
            self.ledger.evidence[-1]["name_mentioned"] = len(target) >= 3 and target in normalize(text)
        founded = (self.company.get("basic_info") or {}).get("year_founded")
        if isinstance(founded, int) and self.today.year - 1 <= founded <= self.today.year:
            self.window_start = max(self.window_start, f"{founded}-01-01")
        for group, fields in (("basic_info", ["name", "primary_domain", "year_founded", "description", "status"]), ("locations", ["country", "city", "state"]), ("funding", ["total_investment_usd", "last_fundraise_date", "acquired_by"])):
            for field in fields:
                value = (self.company.get(group) or {}).get(field)
                if value is not None:
                    path = group + "." + field
                    ev = self.ledger.add(call=result["call"], path="matches[].company_data." + path, value=value,
                                         matched=True, record_id=f"company:{cid}", note="Provider observation; retrieval time does not establish field freshness")
                    self.field_evidence[path] = ev
        for field in {c.get("field") for c in self.ledger.claims} & FIELDS:
            if field not in self.field_evidence and (value := value_at(self.company, field)) is not None:
                ev = self.ledger.add(call=result["call"], path="matches[].company_data." + field, value=value,
                    record_id=f"company:{cid}", matched=True,
                    source_date=((self.company.get("metadata") or {}).get("updated_at")),
                    note="Provider field retained for scoped claim comparison; unknown observation date stays unknown")
                self.field_evidence[field] = ev
        description = (self.company.get("basic_info") or {}).get("description")
        if description:
            self.ledger.claim(description, "provider_company_description", evidence_ids=[self.field_evidence["basic_info.description"]])
        for i, point in enumerate((self.company.get("headcount") or {}).get("timeseries") or []):
            day = iso_date(point.get("date"))
            count = point.get("employee_count")
            if day and self.window_start <= day <= self.today.isoformat() and isinstance(count, (int, float)):
                self.headcount_trend.append({"date": day, "employee_count": count, "field_path": f"headcount.timeseries[{i}]"})
        if self.headcount_trend:
            self.ledger.add(call=result["call"], path="matches[].company_data.headcount.timeseries", value=self.headcount_trend,
                            matched=True, record_id=f"company:{cid}", source_date=max(x["date"] for x in self.headcount_trend),
                            note="Indirect workforce trend; not delivered work and not added to event counts")

    async def research_people(self):
        cid = company_id(self.company)
        urls = [p.get("profile_url", "") for p in [*self.request.people, *self.intake["people"]]]
        embedded = self.company.get("people") or {}
        for kind in ("founders", "cxos", "decision_makers"):
            urls.extend(person_url(p) for p in (embedded.get(kind) or []) if isinstance(p, dict))
        urls = list(dict.fromkeys(u for u in urls if public_url(u) and (urlparse(u).hostname or "").removeprefix("www.") == "linkedin.com" and urlparse(u).path.startswith("/in/")))[:self.config.max_people]
        if urls:
            fields = self.api.allowed_fields("/person/enrich", ["basic_profile", "social_handles", "experience"])
            result = await self.api.call("/person/enrich", {"professional_network_profile_urls": urls, "fields": fields})
            for match in unpack_matches(result):
                if match.get("confidence_score", 0) >= .95 and isinstance(match.get("person_data"), dict):
                    self.add_person(match["person_data"], result["call"], "matches[].person_data")
        if not self.people and self.config.max_people:
            # Canonical company-id fallback, prioritizing leadership title tokens.
            body = {"filters": {"op": "and", "conditions": [
                {"field": "experience.employment_details.current.company_id", "type": "=", "value": cid},
                {"op": "or", "conditions": [
                    {"field": "experience.employment_details.current.title", "type": "[.]", "value": "founder"},
                    {"field": "experience.employment_details.current.title", "type": "[.]", "value": "CEO"}]}]},
                "fields": self.api.allowed_fields("/person/search", ["basic_profile", "experience", "social_handles"]), "limit": self.config.max_people}
            for supplied in self.request.people[:self.config.max_people]:
                if isinstance(supplied.get("name"), str) and supplied["name"].strip():
                    body["filters"]["conditions"][1]["conditions"].append({"field": "basic_profile.name", "type": "=", "value": supplied["name"].strip()})
            result = await self.api.call("/person/search", body)
            data = result.get("data") or {}
            for person in data.get("profiles", []) if isinstance(data, dict) else []:
                self.add_person(person, result["call"], "profiles[]")
        if not self.people:
            self.gap("No strongly identified founder/representative history retrieved")
        if len(self.request.people) > self.config.max_people:
            self.gap("Submitted people exceed this run's person limit; remaining profiles were not checked")

    def add_person(self, person, call, path):
        pid = person.get("crustdata_person_id") or (person.get("basic_profile") or {}).get("crustdata_person_id")
        if not pid or any(p["crustdata_person_id"] == pid for p in self.people):
            return
        detail = {"crustdata_person_id": pid, "name": (person.get("basic_profile") or {}).get("name"),
                  "profile_url": person_url(person), "affiliations": []}
        ev = self.ledger.add(call=call, path=path + ".basic_profile", value=person.get("basic_profile"),
                            record_id=f"person:{pid}", matched=True, note="Cached professional profile, not identity-document verification")
        detail["evidence_ids"] = [ev]
        for kind, role in roles(person):
            role_cid = role_company(role)
            if not role_cid:
                continue
            affiliation_ev = self.ledger.add(call=call, path=path + f".experience.employment_details.{kind}",
                value=role, matched=True, record_id=f"person:{pid}", source_date=None,
                note="Profile-reported professional affiliation; not beneficial ownership, signing authority or proof of a conflict")
            detail["affiliations"].append({"company_id": role_cid, "company_name": role.get("name"), "title": role.get("title"),
                "start_date": role.get("start_date"), "end_date": role.get("end_date"), "period": kind, "evidence_id": affiliation_ev})
        self.people.append(detail)
        self.entities.append({"id": f"person:{pid}", "type": "person", "crustdata_person_id": pid,
                              "name": detail["name"], "evidence_ids": detail["evidence_ids"]})

    async def search_web(self, kind, query):
        result = await self.api.call("/web/search/live", {"query": query, "location": "IN" if self.request.jurisdiction.upper() in ("IN", "INDIA") else "US"})
        data = result.get("data") or {}
        rows = data.get("results", []) if isinstance(data, dict) else []
        accepted = []
        basic = self.company.get("basic_info") or {}
        for i, row in enumerate(rows[:10]):
            url = row.get("url", "")
            if not public_url(url) or (urlparse(url).hostname or "").endswith("google.com"):
                continue
            excerpt = str(row.get("title", "")) + " " + str(row.get("snippet", ""))
            matched = entity_match(excerpt, url, basic.get("name", ""), basic.get("primary_domain", ""), [p["name"] or "" for p in self.people])
            self.ledger.add(call=result["call"], path=f"results[{i}]", value=excerpt, url=url, kind="search_snippet",
                matched=matched, source_date=row.get("date") or row.get("published_date"),
                state="discovery_only", note=f"{kind} discovery lead; requires original-page retrieval and entity matching")
            # Snippets naming the company may raise review concerns, never facts or scored support.
            target = normalize(basic.get("name", ""))
            self.ledger.evidence[-1]["name_mentioned"] = len(target) >= 3 and target in normalize(excerpt)
            accepted.append({"url": url, "kind": kind, "discovery_matched": matched})
        if not rows:
            self.gap(kind + " search returned no usable leads; this is not a clean-record finding")
        return accepted

    def model_payload(self):
        sources = [e for e in self.ledger.evidence if e["state"] == "usable" and e["entity_matched"] and
                   e["kind"] in ("primary_page", "external_page", "company_post", "official_register")]
        # Fetched evidence gets priority over marketing posts. Keep excerpts bounded.
        sources.sort(key=lambda e: e["kind"] == "company_post")
        sources = sources[:12] + [e for e in self.ledger.evidence if e["kind"] in ("search_snippet", "provider_news") and e.get("name_mentioned")][:12]
        basic = self.company.get("basic_info") or {}
        locations = self.company.get("locations") or {}
        return {"target": {"name": basic.get("name"), "domain": basic.get("primary_domain"), "company_id": company_id(self.company),
                           "description": str(basic.get("description") or "")[:600], "industries": basic.get("industries"),
                           "year_founded": basic.get("year_founded"), "country": locations.get("country"),
                           "people": [p["name"] for p in self.people if p.get("name")][:5]},
                "window": {"start": self.window_start, "end": self.today.isoformat()}, "allowed_fields": sorted(FIELDS),
                "upstream_assertions": redact(self.intake["leaves"][:100]),
                "claims": [{k: c.get(k) for k in ("id", "text", "field", "expected", "assertion_kind", "input_path", "assessment_date", "source_urls")} for c in self.ledger.claims[:40]],
                "initial_findings": [{k: f.get(k) for k in ("id", "claim_id", "result", "confidence_reason")} for f in self.findings],
                "provider_context_policy": "Provider values are already represented by scoped claims. Do not invent page quotations from claim values. Quote ONLY the sources below.",
                "sources": [{"id": e["id"], "kind": e["kind"], "url": e["url"], "source_date": e["source_date"], "text": str(e["value"])[:10000]} for e in sources]}

    async def call_model(self, task, timeout):
        model = ModelClient(self.http, primary=self.config.model, timeout=min(timeout, self.config.model_timeout))
        payload = redact(self.model_payload())
        result = {}
        try:
            result = await model.extract(payload, deadline=min(self.deadline - 1, time.monotonic() + timeout), task=task)
            return result
        finally:
            self.model_trace.extend(model.trace)
            path = self.store.raw(self.case_id, "model-" + task, {"input": payload, "proposals": result, "trace": model.trace, "retrieved_at": now()})
            self.model_raw_paths.append(path)
            self.model_raw_path = path

    async def plan_research(self):
        # Always discover a small factual checklist even when the model is absent
        # or cannot extract claims from a navigation-heavy homepage.
        existing = {c.get("field") for c in self.ledger.claims if c.get("field")}
        for field in ("funding.acquired_by", "basic_info.year_founded", "funding.last_round_amount_usd", "funding.total_investment_usd", "basic_info.status"):
            value = value_at(self.company, field)
            if field in existing or value is None or not self.field_evidence.get(field):
                continue
            claim = self.ledger.claim(f"Provider reports {field}: {value}", "provider_discovered", field=field, expected=value,
                                      evidence_ids=[self.field_evidence[field]])
            claim.update(assertion_kind="source_assertion", source_urls=[], assessment_date=iso_date(value_at(self.company, "funding.last_fundraise_date")) if field.startswith("funding.") else None,
                         input_path="provider.company." + field)
        for claim in self.ledger.claims:
            add_claim_finding(claim, self.findings)
        proposals = {}
        if self.config.use_model and self.api.remaining() > 5:
            proposals = await self.call_model("plan", min(12, self.api.remaining() * .3))
            # Preserve source-linked discovered claims for company-name-only requests.
            known = {(c.get("field"), str(c.get("expected"))) for c in self.ledger.claims if c.get("field")}
            filtered = {"claims": [c for c in proposals.get("claims", []) if isinstance(c, dict) and
                                  (c.get("field"), str(c.get("expected"))) not in known]}
            self.ledger.validate_proposals(filtered, today=self.today.isoformat(), start=self.window_start)
            for proposal in proposals.get("normalized_claims", [])[:40]:
                if not isinstance(proposal, dict):
                    continue
                claim = next((c for c in self.ledger.claims if c["id"] == proposal.get("claim_id")), None)
                field, quote = proposal.get("field"), proposal.get("value_quote")
                if claim and not claim.get("field") and field in FIELDS and isinstance(quote, str) and quote in claim["text"] and canonical(proposal.get("expected"), field) is not None and canonical(proposal.get("expected"), field) == canonical(quote, field):
                    claim.update(field=field, expected=proposal["expected"], normalization_basis="Model-proposed typed value reproduced from original assertion")
        for claim in self.ledger.claims:
            add_claim_finding(claim, self.findings)
        claims_by_id = {c["id"]: c for c in self.ledger.claims}
        rank = {p.get("claim_id"): i for i, p in enumerate(proposals.get("priorities", [])) if isinstance(p, dict) and p.get("claim_id") in claims_by_id}
        candidates = sorted(self.ledger.claims, key=lambda c: (rank.get(c["id"], 100), c["origin"] not in ("submission", "upstream_context"), research_priority(c)))
        basic = self.company.get("basic_info") or {}
        name, domain = basic.get("name", ""), basic.get("primary_domain", "")
        chosen = set()
        for item in proposals.get("queries", [])[:4]:
            if not isinstance(item, dict) or item.get("claim_id") not in claims_by_id or not isinstance(item.get("query"), str):
                continue
            # Always bind queries to canonical identity, irrespective of model instructions.
            query = f'"{name}" {domain} {item["query"].replace(name, "").replace(domain, "")[:200]}'
            self.research_plan.append({"claim_id": item["claim_id"], "query": query, "reason": str(item.get("reason", "Claim-specific follow-up")), "origin": "model_proposal", "status": "planned"})
            chosen.add(item["claim_id"])
            if len(chosen) >= MAX_CLAIM_QUERIES:
                break
        for claim in candidates:
            if len(chosen) >= MAX_CLAIM_QUERIES or claim["origin"] not in ("submission", "upstream_context") and chosen:
                break
            if claim["id"] in chosen:
                continue
            topic = re.sub(r"^Investment team \([a-z]+-sourced\): ", "", claim["text"])[:120]
            self.research_plan.append({"claim_id": claim["id"], "query": f'"{name}" {domain} {topic}',
                                       "reason": "Highest-priority unresolved assertion", "origin": "deterministic_fallback", "status": "planned"})
            chosen.add(claim["id"])
        # The search backend ignores OR; plain terms rank adverse coverage without excluding it.
        self.research_plan.append({"claim_id": self.research_plan[0]["claim_id"] if self.research_plan else None,
            "query": f'"{name}" {domain} lawsuit fraud bankruptcy shut down regulator',
            "reason": "Bounded adverse-information search; no results do not establish a clean record", "origin": "required_adverse_followup", "status": "planned"})
        for claim in self.ledger.claims:
            claim["research_state"] = "planned" if claim["id"] in {p["claim_id"] for p in self.research_plan} else "not_targeted_within_budget"

    async def follow_up(self):
        # Retrieve supplied references, but do not count re-fetching an upstream
        # source as independent corroboration of the assertion citing it.
        supplied = self.intake["source_links"][:3]
        for omitted in self.intake["source_links"][3:]:
            self.gap("Supplied reference not fetched within source budget: " + omitted["url"])
        async def search(plan):
            before = len(self.api.calls)
            leads = await self.search_web("claim_followup", plan["query"])
            plan["status"] = "completed" if any(c["endpoint"] == "/web/search/live" and c["status"] in ("completed", "cached") for c in self.api.calls[before:]) else "failed_or_skipped"
            plan["lead_urls"] = [l["url"] for l in leads]
            return leads
        plans = self.research_plan[:MAX_CLAIM_QUERIES + 1]
        results = await asyncio.gather(*(search(plan) for plan in plans), *(self.fetch_pages([x]) for x in supplied))
        existing_urls = {e["url"] for e in self.ledger.evidence if e["kind"] in ("primary_page", "external_page")} | {x["url"] for x in supplied}
        links = []
        for leads in results[:len(plans)]:
            leads.sort(key=lambda x: not x["discovery_matched"])
            links.extend(leads[:2])
        links = list({l["url"]: l for l in links if l["url"] not in existing_urls}.values())[:MAX_CLAIM_QUERIES + 1]
        # One page per request: a slow page cannot stall the others.
        await asyncio.gather(*(self.fetch_pages([l]) for l in links))
        for claim in self.ledger.claims:
            if any(p["claim_id"] == claim["id"] and p["status"] == "completed" for p in self.research_plan):
                claim["research_state"] = "searched"

    async def fetch_pages(self, links):
        if not links:
            return
        basic = self.company.get("basic_info") or {}
        name, domain = basic.get("name", ""), basic.get("primary_domain", "")
        result = await self.api.call("/web/enrich/live", {"urls": [x["url"] for x in links]})
        if not result["ok"] or not isinstance(result["data"], list):
            self.gap("Original page retrieval unavailable")
            return
        for i, page in enumerate(result["data"]):
            url = page.get("url", "")
            usable = page.get("success") is True and isinstance(page.get("content"), str) and bool(page["content"].strip())
            text = text_from_html(page.get("content", "")) if usable else ""
            published = None
            if usable:
                # Publication metadata is a source date; provider fetch timestamps are not.
                match = re.search(r'(?:article:published_time[\"\x27][^>]*content=[\"\x27]|datePublished[\"\x27]\s*:\s*[\"\x27]|<time[^>]*datetime=[\"\x27])(\d{4}-\d{2}-\d{2})', page["content"], re.I)
                published = iso_date(match[1]) if match else None
            matched = usable and entity_match(text, url, name, domain, [p["name"] or "" for p in self.people])
            host = (urlparse(url).hostname or "").removeprefix("www.")
            primary = host == domain or host.endswith("." + domain)
            ev = self.ledger.add(call=result["call"], path=f"[{i}].content", value=text, url=url,
                kind="primary_page" if primary else "external_page", matched=bool(matched), state="usable" if matched else "failed" if not usable else "unmatched",
                source_date=published,
                note="Self-published source" if primary else "Original retrieved page; publication date and entity linkage require checking",
                independence_group=domain if primary else host)
            # Different hosting alone does not establish independence: syndicated
            # releases and provider mirrors remain the same underlying source.
            self.ledger.evidence[-1]["independent"] = bool(not primary and matched and not any(term in text.lower() for term in
                ("press release", "provided by", "prnewswire", "business wire", "originally published", "crustdata")))
            if primary and matched:
                set_finding(self.findings, "identity.presence", "supported", [ev], "Canonical-domain website was retrieved and contains readable public content",
                            missing=["Website control and legal registration are not established"])
            if not usable:
                self.gap("Page fetch failed within HTTP 200 or returned empty content: " + url)
            elif not matched:
                self.gap("Rejected weak entity match for retrieved page: " + url)

    async def research_activity(self):
        cid = company_id(self.company)
        domain = (self.company.get("basic_info") or {}).get("primary_domain")
        social_body = {"filters": {"op": "and", "conditions": [
            {"field": "actor.crustdata_entity_id", "type": "=", "value": cid},
            {"field": "actor.actor_type", "type": "=", "value": "company"},
            {"field": "date_posted", "type": "=>", "value": self.window_start},
            {"field": "date_posted", "type": "<", "value": (self.today + timedelta(days=1)).isoformat()}]},
            "fields": self.api.allowed_fields("/social_post/search", ["share_url", "text", "date_posted", "actor.crustdata_entity_id", "actor.name"]),
            "sorts": [{"field": "date_posted", "order": "desc"}], "limit": 6}
        jobs_body = {"filters": {"op": "and", "conditions": [{"field": "company.basic_info.primary_domain", "type": "=", "value": domain}]},
            "fields": self.api.allowed_fields("/job/search", ["job_details.title", "job_details.url", "metadata", "company.basic_info"]),
            "sorts": [{"field": "metadata.date_added", "order": "desc"}], "limit": 3}
        # Optional activity calls respect the preferred budget as well as the hard ceiling.
        tasks = []
        for path, body in (("/social_post/search", social_body), ("/job/search", jobs_body)):
            try:
                estimate = self.api.estimate(path, body)
                if self.api.used + self.api.reserved + estimate <= min(self.config.target_credits, self.config.max_credits):
                    tasks.append((path, self.api.call(path, body)))
                else:
                    self.gap(path + " omitted to respect preferred credit budget")
            except (StopRun, KeyError):
                self.gap(path + " unavailable or pricing unestablished")
        results = await asyncio.gather(*(task for _, task in tasks))
        for (path, _), result in zip(tasks, results):
            data = result.get("data") or {}
            if not isinstance(data, dict):
                continue
            if path == "/social_post/search":
                for i, post in enumerate(data.get("posts", [])):
                    if (post.get("actor") or {}).get("crustdata_entity_id") != cid:
                        continue
                    day = iso_date(post.get("date_posted"))
                    ev = self.ledger.add(call=result["call"], path=f"posts[{i}]", value=post.get("text", ""), url=post.get("share_url"),
                        record_id=f"company:{cid}", kind="company_post", matched=True, source_date=day,
                        independence_group=domain, note="Company-authored marketing, not delivered work; provider date not independently authenticated")
                    # Posts remain evidence for extraction; one post is not automatically one event.
                self.gap(f"Social activity retrieval bounded to {len(data.get('posts', []))} of {data.get('total_count', 'unknown')} indexed posts; timeline is incomplete")
            else:
                for i, job in enumerate(data.get("job_listings", [])):
                    jb = job.get("job_details") or {}
                    metadata = job.get("metadata") or {}
                    ev = self.ledger.add(call=result["call"], path=f"job_listings[{i}]", value=job,
                        url=jb.get("url"), record_id=f"company:{cid}", kind="job", matched=True,
                        source_date=iso_date(metadata.get("date_added")), independence_group=domain,
                        note="Indexed job posting; plans to hire do not prove delivery or that a vacancy is still open")
                    day = iso_date(metadata.get("date_added"))
                    if day and self.window_start <= day <= self.today.isoformat():
                        # All vacancies on the same day are one hiring observation.
                        self.ledger.event("Observed job posting: " + str(jb.get("title", "untitled")), day, "hiring", ev,
                                          event_key=f"hiring-{cid}-{day}", note="Indirect hiring observation")
                if not data.get("job_listings"):
                    self.gap("No indexed jobs returned; hiring activity remains unknown")

    async def registry(self):
        """A bounded global LEI register overlay. Name-only records remain candidates."""
        basic = self.company.get("basic_info") or {}
        url = "https://api.gleif.org/api/v1/lei-records"
        params = {"filter[lei]": self.request.lei} if self.request.lei else {"filter[entity.legalName]": basic.get("name", ""), "page[size]": "3"}
        call = {"id": "registry-1", "endpoint": url, "request": params, "started_at": now(), "credits_used": 0, "status": "running"}
        self.api.calls.append(call)
        started = time.monotonic()
        try:
            timeout = max(.1, min(6, self.api.remaining()))
            response = await asyncio.wait_for(self.http.get(url, params=params, timeout=timeout), timeout=timeout)
            call.update(http_status=response.status_code, retrieved_at=now())
            response.raise_for_status()
            data = response.json()
            call["raw_path"] = self.store.raw(self.case_id, call["id"], {"request": params, "data": data, "retrieved_at": call["retrieved_at"]})
            for i, record in enumerate(data.get("data", [])):
                attributes = record.get("attributes") or {}
                entity = attributes.get("entity") or {}
                legal_name = (entity.get("legalName") or {}).get("name", "")
                lei = attributes.get("lei") or record.get("id")
                matched = bool(self.request.lei and lei == self.request.lei and normalize(legal_name) == normalize(basic.get("name")))
                ev = self.ledger.add(call=call, path=f"data[{i}].attributes", value=attributes,
                    url=f"https://api.gleif.org/api/v1/lei-records/{lei}", record_id=lei, kind="official_register", matched=matched,
                    source_date=(attributes.get("registration") or {}).get("lastUpdate"), state="usable" if matched else "ambiguous",
                    note="GLEIF legal-entity reference; no LEI is not a negative signal. Exact supplied LEI and company-name agreement required for automatic linkage")
                self.registry_candidates.append({"lei": lei, "legal_name": legal_name, "entity_matched": matched, "evidence_id": ev})
                if matched:
                    set_finding(self.findings, "identity.registration", "supported", [ev], "Supplied LEI resolves to an official legal-entity record whose name matches the resolved company",
                                missing=["Source-specific legal-entity reference, not comprehensive jurisdictional compliance clearance"])
            call["status"] = "completed"
        except (httpx.HTTPError, TimeoutError, ValueError, KeyError, TypeError):
            call.update(status="failed", reason="Official-register reference unavailable")
        except asyncio.CancelledError:
            call.update(status="failed", reason="Official-register request cancelled at time limit")
            raise
        finally:
            call["seconds"] = round(time.monotonic() - started, 3)
        if not any(c["entity_matched"] for c in self.registry_candidates):
            self.gap("Registration unresolved: GLEIF name candidates do not establish incorporation; local US state/India MCA or other jurisdiction-specific registration evidence is still needed")

    async def research(self):
        await self.stage("account_preflight", self.api.preflight)
        if not self.api.permissions:
            return
        await self.stage("company_resolution", self.resolve)
        if self.identity["status"] != "resolved":
            return
        await self.stage("company_enrichment", self.enrich)
        domain = (self.company.get("basic_info") or {}).get("primary_domain", "")
        async def primary():
            if domain and public_url("https://" + domain):
                await self.fetch_pages([{"url": "https://" + domain}])
        await asyncio.gather(self.stage("people", self.research_people), self.stage("primary_source", primary),
                             self.stage("activity", self.research_activity), self.stage("registration", self.registry))
        self.check_people_and_disclosures()
        self.check_operations()
        self.initial_checks_done = True
        self.ledger.rejected.extend(assess_claims(self.ledger, self.findings, self.field_evidence, self.company, [], self.today.isoformat()))
        await self.stage("claim_research_plan", self.plan_research)
        await self.stage("claim_corroboration_and_adverse_followup", self.follow_up)

    async def model_extract(self):
        if not self.config.use_model or self.identity["status"] != "resolved":
            return
        payload = self.model_payload()
        if not payload["sources"]:
            self.gap("No usable page/post evidence available for model extraction")
            return
        proposals = await self.call_model("assess", max(.1, self.deadline - time.monotonic() - 1))
        self.concerns = self.ledger.validate_proposals(proposals, today=self.today.isoformat(), start=self.window_start)
        self.claim_observations = proposals.get("observations", [])
        for proposal in proposals.get("interpretations", [])[:40]:
            if not isinstance(proposal, dict):
                continue
            finding = next((f for f in self.findings if f.get("claim_id") == proposal.get("claim_id")), None)
            source = next((e for e in self.ledger.evidence if e["id"] == proposal.get("source_id")), None)
            quote = proposal.get("quote")
            if finding and source and source["state"] == "usable" and source["entity_matched"] and source["kind"] != "submission" and isinstance(quote, str) and len(quote) >= 20 and quote in str(source["value"]):
                finding.setdefault("interpretations", []).append({"source_id": source["id"], "quote": quote, "reason": str(proposal.get("reason", "")),
                                                                    "basis": "model_interpretation_not_a_scored_verdict"})
        if not any(t["status"] == "completed" for t in self.model_trace if t.get("task") == "assess"):
            self.gap("Model extraction unavailable; deterministic evidence and partial assessment retained")
        for concern in self.concerns:
            self.gap("Review source allegation/context: " + concern["text"])

    def check_people_and_disclosures(self):
        cid = company_id(self.company)
        target_affiliations = [a["evidence_id"] for p in self.people for a in p["affiliations"] if a["company_id"] == cid]
        if target_affiliations:
            set_finding(self.findings, "consistency.affiliation", "supported", target_affiliations,
                        "Researched professional histories include the canonical company; this does not establish signing authority",
                        missing=["Independent confirmation of role dates and authority"])
        # Never convert missing employer rows to an impersonation allegation.
        for supplied in self.request.people:
            url = supplied.get("profile_url")
            matched = next((p for p in self.people if (url and normalize(p["profile_url"]) == normalize(url)) or
                            (not url and supplied.get("name") and normalize(p["name"]) == normalize(supplied["name"]))), None)
            if not matched:
                self.gap("A submitted representative was not resolved: " + str(supplied.get("name") or url or "unnamed person"))
                set_finding(self.findings, "consistency.affiliation", "insufficient evidence", [],
                            "At least one submitted representative remains unresolved", missing=["Relevant submitted-person identity and affiliation evidence"])
            elif not any(a["company_id"] == cid for a in matched["affiliations"]):
                self.gap("Submitted representative has no target-company affiliation in the retrieved history; role remains unresolved")
                set_finding(self.findings, "consistency.affiliation", "insufficient evidence", matched["evidence_ids"],
                            "A submitted representative's target-company role was not corroborated", missing=["Relevant representative affiliation evidence"])
        self.authority_check(cid)
        self.relationships = []
        if not self.request.internal_roster and not self.request.disclosures:
            set_finding(self.findings, "disclosures.comparison", "not applicable", [],
                        "No internal roster or disclosures were supplied, so there is nothing to compare; excluded from the score",
                        missing=["Internal roster and disclosures, if a conflict review is wanted"])
        if not self.request.internal_roster:
            self.gap("Internal disclosure comparison unavailable without an authorized roster; public affiliations were researched")
            return
        # Exact IDs only; ordinary professional overlaps are informational, never automatic conflicts.
        for member in self.request.internal_roster:
            affiliations = member.get("affiliations", [])
            for person in self.people:
                for affiliation in person["affiliations"]:
                    for other in affiliations:
                        if not isinstance(other, dict) or other.get("company_id") != affiliation["company_id"]:
                            continue
                        start = max(iso_date(affiliation.get("start_date")) or "9999-12-31", iso_date(other.get("start_date")) or "9999-12-31")
                        end = min(iso_date(affiliation.get("end_date")) or self.today.isoformat(), iso_date(other.get("end_date")) or self.today.isoformat())
                        if start <= end:
                            roster_ev = self.ledger.add(path="request.internal_roster", value=member, kind="submission", matched=False,
                                                       note="Supplied internal affiliation; not independently verified")
                            self.relationships.append({"person_id": person["crustdata_person_id"], "roster_member": member.get("name"),
                                "company_id": affiliation["company_id"], "overlap_start": start, "overlap_end": end,
                                "evidence_ids": [affiliation["evidence_id"], roster_ev], "result": "professional overlap for disclosure review; no conflict established"})
        self.disclosure_observations = []
        for disclosure in self.request.disclosures:
            person = next((p for p in self.people if p["crustdata_person_id"] == disclosure.get("person_id")), None)
            affiliations = [a for a in person["affiliations"] if a["company_id"] == disclosure.get("company_id")] if person else []
            self.disclosure_observations.append({"disclosure": disclosure, "result": "supported affiliation" if affiliations else "insufficient evidence",
                "evidence_ids": [a["evidence_id"] for a in affiliations], "note": "Affiliation agreement only; no determination of an actual conflict or disclosure completeness"})
        if self.disclosure_observations and all(d["evidence_ids"] for d in self.disclosure_observations):
            ids = [i for d in self.disclosure_observations for i in d["evidence_ids"]]
            submission_ev = self.ledger.add(path="request.disclosures", value=self.request.disclosures, kind="submission", matched=False,
                                            note="Supplied disclosures; evidence of what was declared")
            set_finding(self.findings, "disclosures.comparison", "supported", [submission_ev, *ids],
                        "Supplied affiliation disclosures agree with the checked professional histories; internal roster was provided",
                        missing=["Completeness of disclosures and internal roster is not established"])
        else:
            self.gap("Internal roster/disclosure completeness is not established; unresolved affiliations are not contradictions")

    def authority_check(self, cid):
        if not self.request.people:
            set_finding(self.findings, "consistency.authority", "not applicable", [],
                        "No representative was submitted; excluded from the score", missing=["Representative details, if one is acting for the company"])
            return
        self.gap("Professional profiles do not establish mailbox control or representative signing authority")
        supplied = [p for p in self.people if any((s.get("profile_url") and normalize(s["profile_url"]) == normalize(p["profile_url"] or "")) or
                    (s.get("name") and normalize(s["name"]) == normalize(p["name"] or "")) for s in self.request.people)]
        leadership = [a for p in supplied for a in p["affiliations"]
                      if a["company_id"] == cid and a["period"] == "current" and LEADERSHIP.search(str(a.get("title") or ""))]
        if leadership:
            set_finding(self.findings, "consistency.authority", "supported", [a["evidence_id"] for a in leadership],
                        "Submitted representative currently holds a leadership role at the resolved company in their professional profile",
                        missing=["Document establishing signing authority for this transaction"])

    def check_operations(self):
        events = [e for e in self.ledger.events if self.window_start <= e["date"] <= self.today.isoformat()]
        recent = [e for e in events if e["date"] >= (self.today - timedelta(days=90)).isoformat()]
        if recent:
            set_finding(self.findings, "operations.recent", "supported", [i for e in recent for i in e["evidence_ids"]],
                        "Dated public observations within 90 days; marketing and hiring are indirect signals")
        if events:
            dates = sorted(e["date"] for e in events)
            span = (date.fromisoformat(dates[-1]) - date.fromisoformat(dates[0])).days
            period = (self.today - date.fromisoformat(self.window_start)).days
            if span >= max(30, period * .5):
                set_finding(self.findings, "operations.period", "supported", list(dict.fromkeys(i for e in events for i in e["evidence_ids"])),
                            "Public activity observations span at least half of the available period; unknown months remain unknown")
            kinds = {e["kind"] for e in events}
            if len(kinds) >= 2:
                set_finding(self.findings, "operations.diversity", "supported", list(dict.fromkeys(i for e in events for i in e["evidence_ids"])),
                            "At least two distinct activity types observed; this is not proof of business performance")
        self.gap("Operating claims require claim-specific independent corroboration; self-published marketing is not proof of delivered work or revenue")
        self.gap("No adverse search result or absence of concerns establishes a clean record")

    def finish(self):
        if not self.initial_checks_done:
            self.check_people_and_disclosures()
        self.check_operations()
        for claim in self.ledger.claims:
            add_claim_finding(claim, self.findings)
        if self.identity["status"] == "resolved":
            self.ledger.rejected.extend(assess_claims(self.ledger, self.findings, self.field_evidence, self.company, self.claim_observations, self.today.isoformat()))
            operating = [f for f in self.findings if f.get("claim_id") and next((c.get("check_component") == "operations" for c in self.ledger.claims if c["id"] == f["claim_id"]), False)]
            corroborated = [f for f in operating if f.get("independently_corroborated")]
            conflicts = [f for f in operating if f["result"] == "conflicting evidence"]
            if conflicts:
                set_finding(self.findings, "operations.claims", "conflicting evidence", [i for f in conflicts for i in f["evidence_ids"]], "Claim-specific comparable operating evidence conflicts; verify the listed assertions")
            elif corroborated:
                set_finding(self.findings, "operations.claims", "supported", [i for f in corroborated for i in f["evidence_ids"]], "At least one scoped operating assertion has independently retrieved corroboration; inspect other unresolved claims")
        heartbeat = score([r for r in self.findings if r["component"]], self.identity["status"], self.config)
        # A quoted allegation needs review before any continue, but is never a confirmed contradiction.
        if self.concerns and self.identity["status"] == "resolved" and heartbeat["outcome"] != "hold for a specific verification":
            heartbeat.update(outcome="hold for a specific verification", reason="Source-linked potential issue needs review; no wrongdoing determination")
        for row in self.findings:
            for missing in row["missing_evidence"]:
                self.gap(missing)
        raw_paths = [r.get("raw_path") for r in self.api.calls if r.get("raw_path")]
        edges = []
        for row in self.findings:
            for eid in row["evidence_ids"]:
                edges.append({"from": row["id"], "to": eid, "relation": "SUPPORTED_BY" if row["result"] == "supported" else "CONTRADICTED_BY" if row["result"] == "conflicting evidence" else "MENTIONED_IN"})
        for person in self.people:
            for a in person["affiliations"]:
                if not any(e["id"] == f"company:{a['company_id']}" for e in self.entities):
                    self.entities.append({"id": f"company:{a['company_id']}", "type": "company", "crustdata_company_id": a["company_id"],
                                          "name": a["company_name"], "evidence_ids": [a["evidence_id"]], "resolution": "profile-reported affiliation"})
                edges.append({"from": f"person:{person['crustdata_person_id']}", "to": f"company:{a['company_id']}", "relation": "WORKED_AT", "evidence_ids": [a["evidence_id"]], "start_date": a["start_date"], "end_date": a["end_date"]})
        report = {"schema_version": "1.1", "case_id": self.case_id, "started_at": self.started_at, "completed_at": now(),
            "assessment_date": self.today.isoformat(), "synthetic_submission": self.request.synthetic,
            "request": self.request.to_dict(), "identity": self.identity, "company": self.company, "people": self.people,
            "company_record_policy": "Provider context, not independently verified facts. News, estimates, status, and embedded people are not findings unless explicitly assessed with evidence IDs.",
            "heartbeat": heartbeat, "findings": self.findings, "claims": self.ledger.claims, "evidence": self.ledger.evidence,
            "activity": self.ledger.events, "activity_timeline": timeline(self.ledger.events, self.today.isoformat(), self.window_start),
            "activity_window": {"start": self.window_start, "end": self.today.isoformat(), "complete": False, "label": "Observed public activity; missing months are unknown"},
            "headcount_trend": self.headcount_trend, "relationship_observations": self.relationships,
            "disclosure_observations": getattr(self, "disclosure_observations", []),
            "registry_candidates": self.registry_candidates, "potential_issues": self.concerns, "unresolved_questions": self.gaps,
            "entities": self.entities, "graph": {"nodes": [*self.entities,
                *[{"id": c["id"], "type": "claim"} for c in self.ledger.claims],
                *[{"id": f["id"], "type": "finding"} for f in self.findings],
                *[{"id": e["id"], "type": "source"} for e in self.ledger.evidence]], "edges": edges}, "calls": self.api.calls, "stages": self.stage_trace,
            "model_calls": self.model_trace, "rejected_model_proposals": self.ledger.rejected,
            "input_utilization": {"assertion_count": len(self.intake["claims"]), "source_links": self.intake["source_links"], "person_hints": self.intake["people"],
                                  "company_id_hints": self.intake["hints"]["company_ids"], "omitted": self.intake["omitted"]},
            "research_plan": self.research_plan,
            "usage": {"credits_used_or_reserved": round(self.api.used, 4), "credit_ceiling": self.config.max_credits,
                      "preferred_credits": self.config.target_credits, "seconds": round(time.monotonic() - self.started, 3),
                      "time_ceiling_seconds": self.config.max_seconds, "account_balance_before": self.api.balance,
                      "accounting": "X-Credits-Used where present; conservative request upper bound when absent; cached calls cost zero"},
            "storage": {"database": str(self.store.path), "raw_paths": raw_paths, "model_raw_path": getattr(self, "model_raw_path", None), "model_raw_paths": self.model_raw_paths},
            "rules": {"weights": self.config.weights, "coverage_threshold": self.config.coverage_threshold,
                      "identity_minimum_confidence": .95, "identity_minimum_margin": .15},
            "limitations": ["Diligence triage only; not an investment decision, fraud determination, KYC/AML clearance or legal opinion",
                "CrustData estimates, profile histories and provider freshness are not independently verified",
                "Public affiliations do not establish beneficial ownership, authority or conflicts of interest",
                "Global identity research is supported; authoritative registration coverage is partial and jurisdiction-specific"]}
        report = redact(report)
        self.store.finish(report)
        return report

async def investigate_async(request, *, config=None, transport=None):
    """Public async API. transport is injectable for reproducible failure verification."""
    config = config or RunConfig()
    if isinstance(config, dict):
        config = RunConfig(**config)
    request = InvestigationRequest.from_dict(request) if isinstance(request, dict) else request
    if not isinstance(request, InvestigationRequest):
        raise ValueError("Expected InvestigationRequest or dict")
    if config.env_file:
        load_env(config.env_file)
    store = Store(config.db_path)
    try:
        async with httpx.AsyncClient(transport=transport, follow_redirects=False, limits=httpx.Limits(max_connections=8)) as http:
            run = Investigation(request, config, store, http)
            try:
                await asyncio.wait_for(run.research(), timeout=max(.1, run.research_deadline - time.monotonic()))
            except asyncio.TimeoutError:
                run.gap("Research time limit reached; unfinished source calls cancelled and partial evidence retained")
            try:
                await asyncio.wait_for(run.stage("model_extraction", run.model_extract), timeout=max(.1, run.deadline - time.monotonic() - .3))
            except asyncio.TimeoutError:
                run.gap("Model time limit reached; deterministic report retained")
            return run.finish()
    finally:
        store.close()
