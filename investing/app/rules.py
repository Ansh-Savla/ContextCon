import re
from datetime import date

from .textutil import (ACQUISITION_PATTERNS, ALIVE_PATTERNS, CLOSURE_PATTERNS, DEAL_FAILED_PATTERNS, DISTRESS_PATTERNS,
                       any_pattern, hint_tokens, mentions, norm, norm_name, tokens)

TODAY = date.today()
FOUNDER_RE = re.compile(r"\bfounder\b|\bco-?founder\b", re.I)
EXEC_RE = re.compile(r"\bceo\b|chief \w+ officer|chief executive|managing director|(?<!vice )\bpresident\b|\bcoo\b"
                     r"|\bcto\b|\bowner\b", re.I)
SHARKS = ["Mark Cuban", "Kevin O'Leary", "Barbara Corcoran", "Lori Greiner", "Robert Herjavec", "Daymond John",
          "Ashneer Grover", "Aman Gupta", "Namita Thapar", "Vineeta Singh", "Anupam Mittal", "Peyush Bansal",
          "Ghazal Alagh", "Ritesh Agarwal", "Amit Jain", "Varun Alagh", "Deepinder Goyal", "Radhika Gupta"]
AMOUNT_RE = re.compile(
    r"((?:₹|rs\.?\s?|inr\s?|\$|usd\s?)\s?\d[\d,]*(?:\.\d+)?\s?(?:lakhs?|lac|crores?|cr|k|m|mn|million|billion)?"
    r"|\d[\d,]*(?:\.\d+)?\s?(?:lakhs?|lac|crores?|cr|million|mn)?\s?(?:inr|rupees|usd|dollars))"
    r"\s*(?:for|at)\s*(?:a\s)?(\d+(?:\.\d+)?)\s?(?:%|per\s?cent|percent)", re.I)
# Flags about the data (sources disagreeing, bad input, stale records), not about the company itself.
DATA_QUALITY_CODES = {"STATUS_CONFLICT", "STATUS_DISPUTED", "REVENUE_IMPLAUSIBLE", "STALE_HEADCOUNT",
                      "DEAL_NOT_RECORDED", "DEAL_TERMS_VARY", "INPUT_FOUNDER_MISMATCH", "INPUT_DOUBT",
                      "FOREIGN_HEADCOUNT", "SIZE_BUCKET_CONFLICT", "NEWS_COLLISIONS", "WEB_FAILED", "STALE_ROLE",
                      "ACQUIRER_DOMAIN", "NO_FOUNDERS_FOUND", "ENRICH_FAILED"}
TOP_SCHOOLS = ["indian institute of technology", "iit ", "indian institute of management", "iim ", "wharton",
               "harvard", "stanford", "mit", "west point", "military academy", "iiser", "ncbs", "bits pilani",
               "insead", "symbiosis", "isb", "columbia", "oxford", "cambridge"]
REV_PER_HEAD = [("restaurant", 120_000), ("food service", 120_000), ("software", 400_000), ("it services", 300_000),
                ("retail", 250_000), ("apparel", 250_000), ("jewel", 250_000), ("manufactur", 300_000),
                ("food", 300_000), ("translation", 150_000)]


# ---------- small accessors ----------

def first_company(res) -> dict | None:
    if not res or not res.ok or not res.data:
        return None
    for row in res.data:
        for m in row.get("matches") or []:
            return m.get("company_data")
    return None


def clean_name(name: str) -> str:
    name = re.sub(r"\[.*?\]|®|™", "", name or "")
    name = re.sub(r"\b(pvt|private)\.?\s*(ltd|limited)\.?", "", name, flags=re.I)
    return re.sub(r"\s{2,}", " ", name).strip(" -")


def people_names(res) -> list[str]:
    if not res or not res.ok:
        return []
    return [(p.get("basic_profile") or {}).get("name") or "" for p in (res.data or {}).get("profiles") or []]


def _d(s) -> date | None:
    if not s:
        return None
    try:
        return date.fromisoformat(str(s)[:10])
    except ValueError:
        return None


def _ym(s) -> str:
    return str(s)[:7] if s else "now"


def _money(v) -> str:
    if v is None:
        return "n/a"
    v = float(v)
    if v >= 1e9:
        return f"${v / 1e9:.2f}B"
    if v >= 1e6:
        return f"${v / 1e6:.2f}M"
    if v >= 1e3:
        return f"${v / 1e3:.0f}K"
    return f"${v:.0f}"


def _parse_amount(s: str) -> tuple[str, float] | None:
    low = s.lower().replace(",", "")
    cur = "INR" if any(x in low for x in ("₹", "rs", "inr", "rupee")) else "USD"
    m = re.search(r"(\d+(?:\.\d+)?)", low)
    if not m:
        return None
    n = float(m.group(1))
    mult = {"lakh": 1e5, "lac": 1e5, "crore": 1e7, "cr": 1e7, "k": 1e3, "mn": 1e6, "million": 1e6, "m": 1e6,
            "billion": 1e9}
    for unit, k in mult.items():
        if re.search(rf"\d\s?{unit}s?\b", low):
            n *= k
            break
    return cur, n


def _fmt_local(cur: str, n: float) -> str:
    if cur == "INR":
        return f"₹{n / 1e7:.2f} Cr" if n >= 1e7 else f"₹{n / 1e5:.1f} L"
    return _money(n)


def _year_in(text: str) -> int | None:
    m = re.search(r"\b(1[34]\d\d)\s?AP\b", text or "")  # some results carry Solar Hijri dates ("Dey 7, 1400 AP")
    if m:
        return int(m.group(1)) + 621
    m = re.search(r"\b(19[89]\d|20[0-3]\d)\b", text or "")
    return int(m.group(1)) if m else None


def _series(points, key_date, key_val, max_points=36):
    pts = [(str(p.get(key_date))[:10], p.get(key_val)) for p in points or [] if p.get(key_val) is not None]
    pts.sort()
    if len(pts) > max_points:
        step = len(pts) / max_points
        pts = [pts[int(i * step)] for i in range(max_points)] + [pts[-1]]
    return [{"date": d, "value": v} for d, v in pts]


# ---------- memo ----------

def build_memo(entry, resolution, raw, ev) -> dict:
    flags, facts = [], {}

    def flag(sev, code, text, evid=None, question=None):
        flags.append({"severity": sev, "code": code, "text": text, "evidence": list(dict.fromkeys(e for e in (evid or []) if e)),
                      "question": question})

    memo = {"input": entry.to_dict(), "resolution": resolution, "flags": flags, "facts": facts,
            "founders": [], "input_claims": [], "deals": {"announced": [], "recorded": []}, "news": [],
            "news_dropped": 0, "metrics": {}, "status": {}, "score": {}, "questions": []}

    for p in entry.problems:
        flag("low", "INPUT_DOUBT", f"Input line: {p}.")
    if resolution["status"] == "NEEDS_REVIEW":
        flag("high", "AMBIGUOUS", "Several companies match equally well; pick one before research.",
             resolution.get("evidence"))
        memo["status"] = {"verdict": "NEEDS REVIEW", "reasons": ["identity is ambiguous"]}
        memo["score"] = {"verdict": "Needs review", "overall": None, "dims": {}}
        memo["activity"] = {"state": "unknown", "label": "Needs review", "detail": "Several companies share this name"}
        memo["research_hint"] = {"name": entry.name or entry.label(), "category": "", "context": ""}
        memo["evidence"] = ev.items
        memo["questions"] = ["Which of these is the company you mean: "
                             + "; ".join(f"{c['name']} ({c['domain'] or 'no domain'})" for c in resolution["candidates"][:3]) + "?"]
        return memo

    company = first_company(raw.get("enrich"))
    cid = resolution["chosen"]["id"] if resolution.get("chosen") else None
    name = clean_name((company or {}).get("basic_info", {}).get("name") or (resolution.get("chosen") or {}).get("name")
                      or entry.name or entry.label())
    memo["name"] = name
    e_enrich = ev.add(raw.get("enrich"), f"company_enrich #{cid}") if company else None
    if cid and not company:
        flag("high", "ENRICH_FAILED", f"company_enrich returned nothing for #{cid}: "
             f"{getattr(raw.get('enrich'), 'error', '')}")

    b = (company or {}).get("basic_info") or {}
    loc = (company or {}).get("locations") or {}
    tax = (company or {}).get("taxonomy") or {}
    funding = (company or {}).get("funding") or {}
    revenue = (company or {}).get("revenue") or {}
    hc = (company or {}).get("headcount") or {}
    if company:
        facts.update({
            "domain": {"value": b.get("primary_domain"), "ev": e_enrich, "field": "basic_info.primary_domain"},
            "linkedin": {"value": b.get("professional_network_url"), "ev": e_enrich},
            "founded": {"value": b.get("year_founded"), "ev": e_enrich, "field": "basic_info.year_founded"},
            "hq": {"value": loc.get("headquarters"), "ev": e_enrich, "field": "locations.headquarters"},
            "industry": {"value": (tax.get("primary_naics_detail") or {}).get("industry")
                         or tax.get("professional_network_industry"), "ev": e_enrich},
            "description": {"value": b.get("description"), "ev": e_enrich},
            "size_bucket": {"value": b.get("employee_count_range"), "ev": e_enrich},
            "company_type": {"value": b.get("company_type"), "ev": e_enrich},
            "logo": {"value": b.get("logo_permalink"), "ev": e_enrich},
            "specialities": {"value": tax.get("professional_network_specialities") or [], "ev": e_enrich},
        })

    # ----- founders -----
    founders = _founders(raw, cid, company, ev)
    memo["founders"] = founders
    surnames = {f["name"].split()[-1].lower() for f in founders if f.get("name")}
    anchors = (surnames | set(tokens(loc.get("city"))) | hint_tokens(entry.hint)
               | set(tokens(" ".join(tax.get("professional_network_specialities") or [])))
               | set(tokens(" ".join(b.get("industries") or []))) | {"shark", "tank", "startup", "founder"})
    if b.get("primary_domain"):
        anchors.add(norm(b["primary_domain"].split(".")[0]))
    anchors -= set(tokens(name, True)) | set(tokens(entry.name or "", True))  # "geek" can't vouch for "Geek Chic"
    anchors.discard(norm_name(name))

    # ----- web + news relevance -----
    web_items = []
    for res in raw.get("web") or []:
        if not res.ok:
            flag("low", "WEB_FAILED", f"web search failed: {res.error}")
            continue
        for r in (res.data or {}).get("results") or []:
            text = f"{r.get('title') or ''} {r.get('snippet') or ''}"
            item = {"title": r.get("title"), "url": r.get("url"), "snippet": r.get("snippet"), "res": res,
                    "relevant": mentions(text, name, anchors) or (entry.name and mentions(text, entry.name, anchors)),
                    "year": _year_in(r.get("snippet") or "")}
            web_items.append(item)
    news_cd = [n for n in (company or {}).get("news") or []]
    rel_news, dropped = [], 0
    for n in news_cd:
        title = n.get("article_title") or n.get("title") or ""
        if mentions(title, name, anchors):
            nd = str(n.get("article_publish_date") or n.get("date") or "")
            rel_news.append({"title": title, "url": n.get("article_url") or n.get("url"),
                             "date": "" if nd.startswith("1970") else nd, "origin": "Crustdata news",
                             "ev": e_enrich, "kind": _news_kind(title)})
        else:
            dropped += 1
    seen_urls = {n["url"] for n in rel_news}
    for w in web_items:
        if not w["relevant"]:
            dropped += 1
            continue
        if w["url"] in seen_urls:
            continue
        seen_urls.add(w["url"])
        w["ev"] = ev.add(w["res"], f"web: {w['title']}", url=w["url"], kind="WEB",
                         date=str(w["year"] or ""))
        rel_news.append({"title": w["title"], "url": w["url"], "date": str(w["year"] or ""), "snippet": w["snippet"],
                         "origin": "web search", "ev": w["ev"], "kind": _news_kind(f"{w['title']} {w['snippet']}")})
    memo["news"] = sorted(rel_news, key=lambda n: str(n.get("date") or ""), reverse=True)
    memo["news_dropped"] = dropped
    if dropped:
        flag("low", "NEWS_COLLISIONS", f"Dropped {dropped} news/web items that matched the name but not the company "
                                       f"(name collisions or unrelated).")

    rel_web = [w for w in web_items if w["relevant"]]

    if resolution["status"] == "OFFLINE":
        flag("high", "CRUSTDATA_OFFLINE", "Live Crustdata access isn't configured and this company isn't in the recorded "
             "data, so its Crustdata profile can't be loaded. This is not evidence that the company doesn't exist.")
        memo["status"] = {"verdict": "NO DATA", "crustdata_status": None, "signals": []}
        memo["score"] = {"verdict": "Insufficient data", "overall": None, "dims": {}, "reason": "Crustdata unavailable"}
        memo["activity"] = {"state": "unknown", "label": "Crustdata data unavailable",
                            "detail": "Add CRUSTDATA_API_KEY to investing/.env for live lookups"}
        memo["research_hint"] = _research_hint(name, entry, {}, {})
        memo["evidence"], memo["questions"] = ev.items, []
        return memo
    if not company:
        return _web_only(memo, entry, rel_web, flags, flag, ev)

    # ----- status / reality check -----
    signals = []
    cd_status = b.get("status")
    acquired_by = funding.get("acquired_by") or []
    closure, alive = None, []
    for w in rel_web:
        text = f"{w['title']} {w['snippet']}"
        hit, alive_hit = any_pattern(text, CLOSURE_PATTERNS), any_pattern(text, ALIVE_PATTERNS)
        if hit and alive_hit:
            continue  # e.g. "three locations shut down" inside a comeback story
        if alive_hit and (w.get("year") or 0) >= TODAY.year - 2:
            alive.append({"text": f"web: “{alive_hit.strip()}” — {w['title']}", "ev": w.get("ev")})
        if hit:
            closure = closure or {**w, "hit": hit}
            signals.append({"text": f"web: “{hit}” — {w['title']}", "ev": w.get("ev")})
    for n in rel_news:
        hit = any_pattern(n["title"], CLOSURE_PATTERNS)
        if hit and n["origin"] == "Crustdata news":
            closure = closure or {"title": n["title"], "year": _year_in(str(n.get("date"))), "ev": n["ev"], "hit": hit}
            signals.append({"text": f"news: “{hit}” — {n['title']}", "ev": n["ev"]})
    if acquired_by:
        a = acquired_by[0]
        signals.append({"text": f"Crustdata: acquired by {a.get('name')} on {a.get('date')}"
                                + (f" for {_money(a.get('amount_usd'))}" if a.get("amount_usd") else ""), "ev": e_enrich})
    elif revenue.get("acquisition_status") == "acquired":
        signals.append({"text": "Crustdata: acquisition_status = acquired (acquirer not recorded)", "ev": e_enrich})

    ts = hc.get("timeseries") or []
    hc_series = _series(ts, "date", "employee_count")
    hc_now = hc.get("total")
    wt = next(iter(((company.get("web_traffic") or {}).get("domain_traffic") or {}).values()), {}) or {}
    web_series = _series(wt.get("monthly_visitors_timeseries"), "date", "monthly_visitors")
    web_peak = max([p["value"] for p in web_series] or [0])
    web_last = web_series[-1]["value"] if web_series else None
    founders_present = [f for f in founders if f["is_founder"] and f["current"]]
    founders_any = [f for f in founders if f["is_founder"]]

    if closure and alive:
        flag("med", "STATUS_DISPUTED", f"Sources disagree on whether the company still trades: {signals[0]['text']} vs "
             f"{alive[0]['text']}. Falling back to Crustdata activity signals.", [signals[0].get("ev"), alive[0].get("ev")],
             question="Is the company still trading? Please share recent sales or a bank statement.")
        signals.extend(alive)
        closure = None
    if closure:
        verdict = "DEFUNCT"
    elif acquired_by or revenue.get("acquisition_status") == "acquired":
        verdict = "ACQUIRED"
    elif (hc_now is not None and hc_now <= 2) or (founders_any and not founders_present and (hc_now or 0) <= 5):
        verdict = "DORMANT"
        signals.append({"text": f"headcount {hc_now}; founders still in role: {len(founders_present)}/{len(founders_any)}",
                        "ev": e_enrich})
    else:
        verdict = "OPERATING"
    memo["status"] = {"verdict": verdict, "crustdata_status": cd_status, "signals": signals}
    if cd_status and cd_status.lower() == "active" and verdict in ("DEFUNCT", "ACQUIRED", "DORMANT"):
        flag("high" if verdict == "DEFUNCT" else "med", "STATUS_CONFLICT",
             f"Crustdata says status “{cd_status}”, but the evidence says {verdict}.",
             [e_enrich] + [s.get("ev") for s in signals],
             question="Is the company still operating independently today? Who owns it?")

    if closure and closure.get("year"):
        y = closure["year"]
        after = [p for p in hc_series if int(p["date"][:4]) > y + 1 and (p["value"] or 0) > 3]
        if after:
            flag("high", "STALE_HEADCOUNT", f"Crustdata shows {after[-1]['value']} employees in {after[-1]['date'][:7]}, "
                 f"years after the reported closure ({y}). Headcount and revenue are stale profiles, not a live team.",
                 [e_enrich, closure.get("ev")])
    if web_series and web_last == 0 and web_peak >= 1000:
        flag("med", "TRAFFIC_COLLAPSE", f"Website traffic fell from a peak of {web_peak:,} visits/month to 0.",
             [e_enrich])
    other_domains = [d for d in b.get("all_domains") or [] if d and d != b.get("primary_domain")]
    if other_domains and acquired_by:
        acq = norm_name(acquired_by[0].get("name"))
        hits = [d for d in other_domains if acq and norm(d.split(".")[0]).startswith(acq[:6])]
        if hits:
            flag("med", "ACQUIRER_DOMAIN", f"The record also carries {', '.join(hits)} (the acquirer's domain). "
                 f"Traffic/SEO figures may belong to the acquirer.", [e_enrich])
    if hc_now and b.get("employee_count_range"):
        lo = re.findall(r"\d+", b["employee_count_range"])
        if lo and int(lo[0]) > 3 * hc_now:
            flag("low", "SIZE_BUCKET_CONFLICT", f"Size bucket “{b['employee_count_range']}” vs {hc_now} observed employees.",
                 [e_enrich])

    # ----- metrics -----
    growth = hc.get("growth_percent") or {}
    memo["metrics"] = {
        "headcount": {"now": hc_now, "series": hc_series, "yoy": growth.get("yoy"), "two_years": growth.get("two_years"),
                      "by_role": hc.get("by_role_absolute") or {}, "ev": e_enrich},
        "web": {"last": web_last, "peak": web_peak, "series": web_series, "mom": wt.get("mom_pct"),
                "sources": {k: wt.get(f"source_{k}_pct") for k in ("search", "direct", "social")}, "ev": e_enrich},
        "followers": {"count": (company.get("followers") or {}).get("count"),
                      "yoy": (company.get("followers") or {}).get("yoy_percent"), "ev": e_enrich},
        "reviews": _reviews(company.get("employee_reviews")),
        "jobs": _jobs(raw.get("jobs"), ev),
    }
    by_region = hc.get("by_region_absolute") or {}
    hq_country = {"ind": "india", "usa": "united states", "gbr": "united kingdom"}.get(
        (loc.get("country") or "").lower(), (loc.get("country") or "").lower())
    # Country-level keys are the ones other keys end with (", Brazil"); everything else is a city/state.
    countries = {k for k in by_region if "," not in k and any(o.endswith(", " + k) for o in by_region)}
    foreign = {k: by_region[k] for k in countries if k.lower() != hq_country and (by_region[k] or 0) >= 2}
    if foreign and hq_country:
        flag("low", "FOREIGN_HEADCOUNT", f"Headcount includes people in {', '.join(f'{k} ({v})' for k, v in foreign.items())}"
             f" outside the HQ country: real overseas staff or profiles mislinked by name collision — check.", [e_enrich])

    # Crustdata's region keys nest (India > Maharashtra, India > Mumbai); keep one non-overlapping level.
    states = {k: v for k, v in by_region.items() if k.count(",") == 1 and k.split(", ")[1] in countries}
    memo["metrics"]["headcount"]["by_region"] = states or {k: by_region[k] for k in countries} or by_region
    seo = company.get("seo") or {}
    memo["metrics"]["seo"] = {"organic_clicks": seo.get("monthly_organic_clicks"), "ads_budget": seo.get("monthly_google_ads_budget"),
                              "organic_value": seo.get("monthly_organic_value"), "ev": e_enrich}

    # ----- revenue plausibility -----
    est = revenue.get("estimated") or {}
    rev = {"lower": est.get("lower_bound_usd"), "upper": est.get("upper_bound_usd"), "verdict": "UNVERIFIED",
           "reason": "model estimate from Crustdata", "ev": e_enrich,
           "series": [{"date": str(p.get("date"))[:10], "lower": p.get("revenue_lower_bound_usd"),
                       "upper": p.get("revenue_upper_bound_usd")} for p in est.get("timeseries") or []]}
    if est.get("lower_bound_usd") is not None:
        industry_text = " ".join([(tax.get("primary_naics_detail") or {}).get("industry") or "",
                                  tax.get("professional_network_industry") or "", " ".join(b.get("industries") or [])]).lower()
        band = next((v for k, v in REV_PER_HEAD if k in industry_text), 500_000)
        per_head = est["lower_bound_usd"] / max(hc_now or 1, 1)
        if verdict in ("DEFUNCT", "ACQUIRED"):
            rev.update(verdict="STALE", reason=f"company is {verdict.lower()}; an ongoing revenue estimate does not apply")
        elif per_head >= 4 * band:
            rev.update(verdict="REJECTED", reason=f"implies ≥{_money(per_head)} revenue per employee "
                                                  f"(~{_money(band)} is typical for this industry)")
            flag("high", "REVENUE_IMPLAUSIBLE", f"Revenue estimate {_money(est['lower_bound_usd'])}–"
                 f"{_money(est.get('upper_bound_usd'))} is implausible for {hc_now} employees; treated as unknown.",
                 [e_enrich], question="What were revenues for the last two financial years?")
        else:
            rev.update(verdict="PLAUSIBLE", reason=f"{_money(per_head)} per employee is within range for the industry")
    memo["metrics"]["revenue"] = rev

    # ----- funding, deals, exit -----
    rounds = []
    for m in funding.get("milestones") or []:
        rounds.append({"date": m.get("date"), "type": m.get("round_type"), "amount": m.get("amount_usd"),
                       "lead": m.get("lead_investors"), "investors": m.get("investors"), "ev": e_enrich})
    rounds.sort(key=lambda r: str(r["date"] or ""))
    memo["deals"]["recorded"] = rounds
    memo["funding"] = {"total": funding.get("total_investment_usd"), "rounds": funding.get("num_funding_rounds"),
                       "last_date": funding.get("last_fundraise_date"), "last_type": funding.get("last_round_type"),
                       "investors": funding.get("investors") or [], "acquired_by": acquired_by, "ev": e_enrich}
    _deals(memo, rel_web, rounds, funding, flag)
    if acquired_by and acquired_by[0].get("amount_usd") and funding.get("total_investment_usd"):
        amt, raised = float(acquired_by[0]["amount_usd"]), float(funding["total_investment_usd"])
        mult = amt / raised
        memo["exit"] = {"acquirer": acquired_by[0].get("name"), "date": acquired_by[0].get("date"), "amount": amt,
                        "raised": raised, "multiple": round(mult, 2), "ev": e_enrich}
        if mult < 1:
            flag("med", "DOWN_EXIT", f"Exit at {_money(amt)} is {mult:.2f}x the {_money(raised)} raised: later investors "
                 f"likely lost money.", [e_enrich])
    distress = [n for n in rel_news if any_pattern(n["title"] + " " + (n.get("snippet") or ""), DISTRESS_PATTERNS)]
    if distress:
        flag("med", "DISTRESS_PRESS", f"Press uses distress language: “{distress[0]['title']}”.",
             [n["ev"] for n in distress[:3]])

    # ----- founder flags -----
    acq_name = norm_name(acquired_by[0].get("name")) if acquired_by else ""
    acq_date = _d(acquired_by[0].get("date")) if acquired_by else None
    own_tokens = {t for t in tokens(name) if len(t) >= 4} | {t for t in tokens(" ".join(
        tax.get("professional_network_specialities") or [])) if len(t) >= 4}
    for f in founders:
        _founder_flags(f, b, acq_name, acq_date, own_tokens, flag)
    if founders_any and not founders_present and verdict == "OPERATING":
        flag("high", "NO_FOUNDER_LEFT", "None of the founders on record is still in a role at the company.",
             [f["ev"] for f in founders_any])
    if not founders_any:
        flag("med", "NO_FOUNDERS_FOUND", "No founder could be verified from Crustdata job records.", [],
             question="Who are the founders, and what is the current cap table?")

    _input_claims(memo, entry, founders, flag)

    memo["score"] = _score(memo, verdict, founders, flags)
    memo["activity"] = _activity(verdict, acquired_by, closure, hc_now)
    memo["research_hint"] = _research_hint(name, entry, tax, b)
    memo["questions"] = [f["question"] for f in flags if f.get("question")]
    memo["evidence"] = ev.items
    memo["flags"] = sorted(flags, key=lambda f: {"high": 0, "med": 1, "low": 2}[f["severity"]])
    return memo


def _activity(verdict, acquired_by, closure, hc_now) -> dict:
    if verdict == "OPERATING":
        return {"state": "active", "label": "Active", "detail": f"{hc_now or 0} people on record; no closure or acquisition found"}
    if verdict == "ACQUIRED":
        who = (acquired_by[0].get("name") if acquired_by else None)
        when = (acquired_by[0].get("date") or "")[:4] if acquired_by else ""
        return {"state": "acquired", "label": f"Acquired by {who}" if who else "Acquired",
                "detail": f"Acquisition recorded{' in ' + when if when else ''}; no longer independent"}
    if verdict.startswith("DEFUNCT"):
        y = (closure or {}).get("year")
        return {"state": "closed", "label": "Closed", "detail": f"Closure reported{f' in {y}' if y else ''} by dated sources"}
    if verdict == "DORMANT":
        return {"state": "dormant", "label": "Low activity", "detail": "Very small team or founders gone; may not be trading"}
    return {"state": "unknown", "label": "Not verified", "detail": "Company could not be matched in the Crustdata graph"}


def _research_hint(name, entry, tax, b) -> dict:
    from .pipeline import descriptor
    category = descriptor(entry.hint, 4) or ((tax or {}).get("professional_network_specialities") or [None])[0] \
        or (tax or {}).get("professional_network_industry") or ""
    return {"name": name, "category": category, "context": (b or {}).get("primary_domain") or ""}


def _web_only(memo, entry, rel_web, flags, flag, ev):
    signals, verdict = [], "UNRESOLVED"
    for w in rel_web:
        w["ev"] = w.get("ev") or ev.add(w["res"], f"web: {w['title']}", url=w["url"], kind="WEB")
        hit = any_pattern(f"{w['title']} {w['snippet']}", CLOSURE_PATTERNS)
        if hit:
            signals.append({"text": f"web: “{hit}” — {w['title']}", "ev": w["ev"]})
    if signals:
        verdict = "DEFUNCT (web only)"
    memo["status"] = {"verdict": verdict, "crustdata_status": None, "signals": signals}
    flag("high", "NOT_IN_GRAPH", "No Crustdata company record matches this input. Everything shown is web evidence "
         "only and should be treated as unverified.", memo["resolution"].get("evidence"))
    if not rel_web:
        flag("high", "NO_EVIDENCE", "No web evidence either: this company may not exist as described.",
             question="Can you share the company's legal name, website or registration number?")
    memo["deals"]["announced"] = []
    _deals(memo, rel_web, [], {}, flag)
    _input_claims(memo, entry, [], flag)
    memo["score"] = {"verdict": "Insufficient data", "overall": None, "dims": {},
                     "reason": "company not found in the Crustdata graph"}
    memo["activity"] = ({"state": "closed", "label": "Closed (web reports)", "detail": signals[0]["text"]} if signals
                        else {"state": "unknown", "label": "Not verified", "detail": "Not in the Crustdata graph"})
    memo["research_hint"] = _research_hint(memo.get("name") or entry.label(), entry, {}, {})
    memo["questions"] = [f["question"] for f in flags if f.get("question")]
    memo["evidence"] = ev.items
    memo["flags"] = sorted(flags, key=lambda f: {"high": 0, "med": 1, "low": 2}[f["severity"]])
    return memo


def _founders(raw, cid, company, ev) -> list[dict]:
    out, seen = [], set()
    sources = [(raw.get("people"), "person_search (founder query)")] + [
        (r, "person_search (input name check)") for r in raw.get("extra_people") or []]
    for res, label in sources:
        if not res or not res.ok:
            continue
        rejected = 0
        for p in (res.data or {}).get("profiles") or []:
            pid = p.get("crustdata_person_id")
            emp = (p.get("experience") or {}).get("employment_details") or {}
            roles = [dict(r, current=True) for r in emp.get("current") or []] + \
                    [dict(r, current=False) for r in emp.get("past") or []]
            here = [r for r in roles if r.get("crustdata_company_id") == cid]
            if not here:
                rejected += 1
                continue
            titles = " ".join(r.get("title") or "" for r in here)
            is_founder = bool(FOUNDER_RE.search(titles))
            is_exec = bool(EXEC_RE.search(titles)) and "franchise" not in titles.lower()
            if not (is_founder or is_exec) or pid in seen:
                continue
            seen.add(pid)
            bp = p.get("basic_profile") or {}
            url = ((p.get("social_handles") or {}).get("professional_network_identifier") or {}).get("profile_url")
            eid = ev.add(res, f"{label}: {bp.get('name')} (person #{pid})", url=url or "")
            others = [r for r in roles if r.get("crustdata_company_id") != cid]
            out.append({
                "pid": pid, "name": bp.get("name"), "headline": bp.get("headline"), "location": (bp.get("location") or {}).get("raw"),
                "url": url, "photo": bp.get("profile_picture_permalink"), "ev": eid, "source": label,
                "is_founder": is_founder, "current": any(r["current"] for r in here),
                "roles_here": [{"title": r.get("title"), "start": _ym(r.get("start_date")), "end": _ym(r.get("end_date")),
                                "current": r["current"], "end_raw": r.get("end_date"), "start_raw": r.get("start_date")}
                               for r in here],
                "other_roles": [{"title": r.get("title"), "company": r.get("name"), "company_id": r.get("crustdata_company_id"),
                                 "start": _ym(r.get("start_date")), "end": _ym(r.get("end_date")) if not r["current"] else "now",
                                 "current": r["current"], "start_raw": r.get("start_date")}
                                for r in others if r.get("title") or r.get("name")][:15],
                "education": [" · ".join(x for x in [s.get("school"), s.get("degree"), s.get("field_of_study"),
                                                       str(s.get("end_year") or "")] if x)
                              for s in (p.get("education") or {}).get("schools") or []],
                "summary": (bp.get("summary") or "")[:600],
                "flags": [],
            })
    for group in ("founders", "cxos"):
        for p in ((company or {}).get("people") or {}).get(group) or []:
            pid = p.get("crustdata_person_id")
            if pid in seen:
                continue
            bp = p.get("basic_profile") or {}
            title = bp.get("current_title") or ""
            if not (FOUNDER_RE.search(title) or EXEC_RE.search(title)):
                continue
            seen.add(pid)
            out.append({"pid": pid, "name": bp.get("name"), "headline": bp.get("headline"), "location": None,
                        "url": ((p.get("social_handles") or {}).get("professional_network_identifier") or {}).get("profile_url"),
                        "photo": bp.get("profile_picture_permalink"), "ev": None, "source": f"company_enrich people.{group}",
                        "is_founder": bool(FOUNDER_RE.search(title)), "current": True,
                        "roles_here": [{"title": title, "start": "?", "end": "now", "current": True}],
                        "other_roles": [], "education": [], "flags": ["career history not loaded"]})
    out.sort(key=lambda f: (not f["is_founder"], not f["current"], f["name"] or ""))
    return out


def _founder_flags(f, b, acq_name, acq_date, own_tokens, flag):
    if not f.get("roles_here") or f["source"].startswith("company_enrich"):
        return
    ends = [_d(r.get("end_raw")) for r in f["roles_here"] if not r["current"]]
    starts = [_d(r.get("start_raw")) for r in f["roles_here"] if r.get("start_raw")]
    who = f"{f['name']} ({f['roles_here'][0]['title']})"
    if not f["current"] and ends and ends[0]:
        left = max(e for e in ends if e)
        months = (TODAY.year - left.year) * 12 + TODAY.month - left.month
        f["flags"].append(f"left {left:%b %Y}")
        if f["is_founder"]:
            recent = months <= 12
            flag("high" if recent else "med", "FOUNDER_LEFT", f"{who} left in {left:%b %Y}"
                 + (" — within the last 12 months." if recent else "."), [f["ev"]],
                 question=f"Why did {f['name']} leave, and do they still hold equity?" if recent or f["is_founder"] else None)
        after = [r for r in f["other_roles"] if _d(r.get("start_raw")) and _d(r["start_raw"]) >= left.replace(day=1)]
        for r in after:
            cname = r.get("company") or ""
            if acq_name and norm_name(cname).startswith(acq_name[:6]):
                f["flags"].append("now at the acquirer")
                flag("low", "ACQUI_HIRE", f"{f['name']} moved to the acquirer ({cname}) as “{r['title']}”.", [f["ev"]])
                break
            shared = {t for t in tokens(cname) if len(t) >= 4} & own_tokens
            if shared and norm_name(cname) != norm_name(b.get("name")):
                f["flags"].append(f"possible similar venture: {cname}")
                flag("med", "SIMILAR_VENTURE", f"After leaving, {f['name']} worked at “{cname}” ({r['title']}), which "
                     f"shares “{', '.join(shared)}” with this company: possible competing venture.", [f["ev"]],
                     question=f"Is {cname} related to or competing with this company?")
                break
    if f["current"] and acq_date and f["is_founder"] and (TODAY - acq_date).days > 180:
        f["flags"].append("still listed as current after the acquisition")
        flag("low", "STALE_ROLE", f"{who} still lists the role as current, {acq_date.year} acquisition notwithstanding.",
             [f["ev"]])
    founded = b.get("year_founded")
    if f["is_founder"] and founded and starts and starts[0] and starts[0].year >= int(founded) + 2:
        f["flags"].append(f"joined {starts[0].year}, {starts[0].year - int(founded)} yrs after founding")
        flag("low", "LATE_COFOUNDER", f"{who} joined in {starts[0].year}, {starts[0].year - int(founded)} years after "
             f"founding: a later co-founder, not part of the original team.", [f["ev"]])
    edu = " ".join(f.get("education") or []).lower()
    if any(s in edu for s in TOP_SCHOOLS):
        f["flags"].append("top-tier school")
    if any(FOUNDER_RE.search(r.get("title") or "") for r in f["other_roles"]
           if r.get("start_raw") and starts and starts[0] and _d(r["start_raw"]) and _d(r["start_raw"]) < starts[0]):
        f["flags"].append("prior founder")


def _input_claims(memo, entry, founders, flag):
    for hint in entry.founder_hints:
        first = norm(hint.split()[0])
        last = norm(hint.split()[-1]) if len(hint.split()) > 1 else ""
        match = next((f for f in founders if f.get("name") and norm(f["name"].split()[0]) == first
                      and (not last or last in norm(f["name"]))), None)
        partial = None if match else next((f for f in founders if f.get("name") and first[:3] == norm(f["name"])[:3]), None)
        if match:
            memo["input_claims"].append({"claim": hint, "verdict": "CONFIRMED", "detail": f"{match['name']} — "
                                         f"{match['roles_here'][0]['title']}", "ev": match.get("ev")})
        elif partial:
            memo["input_claims"].append({"claim": hint, "verdict": "PARTIAL", "detail": f"closest record: {partial['name']}",
                                         "ev": partial.get("ev")})
        else:
            on_record = ", ".join(f["name"] for f in founders if f["is_founder"]) or "none verified"
            memo["input_claims"].append({"claim": hint, "verdict": "NOT FOUND", "detail": f"founders on record: {on_record}",
                                         "ev": None})
    bad = [c for c in memo["input_claims"] if c["verdict"] == "NOT FOUND"]
    if bad:
        flag("med", "INPUT_FOUNDER_MISMATCH", f"Input names {', '.join(c['claim'] for c in bad)} as founder(s); no such "
             f"person has a role at this company in Crustdata.", [c["ev"] for c in memo["input_claims"] if c["ev"]],
             question="Can you confirm the full founding team?")


def _deals(memo, rel_web, rounds, funding, flag):
    announced = {}
    failed = []
    for w in rel_web:
        text = f"{w['title']} {w['snippet']}"
        for amt, pct in AMOUNT_RE.findall(text):
            parsed = _parse_amount(amt)
            if not parsed:
                continue
            cur, n = parsed
            key = (cur, round(n), float(pct))
            sharks = [s for s in SHARKS if s.split()[-1].lower() in text.lower()]
            if key not in announced:
                announced[key] = {"amount": _fmt_local(cur, n), "equity": f"{pct}%",
                                  "implied_valuation": _fmt_local(cur, n / (float(pct) / 100)) if float(pct) else None,
                                  "tv": "shark tank" in text.lower(), "investors": sharks, "ev": w.get("ev"),
                                  "source": w["title"]}
        hit = any_pattern(text, DEAL_FAILED_PATTERNS)
        if hit and ("deal" in text.lower() or "shark" in text.lower()):
            failed.append({"text": f"“{hit}” — {w['title']}", "ev": w.get("ev")})
    memo["deals"]["announced"] = list(announced.values())
    memo["deals"]["failed_signals"] = failed
    if not announced:
        return
    recorded_investors = " ".join(" ".join(r.get("investors") or [] if isinstance(r.get("investors"), list)
                                           else [r.get("investors") or ""]) for r in rounds).lower()
    recorded_investors += " " + " ".join(funding.get("investors") or []).lower()
    tv = [a for a in announced.values() if a["tv"]]
    if tv:
        named = {s for a in tv for s in a["investors"]}
        in_record = [s for s in named if s.split()[-1].lower() in recorded_investors]
        if named and not in_record:
            flag("med", "DEAL_NOT_RECORDED", f"Announced TV deal ({tv[0]['amount']} for {tv[0]['equity']} with "
                 f"{', '.join(sorted(named))}) does not appear in Crustdata's recorded funding.",
                 [a["ev"] for a in tv], question="Did the on-air deal close on the announced terms? Please share the cap table.")
        if len({(a["amount"], a["equity"]) for a in tv}) > 1:
            flag("low", "DEAL_TERMS_VARY", "Sources report different deal terms: "
                 + "; ".join(f"{a['amount']} for {a['equity']}" for a in tv[:4]) + ".", [a["ev"] for a in tv[:4]])
    if failed:
        flag("med", "DEAL_MAY_NOT_HAVE_CLOSED", f"Coverage suggests an announced deal did not close: {failed[0]['text']}",
             [f["ev"] for f in failed[:2]])


def _news_kind(text: str) -> str:
    t = (text or "").lower()
    if any_pattern(t, CLOSURE_PATTERNS):
        return "closure"
    if any_pattern(t, ACQUISITION_PATTERNS):
        return "acquisition"
    if re.search(r"rais|fund|series [a-d]|seed|crore|million|invest", t):
        return "funding"
    if re.search(r"lawsuit|fraud|court|sue|legal", t):
        return "legal"
    if re.search(r"appoint|joins|hire|names .* (head|ceo)", t):
        return "people"
    return "press"


def _reviews(r):
    if not r or not (r.get("overall_rating") or {}).get("rating"):
        return None
    o = r["overall_rating"]
    sub = {k: r.get(f"{k}_rating") for k in ("work_life_balance", "culture_and_values", "senior_management",
                                              "compensation_and_benefits", "career_opportunities", "diversity_and_inclusion")}
    return {"rating": o.get("rating"), "count": o.get("total_count"), "recommend": r.get("recommend_to_friend_rating"),
            "ceo": (r.get("company_ceo") or {}).get("ceo_rating"), "outlook": r.get("business_outlook_rating"),
            "sub": {k: v for k, v in sub.items() if v is not None}}


def _jobs(res, ev):
    if not res:
        return None
    if not res.ok:
        return {"error": res.error}
    data = res.data or {}
    listings = data.get("job_listings") or []
    eid = ev.add(res, f"job_search: {data.get('total_count', 0)} open postings")
    return {"total": data.get("total_count", 0), "titles": [(j.get("job_details") or {}).get("title") for j in listings],
            "ev": eid}


def _score(memo, verdict, founders, flags) -> dict:
    if verdict in ("DEFUNCT", "ACQUIRED"):
        return {"verdict": "Not investable", "overall": None, "dims": {},
                "reason": f"company is {verdict.lower()}"}
    m = memo["metrics"]
    fnd = [f for f in founders if f["is_founder"]]
    team = 0 if not fnd else 2 + (len(fnd) >= 2)
    team += 1 if any("top-tier school" in f["flags"] or "prior founder" in f["flags"] for f in fnd) else 0
    team += 1 if fnd and all(f["current"] for f in fnd) else 0
    team -= 2 if any(x["code"] == "FOUNDER_LEFT" and x["severity"] == "high" for x in flags) else 0
    g = m["headcount"].get("two_years")
    traction = 1 if g is None else 5 if g > 50 else 4 if g > 20 else 3 if g > 0 else 2 if g > -10 else 1
    if (m["headcount"].get("now") or 0) < 10:
        traction = min(traction, 2)  # % growth on a 2-to-4-person team is noise
    web = m["web"]
    if web.get("peak") and web.get("last") is not None and web["last"] < 0.25 * web["peak"]:
        traction -= 1
    if (m["followers"].get("yoy") or 0) > 40:
        traction += 1
    total = (memo.get("funding") or {}).get("total") or 0
    fund = 5 if total > 10e6 else 4 if total > 5e6 else 3 if total > 1e6 else 2 if total > 0 else 1
    last = _d((memo.get("funding") or {}).get("last_date"))
    if last and (TODAY - last).days > 3 * 365:
        fund -= 1
    # Each flag counts once: business risks lower Risk, data-quality problems lower Data confidence.
    business = [f for f in flags if f["code"] not in DATA_QUALITY_CODES]
    risk = 5 - 2 * sum(f["severity"] == "high" for f in business) - sum(f["severity"] == "med" for f in business)
    conf = 5 - sum(1 for f in flags if f["code"] in DATA_QUALITY_CODES and f["severity"] != "low") \
             - sum(1 for f in flags if f["code"] in DATA_QUALITY_CODES and f["severity"] == "low") // 2
    dims = {k: max(0, min(5, v)) for k, v in
            {"team": team, "traction": traction, "funding": fund, "risk": risk, "data_confidence": conf}.items()}
    overall = round(20 * (0.3 * dims["team"] + 0.3 * dims["traction"] + 0.2 * dims["funding"] + 0.2 * dims["risk"]))
    if verdict == "DORMANT":
        overall = min(overall, 30)
    label = "Strong" if overall >= 70 else "Promising" if overall >= 55 else "Watch" if overall >= 40 else "Weak"
    return {"verdict": f"{label} ({overall}/100)", "overall": overall, "dims": dims, "label": label,
            "reason": "weighted: team 30%, traction 30%, funding 20%, risk 20%; data confidence shown separately",
            "experimental": True}
