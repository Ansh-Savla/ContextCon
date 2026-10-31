# Heartbeat library

Company name → CrustData identity/research → evidence-backed trust triage JSON, stored in SQLite. Investment fit and valuation belong to the investment team's system.

## Install and call

From the repository root, Python 3.11+:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -e .
.venv/Scripts/python.exe -m heartbeat investigate --company "Your target company" --output heartbeat-data/report.json
.venv/Scripts/python.exe -m heartbeat investigate --interactive
.venv/Scripts/python.exe -m heartbeat investigate --input examples/structured-context.json
```

The root `.env` can contain `CRUSTDATA_API_KEY`, `GEMINI_API_KEY`, and `FEATHERLESS_API_KEY`. Process environment values take precedence. For a different working directory, pass `RunConfig(env_file="/absolute/path/.env", db_path="/absolute/path/heartbeat.sqlite3")`. Keep custom data locations outside source control. Defaults store all private artifacts under ignored `heartbeat-data/`.

```python
from heartbeat import investigate, investigate_async, RunConfig

report = investigate(
    {"company_name": "Your target company"},
    config=RunConfig(max_seconds=75, max_credits=50, target_credits=15),
)
print(report["identity"])
print(report["heartbeat"])
print(report["findings"])

# Inside an existing event loop:
# report = await investigate_async({"company_name": "Your target company"})
```

`investigate()` returns a JSON-compatible dict. `investigate_async()` is the equivalent async function. Invalid requests raise `ValueError` before research; unavailable sources or time/credit exhaustion produce a saved partial report. A missing CrustData key also produces an insufficient-evidence report with preflight failure, rather than an invented investigation.

Use `get_report(case_id, db_path=...)` and `list_reports(db_path=...)` from `heartbeat` to retrieve saved results without repeating research.

## Input contract

At least one of `company_name` or `domain` is required. Top-level keys are strict; arbitrary additional information belongs in `context`.

| Field | Type | Use |
|---|---|---|
| `company_name` | string | Canonical identity discovery; candidate scores/margins retained |
| `domain` | string | Optional website/domain; cross-checked against the name when both exist |
| `jurisdiction` | string | Optional context; India biases web search to IN, otherwise US |
| `description` | string | Upstream business description retained as a submitted assertion |
| `context` | object | Additional structured investment-team data, preserved with provenance boundary |
| `people` | array of objects | Optional `{name, profile_url}`; exact LinkedIn profiles preferred |
| `claims` | array of objects | Optional `{text, field, expected}`; no claims required to run |
| `internal_roster` | array of objects | Optional authorized internal `{name, affiliations:[{company_id,start_date,end_date}]}` |
| `disclosures` | array of objects | Optional `{person_id, company_id}` referencing canonical CrustData IDs |
| `lei` | string | Optional 20-character LEI; exact identifier plus resolved company-name agreement required for automatic GLEIF linkage |
| `synthetic` | boolean | Marks fabricated demo submissions explicitly |

`context.company.basic_info.primary_domain` (or `context.company.domain`) can supply a domain hint when no top-level domain exists. A supplied `context.company.basic_info.year_founded` becomes a claim to compare. Raw upstream records are retained as context, not silently accepted as independently verified data or injected into the trusted response cache. Top-level values win.

Structured context is now normalized into traceable assertions, including identity/location, funding amounts/dates, acquirer, acquisition status/date, workforce snapshots, revenue estimates and narrative inferences. Nested source URLs are queued for fetching, founder profiles guide person enrichment, and supplied company IDs are independently checked with CrustData. See [`../examples/investment-context.json`](../examples/investment-context.json) for an input shaped from the team's information example.

The workflow performs initial checks, then builds a bounded claim-specific follow-up plan. The LLM sees upstream assertions, initial findings and fetched passages. It proposes priorities, literal-value normalization and targeted queries; code binds searches to the canonical name (domain as a soft anchor), researches investment-team assertions first, and limits execution to three claim queries plus one adverse query, up to three supplied references and four newly discovered pages, each fetched in its own request. All omitted or unresearched assertions remain visible. Name-only requests discover a small factual checklist from provider records and optionally company pages.

The final LLM pass extracts quoted comparable observations and interpretations. Code reproduces values from their quoted spans, checks entity identity, date/measurement comparability and acquisition direction, then revises the claim matrix. Free-text inferences may receive source-linked interpretations without being promoted to factual/scored verdicts. Provider agreement, re-fetching an upstream cited source, and independently retrieved corroboration are separate fields. Different domains without obvious syndication markers are independence candidates, not authenticated independent reporting; source provenance remains reviewable.

Headcount comparisons require the same dated snapshot; the provider's time series is consulted when available. Undated current status, incomparable funding totals and revenue estimates remain unresolved where appropriate. Active status and acquisition status are separate predicates. Source disagreement is preserved rather than overwritten, and every changed claim assessment records its revision history. A contradicted requester or investment-team claim is material and holds the case for verification; it is never a fraud verdict. Disagreements between provider sources alone remain non-material.

The library discovers public representatives without requiring them as input, using company founders/executives and a bounded canonical-company person-search fallback. Default maximum is three profiles; configurable to five. Missing submitted profiles, unconfirmed authority and professional-history limits remain explicit.

### Investment-team Sightline memos

`python -m heartbeat investigate --sightline memo.json --pick "Company"` accepts the investment team's Sightline memo (one memo or a list). [`heartbeat/sightline.py`](../heartbeat/sightline.py) maps it to a request, labelling each item `crustdata-sourced` or `web-sourced`:

- CrustData-sourced facts (founding year, HQ country) become structured claims. Agreement with our CrustData record is consistency, never independent corroboration.
- Status verdicts, press-announced deals, unconfirmed founder names and medium/high flags become claims to research. Flags stay inferences and are never promoted to findings.
- Cited press URLs are fetched to check what they say; search-engine redirect links (`google.com/goto`) and LinkedIn pages are dropped because they cannot be cited or fetched.
- Founders are looked up through CrustData as researched people, not treated as a representative.

Independent support must come from our own search and fetched pages. Example: the team's TagZ "distress sale" flag became a held potential issue from press we retrieved, and its founding year was independently corroborated.

## Output contract

`schema_version: "1.1"` identifies the current contract; earlier stored 1.0 reports remain readable. Main fields:

| Field | Contents |
|---|---|
| `case_id`, `assessment_date`, `synthetic_submission` | Persistent identity/date and demo labeling |
| `identity` | Status, canonical company ID, candidates, confidence, match rule and submitted-name/domain conflict |
| `company`, `people` | Provider context and normalized sourced affiliations; read `company_record_policy` before using raw company fields |
| `heartbeat` | Score, coverage, provisional flag, weights/contributions, outcome and reason |
| `findings`, `claims` | Claim/status/evidence IDs, confidence reason, missing evidence and deterministic rule |
| `evidence` | Source URL or record ID, field path/value, original retrieval time, source date, entity match, state, raw path and independence group |
| `activity`, `activity_timeline`, `headcount_trend` | Deduplicated observed events, unknown months and a separate workforce trend |
| `potential_issues` | Quoted source-linked model proposals requiring review, never wrongdoing verdicts |
| `relationship_observations`, `disclosure_observations` | Dated professional overlap and disclosed-affiliation agreement; no inferred conflict |
| `registry_candidates` | GLEIF candidates with explicit linkage status |
| `graph` | Local nodes/edges for entities, claims, findings and sources |
| `stages`, `calls`, `model_calls` | Completed/skipped/failed work, retries, costs and provider fallback |
| `input_utilization`, `research_plan` | Extracted assertions, source/person/ID hints, omitted fields, selected claim-specific queries and execution status |
| `usage`, `storage` | Duration, credit accounting, SQLite and raw-response paths |
| `unresolved_questions`, `limitations` | Evidence gaps and interpretation boundaries |

All-unresolved evidence returns **0/100, 0% coverage, provisional, insufficient evidence**. Checks that cannot apply to the request are **not applicable** and excluded: representative authority when no representative is submitted, and disclosures when no roster or disclosures are supplied. Applicable components keep their relative weights. Missing evidence for an applicable check still scores 0; it is never dropped. **Hold for a specific verification** is forced by: a submitted name and domain resolving to different companies (including an unknown domain used with a known company name), a submitted claim contradicted by matched evidence, or a quoted, company-matched potential issue (e.g. dissolution, insolvency, enforcement) found by the adverse search. The arithmetic is deterministic; model outputs cannot set scored statuses.

Without registration, representative authority, independently corroborated operating claims or internal disclosures, an otherwise useful company report can remain below 60% coverage. That is expected and must remain visible to the investment system. Do not treat a provisional score such as 75 as moderate/high confidence.

Timeline counts cover observed public activity, not all work performed. Empty months use `null`/`unknown`, not zero. Repeated reports are grouped; near-duplicate titles within seven days are merged. A post is not automatically a milestone, and headcount points are never counted as work events. Event deduplication and source dates remain imperfect, so source links are retained for review.

## Persistence and budgets

SQLite `cases` stores requests/reports; `records` indexes entities, claims, evidence, findings, activity and calls by case/kind/ID. `cache` stores original retrieval timestamps and response references; `rate_slots` coordinates request spacing for processes sharing the database. Raw API/model responses live beside the database under `raw/<case_id>/`.

```powershell
.venv/Scripts/python.exe -m heartbeat list
.venv/Scripts/python.exe -m heartbeat show CASE_ID
.venv/Scripts/python.exe -m heartbeat investigate --company "Your target company" --no-cache --provider featherless
```

Default: 75-second deadline, 15 preferred credits, 50-credit ceiling, 24-hour cache. Account permissions and balance are checked every run. Identity gates require confidence ≥0.95 and a ≥0.15 candidate margin. Calls use account prices and field/filter premiums, bounded retries for 429/temporary server failures, per-endpoint spacing and wall-clock timeouts. Missing billing headers/timeouts retain the conservative request maximum; the account's final bill can differ. The preferred credit budget gates optional activity calls; the hard ceiling gates every paid request.

Provider keys stay server-side. The LLM receives bounded upstream assertions, initial findings and public source excerpts; the dedicated internal roster is excluded. It uses Gemini by default and attempts Featherless on provider failure, including high demand, when time remains. Thinking-model output starts at 16,384 tokens and can retry at 32,768; empty/truncated/invalid output cannot generate a finding. Every accepted model claim/event must point to a usable, entity-matched source and reproduce an exact quotation. Events additionally need a reproducible source date. Model-free operation still normalizes structured context, discovers provider claims, selects a deterministic follow-up and compares structured values, with free-text interpretation left unresolved.

## Verify

```powershell
# Synthetic end-to-end personas and controlled failures; no paid calls:
.venv/Scripts/python.exe scripts/verify_heartbeat.py

# Live model checks only:
.venv/Scripts/python.exe -m heartbeat probe-models

# Reproducible US/India cases, alternate model, fabricated domain mismatch,
# and fabricated unmatched-name case. Authorized APIs only; ≤100 credits:
.venv/Scripts/python.exe scripts/verify_heartbeat.py --live
```

Live reports and provider traces are written to `heartbeat-data/verification/`. These engineering examples do not define the investment team's eventual demo targets. See [`VERIFICATION.md`](VERIFICATION.md) for observed results.
