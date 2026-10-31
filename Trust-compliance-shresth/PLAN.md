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

**One-liner:** *SignalGate is an AI diligence desk. Paste any deal or vendor request and its agents investigate through CrustData's identity graph. Then they finish the job in your local systems: an IC-ready memo, an auditor-ready vendor file, or a payment held with a complaint-ready case file. A human sees only the exceptions.*

**Concept visuals:** see [concept/CONCEPT.md](concept/CONCEPT.md) and [concept/ui-mockup.png](concept/ui-mockup.png). The implementation visual contract is [UI-DESIGN.md](UI-DESIGN.md); Codex and Claude Code should follow it.

## LLM in use: Gemini, with fallbacks everywhere (2026-10-31, 12:10)

**Live test on the E5 text (`gemini-3.8-flash`):**
- Structured JSON extraction returned 200 in about 6.7 s, with a correct span for every field, using about 735 tokens.
- Function calling returned 200 in about 4.5 s and chose `company_identify`.
- Lesson: the model put `domains` and `names` in one identify call. CrustData accepts only one identifier type per call, so the tool wrapper must split them into two calls, domain first.

**Configured in `.env.local`:**
- `LLM_PROVIDER=gemini`
- `LLM_MODEL=gemini-3.8-flash`
- `LLM_FALLBACK_MODELS=gemini-flash-lite-latest`

**Fallback rule, applied to every LLM use:**
- Each LLM call runs `primary → fallback model(s) → OpenRouter (if key) → rules`.
- It falls back on 402, 429, any 5xx, a 20 s timeout, invalid JSON, or a schema or span-quote failure.
- Every fallback is recorded in the trace.

| LLM use | What Gemini does | Fallback (always present) |
|---|---|---|
| Intake | Schema extraction with span quotes and lens choice | Regex/rules parser. Both always run, and the UI shows where they disagree. |
| Investigator plan | Chooses the next tool calls and writes targeted web/news queries | Fixed rules playbook per lens |
| Namesake / other-event judging | Classifies each web hit as relevant, namesake, or a different event, quoting the evidence | Name+domain string-match rules (R-OTHER-EVENT) |
| Memo / case narrative | Prose built only from evidence IDs | Templated sentences |
| Never | Finding statuses, Heartbeat, outcome | Always rules |

**Budget:**
- At most 6 LLM calls per run, run in parallel where possible.
- About $0.01 per run.
- Expected latency is +10–20 s per run. The demo shows a streamed trace, so the wait is visible as progress.

## Time-boxed cut (critique, 12:10: about 3h20m left, nothing built yet)

The plan is larger than the remaining time. If the clock slips, things are cut in this order, and the build order already follows it:

1. **Must have (by about 1:45):**
   - Engine with the rules brain plus Gemini intake.
   - Cases E5, E3, E8 and E6 end to end, with local actions and the case JSON.
   - A CLI as the demo fallback.
2. **Must have (by about 2:45):** a single-page UI matching the mockup:
   - verdict
   - claim matrix
   - trace
   - Heartbeat
   - evidence ledger
3. **Should have:**
   - E1, E2, E4 and E7. The engine is the same, so these are mostly free once the rules exist.
   - Gemini investigator planning and namesake judging.
4. **Cut first if late:** E9 conflict of interest, OpenRouter, export polish, Exceptions inbox as a separate screen (it becomes a counter instead).
5. **Hard stop at 3:00:** record the video. Live runs are preferred, with fixtures as backup.

## Service, not tool: what "finished work" means

The event brief says: "Parts delivered rather than suppliers listed… Fraud caught rather than flagged… Bring in a human only for the exceptions, make every decision cite its reasons." A report alone is a flag. To count as a service, every run **ends with an action in a local system of record**, which the brief allows ("interact only with the team's local environment"). Nothing is ever sent outside.

| Service (paid today by) | Agent's finished work | Local action (simulated system of record) | Human only when |
|---|---|---|---|
| Pre-investment screen (VC analyst) | IC memo with thesis fit, Heartbeat, claim matrix and diligence questions | Deal added to `data/pipeline.json` as **Advance** or **Pass (reason)** | Hold: a contradiction needs a founder call |
| Founder verification (angel, syndicate) | Founder dossier with cited work history | Note on the syndicate deal record | Conflicting claims |
| Vendor onboarding / KYB-lite (procurement) | Auditor-ready vendor file | Vendor master `data/vendors.json` → **Approved**, **Rejected (reason)** or **Exception** | Identity unresolved or contradicted |
| Payment-change / BEC check (AP) | Complaint-ready case file | **Payment hold** written to `data/ap-queue.json`, plus a prepared (unsent) verification-callback task | Always an exception, by policy |
| Adverse-media check (compliance) | Dated dossier with allegation and finding labels | Compliance log entry | Relevant adverse hit |

All outputs are **prepared or simulated actions, clearly labelled**. There are no emails, calls or payments. The UI has an **Exceptions inbox**: the only screen a human has to open.

## Agents and the "brain" provision

Same tools, same guardrails, two brains you can swap:

```
                ┌───────────────────────── SignalGate ──────────────────────────┐
 messy request ─►  INTAKE AGENT        parse request → lens, entities, claims   │
 (email/form/   │       │              (LLM if enabled, else rules)             │
  pitch/tip)    │       ▼                                                       │
                │  INVESTIGATOR AGENT ──tools──► CrustData: identify · enrich · │
                │   plans next call,              person search/enrich · jobs · │
                │   stops on budget               web search/fetch              │
                │       │  evidence ledger (every fact → record ID / URL)       │
                │       ▼                                                       │
                │  VERIFIER (deterministic rules + Heartbeat) ── statuses, outcome
                │       │      LLM may *propose*, rules *dispose*               │
                │       ▼                                                       │
                │  CASE CLERK AGENT ──► memo / vendor file / case file          │
                │       │               + local action (pipeline, vendor master,│
                │       ▼                 AP hold) ── Exceptions inbox ► human  │
                └───────────────────────────────────────────────────────────────┘
   brain = LLM_PROVIDER: none (rules playbook) | openrouter | gemini
   guardrail on every tool call: allow-list, credit budget, no outbound comms
```

- **Rules brain (`LLM_PROVIDER=none`, the default and demo-safe):** a fixed playbook calls the tools in a set order. It always works, costs nothing, and gives the same result every time.
- **LLM brain (`openrouter` or `gemini`):** the LLM picks tools and drives the steps. It reads the messy intake, plans which CrustData calls to make next (including follow-up searches), and judges whether a news hit is about the same company or a namesake; that judgement must quote its evidence. It also writes the narrative from evidence IDs.
  - **It never sets a finding status, the Heartbeat or the outcome.** Those stay deterministic in the Verifier.
  - If an LLM call fails or runs out of budget, that step falls back to the rules brain, and the trace shows it.
- The trace shows **which brain made each decision**, with the tool name and arguments, plus tokens and credits used.
- `lib/llm.ts`: one OpenAI-compatible chat interface.
  - **OpenRouter:** `https://openrouter.ai/api/v1/chat/completions` with `tools` and `response_format`.
  - **Gemini:** direct REST, `generateContent` with function declarations.
  - Env: `LLM_PROVIDER`, `LLM_MODEL`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `LLM_MAX_CALLS_PER_RUN` (default 12).

**Allowed by the hackathon?** Yes. The event page FAQ says: "Build with any model, framework or tool, with or without Crustdata. Every project is judged on the same criteria either way." The PS rules require using CrustData's keys and identity graph, which we do, and require agents to interact only with the local environment and authorized APIs. An LLM API under our own key is an authorized API. Never send keys to the LLM, and never ask it to contact anyone.

**Gemini status (re-checked 2026-10-31, later):** **working**: `gemini-3.8-flash` and `gemini-flash-lite-latest` return 200 after the billing top-up. `gemini-2.5-flash` is closed to new users. Recommended LLM brain: `LLM_PROVIDER=gemini`, `LLM_MODEL=gemini-3.8-flash`. OpenRouter stays optional.

**OpenRouter models**, verified live from `openrouter.ai/api/v1/models` on 2026-10-31. All support tool calling and structured output. Prices are USD per 1M input/output tokens.

| Role | Model | Price | Est. per run |
|---|---|---|---|
| **Agent brain (recommended)** | `anthropic/claude-sonnet-5.5` | $2 / $10 | ~$0.05–0.15 |
| Budget brain, intake + relevance judging | `anthropic/claude-haiku-5.5` (or `openai/gpt-6-luna`) | $0.10 / $0.50 | <$0.01 |
| Gemini via OpenRouter | `google/gemini-3.8-flash` | $0.83 / $4.13 | ~$0.03 |
| Free fallback (rate-limited) | `google/gemma-4-31b-it:free` | $0 | 50 req/day, or 1,000/day after buying ≥$10 |

**Setting up OpenRouter (the user does this; never paste keys in chat):**
1. Sign in at openrouter.ai.
2. Go to **Settings → Credits** (`openrouter.ai/settings/credits`) and choose **Add credits**.
   - Payment: card (Stripe), AliPay or USDC. A platform fee is shown at checkout.
   - **$10 is enough for the whole hackathon**, and it also lifts free-model limits to 1,000 requests a day.
   - Unused credits can be refunded within 24 hours (fees excluded).
   - Indian cards must have international online transactions enabled. If a card is declined, try another card or USDC.
3. Go to **Settings → Keys** (`openrouter.ai/settings/keys`), create a key named `signalgate-hackathon`, and give it a credit limit (for example $10) if the form offers one. Copy it, because it is shown only once.
4. Add to `Trust-compliance-shresth/app/.env.local`:

   ```dotenv
   LLM_PROVIDER=openrouter
   LLM_MODEL=anthropic/claude-sonnet-5.5
   OPENROUTER_API_KEY=...
   ```

5. Preflight checks `GET https://openrouter.ai/api/v1/key` (remaining limit) without printing the key.

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

## Concrete end-to-end examples: US + India, built on Shark Tank companies

**Demo theme: the Shark Tank Diligence Desk.**
- Every company below appeared on Shark Tank US or Shark Tank India. That gives public claims (asks, deals, founders) to check against CrustData's graph.
- The core question, "did the deal hold up, and is the company still alive?", is what an investor, vendor desk or credit desk actually pays to have answered.
- The examples are paired across both markets.
- Full input texts are in [EXAMPLES.md](EXAMPLES.md).

✅ marks companies already resolved live by teammates on 2026-10-31.

| # | Market | Persona → service | Company | What the run must catch | Expected outcome |
|---|---|---|---|---|---|
| **E1** | US | VC associate → pre-investment screen | Misto (mistobox.com) ✅ id 2436762 | Name lookup picks MistoBox LLC at 0.8; the domain gives Misto at 1.0. Funding total of 0 is not proof of no raise. | **Advance**, with "Shark deal: insufficient evidence" |
| **E2** | US | Angel → founder-claim check | Tom + Chee (tomandchee.com) ✅ id 1228597 | "1,000 staff": profile range 501–1000 vs measured 107. Revenue $500M–1B is only an estimate. | **Hold**: conflicting evidence |
| **E3** | **India** | India VC analyst → screen of a messy forwarded pitch | BluePine Foods (bluepinefoods.com) ✅ id 12347153 | Input names it "BluePine Industries" (no match) and the agent recovers it by domain. The ₹75L Shark Tank India deal is **absent from CrustData funding** but present on the web. Co-founder Naveen Panwar **left in Oct 2023**. Headcount is 4 against a claimed ~20. | **Hold**, with an ask for the cap table |
| **E4** | US | Procurement officer → vendor onboarding | Wicked Good Cupcakes (wickedgoodcupcakes.com) ✅ id 2525868 | Name alone gives several exact candidates, so the domain decides. Range 51–200 vs measured 2. | **Exception (Hold)**: size conflict, entered in the vendor master as Exception |
| **E5** | **India** | AP controller → bank-change / BEC check (**SYNTHETIC**) | BluePine Foods vs `bluepinefoods-payments.in` | Lookalike domain (brand plus extra token, different TLD). The fictitious "Rohit Sample" is not found at company id 12347153. | **Hold**: payment hold written to the AP queue, plus a complaint-ready case file |
| **E6** | **India** | Credit analyst → supplier triage | "Zeta" (name only) | Many close identify candidates | **Insufficient**: candidates listed, no conclusions |
| **E7** | **India** | Compliance → adverse-info pre-check | BluePine Foods (reuses E3 IDs) | A web hit about "₹50L for 20% with Varun Alagh" is **a different pitch**, so it must be rejected. Relevant hits are labelled. | Dossier with labelled hits, never "clean" |
| **E8** | US | VC → follow-on / zombie check | VerbalizeIt (verbalizeit.com) id 1919920 | **Acquired by Smartling in 2016**, yet `status=active` (a contradiction). The 45 "employees" are stale profiles. The ~700K visits and $27K/mo ads belong to the acquirer's redirect. Founders left within 0–5 months of the acquisition. | **Pass: not an independent company**. Heartbeat shows ghost signals that are excluded. |
| **E9** (stretch) | US/India | IC member → conflict of interest | E1 or E3 plus a synthetic roster | Overlaps between founder history and roster | Potential issue, or "not checked" |

Messiness covered: wrong company name (E3), forwarded-email noise (E3), name only (E6), lookalike domain (E5), contradictory size (E2, E4), missing funding (E1, E3), acquired zombie (E8), a different event about the same company (E7), mixed ₹/$ units (E3, E5).

The fixtures `fixtures/E*.json` are recorded from real runs and labelled **FIXTURE** in the UI.

### Data-quality rules learned from the live research (apply in `lib/checks/`)

- **R-NAME-RECOVERY:** if a name doesn't match, retry stripped variants (Industries, Pvt Ltd, Inc, LLC, Technologies), then any domain or URL found in the text. The report shows "input name differs from canonical name".
- **R-DOMAIN-FIRST:** a domain match (confidence 1.0) beats any name match. Rejected name candidates are kept with the reason (industry or description mismatch).
- **R-ACQUIRED:** `funding.acquired_by`, or `acquisition_status=acquired`, marks the entity as absorbed.
  - The investment lens returns **Pass: not independent**.
  - If `all_domains` contains the acquirer's domain, or the site redirects, web traffic and SEO are attributed to the acquirer and **excluded from Heartbeat**.
  - Headcount is labelled "may include stale profiles".
- **R-STATUS-CONFLICT:** `status=active` together with acquired is flagged as a conflict in the provider's own data.
- **R-DEPARTED:** a person claimed as current but with an `end_date` on that employer is marked **conflicting**, citing the end date.
- **R-FUNDING-GAP:** a deal claimed on the web (e.g. a Shark Tank offer) but missing from CrustData funding is marked **conflicting sources**: "deal may not have closed as aired; request cap table". Neither source is overruled.
- **R-OTHER-EVENT:** a web hit naming the company but with different deal terms or investors is labelled **different event**, and ignored.
- **R-SELF-DESC:** the company's own description (e.g. "pitched at #sharktankindia") is accepted as **self-reported** support only, labelled as such.
- **R-UNITS:** ₹ lakh and crore are parsed (1 L = 100,000; 1 Cr = 10,000,000 INR) and kept in their original currency. CrustData funding is in USD. Values in different currencies are never compared numerically without a labelled conversion. Presence and absence comparisons are fine.
- **R-VOLATILE:** web traffic that swings more than 3× within 3 months is marked volatile, and its Heartbeat weight is halved.

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
    .env.local     ← user-created: CRUSTDATA_API_KEY; optional LLM_PROVIDER, LLM_MODEL, OPENROUTER_API_KEY, GEMINI_API_KEY (ignored by root .env.*)
    lib/llm.ts            optional brain: OpenRouter / Gemini adapter, tool-calling loop, per-run call cap, falls back to rules
    lib/agents/           intake.ts, investigator.ts (tool loop over lib/crustdata), clerk.ts (deliverable + local action)
    lib/actions.ts        local system-of-record writes: data/pipeline.json, data/vendors.json, data/ap-queue.json, exceptions inbox
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
- **With an LLM brain enabled:** the LLM's intake extraction must quote a source span for each field, or that field is dropped. Its tool calls go through the same allow-list and budget guard. The rules parser runs alongside it, and the UI shows any disagreement between the two.
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
   - Done: E3 company is BluePine Foods (id 12347153). Free identify confirms the E1–E8 IDs before the first paid call.
3. **Scaffold (15 min):** Next app with the pinned versions, crustdata client, evidence ledger, domain utilities.
4. **Engine (≈75 min):** intake → resolve → retrieve once → checks → triage → case JSON. Build it as agents (intake, investigator, clerk) with the rules brain first. Get E5 and E6 working first (the hero and the robustness case), then E1, E2, E4, then E3 and E7.
   - Clerk writes local actions: pipeline, vendor master, AP hold, exceptions inbox.
4b. **LLM brain (≈30 min, only if an OpenRouter or Gemini key with credit is present):**
   - `lib/llm.ts` adapter.
   - LLM intake with span quotes.
   - LLM investigator tool loop over the same tool registry and guards.
   - Namesake judging.
   - The demo shows the same case with both brains.
5. **UI (≈60 min):** SSE trace, verdict, claim matrix, fit checklist, source ledger, export, example chips, FIXTURE fallback. Follow the `frontend-craft` skill.
6. **Record fixtures and README (20 min):** run E1–E7 live, save the fixtures, write the README (run instructions, architecture, examples).
7. **Demo (≈30 min before 3:30):** under 2 minutes:
   - E3 BluePine (India, messy input → Hold, ask for cap table)
   - E5 BluePine BEC (India, synthetic → AP hold plus case file)
   - E8 VerbalizeIt (US, acquired zombie → Pass, ghost Heartbeat signals)
   - If time allows, E6 Zeta (ambiguous → Insufficient)

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
- Agents and actions:
  - Every run ends with a local action, written to the system-of-record JSON, plus a deliverable.
  - Hold cases appear in the Exceptions inbox.
  - Nothing is sent outside the machine.
- Brain swap:
  - Run E5 with `LLM_PROVIDER=none`, then with `openrouter`. Both must reach the same outcome.
  - The trace shows which brain decided each step.
  - Kill the LLM key mid-run: the run falls back to rules and the fallback is visible.
- Edge checks:
  - bad CrustData key: partial report showing the error
  - E6: no company-specific claims
- UI: run `next dev` and drive it with the Playwright browser through E5 and E6 at presentation size. Inspect the trace, matrix links and export.
- Secret check: `grep -r` for the key prefix in `.next/static` and `cases/` returns nothing. `git status` shows only `Trust-compliance-shresth/` changes, and `.env.local` is ignored.
