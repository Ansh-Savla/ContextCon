> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Job Autocomplete API

> Discover valid field values for Job Search filters using the autocomplete API.

## Endpoint essentials

| Detail | Value |
| - | - |
| **API key and headers** | Send `Authorization: Bearer YOUR_API_KEY` and `x-api-version: 2025-11-01` with every request. |
| **Access** | All plans. Check your account with [Permissions](https://docs.crustdata.com/general/permissions.md). |
| **Free account** | Yes, the endpoint is free |
| **Credit cost** | Free |
| **Rate limit** | 30 requests per minute |

**Use this when** you need to discover exact indexed values before building
a [Search Jobs](https://docs.crustdata.com/job-docs/search/introduction.md) query — for filter dropdowns,
input validation, dataset exploration, or guided query builders.

The Job Autocomplete API returns ranked field-value suggestions so you can
feed the result straight into a Search Jobs filter without guessing at valid
values.

> [!WARNING]
>
> This endpoint returns **field values, not job listings**. It also has **no
> pagination or cursor** — the `limit` parameter (max `100`) is the only way
> to control result size. To fetch job records, use [Search
> Jobs](https://docs.crustdata.com/job-docs/search/introduction.md) instead.

> [!NOTE]
>
> Replace `YOUR_API_KEY` in each example with your actual API key. All
> requests require the `x-api-version: 2025-11-01` header.

### At a glance

| Detail | Value |
| - | - |
| **Endpoint** | `POST https://api.crustdata.com/job/search/autocomplete` |
| **Auth** | `Authorization: Bearer YOUR_API_KEY` |
| **API version** | `x-api-version: 2025-11-01` header (required) |
| **Required** | `field` (string) · `query` (string, may be empty) |
| **Optional** | `limit` (integer, 1–100, default 20) |
| **Response** | `{ "suggestions": [ { "value": string } ] }` |
| **Errors** | `400` invalid request · `401` unauthorized · `500` internal |
| **Pricing** | Free — autocomplete does not consume credits. |

> [!NOTE]
>
> Default `rate-limit` is 30 requests per minute. Send an email to
> [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if
> needed for your use case.

***

## When to use Autocomplete vs Search

| You want to… | Use |
| - | - |
| Discover valid filter values for a field | **Autocomplete** (this page) |
| See the distinct values a field takes, ranked | **Autocomplete** with an empty `query` |
| Return actual job listings matching filters | [**Search Jobs**](https://docs.crustdata.com/job-docs/search/introduction.md) |
| Build a type-ahead dropdown for a filter UI | **Autocomplete** with a partial `query` |

***

## Quick start: discover job title values

Type-ahead lookup on a single field. Pass the user's partial input as
`query` and cap the dropdown size with `limit`.

```bash curl theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/job/search/autocomplete \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "field": "title",
    "query": "Software",
    "limit": 5
  }'
```

```python Python theme={"theme":"vitesse-black"}
import os
import requests

response = requests.post(
    "https://api.crustdata.com/job/search/autocomplete",
    headers={
        "Authorization": f"Bearer {os.environ['CRUSTDATA_API_KEY']}",
        "Content-Type": "application/json",
        "x-api-version": "2025-11-01",
    },
    json={
        "field": "title",
        "query": "Software",
        "limit": 5,
    },
)
response.raise_for_status()
suggestions = response.json()["suggestions"]
```

```javascript Node.js theme={"theme":"vitesse-black"}
const response = await fetch(
    "https://api.crustdata.com/job/search/autocomplete",
    {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.CRUSTDATA_API_KEY}`,
            "Content-Type": "application/json",
            "x-api-version": "2025-11-01",
        },
        body: JSON.stringify({
            field: "title",
            query: "Software",
            limit: 5,
        }),
    },
);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const { suggestions } = await response.json();
```

```json Response theme={"theme":"vitesse-black"}
{
    "suggestions": [
        { "value": "Software Deployment Manager Level 3 or 4" },
        { "value": "Software Test Engineer Level 1/2 (AHT)" },
        { "value": "Software Engineer" },
        { "value": "Software Engineer, AI/ML, Google Workspace" },
        {
            "value": "Software Engineering Manager, VP – Private Wealth Technology"
        }
    ]
}
```

Each suggestion includes:

* **`value`** — the exact **indexed value** stored against `field`. Use it verbatim as a Search Jobs filter value.

When no values match the `query`, the response returns an empty array — not
a 404:

```json No results theme={"theme":"vitesse-black"}
{
    "suggestions": []
}
```

***

## Examples

Worked recipes you can copy, paste, and adapt. Each example is a full working
request you can adapt to your own fields and filters.

For the core walkthrough (quick start, response shape), see the
[Quick start](#quick-start-discover-job-title-values) above. For request
parameters, autocomplete-enabled fields, and errors, see the
[reference sections](#request-parameters) below.

> [accordion] Get the most common values for a field
>
> Pass an empty `query` to retrieve the top values for a field, ranked. This
> is ideal for a controlled vocabulary like `category` — it returns the full
> set of categories without an extra round-trip, perfect for seeding a filter
> dropdown.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/job/search/autocomplete \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "field": "category",
>     "query": "",
>     "limit": 8
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "suggestions": [
>         { "value": "Others" },
>         { "value": "Engineering" },
>         { "value": "Sales" },
>         { "value": "Product" },
>         { "value": "Operations" },
>         { "value": "Consultancy" },
>         { "value": "Management and Manufacturing" },
>         { "value": "Project Management" }
>     ]
> }
> ```

> [accordion] Autocomplete job titles
>
> Free-text fields like `title` have a large value space. Pass a partial
> `query` to power a type-ahead input.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/job/search/autocomplete \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "field": "title",
>     "query": "Software",
>     "limit": 6
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "suggestions": [
>         { "value": "Software Deployment Manager Level 3 or 4" },
>         { "value": "Software Test Engineer Level 1/2 (AHT)" },
>         { "value": "Software Engineer" },
>         { "value": "Software Engineer, AI/ML, Google Workspace" },
>         { "value": "Software Engineering Manager, VP – Private Wealth Technology" },
>         { "value": "Software Engineer - Guidance, Navigation, and Controls" }
>     ]
> }
> ```

> [accordion] Autocomplete companies and locations
>
> The same endpoint works for company names and locations. Use `company.name`
> to suggest hiring companies, or `location.country` to suggest countries.
>
> > [tab] Company name
> >
> > ```bash Request theme={"theme":"vitesse-black"}
> > curl --request POST \
> >   --url https://api.crustdata.com/job/search/autocomplete \
> >   --header 'authorization: Bearer YOUR_API_KEY' \
> >   --header 'content-type: application/json' \
> >   --header 'x-api-version: 2025-11-01' \
> >   --data '{
> >     "field": "company.name",
> >     "query": "Strip",
> >     "limit": 5
> >   }'
> > ```
> >
> > ```json Response theme={"theme":"vitesse-black"}
> > {
> >     "suggestions": [
> >         { "value": "Stripe" },
> >         { "value": "StripMallGuy" },
> >         { "value": "Stripes" },
> >         { "value": "StripFood" },
> >         { "value": "Stripes Convenience Stores" }
> >     ]
> > }
> > ```
>
> > [tab] Location (country)
> >
> > ```bash Request theme={"theme":"vitesse-black"}
> > curl --request POST \
> >   --url https://api.crustdata.com/job/search/autocomplete \
> >   --header 'authorization: Bearer YOUR_API_KEY' \
> >   --header 'content-type: application/json' \
> >   --header 'x-api-version: 2025-11-01' \
> >   --data '{
> >     "field": "location.country",
> >     "query": "United",
> >     "limit": 5
> >   }'
> > ```
> >
> > ```json Response theme={"theme":"vitesse-black"}
> > {
> >     "suggestions": [
> >         { "value": "United States" },
> >         { "value": "United States of America" },
> >         { "value": "United Kingdom" },
> >         { "value": "United Arab Emirates" },
> >         { "value": "United States Minor Outlying Islands" }
> >     ]
> > }
> > ```
> >
> > > [!TIP]
> > >
> > > Note that a single country can have several indexed spellings (for
> > > example, `United States` and `United States of America`). When you filter
> > > Search Jobs, pass all the variants you care about with the `in` operator.

> [accordion] Full workflow: Autocomplete → Search
>
> Autocomplete discovers the exact value Search Jobs expects, then Search finds
> matching listings.
>
> ### Step 1: Discover a valid category value
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/job/search/autocomplete \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{"field": "category", "query": "Eng", "limit": 3}'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "suggestions": [
>         { "value": "Engineering" },
>         { "value": "Engineering and Information Technology" },
>         { "value": "Information Technology and Engineering" }
>     ]
> }
> ```
>
> **Extract:** Take `suggestions[0].value` → `"Engineering"`. Use this exact
> string in your Search filter.
>
> ### Step 2: Search for matching jobs
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": { "field": "job_details.category", "type": "=", "value": "Engineering" },
>     "fields": ["job_details.title", "company.basic_info.name", "location.raw"],
>     "limit": 1
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "job_listings": [
>         {
>             "company": { "basic_info": { "name": "Accenture" } },
>             "job_details": { "title": "French Application Developer" },
>             "location": { "raw": "Bengaluru, India" }
>         }
>     ],
>     "next_cursor": "H4sIAAKbKmoC_xXMSQoCMRBA0auErHtRk0nFq4g0lXRCL8RgDwsR727cfh7_419n3d7zavvqr85X0EtOikoLopouZAGq5cwYRS1KRi2Rc6ytlSgt1YSNEwgHAgHwk_N7347xuhGpJqQwMsDkQgoMdB_g6Ic95tLP59-JiBLH7w-dPgQbiwAAAA==",
>     "total_count": 4448237
> }
> ```
>
> See [Search Jobs](https://docs.crustdata.com/job-docs/search/introduction.md) for the full filter grammar,
> and [Examples](https://docs.crustdata.com/job-docs/search/introduction.md#examples) for more end-to-end recipes.

***

## Guaranteed contract vs current behavior

Use this table to separate the parts you can build against with confidence
from the observed behavior that may evolve.

| Topic | Kind | What it means |
| - | - | - |
| Endpoint, HTTP method, auth headers | **Contract** | `POST /job/search/autocomplete`, bearer auth, `x-api-version: 2025-11-01`. |
| Request body shape | **Contract** | `field` and `query` required, `limit` optional. No `filters` or `count` keys on this scope. |
| `filters` key | Current behavior | Accepted and ignored. Suggestions match a request without `filters`. |
| Response body shape | **Contract** | `{ "suggestions": [ { "value" } ] }`. Empty results return `{"suggestions": []}` with status `200`. |
| `limit` bounds and default | **Contract** | Minimum `1`, maximum `100`, default `20`. |
| Error status codes | **Contract** | `400` (invalid request), `401` (unauthorized), `500` (internal). |
| Pricing | **Contract** | Autocomplete does not consume credits. |
| Suggestion ranking | Current behavior | Suggestions are ranked by internal frequency — the ranking signal is not exposed in the response. |
| Empty-query top values | Current behavior | An empty `query` returns the most common values for the field, ranked. |
| Free-text duplicates | Current behavior | For high-cardinality free-text fields like `title`, an empty `query` may return repeated values. |

***

## Request parameters

| Parameter | Type | Required | Description |
| - | - | - | - |
| `field` | string | Yes | Must be an **autocomplete-enabled field** — see [Autocomplete-enabled fields](#autocomplete-enabled-fields). Unsupported fields return `400`. |
| `query` | string | Yes | Partial text to match against indexed values. Pass `""` to retrieve the top values for the field by frequency. |
| `limit` | integer | No | Maximum number of suggestions to return. Minimum `1`, maximum `100`, default `20`. |

> [!NOTE]
>
> Job Autocomplete does not take a `filters` scope. The request body is just
> `field`, `query`, and `limit`. If you send a `filters` key, the API ignores
> it and returns the same suggestions as a request without it.

***

## Autocomplete-enabled fields

The `field` in a Job Autocomplete request must come from a **fixed
allowlist**. Many entries are aliases of one another — for example `title`,
`job_title`, and `job_details.title` all autocomplete job titles, so you can
use whichever spelling matches the filter path you use on
[Search Jobs](https://docs.crustdata.com/job-docs/search/introduction.md).

> [tab] Job
>
> | Field | What it discovers |
> | - | - |
> | `title` · `job_title` · `job_details.title` | Job titles |
> | `category` · `job_category` · `job_details.category` | Job categories |
> | `workplace_type` · `job_details.workplace_type` | Workplace types |

> [tab] Company
>
> | Field | What it discovers |
> | - | - |
> | `company.name` · `company.basic_info.name` | Hiring company names |
> | `company.industries` · `company.basic_info.industries` | Company industries |
> | `company.basic_info.primary_domain` | Company website domains |
> | `company.headcount.range` | Headcount brackets |
> | `company.headcount.largest_country` | Largest-headcount countries |
> | `company.funding.last_round_type` | Funding round types |
> | `company.funding.investors` | Investors |
> | `company.revenue.acquisition_status` | Acquisition statuses |
> | `company.revenue.public_markets.stock_symbols` | Stock symbols |
> | `company.revenue.public_markets.fiscal_year_end` | Fiscal year ends |
> | `company.locations.city` · `company.locations.state` · `company.locations.country` | Company office locations |

> [tab] Location
>
> | Field | What it discovers |
> | - | - |
> | `country` · `location.country` · `locations.country` | Countries |
> | `country_code` | Country codes |
> | `continent` | Continents |
> | `state` · `location.state` · `locations.state` | States / regions |
> | `city` · `location.city` · `locations.city` | Cities |
> | `district` · `location.district` · `locations.district` | Districts |
> | `location` · `location.raw` · `locations.location` | Raw location strings |

> [tab] Technographics
>
> | Field | What it discovers |
> | - | - |
> | `technology` · `technographics.technologies.name` | Technology names |
> | `technology_category` · `technographics.technologies.category` | Technology category slugs |
>
> These serve the same canonical vocabulary as
> [Company Autocomplete](https://docs.crustdata.com/company-docs/autocomplete/introduction.md#common-fields-to-autocomplete),
> so `"Reac"` returns `React`, `React Redux`, `React Native`, and so on either
> way. Use them to get exact values for the posting-scoped
> [technographics filters](https://docs.crustdata.com/job-docs/search/reference.md#technographics-filter-only)
> on Search Jobs, which are case-sensitive.
>
> `technographics.technologies.super_category` has **no** autocomplete. Its
> twelve slugs are listed in the
> [Search Jobs reference](https://docs.crustdata.com/job-docs/search/reference.md#technographics-filter-only).

### Verify the live list

Call the endpoint with a deliberately invalid `field`. The `400` response
lists every currently accepted field in its error `message`:

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/job/search/autocomplete \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "field": "not_a_field",
    "query": "",
    "limit": 1
  }'
```

```json Response (abbreviated) theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "Field 'not_a_field' is not supported on scope 'job'. Valid fields: category, city, company.basic_info.industries, company.basic_info.name, ..., job_details.title, job_title, location, ..., state, technographics.technologies.category, technographics.technologies.name, technology, technology_category, title, workplace_type",
        "metadata": []
    }
}
```

***

## Implementation tips for UI builders

> [!TIP]
>
> * **Debounce** autocomplete calls to avoid one request per keystroke —
>   150–300 ms on input idle works well for typeahead UIs. - **Seed dropdowns
>   with an empty query.** For controlled vocabularies like `category`, an empty
>   `query` returns the full set in one call. - **De-duplicate free-text
>   fields.** High-cardinality fields like `title` can return repeated values —
>   collapse duplicates before rendering. - **Expand location variants.** A
>   country may have several indexed spellings (for example `United States` and
>   `United States of America`); pass all the variants you need to a Search Jobs
>   filter with the `in` operator. - **Cap `limit`.** Most dropdowns need 5–15
>   options. A lower `limit` reduces payload size and speeds up responses.

***

## Errors

| Status | Meaning |
| - | - |
| `400` | Invalid request — unsupported `field`, missing `query`, or `limit` out of range. |
| `401` | Unauthorized — the `Authorization` header is missing, malformed, or contains an invalid API key. |
| `500` | Internal server error — retry after a short delay. |

Every error uses the nested envelope
`{ "error": { "type", "message", "metadata" } }`. A `query` that matches
nothing is **not** an error — the endpoint returns `{"suggestions": []}` with
a `200` status.

```json 400 — Unsupported field theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "Field 'not_a_field' is not supported on scope 'job'. Valid fields: category, city, ..., job_details.title, job_title, ..., state, title, workplace_type",
        "metadata": []
    }
}
```

```json 400 — Missing query theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "query is required",
        "metadata": []
    }
}
```

```json 400 — limit out of range theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "limit must be between 1 and 100",
        "metadata": []
    }
}
```

```json 401 — Invalid API key theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "unauthorized",
        "message": "Invalid API key in request.",
        "metadata": []
    }
}
```

***

## API reference summary

| Detail | Value |
| - | - |
| **Endpoint** | `POST /job/search/autocomplete` |
| **Auth** | Bearer token + `x-api-version: 2025-11-01` |
| **Required params** | `field`, `query` |
| **Optional params** | `limit` (default: 20, max: 100) |
| **Response** | `{ "suggestions": [{ "value": "..." }] }` |
| **Empty result** | `200` with `"suggestions": []` |
| **Pricing** | Free — no credits |
| **Errors** | `400` (unsupported field / bad request), `401` (bad auth), `500` (server error) |

See the [full API reference](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction.md) for the
complete OpenAPI schema.

***

## What to do next

* **Try more patterns** — see the [Examples](#examples) above for most-common values, company and location autocomplete, and the Autocomplete → Search workflow.
* **Reference** — see the [request parameters](#request-parameters), [autocomplete-enabled fields](#autocomplete-enabled-fields), implementation tips, and errors above.
* **Search for jobs** — use discovered values in [Search Jobs](https://docs.crustdata.com/job-docs/search/introduction.md).


## Related topics

- [Person Autocomplete API](https://docs.crustdata.com/person-docs/autocomplete/introduction.md)
- [API Introduction](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction.md)
- [Job Postings Search API](https://docs.crustdata.com/job-docs/search/introduction.md)
- [Company Autocomplete API](https://docs.crustdata.com/company-docs/autocomplete/introduction.md)
- [Autocomplete](https://docs.crustdata.com/api-reference/job-apis/autocomplete-values-for-a-job-search-field.md)
