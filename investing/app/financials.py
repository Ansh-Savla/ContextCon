"""Reported P&L figures pulled from press coverage of company filings (Entrackr, Inc42, ...).

No model is involved: figures are extracted sentence by sentence and kept only when the sentence is about this
company (it names it, or directly follows a sentence that does). Every value keeps its quote and source URL.
Line items that no source reports stay empty; derived rows are computed only from disclosed numbers.
"""
import asyncio
import re
from collections import Counter, defaultdict

import httpx

from .research import _search, tavily_key, ResearchError
from .textutil import norm, norm_name

FILINGS_DOMAINS = ["entrackr.com", "inc42.com", "thekredible.com", "yourstory.com", "economictimes.indiatimes.com",
                   "vccircle.com", "moneycontrol.com", "business-standard.com", "startuppedia.in", "indianretailer.com",
                   "the-ken.com", "livemint.com", "financialexpress.com", "techcrunch.com", "businessinsider.com"]

ITEMS = [  # (key, patterns) — order matters: more specific first
    ("material_cost", r"cost of materials?(?: consumed)?|material costs?|raw materials?|procurement costs?|purchase of stock"),
    ("inward_logistics", r"inward (?:logistics|freight)|freight inward"),
    ("manufacturing", r"manufacturing (?:expenses?|costs?)|production costs?|contract manufacturing"),
    ("cogs", r"cost of goods sold|\bcogs\b|cost of sales|cost of revenue"),
    ("employee", r"employee (?:benefits? )?(?:expenses?|costs?)|employee benefit|salar(?:y|ies)|staff costs?"),
    ("marketing", r"advertising|marketing|promotional|ad spends?|brand promotion"),
    ("outward_logistics", r"(?:outward )?(?:logistics|freight|shipping|delivery|warehousing) (?:costs?|expenses?)"),
    ("service", r"service (?:expenses?|costs?)|legal and professional|professional fees"),
    ("rnd", r"research and development|\br&d\b"),
    ("office", r"office (?:expenses?|costs?)|\brent\b"),
    ("ebitda", r"\bebitda\b|operating (?:loss|profit)"),
    ("total_expenses", r"total (?:expenses?|expenditure|costs?)|overall (?:expenses?|expenditure)"),
    ("net_profit", r"net (?:loss|profit)|\blosses?\b|\bprofit\b"),
    ("revenue", r"operating revenue|revenue from operations|\brevenues?\b|\bturnover\b|\bsales\b|\bgmv\b"),
]
ITEM_RE = [(k, re.compile(p, re.I)) for k, p in ITEMS]
AMOUNT = re.compile(r"(?:₹|rs\.?|inr|\$|usd)\s?(\d[\d,]*(?:\.\d+)?)\s?(crores?|cr|lakhs?|lac|million|mn|billion|bn|k)?\b", re.I)
FY = re.compile(r"\b(?:FY\s?'?(\d{2,4})|(?:fiscal|financial)(?: year)? 20\d\d\s?[-–]\s?(?:20)?(\d\d)"
                r"|fiscal(?: year)? (20\d\d)|financial year (20\d\d))", re.I)
PREV = re.compile(r"previous (?:fiscal )?year|preceding year|a year (?:earlier|ago)|last fiscal", re.I)
LOSS_WORDS = re.compile(r"\bloss", re.I)

LINES = [  # key, label, level, kind
    ("revenue", "Revenue", 0, "reported"),
    ("cogs", "Less: COGS", 0, "reported"),
    ("material_cost", "Material cost", 1, "reported"),
    ("inward_logistics", "Inward logistics", 1, "reported"),
    ("manufacturing", "Manufacturing expenses", 1, "reported"),
    ("gross_margin", "Gross margin", 0, "derived"),
    ("gross_margin_pct", "as % of revenue", 1, "derived"),
    ("sga", "Less: SG&A expenses", 0, "reported"),
    ("employee", "Employee expenses", 1, "reported"),
    ("marketing", "Sales & marketing expenses", 1, "reported"),
    ("outward_logistics", "Outward logistics", 1, "reported"),
    ("service", "Service expenses", 1, "reported"),
    ("rnd", "R&D", 1, "reported"),
    ("office", "Office expenses", 1, "reported"),
    ("ebitda", "EBITDA", 0, "reported"),
    ("ebitda_pct", "as % of revenue", 1, "derived"),
    ("total_expenses", "Total expenses (other reported figures)", 0, "reported"),
    ("net_profit", "Net profit / (loss) (other reported figures)", 0, "reported"),
]


def _fy(tok: tuple) -> str | None:
    y = next((t for t in tok if t), None)
    if not y:
        return None
    y = int(y[-2:])
    return f"FY{y:02d}"


def _to_number(num: str, unit: str | None) -> tuple[float, str]:
    n = float(num.replace(",", ""))
    u = (unit or "").lower()
    if u.startswith("cr"):
        return n * 1e7, "INR"
    if u.startswith(("lakh", "lac")):
        return n * 1e5, "INR"
    mult = {"million": 1e6, "mn": 1e6, "billion": 1e9, "bn": 1e9, "k": 1e3}.get(u, 1)
    return n * mult, None


def _sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text or "")
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z₹])|\s*#{2,}\s*|\s\|\s", text)  # sentences, markdown headings, table cells
    return [s.strip() for s in parts if 20 < len(s.strip()) < 600]


def _about(sentence: str, name: str) -> bool:
    n = norm_name(name)
    return bool(n) and n in norm(sentence)


def extract(name: str, docs: list[dict]) -> dict:
    """docs: [{title, url, text}] → {(item, FY): [(amount, currency, quote, source)]}"""
    found = defaultdict(list)
    for d in docs:
        prev_about = False
        for s in _sentences(d["text"]):
            about = _about(s, name)
            # A follow-on sentence counts only when it plainly refers back ("The company's losses ...").
            carry = prev_about and bool(re.match(r"(?:The (?:company|firm|brand|startup)|Its|It)\b", s))
            prev_about = about or carry
            if not (about or carry) or re.search(r"\bquarter|\bQ[1-4]\b|\bH[12]\b|per unit|every rupee|also read|"
                                                 r"read more|related:|recommended|trending", s, re.I):
                continue
            fys = [(m.start(), _fy(m.groups())) for m in FY.finditer(s)]
            main_fy = fys[0][1] if fys else None
            amounts = list(AMOUNT.finditer(s))
            last_item = None
            for idx, m in enumerate(amounts):
                if s[m.end():m.end() + 2].strip().startswith("%"):
                    continue
                if not m.group(2) and not re.search(r"[$]|usd", m.group(0), re.I):
                    continue  # bare "Rs 1.42" is a ratio or price, not a P&L line
                if about and not carry and not _about(s[max(0, m.start() - 160):m.end() + 80], name):
                    continue  # run-on headline blobs: the company must be named near the figure
                window = s[max(0, m.start() - 90):m.start()]
                hits = [(mm.end(), k) for k, rx in ITEM_RE for mm in rx.finditer(window)]
                gap = s[(last_item[1] if last_item else 0):m.start()]
                if hits:
                    item = max(hits)[1]
                elif last_item and re.search(r"\bfrom\b|compared|against|\bvs\.?|versus|up from|down from", gap, re.I):
                    item = last_item[0]
                else:
                    continue
                last_item = (item, m.end())
                nxt = amounts[idx + 1] if idx + 1 < len(amounts) else None
                after = s[m.end():min(m.end() + 45, nxt.start() if nxt else len(s))]
                fy_after = FY.search(after)
                fy = _fy(fy_after.groups()) if fy_after else None
                if not fy and PREV.search(after) and main_fy:
                    fy = f"FY{int(main_fy[2:]) - 1:02d}"
                if not fy and nxt and re.search(r"^\W*(?:from|compared (?:to|with)|against|vs\.?)\b",
                                                 s[m.end():nxt.start()].replace("crore", "").strip(" ,"), re.I):
                    later = FY.search(s[nxt.end():nxt.end() + 45])
                    if later:  # "to Rs 9.6 crore from Rs 5 crore in FY24" -> 9.6 belongs to FY25
                        fy = f"FY{int(_fy(later.groups())[2:]) + 1:02d}"
                fy = fy or (main_fy if len(fys) <= 1 and len(amounts) == 1 else None)
                if not fy:
                    continue
                amount, cur = _to_number(m.group(1), m.group(2))
                cur = cur or ("USD" if "$" in m.group(0) or "usd" in m.group(0).lower() else "INR")
                if item in ("net_profit", "ebitda") and LOSS_WORDS.search(window[-40:] + after[:20]):
                    amount = -amount
                found[(item, fy)].append((amount, cur, s, {"title": d["title"], "url": d["url"]}))
    return found


def _display(amount: float | None, cur: str | None) -> str:
    if amount is None:
        return "—"
    neg, a = amount < 0, abs(amount)
    if cur == "INR":
        txt = f"₹{a / 1e7:,.1f} Cr" if a >= 1e6 else f"₹{a / 1e5:,.1f} L"
    else:
        txt = f"${a / 1e9:.2f}B" if a >= 1e9 else f"${a / 1e6:.1f}M" if a >= 1e6 else f"${a / 1e3:.0f}K"
    return f"({txt})" if neg else txt


def build_statement(name: str, found: dict, sources: list[dict]) -> dict:
    periods = sorted({fy for _, fy in found}, key=lambda f: -int(f[2:]))[:4]
    currency = Counter(c for vals in found.values() for _, c, _, _ in vals).most_common(1)
    currency = currency[0][0] if currency else None
    cells = {}
    for (item, fy), vals in found.items():
        if fy not in periods:
            continue
        # Most common amount (sources often repeat the same filing figure); keep its first quote.
        common = Counter(round(v[0], -3) for v in vals).most_common(1)[0][0]
        pick = next(v for v in vals if round(v[0], -3) == common)
        others = {_display(v[0], v[1]) for v in vals if abs(v[0] - pick[0]) > 0.1 * abs(pick[0] or 1)}
        cells[(item, fy)] = {"amount": pick[0], "display": _display(pick[0], pick[1]), "pct": None, "quote": pick[2],
                             "source": pick[3], "conflict": sorted(others) or None}

    def val(k, fy):
        c = cells.get((k, fy))
        return c["amount"] if c else None

    for fy in periods:
        rev = val("revenue", fy)
        cogs = val("cogs", fy)
        if cogs is None:
            parts = [val(k, fy) for k in ("material_cost", "inward_logistics", "manufacturing")]
            if any(p is not None for p in parts):
                cogs = sum(p for p in parts if p is not None)
                cells[("cogs", fy)] = {"amount": cogs, "display": _display(cogs, currency), "pct": None, "quote": None,
                                       "source": None, "derived": "sum of disclosed COGS items (may be incomplete)"}
        if rev and cogs is not None:
            gm = rev - cogs
            cells[("gross_margin", fy)] = {"amount": gm, "display": _display(gm, currency), "derived": "revenue − COGS"}
            cells[("gross_margin_pct", fy)] = {"amount": None, "display": f"{100 * gm / rev:.1f}%", "pct": f"{100 * gm / rev:.1f}%",
                                               "derived": "gross margin ÷ revenue"}
        sga = val("sga", fy)
        if sga is None:
            parts = [val(k, fy) for k in ("employee", "marketing", "outward_logistics", "service", "rnd", "office")]
            if any(p is not None for p in parts):
                sga = sum(p for p in parts if p is not None)
                cells[("sga", fy)] = {"amount": sga, "display": _display(sga, currency), "derived":
                                      "sum of disclosed SG&A items (may be incomplete)"}
        ebitda = val("ebitda", fy)
        if rev and ebitda is not None:
            cells[("ebitda_pct", fy)] = {"amount": None, "display": f"{100 * ebitda / rev:.1f}%", "derived": "EBITDA ÷ revenue"}

    lines = []
    for key, label, level, kind in LINES:
        values = {fy: cells[(key, fy)] for fy in periods if (key, fy) in cells}
        if key in ("total_expenses", "net_profit") and not values:
            continue
        lines.append({"key": key, "label": label, "level": level,
                      "kind": "derived" if values and all(v.get("derived") for v in values.values()) else kind,
                      "values": values})
    reported = sum(1 for (k, _), c in cells.items() if not c.get("derived"))
    return {"company": name, "currency": currency, "periods": periods, "lines": lines,
            "unit_note": "₹ Cr = crore (10 million rupees); brackets are losses" if currency == "INR" else "",
            "reported_figures": reported, "sources": sources,
            "missing_note": "" if periods else "No reported P&L figures found in press coverage of this company's filings. "
                            "Private companies outside India rarely disclose them."}


async def reported_financials(name: str, category: str = "", context: str = "") -> dict:
    key = tavily_key()
    queries = [
        (f'"{name}" revenue expenses loss FY financials crore', dict(search_depth="advanced", max_results=8)),
        (f'"{name}" FY revenue employee benefit expenses advertising profit loss',
         dict(search_depth="advanced", max_results=8, include_domains=FILINGS_DOMAINS, include_raw_content=True)),
    ]
    docs, errors, cached = [], [], []
    async with httpx.AsyncClient(timeout=60) as client:
        async def one(q, opts):
            try:
                data, hit = await _search(client, key, q, opts)
                cached.append(hit)
                for r in data.get("results") or []:
                    if (r.get("url") or "").startswith(("http://", "https://")):
                        docs.append({"title": r.get("title") or r["url"], "url": r["url"],
                                     "text": f"{r.get('title') or ''}. {r.get('content') or ''} {r.get('raw_content') or ''}"})
            except ResearchError as e:
                errors.append(str(e))
        await asyncio.gather(*[one(q, o) for q, o in queries])
    found = extract(name, docs)
    used = {c[3]["url"] for vals in found.values() for c in vals}
    result = build_statement(name, found, [{"title": d["title"], "url": d["url"]} for d in docs if d["url"] in used])
    result.update({"cached": bool(cached) and all(cached), "errors": errors, "documents_read": len(docs)})
    return result
