"""Map an investment-team Sightline memo onto an investigation request.

Every memo item keeps its upstream provenance. Items the team sourced from CrustData
become structured claims that can only show consistency with our own CrustData record;
items they sourced from the web become claims whose cited pages we fetch, while
independent corroboration still has to come from our own search.
"""
from urllib.parse import urlparse
from .models import public_url

ADVERSE_STATUS = ("DEFUNCT", "CLOSED", "DORMANT", "ACQUIRED")

def usable_url(url):
    host = (urlparse(url or "").hostname or "").lower()
    # Search-engine redirect wrappers hide the publisher and cannot be cited.
    return bool(url) and public_url(url) and not host.endswith(("google.com", "linkedin.com"))

def request_from_memo(memo):
    ledger = {e.get("id"): e for e in memo.get("evidence", []) if isinstance(e, dict)}
    def cited(*ids):
        rows = [ledger.get(i) or {} for i in ids if i]
        return [r["url"] for r in rows if usable_url(r.get("url"))], next((r.get("date") for r in rows if r.get("date")), None)
    def tag(ids):
        return "web" if any((ledger.get(i) or {}).get("kind") == "WEB" for i in ids if i) else "crustdata"

    resolution = memo.get("resolution") or {}
    chosen = resolution.get("chosen") or {}
    facts = memo.get("facts") or {}
    entry = memo.get("input") or {}
    claims = []
    def add(text, *, ids=(), field=None, expected=None, kind=None, urls=None, as_of=None):
        urls_, date_ = cited(*ids)
        claim = {"text": f"Investment team ({tag(ids)}-sourced): {text}", "source_urls": urls if urls is not None else urls_,
                 "as_of": as_of or date_}
        if field:
            claim.update(field=field, expected=expected)
        if kind:
            claim["kind"] = kind
        claims.append(claim)

    # Status verdicts and web-cited signals first: they drive the page-fetch budget.
    status = memo.get("status") or {}
    verdict = str(status.get("verdict") or "").upper()
    if verdict:
        signals = [s for s in status.get("signals", []) if isinstance(s, dict)]
        add(f"company status is {verdict}" + (" — " + "; ".join(s.get("text", "") for s in signals[:3]) if signals else ""),
            ids=[s.get("ev") for s in signals])
    for deal in (memo.get("deals") or {}).get("announced", [])[:3]:
        if isinstance(deal, dict):
            add("announced deal " + ", ".join(f"{k}={v}" for k, v in deal.items() if k not in ("ev", "url") and v not in (None, "")),
                ids=[deal.get("ev")], urls=[deal["url"]] if usable_url(deal.get("url")) else None)
    for item in memo.get("news", [])[:3]:
        if isinstance(item, dict) and usable_url(item.get("url")):
            add(f"press coverage: {item.get('title', '')}", urls=[item["url"]], as_of=item.get("date"))
    if isinstance(facts.get("founded"), dict) and facts["founded"].get("value"):
        add(f"founded {facts['founded']['value']}", ids=[facts["founded"].get("ev")], field="basic_info.year_founded", expected=facts["founded"]["value"])
    hq = (facts.get("hq") or {}).get("value") if isinstance(facts.get("hq"), dict) else None
    if isinstance(hq, str) and "," in hq:
        add(f"headquartered in {hq}", ids=[facts["hq"].get("ev")], field="locations.country", expected=hq.rsplit(",", 1)[1].strip())
    for check in memo.get("input_claims", []):
        if isinstance(check, dict) and check.get("verdict") != "CONFIRMED":
            add(f"submitted founder name '{check.get('claim')}' was {str(check.get('verdict')).lower()} ({check.get('detail', '')})", ids=[check.get("ev")])
    # The team's own reconciliation flags are leads to investigate, never findings.
    for flag in [f for f in memo.get("flags", []) if isinstance(f, dict) and f.get("severity") in ("high", "med")][:6]:
        add(f"flag {flag.get('code')}: {flag.get('text')}", ids=flag.get("evidence") or [], kind="inference")

    people = [{"name": f.get("name", ""), "profile_url": f["url"]} for f in memo.get("founders", [])
              if isinstance(f, dict) and isinstance(f.get("url"), str) and "/in/" in f["url"]][:3]
    domain = (facts.get("domain") or {}).get("value") if isinstance(facts.get("domain"), dict) else None
    request = {"company_name": chosen.get("name") or memo.get("name") or entry.get("name") or "",
               "domain": domain or chosen.get("domain") or entry.get("domain") or "",
               # Founders are researched people, not a representative acting for this request.
               "description": str(entry.get("hint") or "")[:2000], "claims": claims[:40],
               "context": {"origin": "sightline", "founders": people}}
    if isinstance(chosen.get("id"), int):
        request["context"]["crustdata_company_id"] = chosen["id"]
    return request
