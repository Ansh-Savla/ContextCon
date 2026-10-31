# SignalGate build plan: Investment + Trust & Compliance diligence agent

## Context

ContextCon IIT Bombay (CrustData track). Code freeze is 3:30 PM on 31 Oct 2026. Judging covers four things:
- end-to-end execution of an unseen request
- CrustData identity graph usage plus a citation for every claim
- robustness to messy input
- a 2-minute demo

Two plans existed:
- `Trust-compliance-shresth/PLAN.md` (SignalGate, investing): strong guardrails, but too much scope and some wrong API details.
- Mrp1Dev's `Trust-Compliance/implementation-pipeline.md` (vendor trust): a lean engine of four checks plus corroboration. Its live API sample is in `Trust-Compliance/shark-information-crust-data-provides.md`.

The user picked the **Investment + Trust & Compliance** scope. **All work on this laptop lives under `Trust-compliance-shresth/`.** Nothing goes in shared folders, steering or root files.

**The result:** one agent, one engine, two lenses.
- **Investment lens:** pre-investment and founder diligence.
- **Trust lens:** vendor legitimacy, impersonation, payment-change requests, shell-company triage.

You paste a messy request and get back a finished, cited case report with a bounded outcome. The agent never asks a follow-up question, never contacts anyone and never takes an external action.

**No LLM API.** The user dropped Gemini on 2026-10-31: its project's prepaid credits had run out, and every model returned 402. Every stage is therefore deterministic code running on CrustData data:
- Intake parsing uses rules, with free CrustData calls to resolve names.
- Checks and triage use rules.
- The written report comes from templates.

This makes every step reproducible and auditable, and it means only one API key is needed.

## Preflight results (2026-10-31, read-only)

- CrustData key works. Balance is **15,200 credits**: 15,000 in the main wallet plus 200 granted credits that expire on 2026-11-14.
- Enabled endpoints, with cost and requests per minute:

  | Endpoint | Cost | Requests/min |
  |---|---|---|
  | `/company/identify` | Free | 30 |
  | `/company/enrich` | 2 | 15 |
  | `/person/search` | 0.03, plus 0.1 when filtering on `experience` | 30 |
  | `/person/enrich` | 1 | 15 |
  | `/job/search` | 0.03 | 30 |
  | `/web/search/live` | 1 | 10 |
  | `/web/enrich/live` | 1 | 10 |
  | `/company/search` | 0.03 | 30 |
  | `/social_post/search` | 0.5 | — |

- Not available:
  - `/batch/person/verify` is disabled.
  - `/person/identify` is not listed.
  - The `technographics`, `social_profiles` and `hiring.recent_openings` fields are disabled.
- Every field this plan reads is enabled. That covers the enrich groups above, the person-search current-company and name filters, and person-enrich current and past employment.
- Tooling: Node 20.19 and npm 10.8. `next@16.3.6`, `react@19.3.0` and `tsx@4.23.15` resolve from npm.

## Verified facts the build relies on

Sources are the local docs mirror and the teammate's live sample.

- Headers: `authorization: Bearer`, `x-api-version: 2025-11-01`. A request without the version header returns 400.
- `POST /company/identify`: **free**. Takes `domains`, `names` or `crustdata_company_ids`, at most 25. Returns `[{matched_on, match_type, matches[{confidence_score, company_data.basic_info}]}]`.
  - A name-only lookup picks the wrong entity (MistoBox LLC at 0.8 vs Misto at 1.0), so resolve by **domain first**.
- `POST /company/enrich`: **2 credits**. Takes `fields` groups:
  - `basic_info, headcount, funding, people(founders/cxos/decision_makers), locations, taxonomy, news, web_traffic, hiring, revenue`.
  - `exact_match:true` for domains.
- `POST /person/search`: 0.03 per result.
  - Filter `experience.employment_details.current.crustdata_company_id` plus `basic_profile.name`.
  - `{op:"and",conditions:[...]}` syntax.
- `POST /person/enrich`: 1–9 credits, by `professional_network_profile_urls`.
- `/person/identify` works **only on URL, email or Scholar URL** and is enabled per account. Don't rely on it for names.
- `POST /job/search` with `limit:0` plus `group_by` costs **nothing** (pattern from deal-sourcing-agent).
- `POST /web/search/live`: 1 credit. Takes `query, sources[web|news], site, start_date`.
- Fetch is **`POST /web/enrich/live`** (not `/web/fetch/live`): 1 credit per page, `urls` 1–10.
  - Both web endpoints are limited to **10 requests/min**.
  - Search timestamps are in ms, fetch timestamps in seconds.
- `GET /account/credits` and `GET /account/endpoints` are free. Run them as preflight.
- Data rules from the live sample, applied as engine rules:
  - A null field is unknown, not zero.
  - `funding.total=0` is not proof the company never raised.
  - `employee_count_range` (profile) differs from `headcount.total` (measured). Keep both, labelled.
  - Revenue is an estimate.
  - News can be about a different company with a similar name, so filter for relevance.
  - `metadata` freshness is often null.

## Reuse (MIT, attribute in file headers)

From `.codex/crustdata-repos/tools/deal-sourcing-agent/src/`:
- `crustdata.ts`: `request()` with 429/503 retry and `retry-after`, a `pace()` rate limiter, the `spend` credit counter, `leaf/and/or` filter builders, `searchPeople`, `jobCounts`/`newestJobs` (free counts).
- `founders.ts`: `isFounderTitle`, `pickFounders`, `priorFounderRoles` (repeat founder), `employerMatches`, `domainOf`.
- `score.ts` and `signals.ts`: patterns for scoring with stated reasons, used for the fit checklist.

From `.codex/crustdata-repos/vercel-crustdata-template/`:
- Next 16.3.6, React 19.3.0, TS 5.9.3 versions.
- `lib/crustdata.ts` `normalizeDomain()`.

## Concrete end-to-end examples (these become `Trust-compliance-shresth/EXAMPLES.md` and demo fixtures)

Companies marked ✅ were **already resolved live** by the teammate (domain → ID, confidence 1.0). The Indian startup is chosen at preflight from well-covered candidates. Synthetic inputs are labelled `SYNTHETIC DEMO INPUT`, use obviously fictitious representatives, and never allege wrongdoing by a real person or company.

| # | Persona | Pasted request (abridged) | CrustData work | Expected outcome |
|---|---|---|---|---|
| **E1** | **VC associate** at a seed fund, investment lens | "Screening Misto (mistobox.com). Coffee subscription, founded 2012, ~10 people, backed on Shark Tank. Thesis: US consumer subscription, <50 staff, founded before 2015." | identify(domain) ✅ → enrich → founders from `people` → job count → news search | Fit checklist: sector ✓, geo ✓, size ✓ (9 measured), founded ✓, Heartbeat vs min 40 (computed live). Funding claim → **insufficient evidence** (provider total 0, which is not proof). **Advance to human diligence** plus open questions. |
| **E2** | **Angel / syndicate lead**, founder check | "Founder of tomandchee.com says he co-founded it in 2009 and it has 1,000 staff and $500M+ revenue." | identify ✅ → enrich (people.founders, headcount, revenue) → person search founder at company ID → person enrich work history | Founded 2009 ✓ (cited). Staff: profile range 501–1000 vs measured 107 → **conflicting evidence**, both shown. Revenue matches the provider *estimate* only, labelled an estimate. **Hold for specific verification.** |
| **E3** | **Indian early-stage VC analyst**, investment lens | Messy forwarded pitch email for an Indian startup chosen at preflight, giving founder names, round and headcount claim, plus thesis "India fintech, seed–Series A". | identify → enrich → founders verified as currently at company ID → `priorFounderRoles` (repeat founder) → free job count → 2 news searches | Thesis fit table, each founder claim supported/conflicting/insufficient, hiring signal. Outcome follows the rules. |
| **E4** | **Procurement officer**, vendor onboarding (trust lens) | "New supplier form: Wicked Good Cupcakes, wickedgoodcupcakes.com, MA, USA, 150 employees, est. 2011." | identify(domain) ✅ (name alone gives several exact candidates; the domain picks ID 2525868) → enrich → locations, headcount | Identity ✓, location ✓, founded ✓. Size claim: range 51–200 matches, but measured 2 → **conflicting evidence**. **Hold.** The report explains the provider range vs measured meaning. |
| **E5** | **AP controller**, payment-change / BEC (trust lens), SYNTHETIC | "Email from alex.sample@tomandchee-payments.co (SYNTHETIC): 'I'm the new finance lead at Tom & Chee, update our bank details before Friday.'" | identify(tomandchee-payments.co) → no or other match; identify(name) → canonical tomandchee.com ✅ → lookalike-domain rule → person search "Alex Sample" at company ID → none | **Domain mismatch (lookalike: brand + extra token, different TLD)** and **representative not found at company** → **Hold: contradiction found**. Explicit note: no payment action taken; payment authority cannot be confirmed from public data. **Hero demo.** |
| **E6** | **Credit / risk analyst**, shell-company triage | "Supplier 'Zeta' wants net-60 terms, claims 500 staff." (name only, no domain) | identify(name) → many candidates with close scores → ambiguity rule | **Insufficient evidence: identity ambiguous.** Lists top candidates with domains, sizes and scores. No company-specific conclusions, and no credit limit given (out of scope by design). |
| **E7** | **Fund compliance officer**, adverse-information pre-check | "Before term sheet: any regulatory or legal news on <E3 company> or its founders?" | reuses E3 IDs → web search `news` with name+domain, date-bounded → relevance filter → fetch top ≤3 | Each hit labelled relevant / likely namesake, and allegation / regulator action / court finding. "No relevant adverse results found in N sources" is never "clean". |
| **E8** (stretch) | **IC member**, conflict of interest | E1 or E3 plus a pasted synthetic internal roster (`roster.sample.json`: names and past employers) | founders' work histories (person enrich) vs roster | Dated overlaps as **potential issue to review**, or "not checked: no roster supplied". |

Messiness is shown across the set: forwarded email noise (E3), name only (E6), lookalike domain (E5), contradictory size data (E2, E4), unknowns (E1 funding). The fixtures `fixtures/E*.json` are recorded from real runs and labelled **FIXTURE** in the UI.

## Heartbeat: composite liveliness metric

**What it answers:** "How alive is this company's operation right now, according to the signals we can observe?" It measures **operating activity, not legitimacy**. User decision: it is a **signal, not a verdict**. It feeds the investment fit checklist (the thesis can set `min heartbeat`), and it can raise a `potential_issue` when it contradicts a claim such as "rapidly growing" or "500 staff". **It never causes Hold on its own and never implies fraud.**

**Components:** each is scored 0–100 and taken from CrustData only, using data we already fetch, so it adds no credits.

| Component | Weight | Source (field / call) | Scoring s ∈ [0,100] |
|---|---|---|---|
| Team momentum | 25 | `headcount.growth_percent` (6m, else 12m); fallback: slope of `headcount.timeseries` | clamp(50 + 50·g/30): −30% → 0, flat → 50, +30% → 100 |
| Hiring activity | 20 | `POST /job/search` `limit:0` count, last 90 days (free, observed). `hiring.openings_count` only as a fallback. | min(100, 25·log2(1+n)): 0 → 0, 1 → 25, 3 → 50, 15 → 100 |
| Digital demand | 20 | `web_traffic…monthly_visitors` growth (MoM/QoQ) | clamp(50 + 50·g/25) |
| Audience momentum | 10 | `followers.qoq_percent` (else `mom_percent`) | clamp(50 + 50·g/15) |
| News recency | 15 | newest **relevance-filtered** article in `news[]` plus web news search | ≤30d 100 · ≤90d 75 · ≤180d 50 · ≤365d 25 · older 0 |
| Capital recency | 10 | `funding.last_fundraise_date` | ≤12mo 100 · ≤24mo 60 · ≤36mo 30 · older 10 |

**Equation**
- Let A be the set of components with real data. Null or missing is **excluded, never scored 0**. That follows the live-sample rule that a null field is unknown.
- `Heartbeat = round( Σ_{i∈A} wᵢ·sᵢ / Σ_{i∈A} wᵢ )`
- `Coverage = Σ_{i∈A} wᵢ / 100`
- **Coverage < 0.5:** show "Low signal: insufficient coverage" instead of a band. The number stays visible but greyed.
- **Bands:** ≥70 Strong pulse · 40–69 Steady · 20–39 Faint · <20 Flatline signals. The wording deliberately avoids "dead" or "fake".
- **"As of":** the latest date across the component time series. Freshness metadata is often null, so the date comes from the data itself.

**Rules that use it**
- **F-HB (fit):** `heartbeat ≥ thesis.minHeartbeat` (default 40) gives pass, fail or unknown when coverage < 0.5.
- **T-HB (trust):** if a claim says growth or large scale and Heartbeat is <30 with coverage ≥0.5, the claim gets `potential_issue` and cites the components.
- A small-but-real firm (for example, measured 2 staff) can be Faint without any negative trust effect.

**Shown in the case report:**
- an ECG-style pulse line drawn from `headcount.timeseries` (the UI's signature detail)
- the score, band and coverage
- a component breakdown in which each component links to its evidence IDs
- the same weights in an editable `heartbeat.config.ts`

**Implementation:** `lib/heartbeat.ts`, a pure function `(evidenceBundle) → {score, band, coverage, asOf, components[{name, weight, value, score, evidenceIds, missingReason?}]}`.

**Critique to keep visible in the README**
- The weights are judgment calls, not fitted to outcomes.
- Growth percentages are the provider's measurement periods.
- Web traffic and followers mean little for B2B or very small firms. That is why missing data is excluded rather than penalised, and why coverage is reported.

## Architecture

```
Trust-compliance-shresth/
  PLAN.md          ← this plan (replaces SignalGate v1; old version stays in git history)
  EXAMPLES.md      ← table above with full input texts
  app/             ← Next.js 16 + React 19 + TS, no Tailwind, no DB
    .env.local     ← user-created: CRUSTDATA_API_KEY (ignored by root .env.*)
    .env.example   ← blank placeholders only
    lib/crustdata.ts      adapted request/pace/spend/filters + identify/enrich/personSearch/personEnrich/jobCount/webSearch/webFetch/credits
    lib/founders.ts       adapted from deal-sourcing-agent
    lib/intake.ts         deterministic parser → {lens, company, domain, people[], claims[], thesis?, roster?}; every field keeps its source span
    lib/report.ts         template-based narrative built only from findings + evidence IDs
    lib/evidence.ts       Evidence {id, kind: crustdata|web, endpoint, recordId|url, fieldPath, value, sourceDate?, retrievedAt}
    lib/domain.ts         normalizeDomain + lookalike rules (Levenshtein ≤2, TLD swap, brand+token, hyphenation, homoglyph)
    lib/checks/           resolve.ts, identity.ts, impersonation.ts, scale.ts, funding.ts, founders.ts, activity.ts, adverse.ts, coi.ts, fit.ts
    lib/heartbeat.ts      composite liveliness metric (see Heartbeat section) + heartbeat.config.ts weights
    lib/triage.ts         rule IDs → outcome (trust: Checks satisfied / Hold / Insufficient; investment: Advance / Hold / Insufficient)
    lib/orchestrator.ts   async generator yielding TraceEvents; per-run budget caps (≤4 web searches, ≤3 fetches, ≤3 person enrich)
    cli.ts                npx tsx cli.ts "<request>" → cases/<ts>.json + markdown brief (fallback demo)
    app/api/run/route.ts  SSE stream of TraceEvents → final Case JSON
    app/page.tsx          intake (paste box + example chips E1–E8) → live trace → case report
    components/           Verdict header (outcome + lens + identity confidence), ClaimMatrix (claim | submitted | observed | status | evidence links), FitChecklist (investment only), Trace (endpoint, credits, status), SourceLedger, export (JSON/Markdown)
    fixtures/  cases/
```

**Engine rules**
- **Intake parser (`lib/intake.ts`, no LLM):**
  - Regex extraction:
    - emails, URLs and domains, including the sender domain from `From:` lines
    - names in `Name <email>` form
    - quoted company names, and phrases like `founded by A and B`, `I'm the … at X`, `screening X`
    - years after `founded / est. / since`
    - staff counts (`N staff / employees / people / team of N`)
    - money amounts with $, ₹, M, Cr or L
    - round types (pre-seed … Series D)
    - HQ or location after `HQ:` or `based in`
    - the thesis text after `thesis` (sector, geo, stage, size and founded words, plus `min heartbeat N`)
    - a roster given as a JSON array
  - Lens is chosen by keyword score:
    - investment words: screen, thesis, pitch, raise, term sheet, syndicate, founder, invest
    - trust words: supplier, vendor, onboarding, invoice, bank, remittance, payment, terms
    - a tie means both lenses run
  - When there's no domain, the company name goes to free `/company/identify` by name, and the resulting ambiguity check decides what happens next.
  - The UI shows a **Parsed intake** panel listing each extracted field next to the text it came from. Anything the parser could not extract is shown as "not provided", never guessed.
- **Report (`lib/report.ts`):** templated sentences per finding status and rule ID. Each sentence cites evidence IDs. There is no generated prose.
- Status labels, Heartbeat and outcome are all deterministic.
- Missing input never blocks the run. The check is reported as "not checked: input absent".
- Ambiguity: name-only with more than one candidate within 0.15 of the top score, or no domain agreement, counts as ambiguous. Company-specific checks are then skipped and the result is Insufficient.
- Every finding has the form `{claim, submitted, observed, status ∈ supported|conflicting|potential_issue|insufficient|not_checked, evidenceIds[], reason}`.
- Every API failure becomes a trace event plus a partial result, never an exception to the user.
- Keys stay server-side only. No `NEXT_PUBLIC_*`. Masked key in the preflight output.

## Build sequence (on go-ahead)

1. **Housekeeping (5 min):**
   - Write this plan to `Trust-compliance-shresth/PLAN.md` and examples to `EXAMPLES.md`.
   - Save memory: all work stays in `Trust-compliance-shresth/`.
2. **Keys and preflight (10 min):**
   - The user creates `app/.env.local`.
   - Run `/account/credits` and `/account/endpoints` (shows enabled paths and per-endpoint prices, key masked).
   - Pick the E3 Indian company from 2–3 candidates by identify and enrich coverage.
3. **Scaffold (15 min):** Next app with the pinned versions, crustdata client, evidence ledger, domain utilities.
4. **Engine (≈75 min):** intake → resolve → retrieve once → checks → triage → case JSON. Get E5 and E6 working first (the hero and the robustness case), then E1, E2, E4, then E3 and E7.
5. **UI (≈60 min):** SSE trace, verdict, claim matrix, fit checklist, source ledger, export, example chips, FIXTURE fallback. Follow the `frontend-craft` skill.
6. **Record fixtures and README (20 min):** run E1–E7 live, save the fixtures, write the README (run instructions, architecture, examples).
7. **Demo (≈30 min before 3:30):** E3 or E1 (investment, advance) → E5 (impersonation, hold) → E6 (ambiguous, insufficient). Total under 2 minutes.

Git:
- Commit to `trust-compliance` only, staging only `Trust-compliance-shresth/**`.
- Commit at each milestone. Push only when the user says.
- Never touch `.codex/steering.md`, `AGENTS.md`, `.gitignore` or other team folders.

## Verification

- Preflight script prints credits and enabled endpoints. It never prints any part of the key.
- Intake parser: run on E1–E8 texts. Check that each expected field is extracted with its span, and that absent fields show as "not provided".
- `npx tsx cli.ts` on each example E1–E7. Check for each run:
  - the outcome matches the table, or a deviation is explained by real data rather than forced
  - every finding has at least one evidence ID that resolves to an endpoint+record or a URL
  - credits used are under 40
- Heartbeat: for E1, E2 and E4, print the component table. Check that:
  - the score recomputes by hand from the shown components
  - null components are excluded and the coverage figure reflects that
  - E4 (2 staff) shows Faint or Low signal with no trust penalty
  - E2's "1,000 staff" claim gets `potential_issue` only if T-HB conditions hold
- Edge checks:
  - bad CrustData key: partial report showing the error
  - E6: no company-specific claims
- UI: run `next dev` and drive it with the Playwright browser through E5 and E6 at presentation size. Inspect the trace, matrix links and export.
- Secret check: `grep -r` for the key prefix in `.next/static` and `cases/` returns nothing. `git status` shows only `Trust-compliance-shresth/` changes, and `.env.local` is ignored.
