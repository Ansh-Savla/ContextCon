# SignalGate: Investment Diligence & Trust Triage

**Status:** Proposed build plan, ready for scope freeze  
**Last reviewed:** 2026-10-31  
**Project steering:** [`../.codex/steering.md`](../.codex/steering.md)  
**Hackathon:** ContextCon IIT Bombay, CrustData track

## 1. Product decision

Build **SignalGate**, an agent that completes a bounded pre-investment screen for a startup and returns a source-linked diligence brief. It combines the *Investing* and *Trust & Compliance* themes without claiming to conduct regulated diligence or certify compliance.

The core question is:

> “Given this startup, its founders, an investor’s thesis, and a few explicit claims, what can we corroborate from CrustData and public records, what conflicts, and what remains unknown?”

### The finished artifact

One reviewable case containing:

1. A resolved company identity and match confidence, with alternatives or ambiguity retained.
2. A compact investment-fit summary against the supplied thesis, using sourced company, funding, people, hiring, news, and operating signals where available.
3. A claim-by-claim evidence matrix: **supported**, **conflicting evidence**, **potential issue to review**, or **insufficient evidence**.
4. A small relationship/evidence graph linking the company, founders, stated claims, CrustData records, external registry/watchlist records, and source URLs.
5. A bounded recommendation: **advance to human diligence**, **hold for a specific verification**, or **insufficient evidence to assess**. It is not an automated investment approval or rejection.
6. A chronological execution trace, source timestamps, source jurisdiction, and a concise list of diligence questions.

Investment fit and trust/evidence quality must appear as separate dimensions. Never collapse them into one opaque “legitimacy score.”

## 2. Why this scope fits the brief

The event brief explicitly names distinguishing genuine businesses from shell companies, credit limits, and fraud analysis. It requires CrustData’s canonical identity graph, an end-to-end unseen request, evidence for claims, robust handling of ambiguity, and a two-minute demo. SignalGate uses CrustData as the first-party identity and operating-context layer, then adds only narrowly scoped public-record checks.

### Critique and course correction from the earlier ideas

- **Trade-credit limit recommendations are out of MVP.** CrustData headcount, hiring, funding, and web activity are not receivables, cash flow, payment history, existing exposure, or a credit policy. Those signals cannot support a responsible credit limit.
- **Invoice/bank-change approval is out of MVP.** Profile and domain matching cannot prove who controls a bank account or is authorized to change payment instructions. Never return “approve payment.”
- **“Shell-company detector” is too strong a claim.** Public presence can be sparse for legitimate early-stage firms, and operating signals do not prove legal existence or fraud. Use “business identity and claim-consistency triage.”
- **Full KYC/AML, PEP screening, beneficial ownership, and legal compliance certification are out of scope.** The current available inputs and free sources do not establish complete jurisdictional coverage or regulated identity verification.
- **Continuous monitoring is a later phase.** It adds lifecycle state, scheduler/webhook behavior, source freshness, and more permission checks; it is not required to demonstrate one complete diligence run.
- **Do not build a multi-agent system for the demo.** One deterministic orchestrator with Gemini limited to extraction/synthesis is simpler to inspect, budget, and explain.

## 3. User contract

### Input

- Company name and/or website domain (at least one required).
- Optional jurisdiction/incorporation country.
- Optional founder names or professional-network profile URLs.
- Investor thesis as a short text description or structured filters.
- Optional 1–5 explicit claims to inspect, such as “founded in 2021,” “Founder A previously led X,” or “registered in India under CIN …”.
- Optional demo mode selecting a preconfigured case.

For the hackathon MVP, do not accept confidential data-room files, bank details, government IDs, personal contact data, or payment instructions. The investor’s text claims are sufficient to demonstrate evidence comparison.

### Output and automation boundary

The agent completes research and produces an evidence-backed triage result automatically. It may not contact founders, companies, regulators, or other people; submit reports to a registry; move money; or make an investment or compliance decision on behalf of a user.

## 4. End-to-end workflow

| Stage | Action | Evidence / state retained | Failure behavior |
|---|---|---|---|
| 1. Intake | Validate required fields; normalize domain, country, names, and claims. Gemini may extract claim objects from user text into a schema. | Original input, normalized fields, parsed claim and confidence. | Ask for company/domain if absent; preserve uncertain parsing for confirmation or mark claim unresolved. |
| 2. Resolve | Call CrustData Company Identify by domain when available, otherwise name; resolve supplied people using CrustData identity endpoints. | Candidate IDs, match score, matched-on values, API timestamp, alternatives. | Multiple plausible candidates => stop company-specific conclusions and return an ambiguity state. |
| 3. Enrich | Enrich the resolved company with only relevant available fields; enrich founders as needed; query jobs and web/news for concrete thesis/claim questions. Fetch important pages. | Raw response references, normalized facts, source URLs, timestamps, CrustData IDs, endpoint/credit trace. | Partial/no-match results remain explicit; back off on rate limits; do not fabricate missing fields. |
| 4. Public-record overlays | Based on jurisdiction and identifier availability, query the selected official registry and, for a US sanctions-screening demo, the official OFAC lists. Use GLEIF when an LEI or good candidate exists. | Jurisdiction, identifier match method, source link/version/date, candidate match confidence. | Unsupported jurisdiction or weak name-only match => “not checked”/“possible match needs review”; never assert global clearance. |
| 5. Compare claims | Deterministic checks compare normalized claims to source facts. Gemini summarizes only provided evidence and proposes concise explanations with evidence IDs; it does not invent sources or set final statuses. | Claim-to-fact edges, exact fields/text, contradiction rule, evidence reference and rationale. | No independent evidence => insufficient evidence; source disagreement => conflicting evidence, not forced resolution. |
| 6. Triage | Apply transparent rules to identity certainty, official records, material contradictions, and evidence coverage. Keep thesis fit separate. | Decision state, rule IDs, data gaps, confidence/coverage components. | If minimum identity or evidence threshold fails, return “insufficient evidence” or “hold for verification.” |
| 7. Deliver | Render case dashboard and export/share a self-contained report with clickable sources and an execution trace. | Final report JSON and UI state; local demo run identifier. | Every failed/skipped call and its effect is visible in the case timeline. |

## 5. Evidence model and graph

Use a small normalized evidence graph (no graph database required for the hackathon):

- **Company** — submitted entity and resolved CrustData company ID.
- **Person** — submitted founder/executive and resolved CrustData person ID.
- **Claim** — one investor/user assertion with expected value and entity scope.
- **Fact** — normalized sourced observation, value, source, and observation time.
- **Source** — CrustData record/API call or external page/registry dataset, jurisdiction and retrieval time.
- **Signal** — derived observation such as a name/domain mismatch or company activity trend; records its rule and inputs.
- **Assessment** — investment-fit component or diligence triage result, with the exact evidence IDs used.

Edges: `IDENTIFIED_AS`, `FOUNDER_OF`/`WORKED_AT` (only where sourced), `REGISTERED_AS`, `CLAIMS`, `SUPPORTED_BY`, `CONTRADICTED_BY`, `MENTIONED_IN`, and `DERIVED_FROM`.

Every user-visible conclusion must resolve to at least one fact/source or be labeled as an inference. Preserve raw provenance IDs and do not infer beneficial ownership, legal affiliation, fraud, or authority from a professional-profile relationship.

## 6. Data and API plan

### CrustData — mandatory core

Use the local API mirror under [`.codex/crustdata-docs`](../.codex/crustdata-docs/) and its original page URLs as the implementation reference. The current documented API version is `2025-11-01`; required headers are `Authorization: Bearer …` and `x-api-version: 2025-11-01`.

1. **Account preflight:** `GET /account/endpoints` (free) and account credit/usage endpoints. Establish enabled endpoints, field permissions, endpoint-specific rate limits, and available credits before spending.
2. **Company identity:** `POST /company/identify`; use domain as the preferred identifier when supplied. Preserve candidate scores and resolve ambiguity rather than picking the first result.
3. **Company enrichment:** `POST /company/enrich`; request only relevant permitted groups, such as basic info, headcount history, funding, people, locations, and news. Current local docs state the endpoint supports field selection and account permissions may disable response fields.
4. **People identity/context:** use person identify/search/enrich for named founders only after company context and identity are established. Reuse CrustData IDs.
5. **Optional person work-history verification:** `POST /batch/person/verify` only if enabled on this account. Local docs say it is an add-on, costs 10 credits per returned verdict, supports up to 10 profile URLs per batch, and may take a minute or two. This is not legal identity/KYC verification.
6. **Web/news evidence:** `POST /web/search/live`, then `POST /web/fetch/live` on material sources. Prefer targeted queries tied to a claim, company, person, regulator, or jurisdiction. Record original URLs and publisher/date. CrustData is not a substitute for an official sanctions or corporate registry source.
7. **Jobs and watchers:** jobs can add context for operating activity or the thesis; do not treat job volume as proof of legitimacy. Watchers are post-MVP unless a live demo genuinely needs a supported change signal and account permissions are confirmed.

### External sources — add narrowly by jurisdiction

**First external overlay for the India-oriented demo:** India MCA Company Master Data exposed through [data.gov.in](https://data.gov.in/catalog/company-master-data). The catalog describes company name, CIN, status, category, registration date, capital, state, and ROC fields. Obtain the portal’s free registered-user API key, inspect the live resource schema and update date, and join by CIN when supplied. If only name matching is available, show candidate results and avoid a definitive legal-identity match.

**Cross-border entity reference:** [GLEIF API](https://www.gleif.org/en/lei-data/gleif-api/) for LEI lookup and parent/child reference data where the target has an LEI. A missing LEI is “not found/not applicable,” not a negative signal.

**Optional US sanctions demo:** [OFAC Sanctions List Service](https://ofac.treasury.gov/sanctions-list-service) offers downloadable SDN and consolidated non-SDN list files. If integrated, retain list date/hash and match on identifiers/aliases as available. A fuzzy name candidate is only an alert for review; it is not a confirmed match or comprehensive global screening. Respect OFAC’s current download requirements (including a User-Agent where required).

**Optional UK target:** [Companies House REST API](https://developer.company-information.service.gov.uk/get-started), with company status and Persons with Significant Control endpoints, if the selected company is UK-registered. Requires API credentials; do not include solely for breadth.

**Optional SEC public-company context:** [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) only if a target is an SEC filer. They are not a useful baseline for private startups.

**Do not make OpenSanctions a free production dependency.** Its bulk dataset is free for noncommercial use under CC BY-NC; business/commercial use requires a data license. For a student demo, prefer official list sources directly unless its current license and use terms have been explicitly checked.

Do not clone all external API documentation. CrustData’s current mirrored index already contains 113 official Markdown/OpenAPI files. Keep external official URLs, selected schemas, access notes, and source dates in this plan; mirror only the exact authoritative docs/schemas needed once the source is selected for implementation.

## 7. Decision rules and trust language

### Triage states

- **Advance to human diligence:** identity is resolved strongly enough for this use, no material contradictions surfaced in the checked evidence, and required checks for the selected scope completed. This does not mean “verified safe.”
- **Hold for a specific verification:** a material discrepancy or possible official-list match needs a human to resolve.
- **Insufficient evidence:** identity is ambiguous, relevant sources are unavailable, or evidence coverage is too low to assess.

### Investment-fit dimensions (separate from trust)

Score or rank thesis alignment using explicit, editable criteria such as sector, geography, stage/funding context, team background, hiring direction, and recent company signals. Show the contribution of each criterion and missing fields. Do not present this as a return forecast or investment recommendation.

### Prohibited shortcuts

- No single opaque fraud/legitimacy score.
- No treating absent web coverage, small headcount, no hiring, short founder tenure, or young domain as proof of fraud.
- No using scraped accusations as fact; distinguish allegation, investigation, regulator action, and court finding.
- No declaring KYC/AML, sanctions clearance, incorporation validity, beneficial ownership, solvency, or creditworthiness beyond source-specific facts.
- No output such as “approve the vendor/payment/investment” or automatic sanctions adverse action.

## 8. UI/UX direction

The interface should feel like a focused investment committee workbench, not a chatbot or generic admin dashboard. Use a restrained, high-contrast editorial system with clear typography, dense but scannable data, and one memorable evidence-graph motif. Avoid stock imagery and invented company logos; use verified CrustData/source metadata only when permitted, otherwise use a typographic identity mark.

### Main case screen

- **Header:** company identity, resolved/ambiguous status, jurisdiction, run time, and demo/live mode.
- **Outcome strip:** investment fit and evidence quality side by side; triage state and top reason.
- **Left rail:** workflow trace with queued/running/completed/skipped/failed stages and API/source provenance.
- **Main canvas:** claim matrix with status, expected vs observed value, source dates, evidence links, and explainable rationale.
- **Right panel:** compact company/person/source graph; click a node to inspect facts, relationships, match confidence, and source.
- **Bottom drawer:** source ledger, raw/normalized field values, API errors, coverage gaps, and export.
- **Intake state:** paste company/domain, thesis, and claims; select jurisdiction; preview intended checks and expected credit use before running.

### Interaction quality

Build loading, no-match, ambiguous match, partial result, rate-limited, disabled endpoint, missing external API key, possible sanctions match, and evidence-conflict states. Keep long claims and source titles inspectable. Use keyboard access, visible focus, semantic labels, reduced-motion support, and responsive layout. Avoid gratuitous animation; use a small evidence-arrival/timeline transition only where it clarifies execution.

### Recommended implementation approach

The target directory is currently empty. At scaffold time, use a single TypeScript web app with server-side API routes for CrustData, Gemini, and any external key-bearing requests. Keep the UI and backend in one small deployable app; render the graph from the normalized evidence model rather than adding a graph database. Choose the lightest maintained graph/visualization component only if custom SVG becomes a time sink. Preserve a local JSON/SQLite case store only if persistence is necessary for the demo.

## 9. Demo plan (two minutes)

Use one selected, well-covered startup and a clearly labeled synthetic intake variation. The synthetic alteration must be about a fabricated claim/domain/profile mismatch and must not accuse a real person or company of actual fraud. The live research is performed against authorized APIs; any fabricated field is explicitly shown as user-submitted demo data.

1. **0:00–0:15 — Intake:** paste company, domain, thesis, and one or two claims; show planned source checks and call/credit budget.
2. **0:15–0:40 — Resolve and research:** show CrustData company resolution and founder context, with confidence and live evidence arriving.
3. **0:40–1:15 — Compare:** show one corroborated claim, one mismatch or unresolved claim, and the original sources. If actual sources do not support a mismatch, use an explicit insufficient-evidence state rather than manufacture one.
4. **1:15–1:45 — Graph and triage:** open the company/person/claim/source graph and demonstrate why the result is “advance,” “hold,” or “insufficient evidence.”
5. **1:45–2:00 — Deliver:** show exportable diligence brief and the audit/evidence trail.

Preload a deterministic, clearly labeled fixture as a resilience fallback, but do not present fixture data as live. Select the real company only after checking CrustData access, source coverage, and whether the available official registry can resolve it. No real-world outreach or external actions.

## 10. API keys, cost, and setup

### Required

**CrustData API key**

- Get/copy it from [app.crustdata.com/api-keys](https://app.crustdata.com/api-keys). The local CrustData mirror documents bearer auth and `x-api-version: 2025-11-01`.
- Before the first paid call, use account endpoints/credits to inspect enabled paths, field permissions, limits, costs, and balance. Ask the team/account contact about hackathon credits if the expected grant is not visible; do not assume an award has already been credited.

**Gemini API key**

- Use [Google AI Studio API Keys](https://aistudio.google.com/apikey) to create or select a key tied to the correct project. Since paid access is available, verify the project’s billing tier and set usage/budget alerts before using it.
- Keep the key in `GEMINI_API_KEY`. Restrict the key to the Gemini API in AI Studio where supported. Gemini is for structured claim extraction and concise evidence synthesis, not for external verification or final risk rules.

### Optional by chosen jurisdiction

**India OGD/data.gov.in key:** register/login at [data.gov.in](https://data.gov.in/), create an API key in the user account, and use only the selected MCA Company Master Data resource. Confirm its live parameters and rate limits before coding.

**UK Companies House key:** register at the official developer hub and create API credentials only if a UK company is the demo target.

GLEIF public search/API and OFAC downloadable lists do not require buying an aggregator API key for the described lookup flow. No additional paid watchlist provider is required for the MVP.

### Where to feed keys

At development time, create `Trust-compliance-shresth/.env` locally (the existing root `.gitignore` already ignores `.env` and `.env.*`; do not change `.gitignore`). Store values only in the developer’s local environment or deployment secret manager:

```dotenv
CRUSTDATA_API_KEY=replace_locally
GEMINI_API_KEY=replace_locally
DATA_GOV_IN_API_KEY=replace_locally_if_used
COMPANIES_HOUSE_API_KEY=replace_locally_if_used
```

Do not put keys in `NEXT_PUBLIC_*`/`VITE_*` variables, browser storage, source files, committed `.env.example` values, fixtures, console logs, screenshots, or chat. Browser requests must call the app’s server route; the server attaches provider credentials. `.env.example` may contain blank placeholders only. Do not ask the user to paste keys into chat; once development begins, give them the exact local file/variable names and a masked-key preflight path.

### Spend controls

- Preflight permissions and balance first. Do not enrich broad batches or fetch every field.
- Reuse identity IDs; avoid repeat identification and enrichment.
- Cap the demo to one company, up to two founders, and targeted external queries; use paid person verification only when access and budget permit.
- Set Gemini output-token and call limits; invoke it only for claim parsing and final narrative synthesis.
- Show estimated and actual calls/credits in the run trace. Stop before optional calls if a base workflow can complete without them.

## 11. Delivery plan and scope freeze

### P0 — plan freeze / access preflight

Confirm the product name and scope; check directory, local environment, CrustData endpoint access/credits, Gemini model/key and budget, and whether the India OGD API resource works. Pick the demo company after the check. Record unavailable capabilities and fallback behavior. Do not begin broad data collection.

### P1 — complete vertical slice

Implement the intake -> CrustData identity -> minimal enrichment -> one relevant public registry lookup -> evidence normalization -> deterministic claim comparison/triage -> rendered case brief flow. Use a single server-side orchestrator and store all source references.

### P2 — demo-grade UI and resilience

Finish the evidence matrix, execution trace, compact graph, loading/partial/error states, and export. Add deterministic fixture fallback clearly labeled as fixture. Polish accessibility and presentation viewport.

### P3 — demo and submission

Run the authorized live demo, verify a meaningful ambiguous/no-data edge case if the user asks for verification, prepare a two-minute recording script, and package the functional repository. Do not run tests unless asked; this plan states acceptance criteria but no tests are being run now.

### Acceptance criteria (for later development review)

- A new valid request completes without manual entity stitching or an LLM-only answer.
- At least one CrustData canonical company ID is resolved and reused for enrichment; the source IDs and timestamps appear in the case.
- A claim can be supported, contradicted, or explicitly left unresolved with source links.
- An ambiguous identity, unavailable endpoint, external-source error, or missing key produces a clear partial result and never a fabricated verdict.
- Investment fit and trust evidence remain visibly separate.
- All API keys remain server-side and absent from git/logs/browser payloads.
- The main flow and one edge case can be understood in a two-minute demo.

## 12. Current assumptions and open checks

These are implementation preflight items, not blockers to the plan:

- Assume the India MCA catalog is the primary optional registry overlay because the hackathon is at IIT Bombay; verify the actual API resource and its match fields before promising CIN/name lookup.
- Assume CrustData `/account/endpoints` will be checked before build calls; endpoint availability and person verification cannot be inferred from the key alone.
- The Trust-compliance-shresth directory is empty now; framework/version/dependencies must be selected during implementation after a final filesystem check.
- The demo company is intentionally undecided until live API/source coverage is checked. Never invent live data to force the demo narrative.

## 13. Authoritative references

- Hackathon brief: [`ContextCon PS - CrustData.docx`](../ContextCon%20PS%20-%20CrustData.docx) and [`ContextCon 03_ IIT Bombay, the Agentic Services Hackathon _ Y Combinator.pdf`](../ContextCon%2003_%20IIT%20Bombay,%20the%20Agentic%20Services%20Hackathon%20_%20Y%20Combinator.pdf).
- Previous Trust & Compliance explorations: [`combined-suggestion.md`](../Trust-Compliance/combined-suggestion.md), [`opus-reply.md`](../Trust-Compliance/opus-reply.md), [`sol-reply.md`](../Trust-Compliance/sol-reply.md). Treat this plan and current official schemas as authoritative where those drafts conflict.
- CrustData docs mirror: [README](../.codex/crustdata-docs/README.md), [Company Identify](../.codex/crustdata-docs/api-reference/company-apis/identify-a-company-from-name-domain-id-or-profile-url.md), [Company Enrichment](../.codex/crustdata-docs/api-reference/company-apis/get-full-company-enrichment.md), [account endpoint permissions](../.codex/crustdata-docs/api-reference/account-apis/list-endpoint-permissions-and-rate-limits.md), [person verification](../.codex/crustdata-docs/person-docs/verification/batch.md), [web search](../.codex/crustdata-docs/api-reference/web-apis/web-search.md), and [web fetch](../.codex/crustdata-docs/api-reference/web-apis/web-fetch.md).
- External sources: [India MCA Company Master Data](https://data.gov.in/catalog/company-master-data), [India OGD API access help](https://www.data.gov.in/help), [GLEIF API](https://www.gleif.org/en/lei-data/gleif-api/), [OFAC Sanctions List Service](https://ofac.treasury.gov/sanctions-list-service), [Companies House API](https://developer.company-information.service.gov.uk/get-started), [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), [OpenSanctions licensing](https://www.opensanctions.org/docs/commercial/exemption/).
- Secret setup: [CrustData key page](https://app.crustdata.com/api-keys), [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key), and [Gemini billing](https://ai.google.dev/gemini-api/docs/billing).
