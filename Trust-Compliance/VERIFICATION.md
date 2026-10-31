# Observed verification

## Good-versus-bad discrimination, 31 October 2026 (afternoon)

A live comparison exposed that the system did not separate good from bad companies: all 11 cases returned "insufficient evidence", a company with two false claims outscored Stripe, and Theranos was not held. Fixes were general rules, not per-case tuning; three cases unseen during the fixes (Freshworks, Byju's, a Notion lookalike domain) were added before re-running.

| Case | Outcome after fixes | Basis |
|---|---|---|
| Razorpay, PostHog + true claims | continue with diligence | Identity, website, founders, activity |
| Stripe, Zerodha, Beyond Snack | insufficient evidence (54–59) | Coverage just under 60% |
| Linear (name only) | insufficient: ambiguous | Two real "Linear" companies; supply a domain |
| Theranos, FTX, Byju's | hold | Quoted dissolution / Chapter 11 / loan-misappropriation lawsuit |
| Stripe and Notion on lookalike domains | hold | Lookalike of the company's known domain |
| Razorpay + false founding year/country | hold | Contradicted submitted claims |
| Geek Chic (Sightline memo) | hold | Quoted closure and bankruptcy from our own search; CrustData still says active |
| TagZ (Sightline memo) | hold | Team's distress-sale flag confirmed from retrieved press; founding year independently corroborated |
| Freshworks | hold | IPO securities class action; defensible but shows litigation sensitivity |
| Made-up companies | insufficient evidence, 0/100 | Unmatched |

Scoring: unresolved checks now score 0 (a fabricated company is 0/100), and checks that cannot apply (no representative, no roster) are excluded. Known limits: page fetches can time out (retry intentionally not added), and model extraction of comparable values from retrieved pages is inconsistent (Beyond Snack's pages were retrieved but yielded no independent corroboration).

## Claim-driven correction, 31 October 2026

The corrected implementation passes **23 distinct automated checks**, including the prior 16. The paired-input integration check proves that acquisition context changes the actual CrustData search, retrieves an external original-page candidate, supports the scoped assertion and revises `operations.claims`. Additional regressions cover supplied-URL fetching, exclusion of upstream citations/syndication from independent corroboration, reversal when conflicting evidence arrives, reversed acquisition direction, stale/incomparable snapshots, and inference handling. These checks use labeled synthetic companies and controlled HTTP transports.

Live correction runs completed with Gemini planning and assessment:

| Input | Duration | Credits used/reserved | Observed behavior |
|---|---:|---:|---|
| Structured investment-team example | 52.56s | 11 | 18 traceable assertions; supplied founder profiles used; acquisition-date-specific search; scoped field agreements; undated status/estimates unresolved |
| Name-only PostHog regression | 29.68s | 3 | Autonomous research, bounded follow-up and partial result |

Artifacts: `heartbeat-data/claim-context-live.json` and `heartbeat-data/claim-nameonly-live.json`. The richer run's final page retrieval hit the research deadline; it retained prior evidence and explicitly reported the incomplete follow-up. No independent acquisition corroboration is claimed from that run. These results are partial-report verification, not complete company verification. Source retrieval quality and model extraction remain bounded; fabricated/unreproducible quotations were rejected.

The sections below preserve earlier baseline verification and timing observations.

Run on **31 October 2026**, approximately **12:18–12:27 IST**. These are engineering checks, not investment conclusions or the team's chosen demo targets.

## Controlled checks

`python scripts/verify_heartbeat.py` passes **16 checks** using synthetic entities and HTTP transports. No paid calls occur in this suite.

Coverage includes a full persisted case and cache replay; zero-credit execution; ambiguous/unmatched identity; material canonical-name/domain disagreement; disclosed affiliation agreement and professional overlap without a conflict allegation; structured claim mismatch; HTTP-200 per-URL fetch failures; timeout billing reservations; 429 retry and no retry on 403; a short run deadline; exact quote/date validation and event grouping; rejected namesakes; unknown timeline months; secret redaction; Gemini 503 → Featherless; and increased token budget after empty thinking-model output.

## Live providers

Both requested models returned HTTP 200 and usable JSON on the final provider probe:

| Provider/model | Probe duration | Result |
|---|---:|---|
| Gemini `gemini-flash-lite-latest` | 1.22s | One proposed claim and one event |
| Featherless `deepseek-ai/DeepSeek-V4.1-Flash-1017` | 2.62s | One proposed claim and one event |

Both were also used for complete company investigations. Featherless's final full extraction took 17.46s and used 6,871 completion tokens, illustrating why a 4,096-token thinking-model cap is unsuitable here. Actual overload was not observed; fallback was verified with a controlled 503 response.

## Company investigations

Earlier live discovery runs established the cache and source coverage:

| Case | Duration | Credits used or conservatively reserved | Observation |
|---|---:|---:|---|
| PostHog, initial uncached run | 64.05s | 13.09 | Partial result; slow combined page fetch exposed a latency issue |
| Razorpay, uncached name-only run | 45.99s | 13.09 | Identity, people, website, jobs, posts and evidence-backed partial report |
| PostHog, cache plus updated page retrieval | 30.42s | 3.00 | Homepage/page separation completed; sourced timeline and claims |
| PostHog, Featherless full run | 29.72s | 1.00 | Complete alternate-provider workflow |

The initial run exposed a Windows stdout Unicode error after the report had been saved; UTF-8 CLI output was fixed and subsequent CLI runs exited successfully. Page retrieval now uses independent homepage fetching and per-request wall-clock limits.

The final reproducible `python scripts/verify_heartbeat.py --live` run completed all five scenarios:

| Scenario | Duration | New CrustData credits | Outcome |
|---|---:|---:|---|
| US name-only, Gemini | 6.74s | 0 | Resolved; insufficient evidence |
| India name-only, Gemini | 6.72s | 0 | Resolved; insufficient evidence |
| Alternate model, Featherless | 20.59s | 0 | Resolved; insufficient evidence |
| Clearly fabricated name/domain mismatch | 2.93s | 0 | Hold for specific verification |
| Clearly fabricated unresolved company name | 2.79s | 0 | Ambiguous; insufficient evidence, 50/100, 0% coverage |

The zero-credit final runs reused timestamped CrustData records gathered in the earlier paid runs. They still made live account/register/model requests. They are **not uncached timing benchmarks**. Report usage sums across the four earlier engineering runs are **30.18 credits used or conservatively reserved**, within the authorized 500-credit development allowance. Model costs are separate from CrustData credits.

Resolved final cases returned 75.42/100 with 50.83% evidence coverage, explicitly **provisional and insufficient evidence**. Registration, representative authority, independently established operating claims and internal disclosure coverage remain gaps; a positive-looking score does not override them.

## Local proof artifacts

- `heartbeat-data/verification/summary.json`: provider traces, scenario results and case IDs.
- `heartbeat-data/verification/*.json`: complete case reports.
- `heartbeat-data/heartbeat.sqlite3`: stored case reports and indexed evidence records.
- `heartbeat-data/raw/<case_id>/`: raw source responses and model extraction payloads.
- `heartbeat-data/razorpay-live.json`, `posthog-live-v2.json`, `posthog-featherless.json`: earlier development reports.

All raw artifacts are ignored by Git. Each final scenario checked that finding references resolve to stored evidence and credit/duration ceilings were respected. No messages, outreach, watcher creation or external transactions occurred.
