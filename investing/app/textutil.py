import re
import unicodedata

STOP = set("""a an the and or of for to in on at by with from as is are was were be been it its this that these
those our your their his her we you they i me my brand company startup business pvt ltd private limited inc llc
labs industries industry one early season pitch pitches among widely discussed deals deal earliest not avoid
confusion based new best all natural service services chain""".split())

# Words common enough that a name made only of them needs a second anchor to match news reliably.
COMMON = set("""geek chic beyond snack snacks blue pine life hair original originals labs foods food tom tag tags
jugaad star gold valle stella ice pops pop sweet home best good great smart""".split())

CLOSURE_PATTERNS = [
    r"ceased operation", r"closes its doors", r"closed its doors", r"shut down", r"shutting down",
    r"\bbankrupt", r"chapter 7", r"chapter 11", r"no longer in business", r"out of business",
    r"went bust", r"liquidat", r"company folded", r"no longer operat",
]
ALIVE_PATTERNS = [r"still in business", r"still operating", r"comeback", r"relaunch", r"re-?open", r"revived",
                  r"back in business", r"is expanding", r"plots franchise growth", r"raises? ", r"secures? "]
ACQUISITION_PATTERNS =[r"\bacquir", r"\bbought by\b", r"\bmerged with\b", r"\bsold to\b"]
DEAL_FAILED_PATTERNS = [r"never (?:actually )?went through", r"never closed", r"fell through", r"didn'?t go through",
                        r"did not go through", r"pulled out", r"parted ways", r"decided not to", r"rejected"]
DISTRESS_PATTERNS = [r"distress", r"fire sale", r"down round", r"layoff", r"laid off"]


def norm(s: str | None) -> str:
    """Lowercase alphanumerics; '&', '+' and the word 'and' are dropped so 'Tom & Chee' == 'Tom and Chee'."""
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"\band\b|[&+]", " ", s, flags=re.I)
    return re.sub(r"[^a-z0-9]", "", s.lower())


def norm_name(s: str | None) -> str:
    s = re.sub(r"\[.*?\]|\(.*?\)", "", s or "")
    s = re.sub(r"\b(pvt|private|ltd|limited|inc|llc|corp|co)\b\.?", "", s, flags=re.I)
    return norm(s)


def stem(w: str) -> str:
    for suf in ("ings", "ing", "ies", "es", "s"):
        if len(w) > len(suf) + 3 and w.endswith(suf):
            return w[: -len(suf)] + ("y" if suf == "ies" else "")
    return w


def tokens(s: str | None, keep_stop=False) -> list[str]:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    raw = re.findall(r"[a-z0-9]+", s.replace("'", ""))
    return [stem(w) for w in raw if keep_stop or (w not in STOP and len(w) > 2)]


def hint_tokens(hint: str) -> set[str]:
    t = tokens(hint)
    joined = {t[i] + t[i + 1] for i in range(len(t) - 1)}
    return set(t) | {stem(j) for j in joined}


GENERIC_NAME_WORDS = {"industries", "industry", "foods", "food", "labs", "lab", "technologies", "technology", "tech",
                      "systems", "solutions", "pvt", "private", "ltd", "limited", "inc", "llc", "corp", "co",
                      "company", "group", "india", "global", "the"}


def core_name(s: str | None) -> str:
    s = re.sub(r"\[.*?\]|\(.*?\)|®|™", "", s or "")
    words = [w for w in re.findall(r"[A-Za-z0-9&+']+", s) if w.lower().strip("'") not in GENERIC_NAME_WORDS]
    return norm(" ".join(words))


def name_similarity(query: str, candidate: str) -> float:
    a, b = norm_name(query), norm_name(candidate)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    ca, cb = core_name(query), core_name(candidate)
    if ca and ca == cb:
        return 0.95
    short, long_ = sorted((a, b), key=len)
    if len(short) >= 4 and short in long_:
        return 0.9
    ta, tb = set(tokens(query, True)), set(tokens(candidate, True))
    return len(ta & tb) / max(len(ta | tb), 1)


def overlap(hint: set[str], text: str) -> float:
    if not hint:
        return 0.0
    words = set(tokens(text))
    squashed = norm(text)
    hits = {h for h in hint if h in words or (len(h) >= 7 and h in squashed)}
    base = {h for h in hint if not any(h != o and o in h and len(o) > 2 for o in hint)} or hint
    return min(1.0, len(hits) / max(len(base), 1))


def is_generic_name(name: str) -> bool:
    toks = tokens(name, True)
    return bool(toks) and all(t in COMMON or len(t) <= 3 for t in toks)


def mentions(text: str, name: str, anchors: set[str]) -> bool:
    """True when text is about this company: contains the name and, for generic names, an anchor too."""
    n = norm_name(name)
    t = norm(text)
    if not n or n not in t:
        return False
    if not is_generic_name(name):
        return True
    words = set(tokens(text))
    return any(a in words or (len(a) >= 6 and a in t) for a in anchors)


def any_pattern(text: str, patterns: list[str]) -> str | None:
    low = (text or "").lower()
    for p in patterns:
        m = re.search(p, low)
        if m:
            return m.group(0)
    return None
