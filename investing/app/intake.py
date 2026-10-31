import re
from dataclasses import dataclass, field, asdict

LINKEDIN_RE = re.compile(r"(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/company/([A-Za-z0-9\-_%.]+)[^\s|]*", re.I)
DOMAIN_RE = re.compile(
    r"(?<![@\w])(?:https?://)?(?:www\.)?((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|in|co|io|ai|net|org|app|dev|tech|us|uk|ca|es|de|fr|co\.uk|co\.in))(?:/[^\s|]*)?",
    re.I)
NOISE_RE = re.compile(r"\bsharktank\w*\b|\bshark\s*tank\s*season\s*\d*\b", re.I)
SEPARATORS = re.compile(r"\s*(?:\||\s—\s|\s–\s|\s-\s|:\s|\t)\s*")
NAME_LIST_RE = re.compile(
    r"^\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)(?:\s*(?:,|and|&)\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?))*\s*$")
PERSON_TOKEN_RE = re.compile(r"[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?")


@dataclass
class Entry:
    line_no: int
    raw: str
    name: str | None = None
    domain: str | None = None
    linkedin: str | None = None
    hint: str = ""
    founder_hints: list = field(default_factory=list)
    problems: list = field(default_factory=list)

    def label(self) -> str:
        return self.name or self.domain or self.linkedin or self.raw

    def to_dict(self):
        return asdict(self)


def _founder_names(segment: str) -> list[str]:
    seg = segment.strip()
    if not NAME_LIST_RE.match(seg):
        return []
    parts = [p.strip() for p in re.split(r"\s*(?:,|\band\b|&)\s*", seg) if p.strip()]
    if not all(PERSON_TOKEN_RE.fullmatch(p) for p in parts):
        return []
    # "Ravi and Anuja Kabra": the trailing surname is shared with earlier first-name-only parts.
    if len(parts) > 1 and len(parts[-1].split()) == 2:
        surname = parts[-1].split()[-1]
        parts = [f"{p} {surname}" if len(p.split()) == 1 else p for p in parts[:-1]] + [parts[-1]]
    return parts


def parse_line(line_no: int, raw: str) -> Entry | None:
    text = raw.strip()
    if not text or text.startswith(("#", "//")) or re.fullmatch(r"[\s|\-=_:+#*]+", text):
        return None
    text = re.sub(r"^\s*(?:[-*•]+|\d+[.)])\s+", "", text)
    text = text.strip(" |")
    e = Entry(line_no=line_no, raw=raw.strip())

    m = LINKEDIN_RE.search(text)
    if m:
        e.linkedin = f"https://www.linkedin.com/company/{m.group(1).rstrip('/').lower()}"
        text = (text[:m.start()] + " " + text[m.end():]).strip()

    m = DOMAIN_RE.search(text)
    if m:
        e.domain = m.group(1).lower()
        text = (text[:m.start()] + " " + text[m.end():]).strip()

    text = NOISE_RE.sub("", text)
    text = re.sub(r"\s{2,}", " ", text).strip(" |,;")
    parts = [p for p in SEPARATORS.split(text) if p and p.strip(" |")]
    if parts:
        e.name = parts[0].strip(" |\"'") or None
        e.hint = " ".join(p.strip(" |") for p in parts[1:]).strip()
    if e.name and len(e.name) > 60:
        e.hint = (e.name + " " + e.hint).strip()
        e.name = None
        e.problems.append("could not isolate a company name")

    first_clause = re.split(r"[;,.()]", e.hint, maxsplit=1)[0] if e.hint else ""
    names = _founder_names(first_clause) if first_clause else []
    if names:
        e.founder_hints = names
        e.hint = e.hint[len(first_clause):].lstrip(" ;,.").strip()
    if "?" in (e.name or "") + e.hint:
        e.problems.append("input line itself expresses doubt ('?')")
    if not (e.name or e.domain or e.linkedin):
        return None
    return e


def parse(text: str) -> list[Entry]:
    entries = []
    seen = set()
    for i, line in enumerate(text.splitlines(), 1):
        e = parse_line(i, line)
        if not e:
            continue
        sig = (e.name or "").lower(), e.domain, e.linkedin
        if sig in seen:
            continue
        seen.add(sig)
        entries.append(e)
    return entries
