# Heartbeat implementation contract

Scope frozen with the team on 31 October 2026. This is the library implementation of `implementation-pipeline-heartbeat.md`; the separate SignalGate web-app plan is not the build target.

The claim-driven correction now normalizes investment-team context with original input paths, fetches supplied references, validates canonical-ID/person hints, discovers claims for name-only requests, and performs initial checks before claim-specific corroboration/adverse follow-up. LLMs prioritize questions and extract quoted values/interpretations; deterministic comparisons control labels and preserve finding revisions. Input utilization, research selections, omissions, provider agreement and independent-source candidates are exposed explicitly in schema 1.1. Free-text inferences are not promoted to proven facts.

- Deliver an importable Python library, structured JSON input/output, an interactive plaintext CLI, local SQLite persistence and reproducible verification. No web UI or HTTP server.
- Company name is sufficient to start. Optional domain, people, jurisdiction, structured upstream context, claims, internal roster and disclosures improve research. Upstream conclusions are assertions, not proof.
- Research company identity, public operating claims, relevant people and affiliations, dated activity, and corroborating/adverse information autonomously through CrustData. Keep legal registration and internal-information gaps explicit.
- Assess current conditions. Global identity research is supported, with US/India the likely inputs. Registration coverage is source-specific and incomplete; the first overlay is official GLEIF reference data. Name-only LEI candidates do not establish legal identity or incorporation.
- Default deadline 75 seconds; configurable up to 120. Aim near one minute, 10–20 credits, preferred budget 15 and hard ceiling 50. Development research authorized up to 500 credits. Network latency can force partial results.
- Use `gemini-flash-lite-latest` by default. On failure, including high-demand responses, try `deepseek-ai/DeepSeek-V4.1-Flash-1017` via Featherless. Allow larger thinking-token budgets and reject empty/truncated or malformed visible output.
- Heartbeat uses the agreed 35/25/30/10 component weights, unresolved=0 (only supported checks earn points), coverage threshold=60%, not-applicable checks excluded, and holds for identity conflicts, contradicted submitted claims and quoted adverse potential issues. Unresolved identity still returns a clearly provisional score and insufficient-evidence outcome. Scores are checklist indices, not probabilities.
- Freeze scored checks before research. Extracted narrative claims are reported separately and do not alter weights after observing results. Structured provider-field comparisons assess consistency, not independently established truth. Model outputs cannot assign scored statuses.
- Store raw responses, original retrieval times, record IDs, exact fields/excerpts, execution outcomes and credit accounting. Cache reuse preserves original timestamps; missing credit headers reserve the conservative request maximum.
- Verification is explicitly authorized: synthetic personas and controlled failures plus live real-company development cases. These cases are engineering examples, not the investment team's selected demonstration targets.
- Keep all activity read-only. No outreach, external transactions, watchers, investment decisions, fraud verdicts, global screening clearance or compliance certification.

Implementation and integration guide: [`README.md`](README.md). Reproducible verification: [`../scripts/verify_heartbeat.py`](../scripts/verify_heartbeat.py).
