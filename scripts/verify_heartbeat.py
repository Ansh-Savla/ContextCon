"""Reproduce verification. Live mode spends at most 100 CrustData credits.

Run from the repository root: python scripts/verify_heartbeat.py [--live]
"""
import argparse
import asyncio
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from heartbeat import RunConfig, investigate_async
from heartbeat.cli import probe_models
from heartbeat.models import load_env
from heartbeat.store import dumps

async def live():
    load_env()
    output = ROOT / "heartbeat-data" / "verification"
    output.mkdir(parents=True, exist_ok=True)
    providers = await probe_models()
    (output / "providers.json").write_text(dumps(providers), encoding="utf-8")
    scenarios = [
        ("us-name-only", {"company_name": "PostHog"}, "gemini"),
        ("india-name-only", {"company_name": "Razorpay"}, "gemini"),
        ("alternate-model", {"company_name": "PostHog"}, "featherless"),
        ("synthetic-domain-mismatch", {"company_name": "PostHog", "domain": "razorpay.com", "synthetic": True}, "gemini"),
        ("synthetic-unmatched", {"company_name": "Heartbeat Synthetic Unmatched 20261031 ZZ99", "synthetic": True}, "gemini"),
    ]
    summaries = []
    for label, request, model in scenarios:
        report = await investigate_async(request, config=RunConfig(model=model, max_credits=20))
        (output / (label + ".json")).write_text(dumps(report), encoding="utf-8")
        ids = {e["id"] for e in report["evidence"]}
        assert all(set(f["evidence_ids"]) <= ids for f in report["findings"])
        assert report["usage"]["credits_used_or_reserved"] <= 20
        assert report["usage"]["seconds"] < 77
        if label == "synthetic-domain-mismatch":
            assert report["heartbeat"]["outcome"] == "hold for a specific verification"
        if label == "synthetic-unmatched":
            assert report["heartbeat"]["outcome"] == "insufficient evidence"
            assert report["heartbeat"]["provisional"]
        summaries.append({"scenario": label, "case_id": report["case_id"], "identity": report["identity"]["status"],
            "heartbeat": report["heartbeat"]["value"], "coverage_percent": report["heartbeat"]["coverage_percent"],
            "outcome": report["heartbeat"]["outcome"], "seconds": report["usage"]["seconds"],
            "credits_used_or_reserved": report["usage"]["credits_used_or_reserved"],
            "model_calls": report["model_calls"], "report_path": str(output / (label + ".json"))})
        print(dumps(summaries[-1]), flush=True)
    (output / "summary.json").write_text(dumps({"providers": providers, "cases": summaries}), encoding="utf-8")
    # Report provider issues explicitly instead of hiding them behind deterministic success.
    assert all(p["valid_json"] for p in providers), "A provider connectivity check failed; inspect providers.json"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="Also call authorized APIs using local environment keys")
    args = parser.parse_args()
    tests = unittest.defaultTestLoader.discover(str(ROOT / "tests"))
    result = unittest.TextTestRunner(verbosity=2).run(tests)
    if not result.wasSuccessful():
        raise SystemExit(1)
    if args.live:
        asyncio.run(live())

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
