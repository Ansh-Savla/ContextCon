import asyncio
import re
from urllib.parse import urlparse

from .crust import Crust, CallResult
from .intake import Entry
from .textutil import name_similarity, hint_tokens, is_generic_name, overlap, norm_name
from . import rules

ENRICH_FIELDS = ["crustdata_company_id", "basic_info", "revenue", "headcount", "funding", "web_traffic",
                 "employee_reviews", "people", "locations", "taxonomy", "news", "followers", "seo"]
PERSON_FIELDS = ["crustdata_person_id", "basic_profile", "social_handles", "experience", "education"]
FOUNDER_QUERY = "founder co-founder CEO managing director owner president"
SKIP_DOMAINS = ("google.", "linkedin.", "facebook.", "instagram.", "youtube.", "twitter.", "x.com", "wikipedia.",
                "amazon.", "flipkart.", "reddit.", "quora.", "tiktok.", "crunchbase.", "tracxn.", "medium.",
                "sharktank", "allsharktankproducts", "seenintank", "gazettereview", "pinterest.")


class Evidence:
    def __init__(self):
        self.items = []

    def add(self, res: CallResult | None, label: str, url: str = "", date: str = "", kind: str = "CD") -> str:
        eid = f"E{len(self.items) + 1}"
        self.items.append({"id": eid, "kind": kind, "label": label, "url": url, "date": date,
                           "tool": res.tool if res else "", "fixture": res.key if res else "",
                           "source": res.source if res else "", "recorded_at": res.recorded_at if res else ""})
        return eid


def descriptor(hint: str, max_words: int = 5) -> str:
    """Short product description from a hint, for search queries (drops filler like 'among the earliest ...')."""
    clause = re.split(r"[;.?(]", hint or "")[0]
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z\-]+", clause) if w.lower() not in
             {"among", "the", "earliest", "widely", "discussed", "deals", "deal", "one", "of", "early", "season",
              "pitch", "pitches", "startup", "backed", "not", "avoid", "confusion", "and", "a", "an"}]
    return " ".join(words[:max_words])


def _person_or_filter(cid: int) -> dict:
    return {"op": "or", "conditions": [
        {"field": "experience.employment_details.current.company_id", "type": "=", "value": cid},
        {"field": "experience.employment_details.past.company_id", "type": "=", "value": cid}]}


def name_variants(name: str) -> list[str]:
    out = [name]
    squashed = re.sub(r"\s+", "", name)
    if squashed != name:
        out.append(squashed)
    stripped = re.sub(r"\b(industries|industry|labs|pvt|ltd|limited|inc|llc)\b", "", name, flags=re.I).strip()
    stripped = re.sub(r"\s{2,}", " ", stripped)
    if stripped and stripped.lower() != name.lower() and len(stripped) >= 3:
        out.append(stripped)
    return list(dict.fromkeys(out))


def score_candidate(entry: Entry, query_name: str, m: dict) -> dict:
    b = m.get("company_data", {}).get("basic_info") or {}
    conf = float(m.get("confidence_score") or 0)
    nsim = name_similarity(query_name, b.get("name") or "") if query_name else 0.0
    text = " ".join([b.get("name") or "", b.get("description") or "", " ".join(b.get("industries") or []),
                     " ".join(b.get("markets") or [])])
    desc = descriptor(entry.hint, 8)
    hsim = overlap(hint_tokens(desc), text) if desc else 0.0
    total = 0.5 * conf + 0.3 * nsim + 0.2 * hsim if desc else 0.6 * conf + 0.4 * nsim
    return {"id": m["company_data"]["crustdata_company_id"], "name": b.get("name"), "domain": b.get("primary_domain"),
            "description": (b.get("description") or "")[:220], "industries": b.get("industries") or [],
            "confidence": conf, "name_sim": round(nsim, 2), "hint_sim": round(hsim, 2), "score": round(total, 3)}


async def resolve(entry: Entry, cx: Crust, ev: Evidence, emit) -> dict:
    """Identity resolution: profile URL / domain first, then name variants, then a web lookup for the domain."""
    notes, candidates, offline = [], {}, []

    async def identify(kind: str, values: list[str]):
        res = await cx.call("company_identify", {kind: values, "fields": ["crustdata_company_id", "basic_info"]})
        if not res.ok:
            notes.append(f"identify by {kind} failed: {res.error}")
            if "fixture cache" in res.error:
                offline.append(kind)
            return res, []
        return res, res.data or []

    for kind, value in (("professional_network_profile_urls", entry.linkedin), ("domains", entry.domain)):
        if not value:
            continue
        res, rows = await identify(kind, [value])
        for row in rows:
            for m in row.get("matches") or []:
                if float(m.get("confidence_score") or 0) >= 0.9:
                    c = score_candidate(entry, entry.name or "", m)
                    what = "LinkedIn URL" if kind.startswith("professional") else "domain"
                    eid = ev.add(res, f"company_identify by {what} '{value}' -> {c['name']} (conf {c['confidence']})")
                    return {"status": "RESOLVED", "method": f"exact {what} match", "chosen": c,
                            "candidates": [c], "notes": notes, "evidence": [eid]}
        notes.append(f"no confident match by {kind.split('_')[0]} '{value}'")

    if entry.name:
        emit("resolve", f"identify by name: {', '.join(name_variants(entry.name))}")
        res, rows = await identify("names", name_variants(entry.name))
        for row in rows:
            for m in row.get("matches") or []:
                c = score_candidate(entry, entry.name, m)
                c["matched_on"] = row.get("matched_on")
                if c["id"] not in candidates or candidates[c["id"]]["score"] < c["score"]:
                    candidates[c["id"]] = c
        ranked = sorted(candidates.values(), key=lambda c: -c["score"])
        accepted = [c for c in ranked if _acceptable(entry, c, ranked)]
        if accepted:
            best = accepted[0]
            rivals = [c for c in accepted[1:] if c["name_sim"] >= 0.9 and best["name_sim"] >= 0.9
                      and best["score"] - c["score"] < 0.1]
            eid = ev.add(res, f"company_identify by name -> {len(ranked)} candidates; chose {best['name']} "
                              f"(conf {best['confidence']}, name {best['name_sim']}, description {best['hint_sim']})")
            method = "name match"
            if rivals:
                rival = rivals[0]
                if descriptor(entry.hint) and best["hint_sim"] - rival["hint_sim"] >= 0.15:
                    method = f"name tie broken by description (rejected {rival['name']}, {rival['domain'] or 'no domain'})"
                else:
                    return {"status": "NEEDS_REVIEW", "method": "ambiguous: several equally good matches",
                            "chosen": None, "candidates": ranked[:5], "notes": notes, "evidence": [eid]}
            locs = [c["name"] for c in ranked if c["id"] != best["id"] and best["name"] and " - " in (c["name"] or "")
                    and norm_name(c["name"].split(" - ")[0]) == norm_name(best["name"])]
            if locs:
                notes.append(f"collapsed location/duplicate pages into parent: {', '.join(locs)}")
            if best["confidence"] < 0.8:
                notes.append(f"accepted a low-confidence match ({best['confidence']}) on name + description evidence")
            return {"status": "RESOLVED", "method": method, "chosen": best, "candidates": ranked[:5],
                    "notes": notes, "evidence": [eid]}
        notes.append("no name candidate passed the name/description checks: "
                     + "; ".join(f"{c['name']} (conf {c['confidence']}, desc {c['hint_sim']})" for c in ranked[:3]))

    if offline and not candidates:
        # Replay mode without a live key: absence from the cache is NOT evidence the company is missing.
        return {"status": "OFFLINE", "method": "Crustdata not reachable for this company (no live API key; "
                "not among the recorded companies)", "chosen": None, "candidates": [], "notes": notes, "evidence": []}
    found = await _domain_from_web(entry, cx, ev, emit, notes)
    if found:
        return found
    return {"status": "UNRESOLVED", "method": "not in Crustdata graph", "chosen": None,
            "candidates": sorted(candidates.values(), key=lambda c: -c["score"])[:5], "notes": notes, "evidence": []}


def _acceptable(entry: Entry, c: dict, ranked: list[dict]) -> bool:
    if c["confidence"] >= 0.9 and c["name_sim"] >= 0.6:
        return True
    if c["name_sim"] < 0.9:
        return False
    if c["hint_sim"] > 0:
        return c["score"] >= 0.5
    # Low confidence and no description support: accept only a name no other candidate shares
    # ("Skippi" is unique; five companies are called "Jugaad").
    same_name = [o for o in ranked if o is not c and o["name_sim"] >= 0.9]
    return not same_name and not descriptor(entry.hint)


async def _domain_from_web(entry: Entry, cx: Crust, ev: Evidence, emit, notes) -> dict | None:
    if not entry.name:
        return None
    query = re.sub(r"\s+", " ", f"{entry.name} {descriptor(entry.hint)} official website").strip()
    emit("resolve", f"web lookup for the official site: “{query}”")
    res = await cx.call("web_search_live", {"query": query})
    if not res.ok:
        notes.append(f"web lookup failed: {res.error}")
        return None
    stem = norm_name(entry.name)[:6]
    domains, profiles = [], []
    for r in (res.data or {}).get("results") or []:
        url = r.get("url") or ""
        host = urlparse(url).netloc.lower().removeprefix("www.")
        if "linkedin.com" in host and "/company/" in url:
            slug = url.split("/company/")[1].split("/")[0].split("?")[0]
            if norm_name(slug).startswith(stem[:5]):
                profiles.append(f"https://www.linkedin.com/company/{slug}")
        elif host and not any(s in host for s in SKIP_DOMAINS) and norm_name(host.split(".")[0]).startswith(stem[:5]):
            domains.append(host)
    domains, profiles = list(dict.fromkeys(domains))[:2], list(dict.fromkeys(profiles))[:1]
    lookup_eid = ev.add(res, f"web search for official site: '{query}' -> domains {domains or 'none'}", kind="WEB")
    for kind, values in (("domains", domains), ("professional_network_profile_urls", profiles)):
        for v in values:
            r2 = await cx.call("company_identify", {kind: [v], "fields": ["crustdata_company_id", "basic_info"]})
            for row in (r2.data or []) if r2.ok else []:
                for m in row.get("matches") or []:
                    if float(m.get("confidence_score") or 0) >= 0.9:
                        c = score_candidate(entry, entry.name, m)
                        eid = ev.add(r2, f"company_identify by {kind.split('_')[0]} '{v}' (found via web) -> {c['name']}")
                        notes.append(f"input name '{entry.name}' did not match; resolved via web-discovered {v}")
                        return {"status": "RESOLVED", "method": "web-discovered domain", "chosen": c,
                                "candidates": [c], "notes": notes, "evidence": [lookup_eid, eid]}
            notes.append(f"web-discovered {v} is not in Crustdata")
    return None


async def research(entry: Entry, resolution: dict, cx: Crust, emit) -> dict:
    cid = resolution["chosen"]["id"] if resolution.get("chosen") else None
    raw = {"enrich": None, "people": [], "jobs": None, "web": [], "extra_people": []}
    if cid is None and resolution["status"] == "OFFLINE":
        return raw
    if cid is None:
        q = (entry.name or entry.domain or "").replace("’", "'").strip()
        if not q:
            return raw
        emit("research", "not in the graph: gathering web-only evidence")
        # The search engine ignores OR; "<name> <what it makes> news" is the shape that surfaces status coverage.
        what = " ".join([w for w in descriptor(entry.hint).split() if "-" not in w][:2])
        raw["web"] = [await cx.call("web_search_live", {"query": re.sub(r"\s+", " ", f"{q} {what} news")})]
        return raw

    emit("research", "enriching company, searching founders, jobs and news in parallel")
    enrich_t = cx.call("company_enrich", {"crustdata_company_ids": [cid], "fields": ENRICH_FIELDS})
    people_t = cx.call("person_search", {"filters": _person_or_filter(cid),
                                         "search": {"query": FOUNDER_QUERY, "mode": "lexical"}, "mode": "exact",
                                         "limit": 10, "fields": PERSON_FIELDS})
    jobs_t = cx.call("job_search", {"filters": {"field": "company.basic_info.company_id", "type": "=", "value": cid},
                                    "limit": 5, "fields": ["crustdata_job_id", "job_details", "location"]})
    enrich, people, jobs = await asyncio.gather(enrich_t, people_t, jobs_t)
    raw["enrich"], raw["people"], raw["jobs"] = enrich, people, jobs

    company = rules.first_company(enrich)
    canonical = rules.clean_name((company or {}).get("basic_info", {}).get("name") or resolution["chosen"]["name"])
    subject = canonical
    if is_generic_name(canonical):
        tax = (company or {}).get("taxonomy") or {}
        anchor = ((tax.get("professional_network_specialities") or [None])[0]
                  or tax.get("professional_network_industry") or "")
        subject = f"{canonical} {anchor}".strip()
    emit("research", f"web: status and deal coverage for “{subject}”")
    web_status = cx.call("web_search_live", {"query": f"{subject} closed OR acquired OR shut down OR bankruptcy"})
    web_deals = cx.call("web_search_live", {"query": f"{subject} funding OR raises OR investors OR Shark Tank deal"})
    raw["web"] = list(await asyncio.gather(web_status, web_deals))

    found = {norm_name(n) for n in rules.people_names(people)}
    missing = [n for n in entry.founder_hints if not any(norm_name(n.split()[0]) in f for f in found)]
    if missing:
        emit("research", f"checking input founder names not yet seen: {', '.join(missing)}")
        raw["extra_people"] = list(await asyncio.gather(*[
            cx.call("person_search", {"filters": _person_or_filter(cid), "search": {"query": n, "mode": "lexical"},
                                      "mode": "exact", "limit": 3, "fields": PERSON_FIELDS}) for n in missing]))
    return raw


async def analyze_entry(idx: int, entry: Entry, cx: Crust, queue: asyncio.Queue) -> dict:
    def emit(stage, msg):
        queue.put_nowait({"type": "stage", "index": idx, "label": entry.label(), "stage": stage, "msg": msg})

    ev = Evidence()
    emit("intake", f"parsed: name={entry.name!r} domain={entry.domain!r} linkedin={entry.linkedin!r} "
                   f"founder hints={entry.founder_hints or '—'}")
    try:
        resolution = await resolve(entry, cx, ev, emit)
        emit("resolve", f"{resolution['status']}: {resolution['method']}"
             + (f" → {resolution['chosen']['name']} (#{resolution['chosen']['id']})" if resolution.get("chosen") else ""))
        raw = await research(entry, resolution, cx, emit) if resolution["status"] != "NEEDS_REVIEW" else {}
        emit("reconcile", "cross-checking status, numbers, founders, deals and news")
        memo = rules.build_memo(entry, resolution, raw, ev)
        emit("score", f"verdict: {memo['score']['verdict']}")
    except Exception as e:  # keep one bad company from failing the batch
        memo = {"index": idx, "input": entry.to_dict(), "error": f"{type(e).__name__}: {e}",
                "resolution": {"status": "ERROR"}, "score": {"verdict": "Error", "overall": None}}
        emit("error", memo["error"])
    memo["index"] = idx
    queue.put_nowait({"type": "result", "index": idx, "memo": memo})
    return memo
