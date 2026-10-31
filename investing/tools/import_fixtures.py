"""Import responses recorded through the Crustdata MCP into fixtures/.

Usage:
  python tools/import_fixtures.py requests            # print pending requests (from fixtures/_missing.jsonl) as JSON
  python tools/import_fixtures.py import <dump.json>  # dump = MCP execute output: {"value": [{tool, body, ok, data, credits}]}
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.crust import FIXTURES, MISSING_LOG, cache_key  # noqa: E402


def pending():
    if not MISSING_LOG.exists():
        return []
    reqs = [json.loads(l) for l in MISSING_LOG.read_text().splitlines() if l.strip()]
    return [r for r in reqs if not (FIXTURES / f"{r['tool']}-{r['key']}.json").exists()]


def import_dump(path):
    doc = json.loads(Path(path).read_text())
    rows = doc.get("value", doc) if isinstance(doc, dict) else doc
    if isinstance(rows, dict):
        if rows.get("truncated"):
            sys.exit("dump is truncated; re-record in smaller batches")
        rows = rows.get("rows", [])
    stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    n = 0
    for r in rows:
        if not r.get("ok"):
            print("skip (failed):", r.get("tool"), r.get("err"))
            continue
        key = cache_key(r["tool"], r["body"])
        (FIXTURES / f"{r['tool']}-{key}.json").write_text(json.dumps(
            {"tool": r["tool"], "body": r["body"], "ok": True, "data": r["data"], "credits": r.get("credits") or 0,
             "recorded_at": stamp, "via": "mcp"}, ensure_ascii=False))
        n += 1
    left = pending()
    MISSING_LOG.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in left))
    print(f"imported {n}; still pending {len(left)}")


if __name__ == "__main__":
    if sys.argv[1] == "requests":
        print(json.dumps([{"tool": r["tool"], "body": r["body"]} for r in pending()], ensure_ascii=False))
    else:
        import_dump(sys.argv[2])
