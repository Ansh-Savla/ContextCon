"""Run the diligence pipeline from the terminal: python cli.py test_inputs/set_b_shark_tank_india.txt"""
import asyncio
import json
import sys

from app.crust import Crust
from app.intake import parse
from app.pipeline import analyze_entry
from app.research import load_env

load_env()


async def main(path: str, dump: str | None):
    text = "\n".join(l for l in open(path).read().splitlines() if not l.startswith("#"))
    entries = parse(text)
    cx = Crust()
    q = asyncio.Queue()
    memos = await asyncio.gather(*[analyze_entry(i, e, cx, q) for i, e in enumerate(entries)])
    print(f"mode={cx.mode} calls={len(cx.log)} misses={sum(1 for c in cx.log if not c.ok)} "
          f"credits(replayed)={cx.credits_replayed} credits(live)={cx.credits_spent}")
    for m in memos:
        r = m.get("resolution", {})
        chosen = (r.get("chosen") or {}).get("name")
        print(f"\n== {m['input']['name'] or m['input']['domain'] or m['input']['linkedin']}  ->  {r.get('status')} "
              f"{chosen or ''} [{r.get('method')}]")
        if m.get("error"):
            print("   ERROR", m["error"])
            continue
        print(f"   status={m['status'].get('verdict')}  score={m['score'].get('verdict')}")
        for f in m.get("founders", [])[:5]:
            print(f"   founder: {f['name']} | {f['roles_here'][0]['title']} {f['roles_here'][0]['start']}→"
                  f"{f['roles_here'][0]['end']} | {', '.join(f['flags'])}")
        for c in m.get("input_claims", []):
            print(f"   claim: {c['claim']} -> {c['verdict']} ({c['detail']})")
        for d in m.get("deals", {}).get("announced", [])[:3]:
            print(f"   deal: {d['amount']} for {d['equity']} tv={d['tv']} {d['investors']}")
        for f in m.get("flags", []):
            print(f"   [{f['severity']}] {f['code']}: {f['text']}")
        print(f"   news kept={len(m.get('news', []))} dropped={m.get('news_dropped')}")
    if dump:
        json.dump(memos, open(dump, "w"), indent=1, default=str, ensure_ascii=False)


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
