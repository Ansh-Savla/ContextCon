"""Company research on the Tavily Search API: overview, news, funding, market, competitors.

Adapted from the team's tavily_pipeline (tavily.txt) to async httpx and the shared fixtures cache, so a
company is researched once and replays for free afterwards.
"""
import asyncio
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

from .crust import FIXTURES, cache_key
from .textutil import mentions, norm, tokens

TAVILY_URL = "https://api.tavily.com/search"
SECTION_ORDER = ["overview", "news", "funding", "market", "competitors"]
EXCLUDED_DOMAINS = ["facebook.com", "instagram.com", "tiktok.com", "pinterest.com"]
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class ResearchError(Exception):
    pass


def load_env():
    """Load investing/.env into os.environ without overriding real environment variables."""
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip("'\""))


_EXHAUSTED: set[str] = set()  # keys that hit their credit limit or were rejected this process


def tavily_keys() -> list[str]:
    """Primary key first, then backups (TAVILY_API, TAVILY_API_2, TAVILY_API_3, ... or TAVILY_API_KEY)."""
    names = sorted((k for k in os.environ if k.startswith("TAVILY_API")), key=lambda k: (k != "TAVILY_API", k))
    keys = [os.environ[k].strip() for k in names if os.environ[k].strip()]
    return list(dict.fromkeys(keys))


def tavily_key() -> str | None:
    live = [k for k in tavily_keys() if k not in _EXHAUSTED]
    return live[0] if live else None


def build_queries(name: str, category: str, context: str, days: int) -> dict:
    q = f'"{name}"'
    return {
        "overview": (" ".join(filter(None, [q, category, context])), dict(search_depth="advanced", max_results=8)),
        "news": (f"{q} company news", dict(topic="news", days=days, max_results=10)),
        "funding": (f"{q} funding revenue valuation sales growth", dict(search_depth="advanced", max_results=8)),
        "market": (" ".join(filter(None, [category or name, "market size trends industry"])),
                   dict(search_depth="advanced", max_results=8)),
        "competitors": (" ".join(filter(None, [name, "competitors alternatives", category])), dict(max_results=6)),
    }


def _clean(results) -> list[dict]:
    seen, out = set(), []
    for r in results or []:
        url = r.get("url")
        if not url or url in seen or not url.startswith(("http://", "https://")):
            continue
        seen.add(url)
        out.append({"title": r.get("title"), "url": url, "published_date": r.get("published_date"),
                    "score": round(r.get("score") or 0, 3), "snippet": " ".join((r.get("content") or "").split())[:500]})
    return out


async def _search(client: httpx.AsyncClient, key: str, query: str, opts: dict) -> tuple[dict, bool]:
    body = {"query": query, "search_depth": opts.get("search_depth", "basic"), "topic": opts.get("topic", "general"),
            "max_results": opts.get("max_results", 5), "include_answer": True, "exclude_domains": EXCLUDED_DOMAINS}
    if body["topic"] == "news" and opts.get("days"):
        body["days"] = opts["days"]
    for k in ("include_domains", "include_raw_content"):
        if opts.get(k):
            body[k] = opts[k]
    path = FIXTURES / f"tavily-{cache_key('tavily', body)}.json"
    if path.exists():
        return json.loads(path.read_text())["data"], True
    last_error = "no Tavily API key configured and this search is not cached"
    for key in [k for k in tavily_keys() if k not in _EXHAUSTED]:
        for attempt in range(2):
            try:
                r = await client.post(TAVILY_URL, json=body, headers={"Authorization": f"Bearer {key}"})
            except httpx.HTTPError as e:
                last_error = f"network error: {e}"
                await asyncio.sleep(2 ** attempt)
                continue
            if r.status_code == 200:
                data = r.json()
                path.write_text(json.dumps({"tool": "tavily", "body": body, "data": data,
                                            "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
                                           ensure_ascii=False))
                return data, False
            last_error = f"HTTP {r.status_code}: {r.text[:200]}"
            if r.status_code in (401, 403, 432, 433):  # invalid key or credit limit: switch to the backup key
                _EXHAUSTED.add(key)
                break
            if r.status_code == 429:  # rate limited: try the next key rather than waiting
                break
            if r.status_code < 500:
                raise ResearchError(last_error)
            await asyncio.sleep(2 ** (attempt + 1))
    raise ResearchError(last_error)


async def research_company(name: str, category: str = "", context: str = "", days: int = 730,
                           strict: bool = False) -> dict:
    """strict=True is used when Crustdata has no record: only web results that are demonstrably about this
    company are returned, and industry-level sections (market, competitors) only once the company is found."""
    key = tavily_key()
    queries = build_queries(name.strip(), (category or "").strip(), (context or "").strip(), days)
    sections, errors, cached = {}, {}, []
    async with httpx.AsyncClient(timeout=60) as client:
        async def one(section, query, opts):
            try:
                data, hit = await _search(client, key, query, opts)
                cached.append(hit)
                sections[section] = {"query": query, "answer": data.get("answer"), "sources": _clean(data.get("results"))}
            except ResearchError as e:
                errors[section] = str(e)
        await asyncio.gather(*[one(s, q, o) for s, (q, o) in queries.items()])
    # Company-specific sections must actually be about this company (generic names collide: "Beyond Snack").
    anchors = set(tokens(category)) | set(tokens(context)) | {norm(context.split(".")[0])} if context else set(tokens(category))
    for s in ("overview", "news", "funding"):
        sec = sections.get(s)
        if not sec:
            continue
        kept = [x for x in sec["sources"] if mentions(f"{x['title']} {x['snippet']} {x['url']}", name, anchors)]
        sec["dropped"] = len(sec["sources"]) - len(kept)
        sec["sources"] = kept
        if not kept:
            sec["answer_note"] = "AI summary withheld: none of the sources was about this company."
            sec["answer"] = None
        elif sec["dropped"]:
            if strict and sec["dropped"] >= len(kept):
                sec["answer_note"] = "AI summary withheld: most sources were about other companies."
                sec["answer"] = None
            else:
                sec["answer_note"] = f"{sec['dropped']} unrelated sources removed; the AI summary may still mention them."
    found = any((sections.get(s) or {}).get("sources") for s in ("overview", "news", "funding"))
    note = ""
    if strict and not found:
        sections, note = {}, (f"No web source found that is about “{name}”. Nothing is shown rather than results "
                              f"for similarly named companies.")
    elif strict:
        note = "Not in Crustdata. These web results mention the company but are unverified."
    return {"company": name, "input": {"name": name, "category": category, "context": context, "days": days},
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "cached": bool(cached) and all(cached), "strict": strict, "found_on_web": found, "note": note,
            "sections": {s: sections[s] for s in SECTION_ORDER if s in sections}, "errors": errors}
