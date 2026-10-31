import asyncio
import hashlib
import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path

import httpx

BASE_URL = "https://api.crustdata.com"
API_VERSION = "2025-11-01"
FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
MISSING_LOG = FIXTURES / "_missing.jsonl"

ENDPOINTS = {
    "company_identify": "/company/identify",
    "company_enrich": "/company/enrich",
    "person_search": "/person/search",
    "job_search": "/job/search",
    "web_search_live": "/web/search/live",
}


def cache_key(tool: str, body: dict) -> str:
    raw = tool + "|" + json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha1(raw.encode()).hexdigest()[:16]


@dataclass
class CallResult:
    tool: str
    key: str
    ok: bool
    data: object = None
    credits: float = 0.0
    source: str = ""  # "fixture" | "live"
    error: str = ""
    recorded_at: str = ""


@dataclass
class Crust:
    api_key: str | None = field(default_factory=lambda: os.environ.get("CRUSTDATA_API_KEY") or os.environ.get("CRUSTDATA_API"))
    concurrency: int = 4
    log: list = field(default_factory=list)

    def __post_init__(self):
        self.mode = "live" if self.api_key else "replay"
        self._sem = asyncio.Semaphore(self.concurrency)
        FIXTURES.mkdir(exist_ok=True)

    @property
    def credits_spent(self) -> float:
        return round(sum(c.credits for c in self.log if c.source == "live"), 2)

    @property
    def credits_replayed(self) -> float:
        return round(sum(c.credits for c in self.log if c.source == "fixture"), 2)

    async def call(self, tool: str, body: dict) -> CallResult:
        key = cache_key(tool, body)
        path = FIXTURES / f"{tool}-{key}.json"
        if path.exists():
            rec = json.loads(path.read_text())
            res = CallResult(tool, key, rec.get("ok", True), rec.get("data"), float(rec.get("credits") or 0),
                             "fixture", rec.get("error", ""), rec.get("recorded_at", ""))
        elif self.mode == "replay":
            self._note_missing(tool, body, key)
            res = CallResult(tool, key, False, error="not in fixture cache (set CRUSTDATA_API_KEY to fetch live)",
                             source="fixture")
        else:
            res = await self._live(tool, body, key, path)
        self.log.append(res)
        return res

    async def _live(self, tool, body, key, path) -> CallResult:
        headers = {"authorization": f"Bearer {self.api_key}", "x-api-version": API_VERSION,
                   "content-type": "application/json"}
        url = BASE_URL + ENDPOINTS[tool]
        async with self._sem:
            async with httpx.AsyncClient(timeout=60) as client:
                for attempt in range(4):
                    try:
                        r = await client.post(url, headers=headers, json=body)
                    except httpx.HTTPError as e:
                        if attempt == 3:
                            return CallResult(tool, key, False, error=f"network error: {e}", source="live")
                        await asyncio.sleep(2 ** attempt)
                        continue
                    if r.status_code == 429 or r.status_code >= 500:
                        await asyncio.sleep(float(r.headers.get("retry-after", 2 ** (attempt + 1))))
                        continue
                    break
        credits = float(r.headers.get("x-credits-used") or 0)
        if r.status_code != 200:
            return CallResult(tool, key, False, error=f"HTTP {r.status_code}: {r.text[:300]}", source="live",
                              credits=credits)
        data = r.json()
        stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        path.write_text(json.dumps({"tool": tool, "body": body, "ok": True, "data": data, "credits": credits,
                                    "recorded_at": stamp, "via": "rest"}, ensure_ascii=False))
        return CallResult(tool, key, True, data, credits, "live", recorded_at=stamp)

    def _note_missing(self, tool, body, key):
        existing = set()
        if MISSING_LOG.exists():
            existing = {json.loads(l)["key"] for l in MISSING_LOG.read_text().splitlines() if l.strip()}
        if key not in existing:
            with MISSING_LOG.open("a") as f:
                f.write(json.dumps({"tool": tool, "body": body, "key": key}, ensure_ascii=False) + "\n")


def fixture_count() -> int:
    return len([p for p in FIXTURES.glob("*.json")])
