"""Provenance and conservative model-proposal validation."""
from datetime import date, datetime
from difflib import SequenceMatcher
from html.parser import HTMLParser
import re
from urllib.parse import urlparse
from .models import normalize, now

class TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self.hidden += 1
    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg") and self.hidden:
            self.hidden -= 1
    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)

def text_from_html(value):
    parser = TextParser()
    parser.feed(value or "")
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()

def iso_date(value):
    try:
        return date.fromisoformat(str(value)[:10]).isoformat()
    except (ValueError, TypeError):
        return None

def previous_year(today):
    try:
        return today.replace(year=today.year - 1)
    except ValueError:
        return today.replace(year=today.year - 1, day=28)

class Ledger:
    def __init__(self):
        self.evidence = []
        self.claims = []
        self.events = []
        self.rejected = []

    def add(self, *, call=None, path="", value=None, url=None, record_id=None, kind="provider", matched=False,
            source_date=None, state="usable", note="", independence_group=None):
        evidence = {"id": f"ev-{len(self.evidence) + 1}", "kind": kind, "url": url, "record_id": record_id,
                    "field_path": path, "value": value, "source_date": source_date,
                    "retrieved_at": (call or {}).get("retrieved_at", now()), "call_id": (call or {}).get("id"),
                    "raw_path": (call or {}).get("raw_path"), "entity_matched": matched, "state": state,
                    "note": note, "independence_group": independence_group or ("crustdata" if kind == "provider" else url)}
        self.evidence.append(evidence)
        return evidence["id"]

    def claim(self, text, origin, *, field=None, expected=None, evidence_ids=None):
        row = {"id": f"claim-{len(self.claims) + 1}", "text": str(text), "origin": origin,
               "field": field, "expected": expected, "evidence_ids": evidence_ids or []}
        self.claims.append(row)
        return row

    def event(self, title, day, kind, evidence_id, *, event_key=None, note=""):
        day = iso_date(day)
        if not day:
            return
        key = normalize(event_key or title)
        existing = next((e for e in self.events if e["event_key"] == key or
                         (e["kind"] == kind and abs((date.fromisoformat(e["date"]) - date.fromisoformat(day)).days) <= 7
                          and SequenceMatcher(None, normalize(e["title"]), normalize(title)).ratio() >= .78)), None)
        if existing:
            if evidence_id not in existing["evidence_ids"]:
                existing["evidence_ids"].append(evidence_id)
            return
        self.events.append({"id": f"activity-{len(self.events) + 1}", "title": title, "date": day, "kind": kind,
                            "event_key": key, "evidence_ids": [evidence_id], "note": note})

    def validate_proposals(self, proposals, *, today, start):
        sources = {e["id"]: e for e in self.evidence}
        concerns = []
        for kind, limit in (("claims", 4), ("events", 6), ("concerns", 3)):
            for item in proposals.get(kind, [])[:limit]:
                if not isinstance(item, dict):
                    self.rejected.append({"kind": kind, "reason": "Invalid proposal object"})
                    continue
                source_id = item.get("source_id")
                source = sources.get(source_id) if isinstance(source_id, str) else None
                quote = item.get("quote", "")
                # Search snippets naming the company may only raise review concerns; the model judges
                # whether the snippet concerns the target, and the exact quote is checked here.
                snippet_concern = kind == "concerns" and source and source["kind"] in ("search_snippet", "provider_news") and source.get("name_mentioned")
                quoted = isinstance(quote, str) and len(quote) >= 20 and (quote in str(source["value"]) if source else False)
                if snippet_concern and isinstance(quote, str) and not quoted:
                    # Snippets carry typographic quotes, dashes and odd spacing that models normalize.
                    quoted = len(quote) >= 20 and loose(quote) in loose(source["value"])
                if not source or not (snippet_concern or (source["entity_matched"] and source["state"] == "usable" and source["kind"] not in ("submission", "search_snippet"))) or not quoted:
                    self.rejected.append({"kind": kind, "reason": "Missing exact quote, usable source, or entity match"})
                    continue
                if kind == "claims":
                    # Keep extracted typed values only when their literal span exists.
                    field = item.get("field")
                    from .research import FIELDS, canonical
                    value_quote = item.get("value_quote")
                    expected = item.get("expected")
                    typed = field in FIELDS and isinstance(value_quote, str) and value_quote in quote and canonical(expected, field) is not None and canonical(expected, field) == canonical(value_quote, field)
                    row = self.claim(item.get("text", quote), "model_extracted_source_claim", evidence_ids=[source["id"]],
                                     field=field if typed else None, expected=expected if typed else None)
                    row.update(assertion_kind="estimate" if field and "estimated" in field else "source_assertion", source_urls=[source["url"]] if source["url"] else [],
                               assessment_date=source.get("source_date"), quote=quote)
                elif kind == "events":
                    day = iso_date(item.get("date"))
                    date_quote = item.get("date_quote", "")
                    # Accept an extracted date only when Python can parse the cited date text.
                    parsed = dates_in_text(date_quote) if isinstance(date_quote, str) and date_quote in str(source["value"]) else set()
                    if not day or not start <= day <= today or (day != iso_date(source["source_date"]) and day not in parsed):
                        self.rejected.append({"kind": kind, "reason": "Date absent, outside window, or not reproducible from source"})
                        continue
                    event_kind = item.get("kind")
                    if event_kind not in ("product", "customer", "funding", "hiring", "marketing"):
                        continue
                    self.event(item.get("title", quote), day, event_kind, source["id"], event_key=item.get("event_key"), note="Model-extracted observation with validated verbatim quote and date; not independently verified delivered work")
                else:
                    concerns.append({"text": str(item.get("text", quote)), "quote": quote, "evidence_ids": [source["id"]], "url": source["url"],
                                     "source_kind": source["kind"], "result": "potential issue to review", "automated_verdict": False})
        return concerns

def loose(text):
    text = str(text).translate(str.maketrans({"\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2013": "-", "\u2014": "-", "\u2026": "..."}))
    return re.sub(r"\s+", " ", text).strip().lower()

def dates_in_text(text):
    found = {d for d in (iso_date(x) for x in re.findall(r"\b\d{4}-\d{2}-\d{2}\b", text)) if d}
    for candidate in re.findall(r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b", text, re.I):
        for fmt in ("%B %d %Y", "%b %d %Y"):
            try:
                found.add(datetime.strptime(candidate.replace(",", ""), fmt).date().isoformat())
                break
            except ValueError:
                pass
    return found

def entity_match(text, url, name, domain, people_names=()):
    """Reject weak namesakes. External text needs the canonical name plus another anchor."""
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    if domain and (host == domain or host.endswith("." + domain)):
        return True
    canon = normalize(name)
    body = normalize(text)
    return bool(len(canon) >= 4 and canon in body and
                ((domain and domain.lower() in text.lower()) or any(len(normalize(p)) >= 6 and normalize(p) in body for p in people_names)))

def timeline(events, today, start):
    current = date.fromisoformat(start).replace(day=1)
    end = date.fromisoformat(today)
    months = []
    while current <= end:
        key = current.strftime("%Y-%m")
        rows = [e for e in events if e["date"].startswith(key) and start <= e["date"] <= today]
        months.append({"month": key, "observed_event_count": len(rows) if rows else None,
                       "state": "observed" if rows else "unknown", "activity_ids": [e["id"] for e in rows]})
        current = date(current.year + (current.month == 12), current.month % 12 + 1, 1)
    return months
