> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Usage

> See what your team spent credits on, request by request or summed by day, product, endpoint, or charge component, and which requests failed. Four free GET endpoints.

Use these endpoints to answer three questions about your account: what you spent
credits on, which requests made up that spend, and which requests failed and
why. They read the same record the [Usage page](https://app.crustdata.com/usage)
of your dashboard shows.

> [!NOTE]
>
> These endpoints are **free**. Their responses carry no `X-Credits-Used`
> header. The four share one limit of 60 requests per minute per API key.

## Endpoints

| Endpoint | Returns |
| - | - |
| [`GET /account/usage/summary`](https://docs.crustdata.com/api-reference/account-apis/get-a-usage-summary) | Requests, credits, errors, and results, summed over the dimensions you pick. |
| [`GET /account/usage/events`](https://docs.crustdata.com/api-reference/account-apis/list-usage-events) | Your requests one by one, newest first, with their charge lines. |
| [`GET /account/usage/events/{request_id}`](https://docs.crustdata.com/api-reference/account-apis/get-one-usage-event) | One request by its `X-Request-Id`, with the body and headers you sent. |
| [`GET /account/usage/errors`](https://docs.crustdata.com/api-reference/account-apis/list-usage-errors) | Your failed requests, grouped by endpoint and error message. |

Authenticate with your API key in the `Authorization` header and send
`x-api-version: 2025-11-01`. Every row is scoped to your team. No parameter
reads another team's usage.

A request usually shows up in these endpoints within about 10 seconds of its
response. The usage endpoints do not record your calls to them. The one
exception is a call refused with a `429`, which shows up like any other
rate-limited request.

## The time window

Every endpoint takes the same window:

| Parameter | Default | Notes |
| - | - | - |
| `start` | 7 days before `end` | Inclusive. A date such as `2026-09-21` (midnight UTC) or an ISO 8601 timestamp such as `2026-09-23T14:00:00Z`. At most 12 months ago. |
| `end` | The coming midnight UTC | Exclusive. Same formats as `start`. |

With no window, you get the last 7 whole days including today.

## Filters

All filters are optional and combine with AND. List filters take a repeated
parameter or one comma-separated value, so `endpoints=/person/search,/person/enrich`
and `endpoints=/person/search&endpoints=/person/enrich` mean the same thing.

| Parameter | Matches | Endpoints |
| - | - | - |
| `api_key_ids` | `api_key_id`, up to 50 | all four |
| `endpoints` | `endpoint`, for example `/person/search`, up to 50 | all four |
| `products` | `product`, for example `person_search`, up to 50 | summary, events |
| `status` | `http_status`, for example `400,404` | summary, events |
| `status_class` | `2xx`, `3xx`, `4xx`, or `5xx` | summary, events |
| `client_surface` | `client_surface`, for example `mcp` | summary, events |
| `error_type` | `error_type`, for example `invalid_request` | summary, events |
| `error_key` | one error group's `error_key` from `/account/usage/errors` | events |
| `hide_free` | `true` hides successful 0-credit calls to endpoints that never bill; see [Events](#events) | events |

## Charge components

Every charge is split into lines. Each line names what it charged in two fields:

* `component` is a stable id such as `person.business_email`. **It does not
  change.** Build reports, alerts, and dashboards on it.
* `label` is display text such as `Business email`. It can be reworded at any
  time, so show it to people but never match on it.

An event's lines add up to its `credits_used`, which is the same number the
original response returned in its [`X-Credits-Used`](https://docs.crustdata.com/general/credits#per-call-usage-the-x-credits-used-header)
header. Lines charged at 0 credits are kept, so the sum always matches.

These are the component ids in use today:

| `component` | `label` |
| - | - |
| `person.search_result` | Person search results |
| `person.search_result_live` | Person search results (live) |
| `person.search_preview_live` | Person search preview (live) |
| `person.profile` | Person enrich (base) |
| `person.profile_live` | Person enrich (live) |
| `person.business_email` | Business email |
| `person.personal_email` | Personal email |
| `person.phone` | Phone |
| `person.verified_email` | Verified email |
| `person.dev_platform` | Dev platform add-on |
| `person.social_posts` | Social posts add-on |
| `person.identify` | Person identified |
| `person.verify` | Work history verdict |
| `company.search_result` | Company search results |
| `company.search_result_live` | Company search results (live) |
| `company.profile` | Company enrich (base) |
| `company.technographics` | Technographics |
| `company.social_posts` | Social posts add-on |
| `company.identify` | Company identified |
| `company.employee_reviews` | Employee reviews |
| `company.screen` | Company screen |
| `job.search_result` | Job search results |
| `job.search_result_live` | Job search results (live) |
| `social_post.search_result` | Post search results |
| `social_post.search_commenters` | Post commenters |
| `social_post.search_reactors` | Post reactors |
| `social_post.search_result_live` | Post search results (live) |
| `social_post.post_live` | Social posts (live) |
| `social_post.commenters_live` | Post commenters (live) |
| `social_post.reactors_live` | Post reactors (live) |
| `dev_platform.profile` | Dev platform profile |
| `web.search_result` | Web search results |
| `web.page` | Web pages fetched |
| `person.watch_updates` | Person watch updates |
| `company.watch_updates` | Company watch updates |
| `job.watch_updates` | Job watch updates |
| `social_post.watch_updates` | Social post watch updates |

Some charges are priced per field or filter, and their ids follow a pattern
instead of a fixed list:

| Pattern | Example `component` | Example `label` |
| - | - | - |
| `<entity>.search_field.<field>` | `person.search_field.experience` | Premium field: Experience |
| `<entity>.search_filter.<field>` | `person.search_filter.experience` | Premium filter: Experience |
| `<product>.request` | `person_search.request` | Request charge |
| `<product>.other` | `person_enrich.other` | Other charge |

`<entity>` is `person` or `company`. `<product>` is the event's `product`.
`<product>.request` is a flat charge for the whole request, and
`<product>.other` is a charge that does not have its own id yet. New ids are
added to this page as they ship, and an id that exists never changes.

## Summaries

`GET /account/usage/summary` adds your usage up. Pass `group_by` with any of
`day`, `product`, `endpoint`, `component`, `api_key_id`, `client_surface`,
`client_platform`, and `status_class`. Leave it out for one total row.

* Grouping by `day` returns the time column as `bucket_start`. `bucket=1d`
  (the default) gives dates, and `bucket=1h` gives hourly timestamps.
* Grouping by `component` returns `component` and `label`, and swaps `errors`
  and `results` for `quantity`, the units charged.
* `client_platform` is the tool or runtime that made the call. See
  [Client platforms](#client-platforms) below.
* `api_key_id` is `0` for usage not tied to an API key, such as data exports,
  watch runs, and requests refused with a `429`.
* Rows are sorted by `bucket_start` when you group by `day`, then by credits,
  highest first.

With `bucket=1d` and a window of whole UTC days, which includes the default
window, some shapes are rejected with a `400` telling you to retry with
`bucket=1h`:

* `component` combines only with `day` and `product`, and filters only by
  `products`.
* The `status` and `error_type` filters are not available.

A window that starts or ends mid-day, `bucket=1h`, or any grouping that
includes `client_platform` accepts every combination.

### Client platforms

`client_platform` names the tool or runtime that sent the request:

* For MCP calls, it is the client's tag as sent, for example `claude-code`,
  `cursor`, `chatgpt`, or `codex`. Clients choose their own tags.
* For the CLI, it is the label in its user agent, for example `codex` from
  `cd_cli ... (codex)`.
* For everything else, it is a category based on your `User-Agent` header,
  such as `python`, `node`, `curl`, `java`, `go_rust`, `browser`,
  `http_tool`, or `automation`.
  It is `none` when you sent no user agent, and `other` when nothing matched.

New values can appear at any time, so do not hard-code the list.

`client_platform` is empty for batch jobs, watch runs, and data exports, and
usually for requests refused with a `429`. Group by `client_surface` as well to
tell those apart. You can group by `client_platform`, but you cannot filter
on it.

## Events

`GET /account/usage/events` returns your requests newest first, 100 per page by
default and up to 500 with `limit`. It uses a cursor: while `has_more` is
`true`, send `next_cursor` back as `cursor` with the same other parameters.

```python Python theme={"theme":"vitesse-black"}
import requests

params = {"start": "2026-09-21", "end": "2026-09-24", "limit": 500}
headers = {"Authorization": "Bearer YOUR_API_KEY", "x-api-version": "2025-11-01"}

events = []
while True:
    page = requests.get(
        "https://api.crustdata.com/account/usage/events", params=params, headers=headers
    ).json()
    events += page["events"]
    if not page["has_more"]:
        break
    params["cursor"] = page["next_cursor"]

print(len(events), sum(e["credits_used"] for e in events))
```

`client_surface` says where a request came from: `api`, `mcp`, `cli`,
`dashboard`, `batch`, `watcher`, `export`, or `gateway` for a request refused
before it reached the API, such as a `429`.

Pass `hide_free=true` to hide successful calls that cost 0 credits on
endpoints that never bill: `/batch/...` submits, `/watcher/...`, any endpoint
ending in `/autocomplete`, `/company/identify`, and `/screener/identify`. It keeps three kinds of rows:

* Errors on those endpoints. A `400` on `/company/identify` still shows.
* Searches that matched nothing. A `/person/search` with 0 results costs 0
  credits and still shows, since that is often the call you are debugging.
* A batch job's completion row, even when the job billed 0 credits. Only its
  submit row is hidden.

The flag applies even when you filter by `endpoints`. It defaults to `false`,
and only `/account/usage/events` takes it: `/summary` and `/errors` ignore it.

`endpoint` is the route template when the endpoint has path parameters, for
example `/watch/person/:watch_id/runs`. The values are in `request.path_params`
on the single-event endpoint. `linked_ids` names the job behind a request that
did not come from a direct call, as `batch_job_id`, `watch_id`, `export_id`, or
`export_run_id`.

To see what you sent on one request, pass the `X-Request-Id` header from its
response (the event's `event_id`) to `GET /account/usage/events/{request_id}`.
It adds `request` (body, query and path parameters), `headers` (with
`authorization` and `apikey` shown as `<redacted>`), and `response`, the error
body a failed request got back. `response` is `null` on a success and on a
`429`. A request id from another team returns `404`, the same as one that never
existed.

## Errors by group

`GET /account/usage/errors` groups your failed requests by endpoint and
`error_key`, the error message with your values masked as `<v>`, `<n>`,
`<values>`, or `<list>`. Successes and `429` responses never appear. Each group's
`kind` tells you what to do:

| `kind` | Meaning | What to do |
| - | - | - |
| `request` | The request was invalid. | Change the call. |
| `account` | A `402` or `403`: credits or field access. | Top up or check [Permissions](https://docs.crustdata.com/general/permissions.md). |
| `server` | A `5xx` on our side. | Retry. |
| `no_results` | The request was valid and nothing matched. | Widen the query. |

`http_status` and `error_type` are the ones the group's requests got back most
often. To list the requests in a group, pass its `error_key` to
`/account/usage/events`. To open one, pass `example_event_id` to
`/account/usage/events/{request_id}`.

At most 1000 groups come back. `truncated` is `true` when the list was cut, and
`total_errors` and `by_kind` count only the groups returned.

## Examples

> [accordion] What did I spend credits on?
>
> Group by `component` to split credits by what was charged. The response is
> trimmed to the first four rows.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url 'https://api.crustdata.com/account/usage/summary?group_by=component&start=2026-09-21&end=2026-09-24' \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>   "buckets": [
>     {
>       "component": "person.search_field.experience",
>       "label": "Premium field: Experience",
>       "requests": 24,
>       "quantity": 8451.0,
>       "credits": 670.0
>     },
>     {
>       "component": "person.search_filter.experience",
>       "label": "Premium filter: Experience",
>       "requests": 45,
>       "quantity": 8487.0,
>       "credits": 365.0
>     },
>     {
>       "component": "person.search_result",
>       "label": "Person search results",
>       "requests": 46,
>       "quantity": 8512.0,
>       "credits": 255.36
>     },
>     {
>       "component": "company.profile",
>       "label": "Company enrich (base)",
>       "requests": 33,
>       "quantity": 46.0,
>       "credits": 92.0
>     }
>   ]
> }
> ```

> [accordion] Credits per day
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url 'https://api.crustdata.com/account/usage/summary?group_by=day&start=2026-09-21&end=2026-09-24' \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>   "buckets": [
>     { "bucket_start": "2026-09-21", "requests": 60, "credits": 27.8, "errors": 5, "results": 128 },
>     { "bucket_start": "2026-09-22", "requests": 136, "credits": 683.52, "errors": 7, "results": 9014 },
>     { "bucket_start": "2026-09-23", "requests": 227, "credits": 879.47, "errors": 25, "results": 457 }
>   ]
> }
> ```

> [accordion] Hourly usage per product
>
> `bucket=1h` returns timestamps in `bucket_start`. The response is trimmed to
> three rows.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url 'https://api.crustdata.com/account/usage/summary?group_by=day,product&bucket=1h&start=2026-09-23T14:00:00Z&end=2026-09-23T16:00:00Z' \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>   "buckets": [
>     { "bucket_start": "2026-09-23T14:00:00+00:00", "product": "person_search", "requests": 15, "credits": 531.14, "errors": 4, "results": 38 },
>     { "bucket_start": "2026-09-23T14:00:00+00:00", "product": "person_enrich", "requests": 11, "credits": 13.0, "errors": 4, "results": 13 },
>     { "bucket_start": "2026-09-23T15:00:00+00:00", "product": "person_search", "requests": 3, "credits": 5.78, "errors": 1, "results": 26 }
>   ]
> }
> ```

> [accordion] One page of events
>
> The `client_ip` values are replaced with documentation addresses.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url 'https://api.crustdata.com/account/usage/events?limit=2&endpoints=/person/enrich&status_class=2xx&start=2026-09-21&end=2026-09-25' \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>   "events": [
>     {
>       "event_id": "678a3646-371d-4f81-b5c3-488fdda81e21",
>       "ts": "2026-09-24T03:24:40.229000+00:00",
>       "team_id": 1318,
>       "user_id": 1318,
>       "api_key_id": 170,
>       "client_surface": "api",
>       "client_platform": "curl",
>       "user_agent": "curl/8.7.1",
>       "client_ip": "203.0.113.10",
>       "product": "person_enrich",
>       "endpoint": "/person/enrich",
>       "method": "POST",
>       "api_version": "2025-11-01",
>       "http_status": 200,
>       "status_class": "2xx",
>       "error_type": "",
>       "error_key": "",
>       "result_count": 1,
>       "latency_ms": 413.3949890136719,
>       "credits_used": 2.0,
>       "cost_components": [
>         { "component": "person.profile", "label": "Person enrich (base)", "quantity": 1.0, "unit_price": 1.0, "credits": 1.0 },
>         { "component": "person.business_email", "label": "Business email", "quantity": 1.0, "unit_price": 1.0, "credits": 1.0 }
>       ],
>       "linked_ids": {}
>     },
>     {
>       "event_id": "f56c23d3-c872-4066-8063-3a0196f09448",
>       "ts": "2026-09-23T15:07:51.316000+00:00",
>       "team_id": 1318,
>       "user_id": 1318,
>       "api_key_id": 170,
>       "client_surface": "mcp",
>       "client_platform": "claude-code",
>       "user_agent": "cd_mcp/2.0 build/master-0569e61 (claude-code)",
>       "client_ip": "203.0.113.20",
>       "product": "person_enrich",
>       "endpoint": "/person/enrich",
>       "method": "POST",
>       "api_version": "2025-11-01",
>       "http_status": 200,
>       "status_class": "2xx",
>       "error_type": "",
>       "error_key": "",
>       "result_count": 1,
>       "latency_ms": 190.9239959716797,
>       "credits_used": 1.0,
>       "cost_components": [
>         { "component": "person.profile", "label": "Person enrich (base)", "quantity": 1.0, "unit_price": 1.0, "credits": 1.0 }
>       ],
>       "linked_ids": {}
>     }
>   ],
>   "has_more": true,
>   "next_cursor": "MjAyNi0wOS0yM1QxNTowNzo1MS4zMTYwMDArMDA6MDAsZjU2YzIzZDMtYzg3Mi00MDY2LTgwNjMtM2EwMTk2ZjA5NDQ4"
> }
> ```

> [accordion] One request by its X-Request-Id
>
> The `client_ip` value is replaced with a documentation address.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url https://api.crustdata.com/account/usage/events/678a3646-371d-4f81-b5c3-488fdda81e21 \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>   "event_id": "678a3646-371d-4f81-b5c3-488fdda81e21",
>   "ts": "2026-09-24T03:24:40.229000+00:00",
>   "team_id": 1318,
>   "user_id": 1318,
>   "api_key_id": 170,
>   "client_surface": "api",
>   "client_platform": "curl",
>   "user_agent": "curl/8.7.1",
>   "client_ip": "203.0.113.10",
>   "product": "person_enrich",
>   "endpoint": "/person/enrich",
>   "method": "POST",
>   "api_version": "2025-11-01",
>   "http_status": 200,
>   "status_class": "2xx",
>   "error_type": "",
>   "error_key": "",
>   "result_count": 1,
>   "latency_ms": 413.3949890136719,
>   "credits_used": 2.0,
>   "cost_components": [
>     { "component": "person.profile", "label": "Person enrich (base)", "quantity": 1.0, "unit_price": 1.0, "credits": 1.0 },
>     { "component": "person.business_email", "label": "Business email", "quantity": 1.0, "unit_price": 1.0, "credits": 1.0 }
>   ],
>   "linked_ids": {},
>   "request": {
>     "body": {
>       "fields": ["basic_profile", "contact.business_emails"],
>       "professional_network_profile_urls": ["https://www.linkedin.com/in/vinod-keshav-seetharamu/"]
>     },
>     "path_params": {},
>     "query_params": {}
>   },
>   "headers": {
>     "accept": "*/*",
>     "apikey": "<redacted>",
>     "authorization": "<redacted>",
>     "content-length": "151",
>     "content-type": "application/json",
>     "user-agent": "curl/8.7.1",
>     "x-api-version": "2025-11-01"
>   },
>   "response": null
> }
> ```

> [accordion] What is failing?
>
> The response is trimmed to three groups.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url 'https://api.crustdata.com/account/usage/errors?start=2026-09-21&end=2026-09-24' \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>   "total_errors": 20,
>   "by_kind": { "request": 19, "account": 0, "server": 0, "no_results": 1 },
>   "groups": [
>     {
>       "endpoint": "/person/search",
>       "error_key": "<v> must be at least <n>. Got <n>.",
>       "kind": "request",
>       "http_status": 400,
>       "error_type": "invalid_request",
>       "count": 4,
>       "last_seen": "2026-09-23T23:42:53.250000+00:00",
>       "example_event_id": "279ad996-cd3e-4856-b230-a95d77a0b715"
>     },
>     {
>       "endpoint": "/job/search",
>       "error_key": "Unsupported columns in conditions: [<values>]",
>       "kind": "request",
>       "http_status": 400,
>       "error_type": "invalid_request",
>       "count": 2,
>       "last_seen": "2026-09-23T23:50:58.158000+00:00",
>       "example_event_id": "1f695ab5-920f-485c-8014-342e3b3af61a"
>     },
>     {
>       "endpoint": "/screener/person/search",
>       "error_key": "No profiles match your search criteria. Please try different search parameters.",
>       "kind": "no_results",
>       "http_status": 400,
>       "error_type": "invalid_request",
>       "count": 1,
>       "last_seen": "2026-09-23T14:52:45.789000+00:00",
>       "example_event_id": "8f9aff61-35dd-432e-917a-c607ff820c71"
>     }
>   ],
>   "truncated": false
> }
> ```

## Errors

Every error uses the same envelope, `{ "error": { "type", "message", "metadata" } }`.

| Status | `error.type` | `error.message` | Cause |
| - | - | - | - |
| `400` | `invalid_request` | `group_by 'endpoint' is not available with these parameters; retry with bucket=1h` | A summary shape the daily totals cannot answer. |
| `400` | `invalid_request` | `filter 'statuses' is not available with these parameters; retry with bucket=1h` | `status` on a daily summary. `error_type` reads `filter 'error_type' ...`. |
| `400` | `invalid_request` | `group_by: "foo" is not a valid choice.` | Unknown `group_by` dimension. |
| `400` | `invalid_request` | `group_by: group_by must not repeat a dimension.` | The same dimension twice. |
| `400` | `invalid_request` | `bucket: "5m" is not a valid choice.` | `bucket` other than `1d` or `1h`. |
| `400` | `invalid_request` | `start: start must be before end.` | `start` on or after `end`. |
| `400` | `invalid_request` | `start: start cannot be more than 12 months ago.` | Window too old. |
| `400` | `invalid_request` | `limit: Ensure this value is less than or equal to 500.` | `limit` above 500. |
| `400` | `invalid_request` | `status_class: "6xx" is not a valid choice.` | `status_class` other than `2xx` to `5xx`. |
| `400` | `invalid_request` | `invalid cursor` | A `cursor` that was not a `next_cursor`. |
| `400` | `invalid_request` | `hide_free: Must be a valid boolean.` | `hide_free` other than `true` or `false`. |
| `401` | `unauthorized` | `Invalid API key in request.` | Missing or invalid API key. |
| `404` | `not_found` | `No usage event with that request id.` | No request with that id on your team. |
| `429` | `rate_limit_error` | `Rate limit exceeded for this endpoint. Please write to gtm@crustdata.co.` | More than 60 requests in a minute across the four endpoints. |

## What to do next

* **Check your balance**: see [Credits](https://docs.crustdata.com/general/credits.md).
* **See what each call costs before you make it**: see [Permissions](https://docs.crustdata.com/general/permissions.md#how-to-read-the-prices).
* **Plan around the limits**: see [Rate limits](https://docs.crustdata.com/general/rate-limits.md).


## Related topics

- [Usage errors](https://docs.crustdata.com/api-reference/account-apis/list-usage-errors.md)
- [Usage event](https://docs.crustdata.com/api-reference/account-apis/get-one-usage-event.md)
- [Usage summary](https://docs.crustdata.com/api-reference/account-apis/get-a-usage-summary.md)
- [Usage events](https://docs.crustdata.com/api-reference/account-apis/list-usage-events.md)
- [Credits](https://docs.crustdata.com/general/credits.md)
