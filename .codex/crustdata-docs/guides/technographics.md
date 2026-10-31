> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Technographics

> Detect the tools, platforms, and categories a company uses, and the technologies named in an individual job posting, directly through the Crustdata Company and Job APIs.

> [!NOTE]
>
> Technographics is currently in **beta**. Field names, category values, and
> coverage may evolve based on feedback. To share input or request access,
> write to [support@crustdata.co](mailto:support@crustdata.co).

Technographics maps each company to the technologies it uses. Every tool comes
with a **name**, the **sources** it was detected from, its **catalog
categories**, a **description**, and the **job-posting evidence** behind the
detection, so you can both target companies by their stack and read the full
stack for a company you already care about.

The same detection also runs at the level of a single job posting, so
[Job Search](https://docs.crustdata.com/job-docs/search/introduction.md) can filter on the technologies a
posting actually names. That is a different question from the company one:
company technographics tells you what an organization runs, posting
technographics tells you what one open role is built on.

### Where technographics is available

Technographics ships on the existing Company and Job APIs. There is no separate
endpoint, and each endpoint plays a different role:

| API | Request field | Notes |
| - | - | - |
| [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/introduction.md) | `fields: ["technographics"]` | **Returns** the full detected stack. Never returned by default; request it. |
| [Company Search](https://docs.crustdata.com/company-docs/search/introduction.md) | `technographics.*` filter columns | **Filters and sorts** companies by tech stack, but does not return the values. |
| [Job Search](https://docs.crustdata.com/job-docs/search/introduction.md) | `technographics.technologies.*` filter columns | **Filters** postings by the technologies named in that posting. Values are not returned. |
| [Job Autocomplete](https://docs.crustdata.com/job-docs/autocomplete/introduction.md) | `technology`, `technology_category` | Discovers the exact technology and category values a Job Search filter expects. |

### At a glance

| Detail | Value |
| - | - |
| **Read endpoint** | `POST https://api.crustdata.com/company/enrich` |
| **Filter endpoint** | `POST https://api.crustdata.com/company/search` |
| **Auth** | `authorization: Bearer YOUR_API_KEY` |
| **API version** | `x-api-version: 2025-11-01` header |
| **Enrich field** | `technographics` (request via `fields`); returned under `company_data.technographics` |
| **Company filter columns** | Each is prefixed with `technographics.`: `technographics.total_technologies`, `technographics.top_technologies`, `technographics.technologies.name`, `technographics.technologies.category`, `technographics.technologies.super_category` |
| **Job filter columns** | `technographics.technologies.name`, `technographics.technologies.category`, `technographics.technologies.super_category`, on `POST https://api.crustdata.com/job/search`. Posting-scoped and filter-only. |
| **Access** | Gated add-on on the Enrich field group; requires field-level permission on your account |
| **Pricing** | **+2 credits** per company that returns technographics data, on top of the base **2 credits** (beta pricing, subject to change) |
| **Freshness** | `updated_at`, per company |

***

## The problem: firmographics don't tell you what a company is built on

Company data tells you a company's size, funding, and industry, but not the
tools it runs. Knowing the stack is what drives the highest-intent motions:

* **Account scoring:** prioritize accounts that already run a complementary or competing product.
* **Competitive displacement:** find every company using a competitor's technology.
* **ICP targeting:** segment by category, like everyone using a data warehouse or an AI model provider.
* **Personalization:** reference a prospect's actual stack in outreach.

Detecting this yourself means running your own pipeline over each company's web
presence and job postings, then normalizing thousands of raw tool names into a
consistent taxonomy.

## The solution: a ready-made stack on the Company API

Request the `technographics` field group on
[Company Enrich](https://docs.crustdata.com/company-docs/enrichment/introduction.md) and Crustdata returns
the technologies detected for the company, each with its catalog categories and
the sources it came from:

```json theme={"theme":"vitesse-black"}
{
    "fields": ["technographics"]
}
```

To build a list instead of reading one company, filter and sort on the
`technographics.*` columns in [Company Search](https://docs.crustdata.com/company-docs/search/introduction.md),
then enrich the companies you want in full. A typical workflow is **search to
narrow, enrich to read**.

## Access and pricing

> [!NOTE]
>
> Technographics is a **gated add-on**. It requires field-level permission on
> your account. Check your access with the
> [permissions endpoint](https://docs.crustdata.com/general/permissions.md), or contact Crustdata to enable
> it. It is billed at **+2 credits** per company that returns technographics
> data, on top of the endpoint's base **2 credits** per company. Companies
> with no technographics data are not charged the add-on. The same pricing
> applies to [Batch Company Enrich](https://docs.crustdata.com/company-docs/enrichment/batch.md).

> [!NOTE]
>
> These credit amounts are **beta pricing** and may change as technographics
> moves toward general availability.

## Example: read a company's stack (Enrich)

Request the `technographics` field group explicitly. It is never returned by
default.

```bash theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/company/enrich \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "domains": ["stripe.com"],
    "fields": ["basic_info", "technographics"]
  }'
```

The `technographics` section appears on each match under
`company_data.technographics`:

```json theme={"theme":"vitesse-black"}
{
  "technographics": {
    "total_technologies": 635,
    "top_technologies": ["SQL", "SaaS", "Python", "API", "Java", "Ruby", "Go", "React", "Salesforce", "Kubernetes"],
    "technologies": [
      {
        "name": "React",
        "sources": ["web signals", "job posting"],
        "posting_count": 3,
        "categories": [
          { "category_slug": "frontend-frameworks", "super_slug": "languages-frameworks", "score": 1.0 }
        ],
        "description": "React is an open-source JavaScript library for building user interfaces with reusable components.",
        "evidence": [
          {
            "source": "job posting",
            "posting_id": "52239010",
            "confidence": 0.13,
            "url": "https://www.linkedin.com/jobs/view/4433506276",
            "title": "Software Engineer",
            "posted_at": "2026-06-25T20:30:57Z"
          },
          {
            "source": "web signals",
            "posting_id": "stripe.com",
            "confidence": 0.29,
            "url": null,
            "title": null,
            "posted_at": null
          }
        ]
      },
      {
        "name": "Twitter",
        "sources": ["web signals"],
        "posting_count": null,
        "categories": [
          { "category_slug": "community-platforms", "super_slug": "customer-success-support", "score": 1.0 }
        ],
        "description": "Twitter, now branded as X, is a microblogging platform for posting and receiving short messages.",
        "evidence": [
          {
            "source": "web signals",
            "posting_id": "stripe.com",
            "confidence": 0.29,
            "url": null,
            "title": null,
            "posted_at": null
          }
        ]
      }
    ],
    "updated_at": "2026-07-21T05:18:56Z"
  }
}
```

### Fields

| Field | Type | Description |
| - | - | - |
| `total_technologies` | integer | Total count of technologies detected for the company. |
| `top_technologies` | string\[] | The most notable technology names. |
| `technologies` | object\[] | List of detected technologies, capped at **500 entries** per company. |
| `technologies[].name` | string | Technology name. |
| `technologies[].sources` | string\[] | Where the signal was detected: `"web signals"` (the company's web presence) or `"job posting"`. |
| `technologies[].posting_count` | integer, nullable | Number of the company's job postings the technology was detected in. `null` when there is no job-posting signal, never `0`. |
| `technologies[].categories` | object\[] | Catalog categories for the technology, strongest match first, up to four entries. |
| `technologies[].categories[].category_slug` | string | Category slug, a lowercase kebab-case value such as `frontend-frameworks` or `cloud-platforms-iaas` (see [Coverage](#coverage-and-freshness)). The same values power the `technographics.technologies.category` search filter. |
| `technologies[].categories[].super_slug` | string | Super-category slug, the broader group the category belongs to. The same values power the `technographics.technologies.super_category` search filter. |
| `technologies[].categories[].score` | number | Strength of the category match. Higher is stronger. |
| `technologies[].description` | string, nullable | Short catalog description of the technology. |
| `technologies[].evidence` | object\[], nullable | Evidence entries behind the detection. Each has a `source`, a `posting_id`, and a `confidence`, plus `url`, `title`, and `posted_at`, which are populated for job-posting evidence and `null` for web-signal evidence. |
| `updated_at` | date-time string | Timestamp of the last technographics refresh for the company. |

The `technologies` list is ordered by notability (`top_technologies` is the
head of the same ranking) and is capped at **500 entries** per company. For a
large stack, `total_technologies` (the true count) can exceed the number of
entries returned. Use `total_technologies` for the count and `top_technologies`
for the most notable tools.

> [!WARNING]
>
> Because the list is the top 500 by notability, a company with a very large
> stack may match a [Company Search](#example-target-companies-by-tech-stack-search)
> filter on a niche technology yet not include that technology in its enriched
> `technologies` array. Treat Company Search as the authority for whether a
> company uses a given technology, and use Enrich to read the notable stack.

For the complete schema, see the
[`technographics` fields reference](https://docs.crustdata.com/company-docs/enrichment/reference#technographics-fields).

## Example: target companies by tech stack (Search)

[Company Search](https://docs.crustdata.com/company-docs/search/introduction.md) can **filter and sort** on
technographics without returning the values. Use it to build a list, then
enrich the companies you want.

```bash theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/company/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "filters": {
      "op": "and",
      "conditions": [
        { "field": "technographics.technologies.name", "type": "in", "value": ["Snowflake"] }
      ]
    }
  }'
```

To segment by category instead of a specific tool, for example every company
using a cloud service, filter on `technographics.technologies.category` with a
category slug:

```bash theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/company/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "filters": {
      "op": "and",
      "conditions": [
        { "field": "technographics.technologies.category", "type": "in", "value": ["cloud-platforms-iaas"] }
      ]
    }
  }'
```

To segment at the broader group level, filter on
`technographics.technologies.super_category` with one of the twelve
super-category slugs, for example `cloud-infrastructure`. The full set is
`cloud-infrastructure`, `collaboration-productivity`,
`customer-success-support`, `data-analytics`, `data-ml-platform`,
`ecommerce-payments`, `engineering-devops`, `finance-operations`,
`hr-workforce`, `languages-frameworks`, `sales-marketing`, and `security`.

Filterable and sortable paths:

| Path | Type | Filter | Sort | Description |
| - | - | - | - | - |
| `technographics.total_technologies` | integer | Yes | Yes | Number of detected technologies |
| `technographics.top_technologies` | string\[] | Yes | No | Most notable technology names |
| `technographics.technologies.name` | string\[] | Yes | No | Detected technology names |
| `technographics.technologies.category` | string\[] | Yes | No | Detected technology category slugs |
| `technographics.technologies.super_category` | string\[] | Yes | No | Detected technology super-category slugs |

> [!NOTE]
>
> **Pricing.** Filtering on technographics bills the [Company
> Search](https://docs.crustdata.com/company-docs/search/introduction.md) base price of **0.03 credits per
> result** plus **1 credit per result** for the technographics group. It is a
> filter-only group, so it never adds a response-side charge, and sorting on
> it is free. The technographics add-on on Company Enrich is a separate
> charge. See [Premium fields in search](https://docs.crustdata.com/general/pricing.md#premium-fields-in-search).

> [!WARNING]
>
> `technographics.total_technologies` is a raw count that tracks company size
> and job-posting volume more than stack sophistication. Sort on it for reach,
> not as a quality signal.

> [!TIP]
>
> Discover valid filter values with the `technology` and
> `technology_category`
> [autocomplete fields](https://docs.crustdata.com/company-docs/autocomplete/introduction.md#common-fields-to-autocomplete)
> so your filters match the values Crustdata uses.

See the [Company Search reference](https://docs.crustdata.com/company-docs/search/reference.md#technographics-filter-only)
for the full list of filter-only fields.

## Example: target job postings by technology (Job Search)

[Job Search](https://docs.crustdata.com/job-docs/search/introduction.md) filters on the technologies named
in **the posting itself**. Use it when you care about the role rather than the
organization: the teams actually hiring for a stack, not every company that
happens to run it somewhere.

```bash theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/job/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "filters": {
      "op": "and",
      "conditions": [
        { "field": "technographics.technologies.name", "type": "in", "value": ["Snowflake"] }
      ]
    },
    "limit": 10,
    "fields": ["crustdata_job_id", "job_details.title", "company.basic_info.name"]
  }'
```

Three filter paths are available, and all three are filter-only. Job Search
never returns technographics values, and passing one in `fields` returns
`400`.

| Path | Type | Filter | Description |
| - | - | - | - |
| `technographics.technologies.name` | string\[] | Yes | Technology named in this posting |
| `technographics.technologies.category` | string\[] | Yes | Category slug of a technology named in this posting |
| `technographics.technologies.super_category` | string\[] | Yes | Super-category slug of a technology named in this posting |

> [!WARNING]
>
> **Posting-scoped, never employer-scoped.** A job matches only when the
> technology was detected in that exact posting. It is never inferred from
> the hiring company's stack. A company whose Company Search record lists
> Snowflake will not surface its marketing roles here, because those postings
> do not name Snowflake. The two surfaces answer different questions and
> their result counts will not line up.

The twelve `super_category` slugs are `cloud-infrastructure`,
`collaboration-productivity`, `customer-success-support`, `data-analytics`,
`data-ml-platform`, `ecommerce-payments`, `engineering-devops`,
`finance-operations`, `hr-workforce`, `languages-frameworks`,
`sales-marketing`, and `security`.

**Combining conditions.** Two AND conditions on
`technographics.technologies.name` match a posting that names **both**
technologies, so `Snowflake` AND `dbt` reads as "this posting mentions
Snowflake and mentions dbt". To match either, put both values in one `in`
array. Values are case-sensitive.

**Coverage.** Posting-level detection runs on listings sourced from the
professional network (`job_details.source` = `"professional_network"`).
Postings from ATS boards such as `greenhouse` and `workday` carry no
technographics and never match these filters. Filter with `is_not_null` on
`technographics.technologies.name` to restrict a query to listings that have
been through detection.

> [!NOTE]
>
> **Pricing.** Filtering on technographics uses standard [Job
> Search](https://docs.crustdata.com/job-docs/search/introduction.md) pricing of **0.03 credits per result
> returned**, with no add-on. The technographics add-on applies only when you
> return the data through Company Enrich.

> [!TIP]
>
> Discover valid values with the `technology` and `technology_category`
> fields on [Job
> Autocomplete](https://docs.crustdata.com/job-docs/autocomplete/introduction.md#autocomplete-enabled-fields).
> They serve the same canonical vocabulary as company autocomplete, so
> `"Reac"` returns `React`, `React Redux`, and `React Native` on either
> endpoint. `super_category` has no autocomplete; use the twelve slugs above.

See the [Job Search reference](https://docs.crustdata.com/job-docs/search/reference.md#technographics-filter-only)
for operator support and null behavior.

## Coverage and freshness

* **Signals.** Technologies are detected from two independent sources: the
  company's **web presence** (`"web signals"`) and its **job postings**
  (`"job posting"`). A technology can be found by either or both, and the
  `sources` array tells you which.
* **Categories.** Every technology maps to one or more catalog categories, each
  a lowercase kebab-case category slug (for example `frontend-frameworks`, `cloud-platforms-iaas`)
  grouped under one of twelve broader super-category slugs (for example
  `engineering-devops`, `cloud-infrastructure`). Filter at either level with
  `technographics.technologies.category` and
  `technographics.technologies.super_category`. Enumerate the category slugs
  with the `technology_category` autocomplete field. Super-category slugs have
  no autocomplete; the twelve values are listed under
  [Target job postings by technology](#example-target-job-postings-by-technology-job-search).
* **Freshness.** `updated_at` reflects the last refresh of the company's
  technographics as a whole. Individual technologies are not timestamped, so a
  signal from an older job posting and a recent one look the same. During beta,
  coverage is expanding, so if a company you expect is thin or missing, let us
  know at [support@crustdata.co](mailto:support@crustdata.co).

## What to do next

* [Company Enrich reference](https://docs.crustdata.com/company-docs/enrichment/reference.md#technographics-fields): full response schema.
* [Company Search reference](https://docs.crustdata.com/company-docs/search/reference.md#technographics-filter-only): filter and sort fields.
* [Job Search reference](https://docs.crustdata.com/job-docs/search/reference.md#technographics-filter-only): posting-scoped filter fields.
* [Autocomplete](https://docs.crustdata.com/company-docs/autocomplete/introduction.md#common-fields-to-autocomplete): valid technology and category values.
* [Permissions](https://docs.crustdata.com/general/permissions.md): check whether technographics is enabled on your account.


## Related topics

- [Jobs Search reference](https://docs.crustdata.com/job-docs/search/reference.md)
- [Job Autocomplete API](https://docs.crustdata.com/job-docs/autocomplete/introduction.md)
- [Company Search reference](https://docs.crustdata.com/company-docs/search/reference.md)
- [Company Enrichment API](https://docs.crustdata.com/company-docs/enrichment/introduction.md)
- [Company Enrich reference](https://docs.crustdata.com/company-docs/enrichment/reference.md)
