import asyncio
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .crust import Crust, MISSING_LOG, fixture_count
from .intake import parse
from .pipeline import analyze_entry
from .research import _EXHAUSTED, load_env, research_company, tavily_key, tavily_keys
from .financials import reported_financials

load_env()

ROOT = Path(__file__).resolve().parent
INPUTS = ROOT.parent / "test_inputs"
MAX_ENTRIES = 25

app = FastAPI(title="Sightline")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


class AnalyzeRequest(BaseModel):
    text: str = Field(..., max_length=20_000)


class ResearchRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field("", max_length=200)
    context: str = Field("", max_length=300)
    days: int = Field(730, ge=1, le=3650)
    strict: bool = False  # set when Crustdata has no record of the company


@app.get("/")
def index():
    return FileResponse(ROOT / "static" / "index.html")


@app.get("/api/status")
def status():
    cx = Crust()
    missing = len(MISSING_LOG.read_text().splitlines()) if MISSING_LOG.exists() else 0
    return {"mode": cx.mode, "fixtures": fixture_count(), "missing_requests": missing, "tavily": bool(tavily_key()),
            "tavily_keys": len(tavily_keys()), "tavily_keys_exhausted": len(_EXHAUSTED)}


@app.get("/api/examples")
def examples():
    """One company per example: lines of 'title :: about :: input' in test_inputs/examples.txt."""
    out = []
    for i, line in enumerate((INPUTS / "examples.txt").read_text().splitlines()):
        parts = [p.strip() for p in line.split("::")]
        if len(parts) == 3 and not line.startswith("#"):
            out.append({"id": f"ex{i}", "title": parts[0], "about": parts[1], "text": parts[2]})
    return out


@app.post("/api/research")
async def research(req: ResearchRequest):
    result = await research_company(req.name, req.category, req.context, req.days, req.strict)
    if not result["sections"] and not req.strict:
        raise HTTPException(502, "; ".join(f"{k}: {v}" for k, v in result["errors"].items()) or "research failed")
    return result


@app.post("/api/financials")
async def financials(req: ResearchRequest):
    return await reported_financials(req.name, req.category, req.context)


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    entries = parse(req.text)
    if not entries:
        raise HTTPException(400, "No company names, domains or LinkedIn URLs found in the input.")
    truncated = len(entries) > MAX_ENTRIES
    entries = entries[:MAX_ENTRIES]
    cx = Crust()
    queue: asyncio.Queue = asyncio.Queue()

    async def run():
        await asyncio.gather(*[analyze_entry(i, e, cx, queue) for i, e in enumerate(entries)])
        misses = [c.tool for c in cx.log if not c.ok and "fixture cache" in c.error]
        queue.put_nowait({"type": "done", "mode": cx.mode, "calls": len(cx.log), "credits_live": cx.credits_spent,
                          "credits_replayed": cx.credits_replayed, "cache_misses": len(misses)})

    async def stream():
        yield json.dumps({"type": "start", "mode": cx.mode, "count": len(entries), "truncated": truncated,
                          "entries": [e.to_dict() for e in entries]}) + "\n"
        task = asyncio.create_task(run())
        while True:
            event = await queue.get()
            yield json.dumps(event, default=str, ensure_ascii=False) + "\n"
            if event["type"] == "done":
                break
        await task

    return StreamingResponse(stream(), media_type="application/x-ndjson")
