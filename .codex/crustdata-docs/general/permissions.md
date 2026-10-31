> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Permissions

> List every Crustdata API endpoint with your account's access status, enabled and disabled response fields, and effective rate limits — in one free GET request.

Use this endpoint to see exactly what your API key can do: which endpoints
your account can call, which response fields each returns, the rate limit that
applies to you per endpoint, and what each one costs your account in credits.
It is read-only — to change your access, contact your Crustdata account manager.

> [!NOTE]
>
> This endpoint is **free** — checking your permissions does not consume any
> credits. It is rate limited to 300 requests per minute.

## Endpoint

```
GET https://api.crustdata.com/account/endpoints
```

Authenticate with your API key in the `Authorization` header and send the
required `x-api-version: 2025-11-01` header — requests without it return
`400`. Permissions are account-wide: every API key on your account starts with
the same access. An admin can narrow an individual key further — see
[Per-key endpoint access](#per-key-endpoint-access).

## Filter, or the response is hard to read

Unfiltered, this endpoint returns all 34 product endpoints, and every entry
lists each response field your account can and cannot receive as a dot-path
string. That is 2,295 field strings in total, and `/company/enrich` alone
contributes 531 enabled and 162 disabled. As compact JSON on a single line the
whole payload is around 89 KB, which is why `--format json` on the
[CLI](https://docs.crustdata.com/for-agents/cli.md) gives you a wall of text.

Start with a single endpoint to learn the shape:

```bash theme={"theme":"vitesse-black"}
curl --request GET \
  --url 'https://api.crustdata.com/account/endpoints?path=/web/enrich/live' \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

That entry is five fields long and fits on a screen. Then widen with
`category` or `status`. If you do want everything, pipe it through `jq` and
drop the field lists:

```bash theme={"theme":"vitesse-black"}
curl -s --request GET \
  --url 'https://api.crustdata.com/account/endpoints' \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01' \
  | jq -r '.endpoints[] | [.status, .effective_rate_limit_rpm, .category, .path] | @tsv'
```

## Query parameters

All parameters are optional filters and combine with AND. A filter that
matches nothing returns `200` with an empty `endpoints` array, not a `404`.

| Parameter | Example | Effect |
| - | - | - |
| `path` | `?path=/company/enrich` | Exact endpoint-path match. Case-sensitive, leading slash required, and a prefix such as `/company` matches nothing. |
| `category` | `?category=Company` | Endpoints in that product category. Case-insensitive. |
| `status` | `?status=enabled` | Only `enabled` or `disabled` endpoints. Case-sensitive; any other value returns `400`. |

## Example request

```bash Request theme={"theme":"vitesse-black"}
curl --request GET \
  --url 'https://api.crustdata.com/account/endpoints?path=/company/enrich' \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

```python Python theme={"theme":"vitesse-black"}
import requests

resp = requests.get(
    "https://api.crustdata.com/account/endpoints",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "x-api-version": "2025-11-01",
    },
)
for endpoint in resp.json()["endpoints"]:
    print(endpoint["path"], endpoint["status"], endpoint["effective_rate_limit_rpm"])
```

```json Response theme={"theme":"vitesse-black"}
{
  "api_version": "2025-11-01",
  "token_limit_rpm": null,
  "endpoints": [
    {
      "path": "/company/enrich",
      "category": "Company",
      "status": "enabled",
      "effective_rate_limit_rpm": 15,
      "fields": {
        "enabled": ["basic_info", "basic_info.all_domains", "basic_info.company_type", "..."],
        "disabled": ["hiring.recent_openings", "social_posts", "..."]
      },
      "base_credits": 2,
      "premium_fields": [
        { "field": "technographics", "credits": 2 },
        { "field": "social_posts", "credits": 5 }
      ]
    }
  ]
}
```

The `enabled` and `disabled` lists are truncated above. In the real response
this one entry carries 531 enabled and 162 disabled field paths.

Search endpoints carry the filter side too. `/person/search` prices both —
filtering on a premium group and receiving it are independent charges per
result, and the filter-only GitHub units appear under `premium_filters` alone:

```json Search entry (trimmed) theme={"theme":"vitesse-black"}
{
  "path": "/person/search",
  "base_credits": 0.03,
  "premium_filters": [
    { "field": "experience", "credits": 0.1 },
    { "field": "professional_network.connections", "credits": 0.2 },
    { "field": "dev_platform_profiles", "credits": 0.8 },
    { "field": "dev_platform_profiles.repos", "credits": 2.5 }
  ],
  "premium_fields": [
    { "field": "experience", "credits": 0.1 },
    { "field": "professional_network.summary", "credits": 0.2 }
  ]
}
```

The standard list prices behind these per-account numbers are on the
[pricing page](https://docs.crustdata.com/general/pricing.md#premium-fields-in-search).

## Response fields

| Field | Type | Description |
| - | - | - |
| `token_limit_rpm` | number \| null | Aggregate requests-per-minute ceiling for your API key across all endpoints. `null` when no account-wide ceiling is set, which is the usual case; the per-endpoint limit applies instead. |
| `endpoints[].path` | string | Endpoint path, as you would call it. |
| `endpoints[].category` | string | Product category: `Company`, `Person`, `Jobs`, `Web`, `Social`, or `Other`. |
| `endpoints[].status` | string | `enabled` — your account can call it; `disabled` — it requires an upgrade. |
| `endpoints[].effective_rate_limit_rpm` | number \| null | The requests-per-minute limit that applies to your account for this endpoint. |
| `endpoints[].fields.enabled` | string\[] | Response fields your account receives from this endpoint. |
| `endpoints[].fields.disabled` | string\[] | Response fields withheld from your account. |
| `endpoints[].base_credits` | number | Credits charged per result. Absent on endpoints with no per-result charge. |
| `endpoints[].premium_filters` | object\[] | Fields that cost extra to filter on, as `{ field, credits }` charged per result. Search endpoints only. |
| `endpoints[].premium_fields` | object\[] | Fields that cost extra to receive, as `{ field, credits }` charged per result that returns them. |
| `endpoints[].premium_modes` | object\[] | Request flags that change the cost, as `{ mode, credits }` — `preview` on live search, `verified` on contact enrich. |

## How to read the prices

Every price is **your account's own price**, read from your billing
configuration — a negotiated or contract rate shows here as the rate you
actually pay. Endpoints omit the keys that do not apply to them: an enrich
endpoint has no `premium_filters`, and an endpoint with no extras carries
`base_credits` alone.

In `premium_filters` and `premium_fields`, `field` is a path prefix: a root such
as `experience` covers every path beneath it, and the longest matching prefix
wins, so `dev_platform_profiles.repos` is priced by its own entry rather than by
`dev_platform_profiles`. The two sides are independent — filtering on a field
and receiving it are separate charges — and sorting on one is free.

A field priced to filter on but never returned by the endpoint appears only in
`premium_filters`.

## How to read the field lists

* On an **enabled** endpoint, `fields.disabled` lists the specific fields your
  plan does not include — the endpoint works, but those fields are omitted
  from its responses.
* On a **disabled** endpoint, `fields.enabled` is empty and
  `fields.disabled` lists everything the endpoint can return — the full set
  you would unlock by enabling it.
* **Batch endpoints** (`/batch/...`) list the fields of the job envelope they
  return (`batch_id`, `status`, `status_url`, and so on), not the fields of
  the records the job produces. Read the matching non-batch endpoint's entry
  for those. A batch endpoint with no field-gated payload lists nothing at
  all.
* Field names are dotted paths (for example `basic_info.company_type`) in the
  form the endpoint's `fields` request parameter accepts. You can copy a path
  from either list into a request as it is.
* Five endpoints wrap their results in an envelope key: `companies` on
  `/company/search` and `/company/professional_network/search/live`, `profiles`
  on `/person/professional_network/search/live`, `job_listings` on
  `/job/professional_network/search/live`, and `posts` on
  `/social_post/professional_network/enrich/live`. Paths on these endpoints
  leave the envelope out, so `/company/search` lists `basic_info.name`, not
  `companies.basic_info.name`. The lists also leave out pagination keys such
  as `next_cursor`.
* Each path is in only one of the two lists. Both lists are sorted, and so is
  the `endpoints` array itself.

## Errors

| Status | Body | Cause |
| - | - | - |
| `401` | `{ "message": "Missing API key in request" }` | No `Authorization` header. |
| `401` | `{ "message": "Invalid API key in request" }` | `Authorization` header carries an invalid key. |
| `400` | `{ "error": { "type": "invalid_request", "message": "Missing required header: x-api-version. ..." } }` | No `x-api-version` header. |
| `400` | `{ "error": { "type": "invalid_request", "message": "Account endpoints requires API version 2025-11-01. ..." } }` | Unsupported `x-api-version` value. |
| `400` | `{ "error": "Invalid status 'x'; expected one of ['enabled', 'disabled']" }` | `status` filter outside `enabled`/`disabled`. |
| `429` | — | More than 300 requests per minute. |

## Per-key endpoint access

Account permissions set the ceiling for every key on the account. A workspace
admin can restrict an individual key to a subset of those endpoints on the
**API Keys** page in your [dashboard](https://app.crustdata.com/). A key with no
restriction can call everything the account has enabled.

Calling an endpoint the key is not allowed to use returns `403`:

```json theme={"theme":"vitesse-black"}
{
  "error": {
    "type": "permission_error",
    "message": "This API key does not have access to /person/search. A workspace admin can update the key's endpoint access in the dashboard.",
    "metadata": []
  }
}
```

The status and `error.type` match an account-level permission failure, so
clients need no new handling. The message names the endpoint that was refused.

## When a request asks for a disabled field

Naming a field from `fields.disabled` in a request returns `403` before any
work happens, so `X-Credits-Used` is `0`. The `metadata` entry splits the fields
the account was refused from the ones it holds, so you can retry with a narrower
`fields` list:

```json 403 field denied theme={"theme":"vitesse-black"}
{
  "error": {
    "type": "permission_error",
    "message": "Access denied to fields: hiring.recent_openings. To enable access, please book a call with us at https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request",
    "metadata": [
      {
        "denied_fields": ["hiring.recent_openings"],
        "permitted_fields": ["basic_info", "funding", "headcount"]
      }
    ]
  }
}
```

`permitted_fields` is the account's whole grant list for that endpoint, so in a
real response it runs to hundreds of dot-paths. The example above is trimmed.

Batch endpoints (`/batch/...`) return the same status and `error.type` and put
the permitted list in the message instead of in `metadata`. The message below is
trimmed the same way: on a wide grant the real one carries every permitted
dot-path and runs to tens of kilobytes, so size your log lines for it.

```json 403 field denied on a batch endpoint theme={"theme":"vitesse-black"}
{
  "error": {
    "type": "permission_error",
    "message": "Access denied to fields: hiring.recent_openings. Available fields: basic_info, funding, headcount. To enable access, please book a call with us at https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request",
    "metadata": []
  }
}
```

Resending the same body gets you the same `403`. Send a narrower `fields` list
to get the rest of the record, or book the call the message links to and have
the field enabled.

## What to do next

* **Check your balance** — see [Credits](https://docs.crustdata.com/general/credits.md) before large batches.
* **Understand per-endpoint limits** — see [Rate limits](https://docs.crustdata.com/general/rate-limits.md).
* **See what fields cost** — review [Pricing](https://docs.crustdata.com/general/pricing.md) for credit costs per endpoint.


## Related topics

- [Permissions and rate limits](https://docs.crustdata.com/api-reference/account-apis/list-endpoint-permissions-and-rate-limits.md)
- [Person Enrichment API](https://docs.crustdata.com/person-docs/enrichment/introduction.md)
- [Technographics](https://docs.crustdata.com/guides/technographics.md)
- [Best practices](https://docs.crustdata.com/openapi-specs/2025-11-01/best-practices.md)
- [Social Post Search reference](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md)
