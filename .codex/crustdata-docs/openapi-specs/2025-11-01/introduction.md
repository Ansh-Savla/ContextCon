> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# API Introduction

> Learn the base URL, headers, authentication, versioning, and response patterns used across the Crustdata API.

Use this page to send your first request and understand the shared conventions across the Company, Person, Job, Web, and Social Post APIs.

## Base URL

All API requests are made to:

```
https://api.crustdata.com
```

## Authentication

Every request must include a Bearer token in the `authorization` header.

```bash theme={"theme":"vitesse-black"}
--header 'authorization: Bearer YOUR_API_KEY'
```

You can get your API key from the [Crustdata dashboard](https://crustdata.com).

> [!WARNING]
>
> Keep your API key secret. Do not expose it in client-side code or public
> repositories.

> [!NOTE]
>
> Endpoint availability can vary by plan. Some live Company and Person
> endpoints are enterprise-only. Review [Pricing](https://docs.crustdata.com/general/pricing.md) before you
> build a production workflow.

## API versioning

Include the `x-api-version` header in every request. The current version is `2025-11-01`.

```bash theme={"theme":"vitesse-black"}
--header 'x-api-version: 2025-11-01'
```

Requests without a version header can default to the latest version, which may introduce breaking changes. Always pin to a specific version.

## Request format

All endpoints accept JSON request bodies with `content-type: application/json`.

```bash theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/company/identify \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{"domains": ["retool.com"]}'
```

## Response format

All responses return JSON. Successful requests typically return `200` with the endpoint-specific payload in the response body.

## Error responses

Error responses return JSON with an `error` field and a details field explaining the issue.

> [!NOTE]
>
> Most APIs use `description` for the details field. The Person API uses
> `reason` instead.

```json theme={"theme":"vitesse-black"}
{
    "error": "Invalid Request",
    "description": "Exactly one identifier must be provided."
}
```

```json Person API theme={"theme":"vitesse-black"}
{
    "error": "Invalid Request",
    "reason": "Input should be a valid dictionary"
}
```

### HTTP status codes

| Status code | Meaning | Description |
| - | - | - |
| `200` | Success | Request completed successfully. |
| `400` | Bad Request | Invalid request parameters or malformed input. |
| `401` | Unauthorized | Missing or invalid API key. |
| `403` | Forbidden | API key does not have access to this endpoint. |
| `404` | Not Found | Requested resource not found. |
| `500` | Internal Server Error | Unexpected server-side failure. Try again later. |

### Error response examples

> [accordion] 400 — Bad Request
>
> ```json theme={"theme":"vitesse-black"}
> {
>   "error": "bad_request",
>   "description": "Invalid request body."
> }
> ```

> [accordion] 401 — Unauthorized
>
> ```json theme={"theme":"vitesse-black"}
> {
>   "error": "Unauthorized",
>   "description": "Missing or invalid API key."
> }
> ```

> [accordion] 403 — Forbidden
>
> ```json theme={"theme":"vitesse-black"}
> {
>   "error": "forbidden",
>   "description": "API key does not have access to this endpoint."
> }
> ```

> [accordion] 404 — Not Found
>
> ```json theme={"theme":"vitesse-black"}
> {
>   "error": "Not Found",
>   "description": "Company not found."
> }
> ```

> [accordion] 500 — Internal Server Error
>
> ```json theme={"theme":"vitesse-black"}
> {
>   "error": "Internal Server Error",
>   "description": "An unexpected error occurred. Please try again later."
> }
> ```

## Rate limits

API requests are rate-limited per API key. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md) for details on limits and best practices.

## Endpoints

This reference currently documents 18 endpoints across five product areas.

> [!NOTE]
>
> Endpoint availability varies by plan. Certain live and specialized
> endpoints are enterprise-only. Check exactly what your API key can
> currently access with the free [`/account/endpoints`](https://docs.crustdata.com/api-reference/account-apis/list-endpoint-permissions-and-rate-limits)
> endpoint, and contact sales to enable more.

### Company API

| Method | Path | Description |
| - | - | - |
| POST | `/company/search` | Search companies with filters |
| POST | `/company/identify` | Resolve a domain, URL, or name to a company |
| POST | `/company/enrich` | Get a full company profile |
| POST | `/company/professional_network/search/live` | Search companies in real time |
| POST | `/company/search/autocomplete` | Autocomplete company search fields |

### Person API

| Method | Path | Description |
| - | - | - |
| POST | `/person/search` | Search people using filters and sorting |
| POST | `/person/enrich` | Enrich person profiles from the cached dataset |
| POST | `/person/contact/enrich` | Enrich contact data (emails and phone numbers) for a person |
| POST | `/person/professional_network/enrich/live` | Fetch fresh profile data from the web |
| POST | `/person/professional_network/search/live` | Search people in real time |
| POST | `/person/search/autocomplete` | Get field value suggestions for building search filters |

### Job API

| Method | Path | Description |
| - | - | - |
| POST | `/job/search` | Search the indexed job dataset with filters, sorting, and aggregations |
| POST | `/job/search/autocomplete` | Autocomplete values for a job search field |
| POST | `/job/professional_network/search/live` | Fetch job listings in real time for a company |

### Web API

| Method | Path | Description |
| - | - | - |
| POST | `/web/search/live` | Perform web search |
| POST | `/web/enrich/live` | Fetch web content |

### Social Post API

| Method | Path | Description |
| - | - | - |
| POST | `/social_post/search` | Search the indexed social post dataset with structured filters (enabled on request) |
| POST | `/social_post/professional_network/enrich/live` | Fetch recent social posts for a person or company |
| POST | `/social_post/professional_network/search/live` | Search social posts by keyword and filters |

> [card] [Company API](https://docs.crustdata.com/company-docs/search/introduction.md)
>
> Search, identify, enrich, and autocomplete company data.

> [card] [Person API](https://docs.crustdata.com/person-docs/search/introduction.md)
>
> Search, enrich, and autocomplete people data.

> [card] [Job API](https://docs.crustdata.com/job-docs/search/introduction.md)
>
> Search indexed job listings and fetch real-time openings for a company.

> [card] [Web API](https://docs.crustdata.com/web-docs/search/introduction.md)
>
> Search the web and fetch page content.

> [!NOTE]
>
> The live Social Post API guides are available to plans with live access,
> and `/social_post/search` is enabled on request. The endpoints above are
> documented in this reference. To enable access,
> [contact us](https://crustdata.com/demo).


## Related topics

- [Introduction](https://docs.crustdata.com/general/introduction.md)
- [llms.txt](https://docs.crustdata.com/for-agents/llms.md)
- [Social Post Search reference](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md)
- [Person Enrich reference](https://docs.crustdata.com/person-docs/enrichment/reference.md)
- [Company Autocomplete API](https://docs.crustdata.com/company-docs/autocomplete/introduction.md)
