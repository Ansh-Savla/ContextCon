"""Behavioral regressions: richer upstream inputs must change actual research."""
import json
import os
from dataclasses import replace
import unittest
from unittest.mock import patch
import httpx
import test_heartbeat as fixtures
from heartbeat.evidence import Ledger
from heartbeat.models import InvestigationRequest
from heartbeat.research import upstream_intake, assess_claims, add_claim_finding

class ClaimResearchTests(unittest.IsolatedAsyncioTestCase):
    asyncSetUp = fixtures.PipelineTests.asyncSetUp
    asyncTearDown = fixtures.PipelineTests.asyncTearDown
    run_case = fixtures.PipelineTests.run_case
    async def test_context_changes_search_and_corroborated_finding(self):
        queries, payloads = [], []
        quote = "Synthetic Example Labs was acquired by Example Holdings. Its product website is example.com."
        def handler(req):
            if req.url.host in ("generativelanguage.googleapis.com", "api.featherless.ai"):
                body = json.loads(req.content)
                payload = json.loads(body["messages"][1]["content"])
                payloads.append(payload)
                acquired = next((c for c in payload["claims"] if c.get("field") == "funding.acquired_by"), None)
                if "plan bounded" in body["messages"][0]["content"]:
                    result = {"priorities": [{"claim_id": acquired["id"], "reason": "Verify supplied acquisition"}] if acquired else [],
                              "queries": [{"claim_id": acquired["id"], "query": "acquisition Example Holdings original announcement"}] if acquired else []}
                else:
                    source = next((s for s in payload["sources"] if s["kind"] == "external_page"), None)
                    result = {"observations": [{"claim_id": acquired["id"], "field": "funding.acquired_by", "value": "Example Holdings",
                        "source_id": source["id"], "quote": quote, "value_quote": "Example Holdings", "as_of": None}] if acquired and source else []}
                return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(result)}, "finish_reason": "stop"}]})
            if req.url.path == "/web/search/live":
                query = json.loads(req.content)["query"]
                queries.append(query)
                found = "acquisition Example Holdings" in query
                return httpx.Response(200, json={"results": [{"url": "https://journal.example.org/deal", "title": quote, "snippet": quote}] if found else []}, headers={"X-Credits-Used": "1"})
            if req.url.path == "/web/enrich/live":
                urls = json.loads(req.content)["urls"]
                return httpx.Response(200, json=[{"url": u, "success": True, "content": quote if "journal." in u else "Synthetic Example Labs builds document review tools at example.com."} for u in urls], headers={"X-Credits-Used": str(len(urls))})
            return fixtures.api_handler(req)
        with patch.dict(os.environ, {"GEMINI_API_KEY": "synthetic-gemini"}):
            config = replace(self.config, use_model=True)
            sparse = await self.run_case({"company_name": "Synthetic Example Labs"}, handler, config)
            sparse_queries = list(queries)
            queries.clear()
            rich = await self.run_case({"company_name": "Synthetic Example Labs", "context": {"funding": {"acquired_by": "Example Holdings"}}}, handler, config)
        self.assertFalse(any("acquisition Example Holdings" in q for q in sparse_queries))
        self.assertTrue(any("acquisition Example Holdings" in q for q in queries))
        claim = next(c for c in rich["claims"] if c.get("field") == "funding.acquired_by")
        self.assertEqual(claim["input_path"], "request.context.funding.acquired_by")
        finding = next(f for f in rich["findings"] if f.get("claim_id") == claim["id"])
        self.assertEqual(finding["result"], "supported")
        self.assertTrue(finding["independently_corroborated"])
        self.assertTrue(finding["revision_history"])
        self.assertEqual(next(f for f in rich["findings"] if f["id"] == "operations.claims")["result"], "supported")
        self.assertGreater(rich["heartbeat"]["coverage_percent"], sparse["heartbeat"]["coverage_percent"])
        self.assertTrue(any(p["upstream_assertions"] for p in payloads))

    async def test_supplied_urls_are_fetched_but_not_independent(self):
        fetched = []
        def handler(req):
            if req.url.path == "/web/enrich/live":
                fetched.extend(json.loads(req.content)["urls"])
            return fixtures.api_handler(req)
        report = await self.run_case({"company_name": "Synthetic Example Labs", "context": {"news": [{"title": "Acquisition announcement", "url": "https://journal.example.org/deal"}]}}, handler)
        self.assertIn("https://journal.example.org/deal", fetched)
        self.assertTrue(report["input_utilization"]["source_links"])

class AssessmentTests(unittest.TestCase):
    def setUp(self):
        self.ledger = Ledger()
        self.request = InvestigationRequest(company_name="Synthetic Example Labs", context={"funding": {"acquired_by": "Example Holdings"}})
        self.intake = upstream_intake(self.request, self.ledger)
        self.claim = next(c for c in self.ledger.claims if c.get("field") == "funding.acquired_by")
        self.findings = []
        add_claim_finding(self.claim, self.findings)
        self.company = {"basic_info": {"name": "Synthetic Example Labs"}}

    def observation(self, acquirer, *, upstream=False, syndicated=False):
        quote = f"Synthetic Example Labs was acquired by {acquirer}. This is a dated acquisition announcement."
        ev = self.ledger.add(value=quote, url="https://journal.example.org/deal", kind="external_page", matched=True, independence_group="journal.example.org")
        self.ledger.evidence[-1]["independent"] = not syndicated
        if upstream:
            self.claim["source_urls"] = ["https://journal.example.org/deal"]
        return {"claim_id": self.claim["id"], "field": "funding.acquired_by", "value": acquirer, "source_id": ev, "quote": quote, "value_quote": acquirer}

    def test_conflicting_evidence_revises_initial_supported_finding(self):
        observations = [self.observation("Example Holdings")]
        assess_claims(self.ledger, self.findings, {}, self.company, observations, "2026-10-31")
        self.assertEqual(self.findings[0]["result"], "supported")
        observations.append(self.observation("Different Holdings"))
        assess_claims(self.ledger, self.findings, {}, self.company, observations, "2026-10-31")
        self.assertEqual(self.findings[0]["result"], "conflicting evidence")
        self.assertEqual(len(self.findings[0]["evidence_ids"]), 2)
        self.assertFalse(self.findings[0]["independently_corroborated"])

    def test_same_cited_source_or_syndication_does_not_corroborate(self):
        for upstream, syndicated in ((True, False), (False, True)):
            self.claim["source_urls"] = []
            obs = self.observation("Example Holdings", upstream=upstream, syndicated=syndicated)
            assess_claims(self.ledger, self.findings, {}, self.company, [obs], "2026-10-31")
            self.assertEqual(self.findings[0]["result"], "supported")
            self.assertFalse(self.findings[0]["independently_corroborated"])

    def test_reversed_acquisition_and_unquoted_values_are_rejected(self):
        obs = self.observation("Example Holdings")
        ev = next(e for e in self.ledger.evidence if e["id"] == obs["source_id"])
        ev["value"] = "Example Holdings was acquired by Synthetic Example Labs. Its website is example.com."
        obs["quote"] = ev["value"]
        rejected = assess_claims(self.ledger, self.findings, {}, self.company, [obs], "2026-10-31")
        self.assertTrue(rejected)
        self.assertEqual(self.findings[0]["result"], "insufficient evidence")

    def test_inferences_are_not_promoted_and_active_acquired_are_separate(self):
        ledger = Ledger()
        request = InvestigationRequest(company_name="Synthetic Example Labs", context={"company": {"basic_info": {"status": "active"}}, "revenue": {"acquisition_status": "acquired"}, "verdict": "All workers are former contractors"})
        upstream_intake(request, ledger)
        findings = []
        for c in ledger.claims:
            add_claim_finding(c, findings)
        company = {"basic_info": {"status": "active"}, "revenue": {"acquisition_status": "acquired"}}
        fields = {}
        for field, value in (("basic_info.status", "active"), ("revenue.acquisition_status", "acquired")):
            fields[field] = ledger.add(value=value, matched=True, source_date="2026-10-01")
        assess_claims(ledger, findings, fields, company, [], "2026-10-31")
        self.assertFalse(any(f["result"] == "conflicting evidence" for f in findings))
        inf = next(c for c in ledger.claims if c["assertion_kind"] == "inference")
        self.assertEqual(next(f for f in findings if f["claim_id"] == inf["id"])["result"], "insufficient evidence")

    def test_stale_snapshots_and_funding_scope_remain_unresolved(self):
        ledger = Ledger()
        request = InvestigationRequest(company_name="Synthetic Example Labs", context={"headcount": {"total": 50, "as_of": "2020-01-01"}, "funding": {"total_raised": 5000000}})
        upstream_intake(request, ledger)
        findings = []
        for c in ledger.claims:
            add_claim_finding(c, findings)
        fields = {"headcount.total": ledger.add(value=10, matched=True, source_date="2026-10-01"),
                  "funding.total_investment_usd": ledger.add(value=2000000, matched=True)}
        company = {"headcount": {"total": 10}, "funding": {"total_investment_usd": 2000000}}
        assess_claims(ledger, findings, fields, company, [], "2026-10-31")
        self.assertTrue(all(f["result"] == "insufficient evidence" for f in findings))
