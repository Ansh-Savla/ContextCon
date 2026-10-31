# Heartbeat: CrustData data readiness

Checked **31 October 2026, 11:40–11:43 IST**, using the local `CRUSTDATA_API_KEY` and API version `2025-11-01`. No key is included in the artifacts. This is a data-access assessment, not a completed company investigation.

**Verdict: ready to build an evidence-backed partial-report MVP. Not ready to promise complete verification across all five checks or a complete 12-month activity timeline for arbitrary companies.** Identity, professional affiliations, workforce history, and some public activity are accessible. Registration, representative authority, internal disclosures, and reliable adverse-information coverage remain gaps.

## What was actually checked

Reused the three existing company enrichment responses rather than buying the same records again. Made live account, company identification, person enrichment/search, job search, web search/fetch, and indexed social-post search calls. The CrustData MCP server is not connected in this session; used the official REST API with the local official skills and documentation instead. No outreach, watches, verification jobs, or external transactions were created.

Starting balance: **15,194 credits**. Final balance: **15,174.77 credits**. Incremental spend: **19.23 credits**, matching the sum of returned `X-Credits-Used` headers. The earlier company enrichment cost of 6 credits is excluded. Available credits establish access today, not a permanent allocation.

Raw calls, request bodies, timestamps, status codes, duration, credit headers, and responses: [`../research/crustdata-sample/heartbeat/`](../research/crustdata-sample/heartbeat/). This directory inherits the existing Git ignore rule. Probe scripts are in ignored `tmp/heartbeat_probe.py` and `tmp/heartbeat_round1.py`; they are exploratory code, not a production client.

## Access and implementation contract

| Capability | Current account | Observed result | Implementation rule |
| --- | --- | --- | --- |
| `POST /company/identify` | Enabled, 30 requests/min | All three exact domains resolve, confidence 1.0 | Preserve candidates, matched-on values and IDs; don't resolve names by first result |
| `POST /company/enrich` | Enabled, 15/min, base 2 credits/match | Existing three responses have identity, headcount history, locations, news | Reuse resolved ID with `exact_match: true`; select permitted fields |
| `POST /person/search` | Enabled, 30/min | Wicked Good Cupcakes returns one current employee, even though company `people` is empty | Search by canonical company ID as a fallback; empty embedded people is not proof of no people |
| `POST /person/enrich` | Enabled, 15/min, base 1 credit/match | Roger David exact profile match, ID 356634, dated current/past roles | Input is `professional_network_profile_urls`, not person IDs; request `experience` explicitly |
| `POST /job/search` | Enabled, 30/min | HTTP 200, zero indexed jobs for each of the three domains | No indexed records is unknown hiring activity, not proof of no hiring |
| `POST /web/search/live` | Enabled, 10/min, 1 credit/query | Five queries succeed technically; broad/date-bounded queries have poor relevance | Validate entity, source and date before accepting evidence; cap follow-ups |
| `POST /web/enrich/live` | Enabled, 10/min, 1 credit/URL in this run | Three of four URLs fetched successfully; one per-URL 504 | Parse each item's `success`; HTTP 200 can contain failed pages |
| `POST /social_post/search` | Enabled; effective rate limit returned null; 0.5 credit/post | Canonical company-author filters return dated posts for two companies | Optional indexed activity source; do not request reactors/comments; apply explicit dates and limits |
| `/batch/person/verify` | Disabled | Not called | Skip with reason; no verification verdict available |
| Live person enrichment/search and live social enrichment/search | Disabled | Not called | Cached profiles/posts cannot be presented as freshly verified |
| `/person/identify` | Absent from the returned endpoint inventory | Not called; access unestablished | Do not require it for MVP: exact-profile enrichment returns identity and match confidence |
| Watch endpoints | Absent from returned inventory | Not called | Outside this workflow; access unestablished |

All batch endpoints returned disabled. Synchronous endpoints can still accept their documented small multi-identifier requests. Do not confuse disabled asynchronous batch products with synchronous array inputs.

**Route correction:** the official Fetch API and this account use `/web/enrich/live`. `/web/fetch/live` in the separate SignalGate plan is not the documented route. Headers remain `Authorization: Bearer …` and `x-api-version: 2025-11-01`; current official docs agree with the mirror on that version.

**Pricing correction:** the generic skill's “identify is free” shortcut applies to company identification here. Official person-identify documentation says 1 credit per matched identifier, and access to that route has not been established. Use account pricing and current endpoint docs over the shortcut.

## Coverage against the Heartbeat checks

| Check / component | Usable data | Remaining evidence boundary |
| --- | --- | --- |
| Business identity, 35% | Company ID, exact domain, name, description, location and company profile | CrustData `status` and founding year do not establish legal registration. No registry lookup was verified in this exercise. Keep registration unresolved until an authoritative jurisdiction-specific record is retrieved and matched |
| Representative consistency, 25% | Exact-profile person identity, employer company IDs, titles, dates, multiple current roles | No evidence of mailbox control, signing authority or identity-document verification; name-only matching remains ambiguous |
| Operating claims and activity, 30% | Dated headcount observations, fetched product sites, company-authored social posts | Workforce is indirect; posts are self-published marketing, not delivered work or revenue. No complete independent 12-month event history established |
| Relationship disclosures, 10% | Dated current/past company affiliations can be compared | No authorized internal roster or disclosures supplied. Leave unresolved; do not fabricate relationships or call ordinary overlaps conflicts |
| Corroboration/adverse follow-up | Targeted search can discover sources; fetch returns original HTML | Search relevance is weak in this sample. No reliable adverse finding or clean-record conclusion established; fetch and entity-match each material source |

No Heartbeat score was calculated: there is no submitted claim checklist, registry evidence, or roster against which to assess these companies. Data availability alone is not a company trust score.

## Company selection and timeline evidence

| Company / canonical ID | Workforce history in 2025-10-31 through 2026-10-31 | Jobs | Indexed company posts | Suggested use |
| --- | --- | --- | --- | --- |
| Misto / 2436762 | 44 points across 10 calendar months; latest 2026-08-31, 9 employees | 0 returned | 0 indexed | Identity, accessible product site, workforce trend, sparse-data example |
| Wicked Good Cupcakes / 2525868 | 40 points across 10 months; latest 2026-09-18, 2 employees | 0 returned | 53 all-time; 37 match the date window; inspected newest 12 | Best tested candidate for a partial activity demo; person-search fallback works |
| Tom & Chee / 1228597 | 45 points across 11 months; latest 2026-09-08, 107 employees | 0 returned | 16 all-time; newest returned is 2023-08-11 | Best tested representative-history example; recent social activity remains unestablished |

These counts are provider observations, not independent company facts. Window month counts include partial boundary months. Series stop before the retrieval date: never carry the last value forward as a newly observed month. Headcount history belongs in a separate trend, not in the event histogram.

Wicked Good Cupcakes' inspected 12 posts span **May–August 2026**, not the full year. The total-count query reports 37 posts in the window, but the older 25 were not retrieved. Do not infer monthly counts or event diversity for uninspected pages. Repeated marketing messages must be grouped by underlying event; one post is not automatically one business milestone. Provider `date_posted` values were retained, not independently authenticated.

Example evidence suitable for the ledger:

- Product marketing observation: [football-season cupcake offer](https://www.linkedin.com/posts/wickedgoodcupcakes_dont-leave-desserts-out-of-your-football-activity-7491083690773712896-8nZn), provider date `2026-08-06T11:41:31Z`; `social-wicked-window.json`, `data.posts[0]`. Supports that the company published an offer, not that orders were fulfilled.
- Product marketing observation: [Wicked Good Brownies offer](https://www.linkedin.com/posts/wickedgoodcupcakes_wicked-good-brownies-make-the-perfect-dessert-activity-7484930890167386112-Y6x4), provider date `2026-07-24T01:41:31Z`; `data.posts[1]`. Distinguish a marketed product from a verified launch date.
- Professional affiliation: `person-roger.json`, `data[0].matches[0].person_data.experience.employment_details.current[1]` records Tom & Chee, company ID 1228597, CEO / President, start `2017-10-01`, end null. His top-level `basic_profile.current_title` is “Official Member” from another affiliation. Compare the relevant employment row rather than treating that headline difference as impersonation.
- Person-search fallback: `people-wicked.json`, `data.profiles[0]`, person ID 94100208, current employment joined to company ID 2525868. This is an employee example, not evidence of founder or representative authority.

Fetched sources: [Misto homepage](https://www.mistobox.com/), [Wicked Good Cupcakes homepage](https://www.wickedgoodcupcakes.com/), and [Tom & Chee franchise press archive](https://franchise.tomandchee.com/category/tom-chee-press/) returned HTML. They can support excerpts about what the sites say; retrieval timestamps are not publication dates. The Tom & Chee main homepage returned `success:false`, `ORIGIN_UNAVAILABLE`, target status 504, `retryable:true` inside an HTTP 200 API response. That failed URL was still billed in this run.

## Quality and failure cases confirmed

1. Exact-domain re-identification reproduces the earlier company IDs and confidence 1.0. This confirms matching consistency, not legal identity.
2. Synthetic nonexistent domain `heartbeat-demo-20261031-no-match.com` returns HTTP 200 with `matches: []`, at zero credits. Return an unresolved identity, not a score or accusation. No website request was made to this domain.
3. Synthetic `.invalid` input caused HTTP 400 for the entire mixed identify request, zero credits. Validate inputs and isolate malformed identifiers so one bad input cannot hide valid matches.
4. Broad Tom & Chee activity/adverse searches returned unrelated restaurant, political/legal or other-company pages. Even exact-domain adverse search returned mostly unrelated results. Reject these; no adverse finding was substantiated in this assessment.
5. Domain-restricted `site:tomandchee.com news` produced relevant franchise pages, but also opaque Google redirect URLs. Store the returned URL and original final URL separately when resolved; do not cite an opaque redirect as an authenticated primary source.
6. No hiring fields, no search results, absent metadata, estimated revenue and company news collisions retain the limitations in the earlier [sample report](shark-information-crust-data-provides.md).

## Build gate and bounded retrieval recipe

Proceed with one server-side workflow that can always finish a partial report. For each case: preflight account access/credits, validate inputs, identify company, enrich once, enrich one supplied exact representative profile or run a small canonical-company person search, fetch a primary page, then run at most two targeted corroboration/adverse queries and fetch material results. Add one date-bounded social query only if it improves activity evidence. Jobs are optional and often empty for these examples.

Use **20 credits as a hard per-case demo ceiling**, with a smaller planned budget when possible. Count search field/filter premiums, fetched failures and social results. A typical planned bundle is 2 company + 1 person + 2 web queries + 2 fetch URLs + up to 3 social credits = 10 credits, before optional search premiums. Check actual account rates before quoting this estimate. Reuse cached records and fetched URLs; this exploration deliberately repeated three social rows for window validation and should not be copied as the production call sequence.

Enforce endpoint rate limits, bounded exponential backoff for 429/temporary failures, per-call timeouts and a stop budget. A null rate limit means unknown, not unlimited. Do not retry nonretryable 400/403s. These controls are implementation requirements, not features verified by the scratch probes.

The implementation should distinguish `usable`, `empty`, `disabled`, `unmatched`, `ambiguous`, `failed`, `stale` and `not_checked`; retain raw paths, source dates, retrieval times and credit use. Evidence requires entity match, a usable excerpt/field and a claim-specific interpretation. Cached provider evidence and self-published pages are not independent corroboration of each other merely because different endpoints returned them.

**Before claiming a fully covered demo:** select and verify an official register for the chosen legal entity/jurisdiction; supply an authorized or clearly synthetic internal roster if disclosures are demonstrated; inspect dated activity across the intended period. Until then, registration and disclosures remain unresolved and timeline gaps remain unknown. Keep the pipeline's neutral placeholders, coverage reporting, identity gate and material-contradiction override.

## Official references checked

[Account permissions](https://docs.crustdata.com/api-reference/account-apis/list-endpoint-permissions-and-rate-limits), [web search](https://docs.crustdata.com/api-reference/web-apis/web-search), [web fetch](https://docs.crustdata.com/api-reference/web-apis/web-fetch), [person enrichment](https://docs.crustdata.com/api-reference/person-apis/enrich-person-profiles-from-cached-dataset), [job search](https://docs.crustdata.com/api-reference/job-apis/search-the-indexed-job-dataset), [indexed social search](https://docs.crustdata.com/api-reference/social-post-apis/search-the-social-post-dataset). The account response is the authority for this key's access; documentation describes broader product capability.
