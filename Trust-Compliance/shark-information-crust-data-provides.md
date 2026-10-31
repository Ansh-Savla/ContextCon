# Shark Tank companies: information CrustData provides

Live API sample retrieved on 31 October 2026. Version: `2025-11-01`.
Three companies were resolved by exact domain, then enriched by CrustData ID with `exact_match: true`. Each returned confidence 1.0. Identification cost 0 credits; enrichment cost 6 credits total.

## Actual sample values

These are API values, not independently verified company facts. Traffic and headcount reflect the provider's measurements and periods, not necessarily today's business totals.

| Returned company name | Domain | Founded | Headcount total | Monthly visitors |
| --- | --- | --- | --- | --- |
| Misto | mistobox.com | 2012 | 9 | 37,979 |
| Wicked Good Cupcakes | wickedgoodcupcakes.com | 2011 | 2 | 33,664 |
| Tom & Chee | tomandchee.com | 2009 | 107 | 7,408 |

## Useful columns by group

| Group | Example actual field paths |
| --- | --- |
| Identity | `crustdata_company_id`, `basic_info.name`, `basic_info.primary_domain`, `basic_info.description`, `basic_info.professional_network_url`, `basic_info.company_type`, `basic_info.status`, `basic_info.year_founded`, `basic_info.logo_permalink` |
| Locations | `locations.city`, `locations.state`, `locations.country`, `locations.street_address`, `locations.headquarters`, `locations.all_office_addresses` |
| Classification | `taxonomy.categories`, `taxonomy.professional_network_industries`, `taxonomy.primary_naics_detail`, `taxonomy.sic_detail_list` |
| Workforce | `headcount.total`, `headcount.growth_percent`, `headcount.growth_absolute`, `headcount.by_role_absolute`, `headcount.by_region_absolute`, `headcount.by_skill_absolute`, `headcount.timeseries`, `headcount.by_function_timeseries` |
| Funding | `funding.total_investment_usd`, `funding.last_round_amount_usd`, `funding.last_round_type`, `funding.last_fundraise_date`, `funding.investors`, `funding.acquired_by`, `funding.acquisitions` |
| Revenue | `revenue.estimated.lower_bound_usd`, `revenue.estimated.upper_bound_usd`, `revenue.estimated.timeseries`, `revenue.acquisition_status` |
| Hiring | `hiring.openings_count`, `hiring.openings_growth_percent`, `hiring.recent_titles_csv` |
| Traffic | `web_traffic.domain_traffic.{domain}.monthly_visitors`, traffic source percentages, growth, visitor history |
| SEO | `seo.monthly_organic_clicks`, `seo.total_organic_results`, `seo.monthly_google_ads_budget`, `seo.monthly_paid_clicks`, keyword gains/losses |
| Competitors | `competitors.all_domains`, `competitors.paid_seo`, `competitors.organic_seo` |
| People | `people.founders`, `people.cxos`, `people.decision_makers` |
| Audience | `followers.count`, `followers.mom_percent`, `followers.qoq_percent`, `followers.yoy_percent`, `followers.timeseries` |
| News | `news[].article_title`, `article_url`, `article_publish_date`, `source`, `confidence_score`, `publisher_domain` |
| Reviews | `employee_reviews.overall_rating.rating`, `employee_reviews.overall_rating.total_count`, culture/work-life/management ratings; `software_reviews.average_rating`, `software_reviews.review_count`; `reviews` |
| Other profiles | `social_profiles`, `market_intel`, `public_launches` |
| Freshness | `metadata.updated_at`, `metadata.indexed_at`, `metadata.growth_calculation_date` |

## Coverage in these three responses

“Populated” means at least one nested scalar is not null/empty. It includes zero and false; it does not mean the group is complete or accurate. See the dictionary for field-level availability.

| Group | Misto | Wicked Good Cupcakes | Tom & Chee |
| --- | --- | --- | --- |
| basic_info | populated | populated | populated |
| competitors | populated | populated | populated |
| crustdata_company_id | populated | populated | populated |
| employee_reviews | empty/null | populated | populated |
| followers | populated | populated | populated |
| funding | populated | populated | populated |
| headcount | populated | populated | populated |
| hiring | empty/null | empty/null | empty/null |
| locations | populated | populated | populated |
| market_intel | empty/null | empty/null | empty/null |
| metadata | empty/null | empty/null | empty/null |
| news | populated | populated | populated |
| people | populated | empty/null | populated |
| public_launches | empty/null | empty/null | empty/null |
| revenue | populated | populated | populated |
| reviews | empty/null | empty/null | empty/null |
| seo | populated | populated | populated |
| social_profiles | populated | populated | populated |
| software_reviews | empty/null | empty/null | empty/null |
| taxonomy | populated | populated | populated |
| web_traffic | populated | populated | populated |

## Quality findings

- Name lookup for MistoBox selected MistoBox LLC (ID 71130061, confidence 0.8). Exact domain identification selected Misto (ID 2436762) with a coffee-subscription description, confidence 1.0. Domain resolution changed the selected record materially.
- Wicked Good Cupcakes had multiple exact-name candidates. We selected the domain-matched record, ID 2525868. Tom & Chee resolved to ID 1228597.
- Profile employee ranges disagree with measured headcount: Wicked Good Cupcakes returns 51–200 versus total 2; Tom & Chee returns 501–1000 versus total 107. Keep both columns with their source meaning.
- Revenue is an estimate. Tom & Chee returns $500M–$1B, which needs independent validation before business use. Misto returns $1M–$2.5M and Wicked Good Cupcakes $10M–$20M, also unverified estimates.
- Funding total is 0 for all three while last-round details are null. This is not proof that they never raised money or received a Shark Tank investment.
- Hiring openings are null for all three, not confirmed zero.
- Misto has one decision-maker record; Wicked Good Cupcakes has no people records in this response; Tom & Chee has two CXO, eight decision-maker, and one founder entries. Entries can overlap across lists.
- Misto news includes Misto Holdings dividends and fashion-store articles. Tom & Chee news includes unrelated politics and Tom Brady stories. These appear to be entity collisions even where article confidence is high. Do not use those articles as company facts without checking relevance.
- Metadata freshness fields were null in all three responses. Historical series contain dates, but request time does not establish the freshness of every metric.
- Technographics is disabled for this key and would add 2 credits per populated company if enabled. Social posts is a premium field (+5 credits per company per the account schema); neither was requested. Other people, job, web and social APIs offer additional data beyond this company enrichment sample.

## Supporting files

The supporting files are in research/crustdata-sample/. This report and the exploration artifacts are ignored by Git.

- `field-dictionary.json`: every observed nested path, JSON types, companies where present/populated, and short first-value examples. Array entries use `[]`; traffic domains use `{domain}`. Dynamic role/skill names remain as returned. Examples are truncated to 180 characters; full values remain in raw responses.
- `sample-responses.json`: complete company enrichment responses, including matching evidence and retrieval timestamp.
- `account-company-fields.json`: fields enabled/disabled for this API key and account-specific pricing, without credentials. This lists more possible fields than this small sample can demonstrate.

For a database, use one company table for scalar fields and separate child tables for people, news, funding events and time series. Preserve raw JSON so empty arrays, nulls and omitted fields remain distinguishable.

Official references: [Enrich reference](https://docs.crustdata.com/company-docs/enrichment/reference), [Identify](https://docs.crustdata.com/api-reference/company-apis/identify-a-company-from-name-domain-id-or-profile-url), [Pricing](https://docs.crustdata.com/general/pricing).
