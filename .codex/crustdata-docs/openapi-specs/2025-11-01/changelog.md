> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Changelog

> Product updates and announcements for the Crustdata API.

**October 2026**

NAICS and SIC on company search

## Company Search: filter on and return NAICS and SIC codes

`POST /company/search` now takes the primary NAICS classification and the SIC
code list that Company Enrich already serves. Filter on any of nine paths under
`taxonomy.primary_naics_detail.*` and `taxonomy.sic_detail_list.*`, and get
both objects back with each result.

* **Nine filter paths.** `taxonomy.primary_naics_detail.naics_code`,
  `.sector`, `.sub_sector`, `.industry_group`, `.industry`, and `.year`, plus
  `taxonomy.sic_detail_list.sic_code`, `.industry`, and `.year`. The text
  paths take `=`, `in`, `contains`, `(.)`, and `[.]`. The integer `year`
  paths take the range operators. None of them is sortable. See
  [Taxonomy](https://docs.crustdata.com/company-docs/search/reference.md#taxonomy).
* **Returned with the `taxonomy` group.** `taxonomy.primary_naics_detail` and
  `taxonomy.sic_detail_list` come back as part of `taxonomy`, or on their own
  when you name either object or a leaf under it in `fields`. The shape is the
  same as on [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/reference.md). A company
  with no classification returns `null` for both.
* **Cross-entry SIC matching.** Two `sic_code` conditions under `and` match a
  company whose list holds both codes, even in different entries. `has_all`
  with the same codes returns the same companies.
* **No price of their own.** Both objects ride inside the `taxonomy` group.

```json theme={"theme":"vitesse-black"}
{
    "filters": { "field": "taxonomy.primary_naics_detail.naics_code", "type": "=", "value": "541511" },
    "fields": ["basic_info.name", "taxonomy.primary_naics_detail", "taxonomy.sic_detail_list"],
    "limit": 1
}
```

Available on `POST /company/search` with `x-api-version: 2025-11-01`.

**October 2026**

Polygon location filters

## Search: `geo_polygon` on company, person, job and social post search

Every search endpoint that takes `geo_distance` now also takes `geo_polygon`,
so you can keep the records inside an area you outline on a map instead of a
circle around one point. The value is an object with a single `points` key: a
list of `[lat, lng]` pairs, at least 3 distinct points and at most 1,000. The
ring closes itself, so repeating the first point is optional. Points are used
as given and are not geocoded.

* **Same fields as `geo_distance`.** `locations.headquarters` on
  [Company Search](https://docs.crustdata.com/company-docs/search/reference.md#geo_polygon-inside-a-polygon),
  the location fields on
  [Person Search](https://docs.crustdata.com/person-docs/search/reference.md#geo_polygon-inside-a-polygon),
  `location` on [Job Search](https://docs.crustdata.com/job-docs/search/reference.md#geographic-polygon-filter-geo_polygon)
  and `actor.location` on
  [Social Post Search](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md#geographic-polygon-filter-geo_polygon).
* **Strict input.** Fewer than 3 distinct points, a malformed pair, an
  out-of-range coordinate, crossing edges or a revisited point return `400`
  with a message naming the problem.
* **Nothing else changed.** `geo_distance` and `geo_exclude` keep their value
  object, and existing requests are unaffected.

```json theme={"theme":"vitesse-black"}
{
    "field": "locations.headquarters",
    "type": "geo_polygon",
    "value": { "points": [[37.81, -122.52], [37.81, -122.35], [37.70, -122.35], [37.70, -122.52]] }
}
```

Available with `x-api-version: 2025-11-01`.

**October 2026**

Research profiles

## Person: academic author profiles on enrich and search

`research_profiles` is a new field group on `POST /person/enrich` and
`POST /person/search`. It carries the person's matched academic author
profiles: citation metrics, publications, co-authors, and research interests.
It is enabled per account, so ask your Crustdata contact to turn it on. Without
the grant, naming it returns `403` with `Access denied to fields:
  research_profiles`.

* **`research_profiles[]`** on enrich is an array, best match first, because one
  person can hold more than one profile. Each profile carries `id`,
  `profile_url`, `name`, `designation`, `affiliated_organisation`,
  `verified_email_domain`, `website`, `research_interests`, `thumbnail`,
  `article_count`, `co_author_count`, `citations_count`, `h_index`, and
  `i10_index` (each with `all`, `recent`, and `recent_since_year`),
  `citations_timeseries`, every publication in `articles`, every linked
  co-author in `co_authors`, and `metadata.last_scraped_source`. The key is
  absent when the person has no matched profile. See
  [`research_profiles` fields](https://docs.crustdata.com/person-docs/enrichment/reference#research_profiles-fields).
* **Sub-path selection.** The full section averages about 26 KB per person.
  Request `research_profiles.h_index.all` or another sub-path to keep the
  payload small.
* **Search filters and sorts.** Twenty `research_profiles.*` paths are
  filterable on `/person/search`, including `h_index.all`,
  `citations_count.all`, `research_interests`, `affiliated_organisation`,
  `articles.title`, and `co_authors.name`. Nine numeric and date paths are
  sortable. Search returns a smaller copy of each profile than enrich does. See
  [Research profiles](https://docs.crustdata.com/person-docs/search/reference.md#research-profiles).
* **Pricing.** On enrich the add-on is **+2** credits per person returned with
  a profile. On search it is **0.4** per result on the filter side and **0.4**
  on the response side, in line with the other premium groups. See
  [Pricing](https://docs.crustdata.com/general/pricing.md#person-enrich-pricing).

Available on `POST /person/enrich` and `POST /person/search` with
`x-api-version: 2025-11-01`.

**October 2026**

Usage API

## Account: read your usage and errors over the API

Four free endpoints show what your team spent credits on and which requests
failed, the same record the dashboard's Usage page reads. See [Usage](https://docs.crustdata.com/general/usage.md).

* **`GET /account/usage/summary`** adds up requests, credits, errors, and results,
  split by any of `day`, `product`, `endpoint`, `component`, `api_key_id`,
  `client_surface`, `client_platform`, and `status_class`. Hourly buckets with
  `bucket=1h`.
* **`GET /account/usage/events`** lists your requests newest first with their
  charge lines, paged with `next_cursor`. Each event's `cost_components` add up to
  the `X-Credits-Used` its response returned. `hide_free=true` leaves out
  successful 0-credit calls to endpoints that never bill.
* **`GET /account/usage/events/{request_id}`** looks up one request by its
  `X-Request-Id` and returns the body and headers you sent, with credentials
  redacted, plus the error body on a failure.
* **`GET /account/usage/errors`** groups failed requests by endpoint and masked
  error message, with a `kind` of `request`, `account`, `server`, or `no_results`
  that says what to do next.
* **`component`** is the stable id of each charge line, for example
  `person.business_email`. It never changes, so key reports on it. `label` is
  display text and can be reworded.

The four share a limit of 60 requests per minute, and calling them costs no
credits. Send `x-api-version: 2025-11-01`.

**September 2026**

Realtime discovery watches

## Watch: a discovery watch that searches the web live

A discovery watch reads the Crustdata index. A **realtime** watch searches the web
live on every run instead, so it finds records as they appear rather than waiting
for the index to pick them up. Set `config.is_realtime: true` and the watch takes
two filter keys instead of one.

* **`realtime_filters`** is what the live search is asked. It holds only the fields
  that search can answer about the watch's own dataset. The shape is simpler too: a
  top-level `and` of leaves, an `or` only across values of one field, no nested
  `and` groups, no sorts, and one free-text keyword per watch. Values are the
  dataset's own, the same ones you write in `filters`. Each watcher page lists the
  fields its own live search accepts:
  [Person](https://docs.crustdata.com/watcher-docs/person/discovery.md#realtime-watches),
  [Company](https://docs.crustdata.com/watcher-docs/company/discovery.md#realtime-watches),
  [Job](https://docs.crustdata.com/watcher-docs/job/watch.md#realtime-watches), and
  [Social Post](https://docs.crustdata.com/watcher-docs/social-post/discovery.md#realtime-watches).
* **`narrowing_filters`** narrows what the live search returned, keyed by dataset.
  A record the live search just found is too new for its own index to hold, so each
  block asks about the durable entity behind it instead: the author of a post, the
  company hiring for a job, the person as the index already knows them. Only
  `person` and `company` may be named, and each block is a plain tree in that
  dataset's own grammar. Everything the live search cannot answer goes here when the
  dataset that owns it is one the watch may narrow on: `or` across different fields,
  negation, and conditions about the
  [entity behind the record](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md). It can only
  remove records.
* **`filters` is not accepted on a realtime watch.** It is the index tier's tree, so
  asking it about a record the index has never seen dropped every result. Use
  `narrowing_filters` instead.
* **Social posts can now be filtered by their author.** A post watch can ask our
  person or company index about whoever wrote the post, using ordinary person or
  company fields under `narrowing_filters`. The watch reads `actor.actor_type`
  first, so a person id never matches a company that shares the number.
* **Pairing**: the flag and the tree go together. `config.is_realtime` without
  `realtime_filters` is a `400`, and so is `realtime_filters` without the flag.
  `narrowing_filters` needs the flag too. `filters` is required on every other
  watch and refused on this one.
* **Limits**: runs at most once a day. On person and company watches,
  `realtime_filters` may match at most 10,000 records, counted on that tree alone;
  the job and social post searches page rather than count, so no creation-time cap
  applies there.
* **Immutable**: `config.is_realtime`, `realtime_filters`, and `narrowing_filters`
  define the watch, so a `PATCH` carrying any of them is refused. The schedule, the channels, and
  `max_results_per_run` stay mutable.
* **Pricing**: a realtime watch runs at a 1-day SLA, which costs 150 credits per new
  record on every dataset, against the 0.5 or 2 a 30-day SLA index watch pays. The
  first run is still a free sample of up to 5. See [Pricing](https://docs.crustdata.com/general/pricing.md).

A discovery watch has no `config.refresh_frequency_days`. The key is refused on
both tiers; `config.is_realtime` is what picks how the watch reads.

Available on `POST /watch/{dataset}/search` for `person`, `company`, `job`, and
`social_post`, with `x-api-version: 2025-11-01`.

**September 2026**

Social post discovery watches

## Watch: turn a post search into a recurring feed

[Social Post Watcher](https://docs.crustdata.com/watcher-docs/social-post/discovery.md) is a new discovery
watcher on the social post dataset. It re-runs your post filter on the schedule
you set and delivers only the posts that newly match, to a webhook, Slack,
Google Chat, or email.

* **`filters`**: the same `and`/`or` tree as
  [Social Post Search](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md#filter-grammar), over
  the same fields: the post body, `hashtags`, `post_type`, `date_posted`, the
  author under `actor.*`, engagement counts, and nested `reactors.*` and
  `comments.*`. `content_type` is a search-only virtual filter and is not
  accepted here.
* **`sorts`, `fields`, and `on`**: delivery order, the projection on each
  delivered post, and the membership transition that notifies you, matching the
  person, company, and job discovery watchers.
* **Management**: list, get, update, test, delete, and run history on the same
  paths as every other discovery watch, keyed by the `id` the create returns.
* **Pricing**: the first run is a free baseline of up to 5 current matches,
  then 2 credits per new post delivered. A run that finds nothing new costs
  nothing. See [Pricing](https://docs.crustdata.com/general/pricing.md).

Available on `POST /watch/social_post/search` with
`x-api-version: 2025-11-01`.

**September 2026**

Social post search

## Social Post: search the indexed post dataset

[Social Post Search](https://docs.crustdata.com/social-post-docs/indexed-search/introduction.md)
is a new endpoint that queries the indexed Crustdata social post dataset with
the same structured filter grammar as Person, Company, and Job Search. Each
result carries the author enriched with a Crustdata id, current title,
employer, industry, and structured location, plus engagement counts, every
reactor and commenter, resolved mentions, and attachments.

* **`filters`**: post fields such as `text`, `hashtags`, `post_type`, and
  `date_posted`; author fields such as `actor.crustdata_entity_id`,
  `actor.title`, `actor.company_name`, and `actor.location`; engagement
  counts; nested `reactors.*` and `comments.*`; `mentions.company_id` and
  `mentions.person_id`; and attachment fields. See the
  [filterable fields](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md#filterable-fields).
* **Nested matching**: conditions on `reactors.*` in one `and` group bind to
  the same reactor, and `all_of` and `has_all` express cross-element
  requirements. See
  [Nested-array matching](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md#nested-array-matching-all_of-and-has_all).
* **`geo_distance` and `geo_exclude`** on `actor.location`, cursor
  pagination, sorting, field selection, and `limit: 0` counts.
* **Pricing**: 0.5 credits per post returned. Default rate limit is 30
  requests per minute. The endpoint is enabled on request.

Available on `POST /social_post/search` with `x-api-version: 2025-11-01`.

**September 2026**

Per-key credit caps on batch jobs

## Per-key credit caps now hold on batch jobs

A batch submit on a capped API key is now admitted on the job's estimated cost
plus the key's batches that are still running, instead of a flat 1 credit. A
job the key cannot afford is refused before it starts with `402` and a new
`error.type`, `credit_limit_exceeded`, whose message names the job's estimate,
the key's remaining credits, and the fix. An exhausted key keeps returning
`insufficient_credits`, so existing `402` handling still works. Raising a cap
now keeps the month's usage instead of restarting the count. See
[Per-key monthly limit](https://docs.crustdata.com/general/credits.md#per-key-monthly-limit).

**September 2026**

Company Search ranked retrieval

## Company Search: rank companies with natural-language queries

[Company Search](https://docs.crustdata.com/company-docs/search/introduction.md) now accepts a `search`
object for natural-language company discovery. You can use it alone or combine
it with structured `filters` that must match before ranking.

* **`search.query`**: describe the products, capabilities, or business models
  you want to find.
* **`search.mode`**: use `hybrid` for keyword and semantic retrieval, `lexical`
  for keyword retrieval, or `semantic` for conceptual similarity. The default
  is `hybrid`.
* **Ranked result window**: return up to 100 companies in relevance order.
  Ranked search does not accept `sorts` or `cursor`.

Available on `POST /company/search` with `x-api-version: 2025-11-01`.

**August 2026**

Company lifecycle on company and person results

## Company lifecycle: `basic_info.status` and `company_status`

Company and person results now carry the company's lifecycle from Crustdata's
entity graph, so you can tell a live company record from one that has been
retired without a second lookup.

* **On company results**: [Company Search](https://docs.crustdata.com/company-docs/search/reference.md) and
  [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/reference.md) return
  `basic_info.status` inside the `basic_info` group.
* **On person results**: [Person Search](https://docs.crustdata.com/person-docs/search/reference.md) and
  [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/reference.md) return `company_status` on
  every employment object, current and past.
* **Two values are defined**: `active` for a live company record, `deleted` for
  one Crustdata has retired. On a person's employment record the value can also
  be `null`, meaning the employer was never resolved to a company record and
  only the free-text company name on the role is available.
* **Both are filterable**: filter companies on `basic_info.status`, and people
  on `experience.employment_details.company_status` or its `current.` and
  `past.` variants. Neither field is sortable.
* **No selection needed**: both ship inside their default field group, so an
  existing request that already asks for `basic_info` or
  `experience.employment_details` picks them up with no change.

Company search serves the live company index, so a `deleted` company is not a
result there. You meet that value on references to a company from other records,
most often a person's employment history.

Available on `POST /company/search`, `POST /company/enrich`,
`POST /person/search`, and `POST /person/enrich` with
`x-api-version: 2025-11-01`.

**August 2026**

Technographics filters on Job Search

## Job Search: filter postings by the technologies they name

[Job Search](https://docs.crustdata.com/job-docs/search/introduction.md) now accepts three
**`technographics.technologies.*`** filter fields, so you can find the open
roles built on a stack rather than the companies that happen to run it.

* **`technographics.technologies.name`**: a canonical technology name, for
  example `Snowflake`.
* **`technographics.technologies.category`**: a category slug on a technology
  named in the posting, for example `data-warehouse`.
* **`technographics.technologies.super_category`**: one of twelve broader group
  slugs, for example `cloud-infrastructure`.
* **Posting-scoped, never employer-scoped**: a job matches only a technology
  detected in that exact posting. Nothing is inferred from the hiring company,
  so these counts will not line up with the same filter on [Company
  Search](https://docs.crustdata.com/company-docs/search/reference.md#technographics-filter-only), which
  describes the organization as a whole.
* **Filter-only**: values are not returned in search responses, and passing one
  in `fields` returns `400`. Two AND conditions on
  `technographics.technologies.name` match a posting that names both
  technologies; put both values in one `in` array to match either. Values are
  case-sensitive.
* **Autocomplete**: `/job/search/autocomplete` now serves `technology` and
  `technology_category` (also spelled `technographics.technologies.name` and
  `technographics.technologies.category`), reusing the same canonical
  vocabulary as company autocomplete. `super_category` has no autocomplete.
* **Coverage**: detection runs on listings with `job_details.source` set to
  `professional_network`. ATS-board postings carry no technographics and never
  match these filters. Use `is_not_null` to restrict a query to listings that
  have been through detection.
* **Credits unchanged**: standard Job Search pricing of 0.03 credits per result
  returned, with no add-on. The technographics add-on applies only when you
  return the data through Company Enrich.

Available on `POST /job/search` and `POST /job/search/autocomplete` with
`x-api-version: 2025-11-01`. See the [technographics
guide](https://docs.crustdata.com/guides/technographics.md#example-target-job-postings-by-technology-job-search)
and the [Job Search
reference](https://docs.crustdata.com/job-docs/search/reference.md#technographics-filter-only).

**August 2026**

match\_status on person lookups

## Person lookups now say why an identifier came back empty

Every result entry on the person lookup endpoints carries a new `match_status`
field, so you can tell a profile we do not have from a profile we will not
return.

* **`match_status`** on [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/reference.md),
  [Contact Enrich](https://docs.crustdata.com/person-docs/contact/enrich.md), and
  [Live Enrich](https://docs.crustdata.com/person-docs/enrichment/live-enrich.md): one of `matched`,
  `not_found`, or `redacted`.
* **`not_found`**: no profile in the dataset yet. The identifier is queued for
  enrichment, so retry later or use live enrich.
* **`redacted`**: the person asked Crustdata to remove their data and the
  request was approved. `matches` stays empty, nothing is billed, and neither a
  retry nor live enrich changes the answer.

The field is additive. Response shape and status codes are otherwise unchanged.

Available on `POST /person/enrich`, `POST /person/contact/enrich`, and
`POST /person/professional_network/enrich/live` with `x-api-version: 2025-11-01`.

**August 2026**

Profile assessment and recent posts on Enrich

## Enrich: profile assessment and recent posts are now in the API reference

Two response field groups on Enrich are now documented, with their full shapes
in the OpenAPI specs. Both are opt-in: name them in `fields` to get them back.

* **`assessment`** on [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/reference.md#assessment-fields):
  Crustdata's view of how well a profile stands up to verification.
  `authenticity.tier` runs 0 (most trusted) to 9 (least trusted), and
  `authenticity.verdict` is one of `clearly_genuine`, `probably_genuine`,
  `cannot_verify`, `probably_fabricated`, or `clearly_fabricated`. No extra
  credits.
* **Screen before you enrich**: both paths are filterable on
  [Person Search](https://docs.crustdata.com/person-docs/search/reference.md#profile-assessment), and
  `assessment.authenticity.tier` is sortable there, so you can drop
  low-quality profiles from a result set before spending an enrich credit.
  Neither is returned in search results.
* **`social_posts`** on [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/reference.md#social_posts-fields)
  and [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/reference.md#social_posts-fields):
  up to the 10 most recent posts authored by the person or company, newest
  first, with text, hashtags, links, and engagement counts. Quote posts are
  included; plain reshares are not. A flat 5 credits per record, however many
  posts come back.

Available on `POST /person/enrich` and `POST /company/enrich` with
`x-api-version: 2025-11-01`.

**August 2026**

Cross-dataset filters on discovery watches

## Discovery watches: mix company, person, and job filters in one watch

A [discovery watch](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md) is no longer limited to
the fields of the dataset it delivers. Put a job field or a person field in the
same flat `conditions` list as your company filters and the watch resolves it
for you, with no new syntax and no second filter list.

* **Every pairing works**: a company watch can filter on the roles a company is
  hiring for and the people it employs, a job watch on the company behind the
  posting, and a person watch on their current employer or its open roles. One
  watch can pull from all three datasets at once.
* **Routing is by field name**: field names are unique across the three
  vocabularies, so the name says where a condition belongs. Where a name is
  shared (`technographics.technologies.*`, `indexed_at`, `updated_at`), your
  watch's own dataset wins it.
* **Negation is rejected across datasets**: `!=`, `not_in`, `(!)`,
  `not_contains`, and `geo_exclude` on a filter from another dataset return
  `400`. They match subjects with some *other* qualifying record rather than
  subjects with none, which is the opposite of how they read. They still work
  on your watch's own dataset.
* **Baseline limit raised to 500,000**: the baseline run delivers a sample of 5
  but reads your whole match set to record what already exists, and that read is
  now bounded at 500,000 records, up from 200,000. A filter from another dataset
  may cover up to 1,000,000 companies. Both are checked at creation.
* **Credits unchanged**: you pay for records delivered to you at your watch's
  own rate. Reading another dataset to narrow your filters is free, and nothing
  from it appears in your payload.
* **The other dataset's records are a separate call**: filters narrow, they do
  not enrich. To see the posting or the person behind a delivered company, call
  `POST /job/search` or `POST /person/search` with the delivered
  `crustdata_company_id` and the same conditions you filtered on.

Available on `POST /watch/{dataset}/search` with `x-api-version: 2025-11-01`.

**August 2026**

Account credits per-top-up breakdown

## `GET /account/credits`: per-top-up breakdown with `credit_topups`

[Account credits](https://docs.crustdata.com/general/credits.md) responses now include a **`credit_topups`**
array for accounts with live top-ups — one entry per top-up still holding
credits, sorted soonest expiry first:

* **`type`**: how the top-up entered your account — `purchase` (one-time
  purchase), `auto_topup` (automatic reload), or `granted` (added by
  Crustdata).
* **`granted_credits`** / **`remaining_credits`**: what the top-up originally
  added and what's still unspent.
* **`granted_at`** / **`expires_at`**: when it was added and when its unspent
  credits expire (`expires_at` is `null` for top-ups without an expiry).

The key is **absent** for accounts without live top-ups, so existing responses
are unchanged. Like `wallets`, the list is informational — keep gating spending
decisions on `account.credits`. Available on `GET /account/credits` with
`x-api-version: 2025-11-01`.

**August 2026**

Company Search office-locations filter

## Company Search: filter by any office location with `locations.all_office_addresses`

[Company Search](https://docs.crustdata.com/company-docs/search/introduction.md) now accepts
**`locations.all_office_addresses`** as a filter field, so you can match
companies on any of their offices, not only the headquarters that the other
`locations.*` filters target. The field was already returned in responses; it
is now filterable too.

* **Substring match**: office addresses are free-text strings (e.g.
  `"HITEC City, Madhapur, Hyderabad, Telangana, 500081, IN"`), so filter with
  a city or region substring using `(.)` / `contains`.
* **Combines with HQ filters**: pair it with `locations.country` in an `and`
  group to express queries like *headquartered in the USA with an office in
  Hyderabad*: `locations.country` `=` `"USA"` and
  `locations.all_office_addresses` `(.)` `"Hyderabad"`.
* **Not sortable**: the field is filterable and returned, but not valid in
  `sorts`. See [Locations](https://docs.crustdata.com/company-docs/search/reference.md#locations) in the
  search reference.

Available on `POST /company/search` with `x-api-version: 2025-11-01`.

**July 2026**

Person Search null-check operators

## `is_null` and `is_not_null` filter operators on Person Search

Person Search now accepts the **`is_null`** and **`is_not_null`** filter
operators, so you can match on field presence directly instead of fetching
fields and checking for null in your own code.

* **`is_null`** — matches profiles where the field has no value. On
  nested-array fields the check is element-based: an empty
  `experience.employment_details.current` array matches
  `experience.employment_details.current.name` `is_null`.
* **`is_not_null`** — matches profiles where at least one non-null value is
  present for the field.
* **`value` is required** — send a literal `"value": null`; omitting the
  `value` key returns `400`.

Combine the two to find people who left a job and have not started a new one:
`experience.employment_details.current.name` `is_null` and
`experience.employment_details.past.name` `is_not_null` in one `and` group.
See [null checks](https://docs.crustdata.com/person-docs/search/reference.md#null-checks-is_null-and-is_not_null)
for details.

Available on `POST /person/search` with `x-api-version: 2025-11-01`.
Company Search and Job Search already accept both operators.

**July 2026**

X-Credits-Used response header

## Every API response now reports what it cost: the `X-Credits-Used` header

Every response from the data APIs — search, enrich, identify, autocomplete,
web, and batch — now carries an `X-Credits-Used` header with the exact decimal
credits that request deducted, read from the same ledger that bills you. Log it
per call to attribute spend by customer, agent, or workflow, sum it to keep an
automation inside a budget, or reconcile it against invoices — without polling
the balance endpoint.

* **Exact decimal** — `0.03` for a one-result person search, `3` for a
  three-company enrich. Fractional costs report exactly.
* **Present on error responses too** — errors report `0`, so the header is
  there on every call you log.
* **`0` is meaningful** — endpoints that consume no credits report `0`, and so
  do asynchronous submissions (batch jobs and background-job searches), which
  are billed when the job runs rather than at submit time.
* **Readable from browsers** — the header is exposed cross-origin, so
  dashboard-style apps can read it from JavaScript.
* **Declared in the specs** — every response in the
  [OpenAPI specs](https://docs.crustdata.com/api-reference/company-apis/search-companies-with-indexed-fields-only.md)
  documents the header.

Responses generated before a request reaches the API, such as rate-limit
`429`s, carry no header. See
[Per-call usage on the Credits page](https://docs.crustdata.com/general/credits.md#per-call-usage-the-x-credits-used-header)
for details and examples.

Available on every data API endpoint.

**July 2026**

Job Search company job-board postings

## Job Search: company job-board postings, `job_details.source`, and `job_details.employment_type`

[Job Search](https://docs.crustdata.com/job-docs/search/introduction.md) now includes postings published
directly on company job boards — about
3 million postings joining the roughly 45 million existing listings. Two new
`job_details` fields expose this:

* **`job_details.source`** — the platform each posting comes from. Present on
  every job: `professional_network` for the existing listings, or one of the
  job-board platforms — `workday`, `smartrecruiters`, `greenhouse`, `workable`,
  `lever`, `icims`, `ashby`, `rippling`, `yc`. Filterable (`=`, `in`, …) and
  groupable via `group_by`; not sortable. See the
  [Job details catalog](https://docs.crustdata.com/job-docs/search/reference.md#job-details-job_details).
* **`job_details.employment_type`** — the employment type declared by the
  posting: `full_time`, `part_time`, `contract`, `intern`, or `temporary`.
  Currently populated for roughly 85% of job-board postings and `null` for
  now when `source` is `professional_network`. Filterable and groupable; not
  sortable.
* **Search-only** — both fields are returned by `POST /job/search` only;
  [Live Search](https://docs.crustdata.com/job-docs/search/live-search.md) does not include them.

Available on `POST /job/search` with `x-api-version: 2025-11-01`.

**July 2026**

Company Search geographic radius filters

## Company Search: `geo_distance` and `geo_exclude` on company headquarters

[Company Search](https://docs.crustdata.com/company-docs/search/introduction.md) now filters companies by
true geographic radius around their headquarters. Pick a point — either a place
name like "Palo Alto, CA" or a pair of coordinates — and set a distance.
`geo_distance` then returns every company whose headquarters falls within that
distance of the point, instead of matching on location text and listing city
names one at a time.

* **`geo_distance`** — returns companies headquartered inside the radius.
* **`geo_exclude`** — the inverse of `geo_distance`. It returns companies
  headquartered outside the radius and excludes the ones inside it, so you can
  skip a region you already cover. See the
  [geographic radius filters reference](https://docs.crustdata.com/company-docs/search/reference.md#geo_distance--radius-around-headquarters).
* **Setting the point and the distance** — the point is what the radius is
  measured from. Pass it as `location` (a place name, geocoded server-side) or
  as `lat_lng` (`[lat, lng]`, which skips geocoding), then add a `distance` and
  a `unit` such as `km` or `mi`.
* **One field path** — apply both operators to `locations.headquarters`, which
  targets the company's geocoded headquarters point.
* **Normalized location facets** — `locations.state` and `locations.city` are
  newly filterable and match normalized values derived from geocoding the
  headquarters address, with search responses returning the same normalized
  values. `locations.country` accepts **both** ISO-3 codes (`"USA"`) and full
  country names (`"United States"`) — either form matches the same companies,
  so existing filters keep working — and responses return the normalized full
  country name. See [Locations](https://docs.crustdata.com/company-docs/search/reference.md#locations).

Available on `POST /company/search` with `x-api-version: 2025-11-01`.

**July 2026**

Auto top-up for credits

## Auto top-up: refill credits automatically before the balance runs out

Save a card once, set a threshold and a reload amount, and Crustdata tops your
balance up on its own. The balance is checked every time credits are spent, and
the moment it drops below your threshold the saved card is charged for the
reload package and the credits land immediately — instead of buying credits by
hand each time the balance runs down. The feature is free on every plan and
stays off until you turn it on.

* **Turn it on from the [Credits page](https://app.crustdata.com/billing/credits)** —
  save a card through a Stripe-hosted page and accept the auto-charge consent,
  then set two numbers: a threshold and a reload amount. Enabling requires a
  balance above the threshold you pick, so buy credits manually once if you are
  already below it. Turning it off is one click, any time.
* **What a top-up does** — the saved card is charged at the price shown during
  setup, the live balance refreshes right away, and you get a receipt email plus
  a real Stripe invoice in the **Invoices** tab, identical to a manual purchase.
* **Monthly recharge limit** — an optional cap on how many credits auto top-up
  can add per calendar month. It resets each calendar month.
* **Safety rails** — at most 3 auto top-ups per day per account, and
  double-charge protection means one threshold breach can only ever produce one
  charge.
* **Failed charges** — a declined or expired card gets an email with the reason
  and the fix, Crustdata retries after a cooldown, and after 3 consecutive
  failures auto top-up disables itself and says so. Cards nearing expiry get a
  warning email before they lapse.
* **Thresholds and reload size** — the threshold is an absolute credit balance,
  and the minimum reload is 500 credits. The exact price is shown before you
  save.
* **Pricing** — the feature is free, with no credit cost and no plan gate. Each
  top-up buys the selected credit package at the standard self-serve rate — the
  same volume-tiered pricing as a manual purchase.
* **Coming next** — negotiated per-account rates applied to auto top-ups. Every
  top-up charges the standard self-serve rate today.

Manage auto top-up on the [Credits page](https://app.crustdata.com/billing/credits);
setup steps are in [Credits — Auto top-up](https://docs.crustdata.com/general/credits.md#auto-top-up).
Available to all users on all plans.

**July 2026**

Person Search cross-entry matching

## Person Search: match conditions across different entries in a profile

[Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) adds `all_of`, a composite
operator whose conditions are each matched by a **different entry** in a
person's history array. A person record holds arrays with many entries — one
for every past job and every degree — so "Engineer at Company A and Manager at
Company B" now returns people who held each title at each company, rather than
one job carrying both titles. A plain `and` on the same array path keeps its
existing same-entry meaning, so your current searches using this operator don't
change.

* **`all_of`** — a composite operator whose conditions are each matched
  independently, by their own array entry. Use it for compound cross-entry
  queries, like a role at one company and a degree from another school, or a
  past job plus a current one. See the
  [operator reference](https://docs.crustdata.com/person-docs/search/reference.md#nested-array-matching-all_of-and-has_all).
* **`has_all`** — shorthand for one field with several values ("worked at both
  A and B"). It expands to one `all_of` block per value.
* **Works across person history** — employment, education, certifications, and
  honors.
* **Combines with document-level filters** — nest `all_of` inside a plain `and`
  to add profile-level conditions, so you can ask for a role at a company and a
  person based in a given country in one query.
* **One matching entry per condition** — each condition is satisfied by at
  least one entry in the array. Conditions do not have to land on the same
  entry, and they do not have to cover every entry.
* **Backward compatible** — a plain `and` on one array path still matches
  within a single entry, so existing queries return exactly what they returned
  before.
* **Pricing** — included on all plans. These are new operators on an existing
  endpoint, so there is no new credit cost and the `/person/search` rate limit
  is unchanged.

Available on `POST /person/search` with `x-api-version: 2025-11-01`, for all
users, at no extra cost.

**July 2026**

Job Search geographic radius filters

## Job Search: `geo_distance` and `geo_exclude` on job location

[Job Search](https://docs.crustdata.com/job-docs/search/introduction.md) now filters postings by true
geographic radius. Pick a point — either a place name like "San Francisco" or a
pair of coordinates — and set a distance. `geo_distance` then returns every job
posting whose location falls within that distance of the point, instead of
matching on exact location text and listing city names one at a time.

* **`geo_distance`** — returns job postings whose location falls inside the
  radius.
* **`geo_exclude`** — the inverse of `geo_distance`. It returns job postings
  whose location falls outside the radius and excludes the ones inside it, so
  you can skip a region you already cover. See the
  [geographic radius filters reference](https://docs.crustdata.com/job-docs/search/reference.md#geographic-radius-filters-geo_distance--geo_exclude).
* **Setting the point and the distance** — the point is what the radius is
  measured from. Pass it as `location` (a place name, geocoded server-side) or
  as `lat_lng` (`[lat, lng]`, which skips geocoding), then add a `distance` and
  a `unit` such as `km` or `mi`.
* **Either field path** — use `location.raw` or `location`; both target the
  same geo point.
* **Geocoded on ingest** — each posting's location text is turned into real
  coordinates when Crustdata adds the posting to the database, so the filter
  compares coordinates rather than matching location strings, and postings in
  towns you never thought to list still come back.
* **Pricing** — no new credit cost. A radius query bills the same as any other
  `/job/search` call, and the endpoint's rate limit is unchanged.

Available on `POST /job/search` with `x-api-version: 2025-11-01`, for all users,
at no extra cost.

**July 2026**

Teams: shared workspaces and roles

## Teams: one workspace with shared credits, API keys, and roles

Bring your whole team into one Crustdata account. Invite teammates by email,
give each one a role, and work from a shared credit pool and one set of API keys.
Credits and keys now belong to the **team**, so everyone works from the same
place instead of a separate login each. Free on every plan, and existing accounts
were migrated automatically.

* **Every account became a team** - your existing account is now a team named
  **Personal** with you as the owner. Nothing changes until you invite someone.
* **Invite by role** - **Owner** (the creator; bypasses every permission check
  and cannot be reassigned), **Admin** (invites members, buys credits, manages
  payment methods, and creates and manages API keys, watchers, and integrations),
  and **Member** (runs playground searches and enrichments against team credits
  and views usage, keys, watchers, exports, and billing, but cannot purchase,
  manage keys, or change the team).
* **Shared credits and API keys** - everyone on a team draws from one credit pool
  and one set of `cd_` keys, gated by role. Rate limits are shared across the team.
* **Team switcher** - one person can belong to and create several teams and
  switch between them from the sidebar. Credits never move between teams: each
  team buys and holds its own, which is a clean way to cap spend for a project,
  client, or department.
* **Per-team billing** - each team has its own wallet, subscription, invoices,
  and saved cards. A new team starts at **0 credits** and buys its own.
* **Default limits** - up to **2 teams** per user and **10 members** per team.
  Reach out to sales to raise either limit.

Manage your team from the **Team** section of the sidebar at
[app.crustdata.com](https://app.crustdata.com); teammates accept an invite from
[app.crustdata.com/account](https://app.crustdata.com/account). Available to all
users on all plans at no extra cost.

<video autoPlay loop muted playsInline aria-label="Inviting a teammate, assigning a role, and switching teams in the Crustdata dashboard" src="https://mintcdn.com/crustdata/D-tpUeAUO0o-YcZY/images/teams.mp4?fit=max&auto=format&n=D-tpUeAUO0o-YcZY&q=85&s=ef4b96abdd6db4adb48fb18e992090cc" />

**July 2026**

Per-API-key credit caps and endpoint access

## Per-API-key limits: cap credits and restrict endpoints on one key

A workspace admin can now attach two independent limits to an individual API
key from the dashboard **API Keys** page, without affecting the rest of the
account.

* **Monthly credit cap** — cap how many account credits one key can spend per
  month; it resets on the 1st (UTC). Use it for a key you hand to a teammate, a
  customer, or an unattended job. When the cap is reached, that key returns
  `402` with `error.type` `insufficient_credits`. Setting the cap to `0` stops
  the key until an admin raises it. See
  [Per-key monthly limit](https://docs.crustdata.com/general/credits.md#per-key-monthly-limit).
* **Endpoint access** — restrict a key to a subset of the endpoints the account
  has enabled. A call to an endpoint outside that subset returns `403` with
  `error.type` `permission_error`. See
  [Per-key endpoint access](https://docs.crustdata.com/general/permissions.md#per-key-endpoint-access).

Both errors reuse the **same status and `error.type`** as their account-level
equivalents, so clients that already handle account-level `402` and `403` need
no new code — only the message differs, naming the key's limit so you can tell
which one was hit. Handling patterns are in
[Best practices](https://docs.crustdata.com/openapi-specs/2025-11-01/best-practices.md#handle-insufficient-credits).

**July 2026**

Usage and logs filtered by API key

## Usage and logs: see and filter activity by API key

Your dashboard now records which API key made each request, so you can tell
your keys apart in usage and request logs instead of seeing one merged total.

* **Per-key attribution** — every request is tagged with the key that made it,
  including requests from keys you have since deleted, so past activity stays
  attributed after a key is rotated out.
* **Filter by key** — narrow the **Usage** and **Logs** views to one or more
  keys to see exactly what each key spends and calls. Together with per-key
  [credit caps](https://docs.crustdata.com/general/credits.md#per-key-monthly-limit) and
  [endpoint access](https://docs.crustdata.com/general/permissions.md#per-key-endpoint-access), you can set a
  key's limits and then confirm what it actually did.

View it in the **Usage** and **Logs** sections of your
[dashboard](https://app.crustdata.com/). Available to all accounts.

**July 2026**

Technographics: company technology stack

## Technographics: filter by and enrich a company's technology stack

Crustdata now exposes the technologies detected for a company across
[Company Enrich](https://docs.crustdata.com/company-docs/enrichment/introduction.md),
[Company Search](https://docs.crustdata.com/company-docs/search/introduction.md), and
[Company Autocomplete](https://docs.crustdata.com/company-docs/autocomplete/introduction.md).

* **`technographics` field group on Enrich** — request it explicitly via
  `fields` (it is never included by default) to get `total_technologies`,
  `top_technologies`, the full `technologies` list (each entry with `name`,
  detection `sources`, `posting_count`, catalog `categories`, a `description`,
  and `evidence`), and `updated_at`. See the
  [field reference](https://docs.crustdata.com/company-docs/enrichment/reference.md#technographics-fields).
* **Search filters** — filter on `technographics.total_technologies` (also
  sortable), `technographics.top_technologies`,
  `technographics.technologies.name`,
  `technographics.technologies.category`, and
  `technographics.technologies.super_category`. Technographics values are not
  returned in search responses — filter, then enrich. See
  [searchable fields](https://docs.crustdata.com/company-docs/search/reference.md#technographics-filter-only).
* **Autocomplete** — two new company-scope fields: `technology` (technology
  names) and `technology_category` (category slugs) for discovering valid
  filter values.
* **Access and pricing** — `technographics` requires field-level permission on
  your account. It is a billed add-on: **+2 credits** per company that returns
  technographics data, on top of the base enrich cost; companies with no
  technographics data are not charged the add-on. The same add-on applies to
  [Batch Company Enrich](https://docs.crustdata.com/company-docs/enrichment/batch.md).

Available on `POST /company/enrich`, `POST /batch/company/enrich`,
`POST /company/search`, and `POST /company/search/autocomplete` with
`x-api-version: 2025-11-01`.

**June 2026**

Accurate company lookup by domain

## Company lookup: more accurate domain matching for large organizations

We improved domain matching in [Company Identify](https://docs.crustdata.com/company-docs/identify/introduction.md)
and [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/introduction.md), especially for large
organizations and companies with subsidiaries. On these domains a lookup could
sometimes surface a related record (a subsidiary, a regional arm, an acquired
company, or a showcase page) instead of the parent company. Matching now favors
the primary company, automatically.

* **Better matches for large organizations** - a domain maps to the parent
  company rather than a subsidiary, an acquired company, or a showcase page. For
  example, `amazon.com` resolves to Amazon, `paypal.com` to PayPal, and
  `schwab.com` to Charles Schwab.
* **Nothing to change** - same endpoints, same request shape, and same response
  shape. No new fields and no confidence score to handle; matches just get better
  automatically.
* **Biggest gains on high-volume domains** - in testing across Fortune 500 US
  companies, top-1 accuracy by domain rose from 88% to 94%.

No extra cost: [Company Identify](https://docs.crustdata.com/company-docs/identify/introduction.md) stays free
and [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/introduction.md) credits are unchanged.
Available on `POST /company/identify` and `POST /company/enrich` with
`x-api-version: 2025-11-01`. No changes to the legacy identity endpoints.

**June 2026**

Natural-language Person Search query (beta)

## Person Search: natural-language `search.query` (beta)

[Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) adds `search.query`, a
natural-language query that returns a ranked list of people instead of requiring
you to hand-build every filter. Crustdata pulls the hard constraints out of the
query and applies them as exact filters, semantically matches the rest against
the full profile, and orders results by fit.

* **`search.query`** - describe who you want in plain language; results are
  ranked by profile context (title, skills, company history, education,
  location, summary).
* **`search.mode`** - `hybrid` (default, blends keyword and concept matching)
  and `semantic` (concepts). For exact keyword matching, see the keyword search
  changelog below.
* **`mode`** - two recall modes: `managed` (default; the query may add
  constraints) and `exact` (your filters are hard constraints and the query only
  ranks within them).
* **`fit`** - each profile returns a relevance tier (`strong` / `possible` /
  `weak`) alongside `total_count_relation`, so you can keep only high-confidence
  matches.
* **Not included** - sorts; semantic results come back already rank-ordered by
  relevance.
* **Pricing** - Person Search parity at **0.03 credits per result**, no premium
  for semantic ranking, and the same **30 requests/minute** rate limit.

[Semantic Search Guide →](https://docs.crustdata.com/guides/person-semantic-search.md)

**June 2026**

Keyword search with Boolean operators

## Person Search: keyword search with Boolean operators

[Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) now lets you search for
keywords across the full profile. Set `search.mode: "lexical"` to match on
keywords, so exact terms, acronyms, names, and IDs are found wherever they
appear in the profile (title, skills, company history, education, location,
summary).

* **`search.mode: "lexical"`** - keyword matching across the whole profile, for
  when you want exact terms to be found rather than concept ranking.
* **`search.query_syntax: "boolean"`** - read the query as a Boolean expression
  instead of plain text: a space means **AND** (every term required), `|` means
  **OR**, and you can combine terms for precise keyword search. Honored only with
  `search.mode: "lexical"` and top-level `mode: "exact"`.

[Boolean keyword operators →](https://docs.crustdata.com/guides/person-semantic-search.md#boolean-keyword-operators)

**June 2026**

Multiple named API keys per account

## Multiple API keys on one account

Every Crustdata account used to have a single API key. You can now create and
manage several named keys on one account, so you can keep dev and prod apart,
give each project or teammate its own key, and switch off a key without affecting
the others. Works across the API and MCP. Every existing key was migrated
automatically and named **Default**.

* **Create and name keys** - add as many keys as you need at
  [app.crustdata.com/api-keys](https://app.crustdata.com/api-keys), rename them
  anytime, and copy the generated `cd_` key into any API or MCP request. See
  [Authentication](https://docs.crustdata.com/general/introduction.md).
* **Per-key status** - `ACTIVE` (usable across the API and MCP), `INACTIVE`
  (blocked instantly and reversible), and `DELETED` (permanently retired; the
  account's other keys keep working).
* **Shared credits and rate limit** - all keys on an account draw from one
  credit pool and one rate-limit bucket today, so keys separate and organize work
  rather than cap spend or speed per key.
* **Coming next** - credit balance and limits set at the individual API-key
  level.

Available to all users on all plans, at no extra cost, across the API and MCP.
Manage keys at [app.crustdata.com/api-keys](https://app.crustdata.com/api-keys).

**June 2026**

Person Contact Enrich endpoint

## Person Contact Enrich: business emails, personal emails, and phone numbers

[Person Contact Enrich](https://docs.crustdata.com/person-docs/contact/enrich.md) is a new
endpoint that returns contact data for up to **25 people** in a single request.
Supply `professional_network_profile_urls` or `business_emails` as input and
get business emails, personal emails, and phone numbers back in the same
response — no polling.

* **Identifiers** — pass exactly one of `professional_network_profile_urls`
  (a profile URL) or `business_emails` to reverse-look-up
  a person, up to 25 values per request.
* **`fields`** — select which contact data to return:
  `contact.business_emails`, `contact.personal_emails`, `contact.phone_numbers`,
  and `contact.websites` (or `contact` for all). Each email entry includes its
  deliverability `status`. See the
  [contact fields reference](https://docs.crustdata.com/person-docs/contact/enrich.md#contact-fields).
* **Response** — the same record shape as `/person/enrich`, restricted to the
  `person_data.contact` object. For higher fill rate on bulk lists, use the
  async [Batch Contact Enrich](https://docs.crustdata.com/person-docs/contact/batch.md) job instead.

Available on `POST /person/contact/enrich` with `x-api-version: 2025-11-01`.

**June 2026**

Person Search geo exclusion

## Person Search: `geo_exclude` filter operator

[Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) adds a `geo_exclude` filter
operator — the inverse of `geo_distance`. It excludes profiles **inside** a
radius and keeps everyone else, so you can carve out a metro you already cover
or target candidates outside a region.

* **`geo_exclude`** takes the same value object as `geo_distance`: a centre
  given as `location` (geocoded server-side) or `lat_lng` (`[lat, lng]`, skips
  geocoding), a required `distance`, and an optional `unit` (`km`, `mi`,
  `miles`, `m`, `meters`, `ft`, `feet`; defaults to `km`). When both `location`
  and `lat_lng` are supplied, `lat_lng` wins. See the
  [operator reference](https://docs.crustdata.com/person-docs/search/reference.md#geo_exclude-exclude-a-radius)
  and a [worked example](https://docs.crustdata.com/person-docs/search/introduction.md#exclude-a-geographic-radius).

Available on `POST /person/search` with `x-api-version: 2025-11-01`.

**May 2026**

Profile name and title fields

## Professional-network name and normalized title on Person profiles

[Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) and
[Person Enrich](https://docs.crustdata.com/person-docs/enrichment/introduction.md) now return additional
`basic_profile` identity fields.

* **`basic_profile.professional_network_name`** — the display name on the
  person's professional-network profile, returned by both `/person/search` and
  `/person/enrich`. On search it is also a filterable field (not sortable). See
  the [search field reference](https://docs.crustdata.com/person-docs/search/reference.md#searchable-fields)
  and the [enrich response reference](https://docs.crustdata.com/person-docs/enrichment/reference.md#person_data-sections).
* **`basic_profile.normalized_title`** — the normalized job-title object
  (`matched_title`, `department`, `sub_department`, `similarity`, `confident`)
  is now also returned by `/person/enrich`, matching the field already available
  on `/person/search`.

Available on `POST /person/search` and `POST /person/enrich` with
`x-api-version: 2025-11-01`.

**May 2026**

Richer Person Search profiles

## Normalized titles, education details, and logos on Person Search

[Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) results now include a
normalized job-title classification, richer education entries, and stable
Crustdata-hosted logo permalinks for employers and schools.

* **`basic_profile.normalized_title`** — an object with `matched_title`,
  `department`, `sub_department`, `similarity`, and `confident`. Filter on
  `basic_profile.normalized_title.matched_title`, `.department`, or
  `.sub_department` (filterable, not sortable). See the
  [field reference](https://docs.crustdata.com/person-docs/search/reference.md#basic-profile).
* **Education location and description** — each `education.schools[]` entry now
  returns a `location` object (`raw`, `city`, `state`, `country`, `continent`)
  and a `description`. The location sub-fields are filterable via
  `education.schools.location.*`. See the
  [education fields](https://docs.crustdata.com/person-docs/search/reference.md#education).
* **`education.schools[].institute_logo_permalink`** — a stable Crustdata-hosted
  school logo URL, returned for display.
* **`experience.employment_details[].company_profile_picture_permalink`** — a
  stable Crustdata-hosted employer logo URL, so you can render company logos
  without resolving image URLs yourself. See the
  [profile-card example](https://docs.crustdata.com/person-docs/search/introduction.md#build-a-profile-card-with-company-and-school-logos).

Available on `POST /person/search` with `x-api-version: 2025-11-01`.

**May 2026**

Follower count on Person Search

## Follower count on Person Search profiles

[Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) now exposes a `followers`
field on each result's `professional_network` block, alongside the existing
`connections` field.

* **`professional_network.followers`** — integer follower count from the
  profile. Filterable and sortable: pass it in `filters.conditions[].field`
  or `sorts[].field`. See the
  [filter and sort field reference](https://docs.crustdata.com/person-docs/search/reference.md).

Available on `POST /person/search` with `x-api-version: 2025-11-01`.

**May 2026**

Person Search filters

## Person Search: new filter operators

[Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) gains two new filter
options for the `2025-11-01` API:

* **`(!)` — fuzzy negation.** Excludes profiles whose value contains the
  given substring (case-insensitive). Multi-word values are matched as a
  literal phrase, so `(!) "New York"` excludes profiles literally
  containing `"New York"` but **not** `"New Yorker"`. To exclude on each
  word independently, send separate `(!)` conditions inside an `and`
  group. See the [operator reference](https://docs.crustdata.com/person-docs/search/reference.md#-fuzzy-negation)
  and a [worked example](https://docs.crustdata.com/person-docs/search/introduction.md#exclude-profiles-matching-a-substring).
* **`geo_distance` accepts `lat_lng`.** Supply explicit coordinates as
  `[lat, lng]` to skip geocoding. When both `location` and `lat_lng` are
  provided, `lat_lng` wins. See the
  [`geo_distance` reference](https://docs.crustdata.com/person-docs/search/reference#geo_distance-radius-around-a-point)
  and the [`lat_lng` example](https://docs.crustdata.com/person-docs/search/introduction#search-by-explicit-coordinates).

Both operators are available only on `POST /person/search` with
`x-api-version: 2025-11-01`.

**May 2026**

API version 2025-11-01

## 🚀 New API version: `2025-11-01`

We are launching a new, versioned API that replaces the legacy
`/screener` and `/data_lab` endpoints. Every product — Company, Person,
Job, Web, and Social Post — now lives under a consistent, purpose-built
surface area.

### What's new

* **Versioned endpoints.** Every call requires the
  `x-api-version: 2025-11-01` header, so future changes ship without
  breaking existing integrations.
* **Bearer authentication.** `Authorization: Bearer <key>` replaces the
  legacy `Token` scheme across every endpoint.
* **Structured error envelope.** A consistent `{ error: { type, message, metadata } }`
  shape across every endpoint.
* **Cursor-based pagination.** Opaque `next_cursor` replaces numeric
  `offset` on search endpoints.
* **Match-result envelope for enrich.** Enrich responses now return
  `matches[]` with a `confidence_score` per match.
* **Nested, neutral response sections.** Flat top-level keys are grouped
  under sections like `basic_info`, `employee_reviews`, and `funding`.

### Migrating from the legacy API

Every legacy `/screener` and `/data_lab` endpoint has a current
replacement. The [Migration guides](https://docs.crustdata.com/migrations/overview.md) map each
legacy endpoint to its new equivalent and walk through request keys,
field renames, type changes, and response-shape differences.


## Related topics

- [Data updates](https://docs.crustdata.com/general/data-updates.md)
