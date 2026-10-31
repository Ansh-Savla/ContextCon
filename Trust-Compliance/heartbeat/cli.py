"""JSON on stdout, progress summaries on stderr. No HTTP server required."""
import argparse
import asyncio
import json
from pathlib import Path
import sys
from . import investigate
from .models import InvestigationRequest, RunConfig, load_env, normalize
from .sightline import request_from_memo
from .store import Store, dumps

def main():
    # Windows redirected stdout otherwise uses the legacy console code page.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(prog="heartbeat", description="Evidence-backed company trust triage")
    commands = parser.add_subparsers(dest="command", required=True)
    run = commands.add_parser("investigate")
    run.add_argument("--input", help="JSON request path, or - for stdin")
    run.add_argument("--sightline", help="Investment-team Sightline memo JSON (one memo or a list)")
    run.add_argument("--pick", default="", help="Company name to select from a Sightline memo list")
    run.add_argument("--company", default="")
    run.add_argument("--domain", default="")
    run.add_argument("--interactive", action="store_true")
    run.add_argument("--output", help="Optional report JSON file")
    run.add_argument("--provider", choices=["gemini", "featherless"], default="gemini")
    run.add_argument("--no-model", action="store_true")
    run.add_argument("--max-seconds", type=float, default=90)
    run.add_argument("--max-credits", type=float, default=50)
    run.add_argument("--target-credits", type=float, default=15)
    run.add_argument("--max-people", type=int, default=3)
    run.add_argument("--no-cache", action="store_true")
    for name in ("list", "show", "probe-models"):
        sub = commands.add_parser(name)
        if name == "show":
            sub.add_argument("case_id")
    for sub in commands.choices.values():
        sub.add_argument("--db", default="heartbeat-data/heartbeat.sqlite3")
        sub.add_argument("--env-file", default=".env")
    args = parser.parse_args()
    try:
        if args.command == "investigate":
            if args.sightline:
                memos = json.loads(Path(args.sightline).read_text(encoding="utf-8-sig"))
                memos = memos if isinstance(memos, list) else [memos]
                pick = normalize(args.pick)
                memo = next((m for m in memos if not pick or pick in (normalize(m.get("name") or ""), normalize((m.get("input") or {}).get("name") or ""))), None)
                if not memo:
                    raise ValueError("No Sightline memo matches --pick")
                request = request_from_memo(memo)
            elif args.input:
                request = json.loads(sys.stdin.read() if args.input == "-" else Path(args.input).read_text(encoding="utf-8-sig"))
            elif args.interactive:
                def ask(prompt):
                    print(prompt, file=sys.stderr, end=" ", flush=True)
                    return input().strip()
                request = {"company_name": ask("Company name:"), "domain": ask("Website/domain (optional):"),
                           "jurisdiction": ask("Country/jurisdiction (optional):"),
                           "description": ask("Business description or investment-team context (optional):")}
                profile = ask("Representative LinkedIn profile URL (optional):")
                if profile:
                    request["people"] = [{"profile_url": profile}]
            else:
                request = {"company_name": args.company, "domain": args.domain}
            config = RunConfig(max_seconds=args.max_seconds, max_credits=args.max_credits, target_credits=args.target_credits,
                max_people=args.max_people, model=args.provider, use_model=not args.no_model, cache_hours=0 if args.no_cache else 24,
                db_path=args.db, env_file=args.env_file)
            report = investigate(request, config=config)
            if args.output:
                target = Path(args.output)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(dumps(report), encoding="utf-8")
            print(dumps(report))
            print(f"Case {report['case_id']}: {report['heartbeat']['outcome']}; Heartbeat {report['heartbeat']['value']}, coverage {report['heartbeat']['coverage_percent']}%; {report['usage']['seconds']}s, {report['usage']['credits_used_or_reserved']} credits", file=sys.stderr)
        elif args.command == "probe-models":
            load_env(args.env_file)
            print(dumps(asyncio.run(probe_models())))
        else:
            store = Store(args.db)
            try:
                result = store.list_cases() if args.command == "list" else store.get(args.case_id)
                if result is None:
                    parser.error("Case not found or unfinished")
                print(dumps(result))
            finally:
                store.close()
    except (ValueError, OSError) as exc:
        # No HTTP exception bodies or secrets are interpolated.
        print("Input/storage error: " + str(exc), file=sys.stderr)
        raise SystemExit(2)

async def probe_models():
    import httpx
    from .providers import ModelClient
    async with httpx.AsyncClient() as http:
        async def probe(provider):
            model = ModelClient(http, primary=provider, timeout=60)
            result = await model.extract({"target": {"name": "Synthetic Example Labs", "domain": "example.com"},
                "sources": [{"id": "probe-1", "kind": "primary_page", "source_date": "2026-10-01",
                             "text": "On October 1, 2026, Synthetic Example Labs launched its document review product. This is a synthetic provider connectivity check."}]}, fallback=False)
            return {"provider": provider, "trace": model.trace, "valid_json": any(r.get("status") == "completed" for r in model.trace),
                    "proposed_claims": len(result.get("claims", [])), "proposed_events": len(result.get("events", []))}
        return await asyncio.gather(probe("gemini"), probe("featherless"))
