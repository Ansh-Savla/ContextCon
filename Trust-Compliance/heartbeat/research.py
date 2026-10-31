"""Normalize upstream assertions, preserve provenance and assess quoted observations.

The model extracts values; this module decides whether sources can change a finding.
"""
from datetime import date
from decimal import Decimal, InvalidOperation
import json
import re
from urllib.parse import urlparse
from .evidence import iso_date, dates_in_text
from .models import normalize, public_url

FIELDS = {
    "basic_info.name", "basic_info.primary_domain", "basic_info.year_founded", "basic_info.status",
    "locations.country", "locations.city", "locations.state", "locations.street_address",
    "funding.total_investment_usd", "funding.last_fundraise_date", "funding.last_round_amount_usd",
    "funding.acquired_by", "funding.acquisition_date", "revenue.acquisition_status", "headcount.total",
    "revenue.estimated.lower_bound_usd", "revenue.estimated.upper_bound_usd", "representative.affiliation",
}
ALIASES = {
    "domain": "basic_info.primary_domain", "primarydomain": "basic_info.primary_domain",
    "founded": "basic_info.year_founded", "foundedyear": "basic_info.year_founded", "yearfounded": "basic_info.year_founded",
    "totalraised": "funding.total_investment_usd", "totalraisedusd": "funding.total_investment_usd",
    "totalinvestmentusd": "funding.total_investment_usd", "acquiredby": "funding.acquired_by", "acquirer": "funding.acquired_by",
    "acquisitiondate": "funding.acquisition_date", "lastfundraisedate": "funding.last_fundraise_date",
    "lastroundamountusd": "funding.last_round_amount_usd", "acquisitionstatus": "revenue.acquisition_status",
}

COUNTRIES = {"us": "unitedstates", "usa": "unitedstates", "unitedstatesofamerica": "unitedstates", "in": "india", "ind": "india",
             "gb": "unitedkingdom", "gbr": "unitedkingdom", "uk": "unitedkingdom", "ca": "canada", "can": "canada", "de": "germany",
             "deu": "germany", "fr": "france", "fra": "france", "sg": "singapore", "sgp": "singapore", "ae": "unitedarabemirates",
             "are": "unitedarabemirates", "uae": "unitedarabemirates", "au": "australia", "aus": "australia", "il": "israel", "isr": "israel",
             "nl": "netherlands", "nld": "netherlands", "br": "brazil", "bra": "brazil", "cn": "china", "chn": "china", "jp": "japan", "jpn": "japan"}

def field_for(path):
    clean = re.sub(r"\[\d+\]", "", path).removeprefix("request.context.")
    for field in FIELDS:
        if clean == field or clean.endswith("." + field):
            return field
    last = normalize(clean.split(".")[-1])
    if re.search(r"(?:acquired_by|acquirer)\.(?:name|company_name)$", clean):
        return "funding.acquired_by"
    if last in ALIASES:
        return ALIASES[last]
    return None

def value_at(value, path):
    for part in path.split("."):
        value = value.get(part) if isinstance(value, dict) else None
    if isinstance(value, dict):
        return value.get("name") or (value.get("basic_info") or {}).get("name")
    if isinstance(value, list):
        names = [value_at(x, "name") or value_at(x, "basic_info.name") for x in value if isinstance(x, dict)]
        return names[0] if len(names) == 1 else None
    return value

def canonical(value, field):
    if value is None or isinstance(value, (dict, list, bool)):
        return None
    if field.endswith("_usd") or field in ("headcount.total", "basic_info.year_founded"):
        try:
            raw = str(value).replace(",", "").replace("$", "").strip().lower()
            match = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)\s*(thousand|million|billion|k|m|b)?(?:\s*usd)?", raw)
            if not match:
                return None
            return Decimal(match[1]) * {None: 1, "k": 1000, "thousand": 1000, "m": 1000000, "million": 1000000, "b": 1000000000, "billion": 1000000000}[match[2]]
        except InvalidOperation:
            return None
    if field.endswith("date"):
        return iso_date(value)
    if field == "basic_info.primary_domain":
        return normalize((urlparse(str(value) if "://" in str(value) else "https://" + str(value)).hostname or "").removeprefix("www."))
    if field == "locations.country":
        code = normalize(value)
        named = COUNTRIES.get(code, code)
        return None if len(named) <= 3 else named
    return normalize(value)

def upstream_intake(request, ledger):
    """A bounded projection of ALL input; no source is promoted to trusted evidence."""
    entries, links, people, ignored = [], [], [], []
    hints = {"company_ids": []}
    for i, claim in enumerate(ledger.claims):
        original = request.claims[i]
        claim.update(input_path=f"request.claims[{len(entries)}]", assertion_kind="submitted", source_urls=[], assessment_date=None)
        claim["assessment_date"] = iso_date(original.get("as_of"))
        claim["source_urls"] = [u for u in original.get("source_urls", []) if public_url(u)] if isinstance(original.get("source_urls", []), list) else []
        claim["assertion_kind"] = original.get("kind") if original.get("kind") in ("inference", "estimate") else "submitted"
        entries.append(claim)
    leaves = []
    def walk(value, path, inherited_date=None, inherited_urls=()):
        if isinstance(value, dict):
            urls = list(inherited_urls)
            for key in ("url", "source_url", "article_url"):
                if public_url(value.get(key, "")):
                    urls.append(value[key])
            day = next((iso_date(value.get(k)) for k in ("as_of", "source_date", "date", "article_publish_date") if iso_date(value.get(k))), inherited_date)
            if isinstance(value.get("profile_url"), str) and "/in/" in value["profile_url"]:
                # A person reference is looked up through CrustData, not asserted as text.
                people.append({"name": value.get("name", ""), "profile_url": value["profile_url"]})
                return
            for key, child in value.items():
                if re.search(r"api.?key|secret|password|token|authorization", key, re.I):
                    ignored.append({"input_path": path + "." + key, "reason": "Credential field excluded"})
                    continue
                walk(child, path + "." + key, day, tuple(urls))
        elif isinstance(value, list):
            for i, child in enumerate(value):
                walk(child, f"{path}[{i}]", inherited_date, inherited_urls)
        elif value is not None:
            leaves.append({"path": path, "value": value, "source_date": inherited_date, "source_urls": list(inherited_urls)})
    walk(request.context, "request.context")
    if request.description:
        walk(request.description, "request.description")
    for i, person in enumerate(request.people):
        if isinstance(person.get("name"), str):
            walk(person, f"request.people[{i}]")
    seen = {(c.get("field"), str(c.get("expected"))) for c in entries if c.get("field")}
    for leaf in leaves:
        path, value = leaf["path"], leaf["value"]
        if isinstance(value, str) and public_url(value):
            host = (urlparse(value).hostname or "").lower().removeprefix("www.")
            if "/in/" in value and host == "linkedin.com":
                people.append({"profile_url": value})
            # Profiles and search redirects are not fetchable original sources.
            elif not host.endswith(("linkedin.com", "google.com")):
                links.append({"url": value, "input_path": path})
            continue
        if path.endswith("crustdata_company_id") and isinstance(value, int) and value > 0 and "founder" not in path.lower() and "acquir" not in path.lower():
            hints["company_ids"].append(value)
            continue
        if path.endswith(("crustdata_person_id", "company_id", "person_id")) or isinstance(value, bool):
            continue
        if re.search(r"(?:source_date|retrieved_at|as_of|\.url|source_url|source_urls|\.source|confidence|matched_on)$", path):
            continue
        field = field_for(path)
        if field and (field, str(value)) in seen:
            existing = next(c for c in entries if c.get("field") == field and str(c.get("expected")) == str(value))
            existing.setdefault("input_paths", []).append(path)
            existing["assessment_date"] = existing.get("assessment_date") or leaf["source_date"]
            existing["source_urls"] = list(dict.fromkeys([*existing.get("source_urls", []), *leaf["source_urls"]]))
            continue
        if len(entries) >= 40:
            ignored.append({"input_path": path, "reason": "Per-run 40-claim limit; retained in original request"})
            continue
        if re.search(r"\.(?:origin|note|provider|publisher|source_name)$", path):
            continue
        kind = "inference" if re.search(r"verdict|inference|interpretation|analysis|conclusion", path, re.I) else "estimate" if "estimated" in path.lower() or "estimate" in path.lower() else "submitted"
        text = str(value) if not field else f"{field}: {value}"
        claim = ledger.claim(text[:4000], "upstream_context", field=field, expected=value if field else None)
        ev = ledger.add(path=path, value=value, kind="submission", state="submitted", source_date=leaf["source_date"],
                        note="Upstream assertion, estimate or inference; not independent verification")
        claim.update(input_path=path, assertion_kind=kind, source_urls=leaf["source_urls"], assessment_date=leaf["source_date"], evidence_ids=[ev])
        entries.append(claim)
        if field:
            seen.add((field, str(value)))
    # URLs nested under a claim retain association as well as the original path.
    for c in entries:
        for url in c.get("source_urls", []):
            links.append({"url": url, "input_path": c.get("input_path"), "claim_id": c["id"]})
    unique_people = {p["profile_url"]: p for p in people if p.get("profile_url")}
    return {"claims": entries, "leaves": leaves[:160], "source_links": list({x["url"]: x for x in links}.values()),
            "people": list(unique_people.values()), "hints": hints, "omitted": ignored}

def add_claim_finding(claim, findings, *, scored=False):
    if any(f.get("claim_id") == claim["id"] for f in findings):
        return
    field = claim.get("field") or ""
    component = "identity" if field.startswith(("basic_info.", "locations.")) else "consistency" if field.startswith("representative.") else "operations"
    claim["check_component"] = component
    findings.append({"id": claim["id"] + ".assessment", "component": component if scored else None, "claim_id": claim["id"],
        "claim": claim["text"], "result": "insufficient evidence", "evidence_ids": [], "claim_evidence_ids": claim.get("evidence_ids", []),
        "confidence_reason": "Assertion requires claim-specific verification", "missing_evidence": ["Matched claim-specific evidence"],
        "material": False, "rule": "claim_evidence_comparison", "revision_history": []})

def research_priority(claim):
    field = claim.get("field") or ""
    return (0 if "acquir" in field or "status" in field else 1 if field.startswith(("funding.", "representative.")) else 2 if claim.get("assertion_kind") == "inference" else 3,
            0 if claim.get("source_urls") else 1)

def assess_claims(ledger, findings, field_evidence, company, observations, today):
    """Compare typed observations; quotes alone never establish semantic truth."""
    sources = {e["id"]: e for e in ledger.evidence}
    rejected = []
    for claim in ledger.claims:
        finding = next((f for f in findings if f.get("claim_id") == claim["id"]), None)
        field = claim.get("field")
        expected = canonical(claim.get("expected"), field) if field in FIELDS else None
        if not finding or expected is None or claim.get("assertion_kind") == "inference":
            continue
        witnesses = []
        provider_ev = sources.get(field_evidence.get(field))
        observed = value_at(company, field)
        if field == "headcount.total" and claim.get("assessment_date"):
            points = (company.get("headcount") or {}).get("timeseries") or []
            snapshot = next(((i, p) for i, p in enumerate(points) if iso_date(p.get("date")) == iso_date(claim["assessment_date"])), None)
            if snapshot:
                i, point = snapshot
                prior = provider_ev or {}
                key = "headcount.timeseries[" + str(i) + "]"
                provider_ev = next((e for e in ledger.evidence if e["field_path"] == key), None)
                if not provider_ev:
                    eid = ledger.add(call={"id": prior.get("call_id"), "retrieved_at": prior.get("retrieved_at"), "raw_path": prior.get("raw_path")},
                                     path=key, value=point, record_id=prior.get("record_id"), matched=True, source_date=iso_date(point["date"]),
                                     note="Provider-observed professional-profile count on the cited date, not audited payroll")
                    provider_ev = ledger.evidence[-1]
                    sources[eid] = provider_ev
                observed = point.get("employee_count")
        if provider_ev and observed is not None:
            witnesses.append({"value": observed, "source_id": provider_ev["id"], "basis": "provider_field", "as_of": provider_ev.get("source_date"), "value_kind": "estimate" if "estimated" in field else "reported"})
        for obs in observations:
            if not isinstance(obs, dict) or obs.get("claim_id") != claim["id"] or obs.get("field") != field:
                continue
            source = sources.get(obs.get("source_id")) if isinstance(obs.get("source_id"), str) else None
            quote, value_quote = obs.get("quote"), obs.get("value_quote")
            if not source or source["state"] != "usable" or not source["entity_matched"] or source["kind"] not in ("primary_page", "external_page", "official_register") or not isinstance(quote, str) or len(quote) < 20 or quote not in str(source["value"]) or not isinstance(value_quote, str) or not value_quote.strip() or value_quote not in quote:
                rejected.append({"claim_id": claim["id"], "reason": "Observation lacks an exact matched-source quote/value span"})
                continue
            target = normalize((company.get("basic_info") or {}).get("name", ""))
            if source["kind"] == "external_page" and (not target or target not in normalize(quote)):
                rejected.append({"claim_id": claim["id"], "reason": "External quotation does not identify the target company"})
                continue
            if re.search(r"\b(not|denied|rumou?r|alleged|forecast|expected|plans to|could|might)\b", quote, re.I):
                rejected.append({"claim_id": claim["id"], "reason": "Qualified/negative statement needs interpretation rather than literal value comparison"})
                continue
            if "estimated" not in field and re.search(r"\b(estimated|estimate|projected)\b", quote, re.I):
                continue
            if field == "basic_info.year_founded" and not re.search(r"\b(founded|established|started|incorporated)\b", quote, re.I):
                continue
            value = obs.get("value")
            if field == "funding.acquired_by":
                q, acquirer = normalize(quote), normalize(value)
                direction = (re.search(re.escape(target) + r"(?:was|hasbeen|is)?acquiredby" + re.escape(acquirer), q) or
                             re.search(re.escape(acquirer) + r"(?:has)?acquired" + re.escape(target), q)) if target and acquirer else None
                if not direction:
                    rejected.append({"claim_id": claim["id"], "reason": "Acquisition direction not reproducible from quote"})
                    continue
            # Numbers/dates cannot be invented by normalization; reproduce them from the cited span.
            if canonical(value, field) is None or (field.endswith("_usd") or field in ("headcount.total", "basic_info.year_founded")) and canonical(value, field) != canonical(value_quote, field):
                rejected.append({"claim_id": claim["id"], "reason": "Numeric value cannot be reproduced from quote"})
                continue
            if not field.endswith(("_usd", "date")) and field not in ("headcount.total", "basic_info.year_founded") and canonical(value, field) != canonical(value_quote, field):
                rejected.append({"claim_id": claim["id"], "reason": "Value does not match quoted span"})
                continue
            if field.endswith("date") and iso_date(value) not in dates_in_text(value_quote):
                continue
            if field.startswith("revenue.") and "estimated" not in field and obs.get("value_kind") == "estimate":
                continue
            witness = {**obs, "basis": "model_extracted_value_with_validated_quote"}
            if iso_date(witness.get("as_of")) and iso_date(witness["as_of"]) != iso_date(source.get("source_date")) and iso_date(witness["as_of"]) not in dates_in_text(quote):
                rejected.append({"claim_id": claim["id"], "reason": "Observation date is not grounded in source"})
                continue
            witnesses.append(witness)
        support, conflict, unusable = [], [], []
        for witness in witnesses:
            # Workforce snapshots and mutable metrics must refer to the same dated observation.
            source_day = iso_date(witness.get("as_of"))
            claim_day = iso_date(claim.get("assessment_date"))
            if field in ("headcount.total",) or field.startswith("revenue.estimated"):
                if not source_day or not claim_day or source_day != claim_day:
                    unusable.append("Snapshot date/measurement basis is missing or differs")
                    continue
            if field == "basic_info.status" and (not source_day or (date.fromisoformat(today) - date.fromisoformat(source_day)).days > 90):
                unusable.append("Current-status evidence is undated or stale")
                continue
            if field in ("funding.total_investment_usd", "funding.last_round_amount_usd") and canonical(witness["value"], field) != expected and (not source_day or not claim_day or source_day != claim_day):
                # Funding totals change. Undated provider disagreement is a review lead, not contradiction.
                unusable.append("Funding amount/date scope is not comparable")
                continue
            (support if canonical(witness["value"], field) == expected else conflict).append(witness)
        old = {k: finding[k] for k in ("result", "evidence_ids", "confidence_reason")}
        ids = list(dict.fromkeys(w["source_id"] for w in [*support, *conflict]))
        independent = [w for w in support if sources[w["source_id"]]["kind"] in ("external_page", "official_register") and
                       sources[w["source_id"]].get("independent", False)]
        # Same provider record supplied upstream and returned again is not corroboration.
        groups = {sources[w["source_id"]]["independence_group"] for w in support}
        independent = [w for w in independent if sources[w["source_id"]].get("url") not in claim.get("source_urls", [])]
        finding["observations"] = witnesses
        if conflict:
            finding.update(result="conflicting evidence", evidence_ids=ids, confidence_reason="Comparable matched-source values conflict; preserve source disagreement for verification", missing_evidence=[] if support else ["Resolve which source/value is authoritative"],
                           material=claim["origin"] in ("submission", "upstream_context"))
        elif support:
            finding.update(result="supported", evidence_ids=ids, confidence_reason="Matched evidence agrees with this scoped assertion" + ("; independent corroboration retrieved" if independent else "; agreement is not independent corroboration"), missing_evidence=[] if independent else ["Independent primary corroboration"])
        else:
            finding.update(result="insufficient evidence", evidence_ids=[], confidence_reason="; ".join(dict.fromkeys(unusable)) or "No comparable claim-specific observations", missing_evidence=["Comparable source value, date and measurement basis"])
        finding["independently_corroborated"] = bool(independent and not conflict)
        finding["independence_groups"] = sorted(str(g) for g in groups)
        if any(finding[k] != old[k] for k in old):
            finding.setdefault("revision_history", []).append({"stage": "claim_comparison", "before": old, "after": {k: finding[k] for k in old}})
    return rejected
