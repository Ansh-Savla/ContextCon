"""No paid APIs here. Synthetic entities and controlled provider failures only."""
import asyncio
from dataclasses import replace
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, AsyncMock
import httpx
from heartbeat import InvestigationRequest, RunConfig
from heartbeat.evidence import Ledger, timeline, entity_match
from heartbeat.pipeline import investigate_async
from heartbeat.providers import CrustData, ModelClient
from heartbeat.rules import initial_findings, score, resolve_candidates
from heartbeat.store import Store
from heartbeat.store import dumps

def company(cid=101, name="Synthetic Example Labs", domain="example.com"):
    return {"crustdata_company_id": cid, "basic_info": {"name": name, "primary_domain": domain, "year_founded": 2020,
        "description": "Synthetic Example Labs builds document review tools."}, "people": {}, "headcount": {"timeseries": []}}

def match(data=None, confidence=1):
    return {"confidence_score": confidence, "company_data": data or company()}

ENDPOINTS = [("/company/identify", 0), ("/company/enrich", 2), ("/person/enrich", 1), ("/person/search", .23),
             ("/web/search/live", 1), ("/web/enrich/live", 1), ("/social_post/search", .5), ("/job/search", .03)]

def api_handler(request):
    path = request.url.path
    if request.url.host == "api.gleif.org":
        return httpx.Response(200, json={"data": []})
    body = json.loads(request.content) if request.content else {}
    data = {}
    cost = 0
    if path == "/account/endpoints":
        data = {"api_version": "2025-11-01", "endpoints": [{"path": p, "status": "enabled", "base_credits": c,
            "effective_rate_limit_rpm": 300, "fields": {"enabled": ["basic_info", "locations", "headcount.total", "headcount.timeseries", "funding", "people", "news", "metadata", "basic_profile", "social_handles", "experience", "job_details.title", "job_details.url", "company.basic_info", "share_url", "text", "date_posted", "actor.crustdata_entity_id", "actor.name"], "disabled": []}} for p, c in ENDPOINTS]}
    elif path == "/account/credits":
        data = {"account": {"credits": 100}}
    elif path == "/company/identify":
        if body.get("names") == ["Unmatched Synthetic"]:
            data = [{"matches": []}]
        elif body.get("names") == ["Ambiguous Synthetic"]:
            data = [{"matches": [match(), match(company(202, "Other Synthetic", "other.example"))]}]
        elif body.get("names") == ["Different Synthetic"]:
            data = [{"matches": [match(company(202, "Different Synthetic", "example.org"))]}]
        else:
            data = [{"matched_on": "Synthetic Example Labs", "match_type": "name", "matches": [match()]}]
    elif path == "/company/enrich":
        data, cost = [{"matches": [match()]}], 2
    elif path == "/person/search":
        data = {"profiles": [{"crustdata_person_id": 501, "basic_profile": {"name": "Synthetic Founder"},
            "experience": {"employment_details": {"current": [{"crustdata_company_id": 101, "name": "Synthetic Example Labs", "title": "Founder", "start_date": "2020-01-01"}], "past": []}}}]}
        cost = .23
    elif path == "/web/search/live":
        data, cost = {"success": True, "results": []}, 1
    elif path == "/web/enrich/live":
        data, cost = [{"url": u, "success": True, "content": "<html>Synthetic Example Labs builds document review tools.</html>"} for u in body["urls"]], len(body["urls"])
    elif path == "/social_post/search":
        data = {"posts": [], "total_count": 0}
    elif path == "/job/search":
        data = {"job_listings": []}
    else:
        return httpx.Response(404, json={"error": "unknown endpoint"})
    return httpx.Response(200, json=data, headers={"X-Credits-Used": str(cost)})

class RulesTests(unittest.TestCase):
    def test_all_unknown_is_zero_with_zero_coverage(self):
        ledger = Ledger()
        result = score(initial_findings(InvestigationRequest(company_name="Synthetic"), ledger), "unmatched", RunConfig())
        self.assertEqual((result["value"], result["coverage_percent"], result["outcome"]), (0, 0, "insufficient evidence"))

    def test_identity_margin_and_domain_gate(self):
        self.assertEqual(resolve_candidates([match(), match(company(102, domain="other.example"), .99)])[0], "ambiguous")
        # Records sharing a domain belong to one organization and are not rivals.
        self.assertEqual(resolve_candidates([match(), match(company(102), .99)])[0], "resolved")
        self.assertEqual(resolve_candidates([match()], domain="example.org")[0], "ambiguous")

    def test_input_validation(self):
        for domain in ("localhost", "https://127.0.0.1", "https://user:pass@example.com", "x.invalid"):
            with self.assertRaises(ValueError):
                InvestigationRequest(domain=domain)
        with self.assertRaises(ValueError):
            RunConfig(max_credits=float("nan"))

    def test_upstream_context_is_assertion_and_secrets_are_redacted(self):
        request = InvestigationRequest(company_name="Synthetic", context={"company": {"basic_info": {"primary_domain": "example.com", "year_founded": 2020}}})
        self.assertEqual(request.domain, "example.com")
        self.assertEqual(request.claims[0]["expected"], 2020)
        with patch.dict(os.environ, {"GEMINI_API_KEY": "synthetic-secret-key"}):
            rendered = dumps({"api_key": "private", "note": "synthetic-secret-key"})
            self.assertNotIn("private", rendered)
            self.assertNotIn("synthetic-secret-key", rendered)

    def test_model_quotes_dates_and_dedup(self):
        ledger = Ledger()
        ev = ledger.add(value="On October 1, 2026, Example launched a new product for businesses.", kind="primary_page", matched=True)
        good = {"title": "Launch", "source_id": ev, "quote": "Example launched a new product for businesses.", "date": "2026-10-01", "date_quote": "October 1, 2026", "kind": "product", "event_key": "one-launch"}
        ledger.validate_proposals({"events": [good, good, {**good, "date": "2026-09-01"}], "claims": [{"source_id": ev, "quote": "Fabricated quotation with no evidence"}]}, today="2026-10-31", start="2025-10-31")
        self.assertEqual(len(ledger.events), 1)
        self.assertEqual(len(ledger.rejected), 2)
        self.assertEqual(timeline([], "2026-10-31", "2026-10-01")[0]["observed_event_count"], None)
        self.assertFalse(entity_match("Example Holdings fraud", "https://news.example.org", "Example", "example.com"))

class PipelineTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.config = RunConfig(db_path=str(Path(self.folder.name) / "cases.sqlite3"), env_file=None, use_model=False)
        self.env = patch.dict(os.environ, {"CRUSTDATA_API_KEY": "synthetic-not-real"})
        self.env.start()
        self.rate = patch.object(CrustData, "rate_wait", new=AsyncMock())
        self.rate.start()

    async def asyncTearDown(self):
        self.rate.stop()
        self.env.stop()
        self.folder.cleanup()

    async def run_case(self, request, handler=api_handler, config=None):
        return await investigate_async(request, config=config or self.config, transport=httpx.MockTransport(handler))

    async def test_full_case_persistence_and_cache(self):
        report = await self.run_case({"company_name": "Synthetic Example Labs", "synthetic": True})
        self.assertEqual(report["identity"]["status"], "resolved")
        self.assertTrue(report["people"])
        self.assertTrue(any(f["id"] == "identity.presence" and f["result"] == "supported" for f in report["findings"]))
        self.assertLessEqual(report["usage"]["credits_used_or_reserved"], 15)
        store = Store(self.config.db_path)
        self.assertEqual(store.get(report["case_id"])["case_id"], report["case_id"])
        self.assertGreater(store.db.execute("SELECT count(*) FROM records").fetchone()[0], 10)
        store.close()
        replay = await self.run_case({"company_name": "Synthetic Example Labs", "synthetic": True})
        self.assertEqual(replay["usage"]["credits_used_or_reserved"], 0)
        evidence = next(e for e in replay["evidence"] if e["raw_path"])
        self.assertTrue(Path(evidence["raw_path"]).exists())

    async def test_ambiguous_and_unmatched_block_paid_research(self):
        for name in ("Ambiguous Synthetic", "Unmatched Synthetic"):
            report = await self.run_case({"company_name": name})
            self.assertEqual(report["heartbeat"]["value"], 0)
            self.assertEqual(report["heartbeat"]["coverage_percent"], 0)
            self.assertEqual(report["usage"]["credits_used_or_reserved"], 0)
            self.assertEqual(report["heartbeat"]["outcome"], "insufficient evidence")

    async def test_material_identity_conflict_overrides_score(self):
        report = await self.run_case({"company_name": "Different Synthetic", "domain": "example.com", "synthetic": True})
        self.assertEqual(report["heartbeat"]["outcome"], "hold for a specific verification")
        self.assertEqual(report["identity"]["status"], "conflicting")

    async def test_zero_credit_budget(self):
        report = await self.run_case({"company_name": "Synthetic Example Labs"}, config=replace(self.config, max_credits=0))
        self.assertEqual(report["usage"]["credits_used_or_reserved"], 0)
        self.assertFalse(report["people"])
        self.assertTrue(any(c["status"] == "skipped" for c in report["calls"]))

    async def test_disclosures_and_professional_overlap_are_not_conflicts(self):
        report = await self.run_case({"company_name": "Synthetic Example Labs", "synthetic": True,
            "internal_roster": [{"name": "Synthetic Investor", "affiliations": [{"company_id": 101, "start_date": "2021-01-01", "end_date": "2022-01-01"}]}],
            "disclosures": [{"person_id": 501, "company_id": 101}]})
        self.assertEqual(len(report["relationship_observations"]), 1)
        self.assertIn("no conflict established", report["relationship_observations"][0]["result"])
        self.assertEqual(next(r for r in report["findings"] if r["id"] == "disclosures.comparison")["result"], "supported")
        self.assertFalse(any(f["result"] == "conflicting evidence" for f in report["findings"]))

    async def test_structured_claim_consistency_without_legal_verdict(self):
        report = await self.run_case({"company_name": "Synthetic Example Labs", "synthetic": True,
            "claims": [{"field": "basic_info.year_founded", "expected": 1990, "text": "Synthetic claim: founded in 1990"}]})
        finding = next(f for f in report["findings"] if f.get("claim_id") == "claim-1")
        self.assertEqual(finding["result"], "conflicting evidence")
        # A requester's claim contradicted by matched evidence needs verification before continuing.
        self.assertTrue(finding["material"])
        self.assertEqual(report["heartbeat"]["outcome"], "hold for a specific verification")
        self.assertEqual(finding["component"], "identity")
        nodes = {n["id"] for n in report["graph"]["nodes"]}
        self.assertTrue(all(e["from"] in nodes and e["to"] in nodes for e in report["graph"]["edges"]))

    async def test_fetch_per_url_failure_and_timeout(self):
        def handler(req):
            if req.url.path == "/web/enrich/live":
                return httpx.Response(200, json=[{"url": "https://example.com", "success": False, "content": None}], headers={"X-Credits-Used": "1"})
            if req.url.path == "/social_post/search":
                raise httpx.ReadTimeout("synthetic timeout")
            return api_handler(req)
        report = await self.run_case({"company_name": "Synthetic Example Labs"}, handler)
        self.assertEqual(next(f for f in report["findings"] if f["id"] == "identity.presence")["result"], "insufficient evidence")
        self.assertTrue(any(c.get("credit_accounting") == "conservative_upper_bound" for c in report["calls"]))

    async def test_rate_limit_retry_and_no_retry_403(self):
        counts = {}
        def handler(req):
            path = req.url.path
            counts[path] = counts.get(path, 0) + 1
            if path == "/company/enrich" and counts[path] == 1:
                return httpx.Response(429, json={"error": "synthetic rate limit"}, headers={"X-Credits-Used": "0", "Retry-After": "0"})
            if path == "/person/search":
                return httpx.Response(403, json={"error": "disabled"}, headers={"X-Credits-Used": "0"})
            return api_handler(req)
        report = await self.run_case({"company_name": "Synthetic Example Labs"}, handler)
        self.assertEqual(counts["/company/enrich"], 2)
        self.assertEqual(counts["/person/search"], 1)
        self.assertEqual(report["identity"]["status"], "resolved")

    async def test_research_deadline_returns_partial(self):
        async def slow(req):
            if req.url.path == "/company/enrich":
                await asyncio.sleep(3)
            return api_handler(req)
        report = await self.run_case({"company_name": "Synthetic Example Labs"}, slow, replace(self.config, max_seconds=2))
        self.assertLess(report["usage"]["seconds"], 2.3)
        self.assertTrue(any("time limit" in g.lower() for g in report["unresolved_questions"]))

class ModelTests(unittest.IsolatedAsyncioTestCase):
    async def test_high_demand_fallback(self):
        calls = []
        def handler(req):
            calls.append(req.url.host)
            if req.url.host == "generativelanguage.googleapis.com":
                return httpx.Response(503, json={"error": "high demand"})
            return httpx.Response(200, json={"choices": [{"message": {"content": '{"claims":[],"events":[],"concerns":[]}'}, "finish_reason": "stop"}]})
        with patch.dict(os.environ, {"GEMINI_API_KEY": "synthetic", "FEATHERLESS_API_KEY": "synthetic"}):
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
                model = ModelClient(http)
                await model.extract({})
                self.assertEqual([t["status"] for t in model.trace], ["failed", "completed"])
        self.assertEqual(len(calls), 2)

    async def test_empty_thinking_output_retries_larger_budget(self):
        budgets = []
        def handler(req):
            budgets.append(json.loads(req.content)["max_tokens"])
            content = "" if len(budgets) == 1 else '{"claims":[],"events":[],"concerns":[]}'
            return httpx.Response(200, json={"choices": [{"message": {"content": content}, "finish_reason": "stop"}]})
        with patch.dict(os.environ, {"FEATHERLESS_API_KEY": "synthetic"}):
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
                model = ModelClient(http, primary="featherless")
                await model.extract({})
                self.assertEqual(model.trace[0]["status"], "completed")
        self.assertEqual(budgets, [16384, 32768])

if __name__ == "__main__":
    unittest.main()
