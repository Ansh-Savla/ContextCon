> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Payload delivery: inline or link

> Choose whether a watch sends its records inside the notification or as a link to one NDJSON file holding the whole run. Set config.payload_delivery_type to inline or link on any discovery or entity watch, on create or with a PATCH.

**Use this when** a watch run can deliver more records than your receiver will accept in one request, or when you would rather load a run as one file than reassemble it from several requests.

A watch run can deliver its records two ways. By default they ride inside the notification. Set `config.payload_delivery_type` to `"link"` and the notification carries a pre-signed S3 URL instead, pointing at one file that holds every record of that run. `link` is also what raises the per-run cap: inline delivery stops at 1,000 records per run, and `link` carries up to 10,000. This page walks you through the basics: the two modes, how to set each one, what the notification looks like, and how to read the file, then folds in worked recipes you can copy, paste, and adapt.

```json theme={"theme":"vitesse-black"}
{
  "config": {
    "trigger": { "type": "interval", "every_hours": 24 },
    "payload_delivery_type": "link"
  }
}
```

> [!NOTE]
>
> This is available on every watch: person, company, and job discovery watches,
> and person and company entity watches. It applies on create and on `PATCH`.

### Request body

`payload_delivery_type` is a single key inside a watch's `config`. Everything else about the watch stays as it was.

| Parameter | Type | Required | Default | Description |
| - | - | - | - | - |
| `config.payload_delivery_type` | string | No | `"inline"` | `"inline"` or `"link"`. Case sensitive; `"LINK"` is rejected. |
| `config.max_results_per_run` | integer | No | `25` | Most records one run delivers, `1` to `10000`. Inline delivery stops at `1000`, so a higher cap needs `"link"`. |

### Response body

The notification carries `metadata.payload_delivery` on **every** delivery, inline and link alike.

| Field | Type | Meaning |
| - | - | - |
| `type` | string | `"link"` or `"inline"`. Where the records of *this* delivery actually travelled. |
| `url` | string | Pre-signed S3 URL for the run's file. Present only when `type` is `"link"`. |
| `format` | string | `"ndjson"`. Present only when `type` is `"link"`. |
| `bytes` | integer | Size of the file. Present only when `type` is `"link"`. |
| `expires_at` | string | When the link stops working, 5 days after it was issued. |

> [!WARNING]
>
> An inline delivery carries `{ "type": "inline" }` with no other keys, so read
> `type` before you reach for `url`. A `link` watch can still hand you an inline
> body if the file could not be written.

### Rate limits and credits

**Pricing:** neither mode changes what a watch costs. You pay per
record delivered, at the same rate either way, and reading the file costs no
credits.

* **Rate limit:** changing the mode is a watch-management request, 10 per minute on that watch path. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).
* **Link lifetime:** 5 days from the moment the run issued it.

> [card] [Examples](#examples)
>
> Set it on create, switch an existing watch, stream the file.

> [card] [The two modes](#the-two-modes)
>
> What changes, and what stays the same.

> [card] [Watchers](https://docs.crustdata.com/watcher-docs/company/discovery.md)
>
> The watches this applies to.

***

## Why you would switch

A run above 1,000 records needs `link`. `config.max_results_per_run` accepts `1` to `10000`, and inline delivery stops at `1000`. An inline run posts its chunks one after another, so a 10,000-record run would become thousands of sequential requests. A `link` run is always one request, whatever the run holds. The API rejects a cap above `1000` on an inline watch, on create and on `PATCH`.

Most receivers cap how large a request body they accept, and a body over the cap is refused whole. An AWS Lambda proxy integration stops at 6 MB, an ALB target at 1 MB. A run that delivers 1,000 enriched people can pass either of those.

Inline delivery splits a large run across several requests to stay under a receiver's cap. Link delivery sidesteps the cap instead. The body carries no records, so its size does not grow with the run.

Pick `link` if your receiver has a small body cap, or if you would rather load a run as one file than reassemble it from several requests.

## The two modes

| | `inline` (default) | `link` |
| - | - | - |
| Records per run | Up to 1,000 | Up to 10,000 |
| Where the records are | In the notification body, under `results` | In one file, behind a pre-signed S3 URL |
| Requests per run | One per chunk, so several on a large run | Always one |
| Body size | Grows with the run | Fixed, a few hundred bytes |
| File format | JSON, in the body | NDJSON, one record per line |
| URL lifetime | n/a | 5 days, signed |

Both modes carry the same `metadata`, including every count in `summary`, so your record counts do not move. Only the records themselves change places.

```json link theme={"theme":"vitesse-black"}
{
  "metadata": {
    "watch_id": 46849,
    "kind": "discovery",
    "dataset": "person",
    "api_version": "2025-11-01",
    "run_id": 64200,
    "notification_id": "ntf_64200",
    "delivered_at": "2026-08-27T03:20:00.000000Z",
    "summary": { "delivered": 1000, "total_count": 1204, "records_searched": 5219, "max_results_per_run": 1000, "truncated": true, "records_stale": 4015 },
    "payload_delivery": {
      "type": "link",
      "url": "https://crustdata-batch-api-data.s3.amazonaws.com/watcher/watch=46849/run=64200/records.ndjson?...&X-Amz-Expires=432000",
      "format": "ndjson",
      "bytes": 4823901,
      "expires_at": "2026-09-01T03:20:00.000000+00:00"
    }
  }
}
```

```json inline theme={"theme":"vitesse-black"}
{
  "metadata": {
    "watch_id": 46849,
    "kind": "discovery",
    "dataset": "person",
    "api_version": "2025-11-01",
    "run_id": 64200,
    "notification_id": "ntf_64200",
    "delivered_at": "2026-08-27T03:20:00.000000Z",
    "summary": { "delivered": 1000, "total_count": 1204, "records_searched": 5219, "max_results_per_run": 1000, "truncated": true, "records_stale": 4015 },
    "payload_delivery": { "type": "inline" }
  },
  "results": { "added": [ { "basic_profile": { "…": "…" }, "crustdata_person_id": 6324687 } ] }
}
```

On a link delivery the body has no `results` key at all. Read `metadata.payload_delivery.type` and branch on it rather than testing for the presence of `results`.

## The file

One file per run, in [NDJSON](https://github.com/ndjson/ndjson-spec): one complete JSON object per line, newline terminated, with no wrapping array. You can stream it line by line without holding the whole run in memory.

Each line is the same record the inline body would have carried, with no container around it.

```json Discovery watch theme={"theme":"vitesse-black"}
{"basic_profile": {"name": "…"}, "crustdata_person_id": 6324687}
{"basic_profile": {"name": "…"}, "crustdata_person_id": 6324688}
```

```json Entity watch theme={"theme":"vitesse-black"}
{"changes": [{"field": "headcount.total", "type": "=>", "value": 1000, "from": 900, "to": 1500}], "record": {"basic_info": {"name": "…"}, "crustdata_company_id": 12345}}
{"changes": [{"field": "headcount.total", "type": "=>", "value": 1000, "from": 970, "to": 1042}], "record": {"basic_info": {"name": "…"}, "crustdata_company_id": 12346}}
```

A discovery watch's lines are the raw dataset records, without the `{ "added": [ … ] }` wrapper the inline body uses, because a file of lines needs no wrapper. An entity watch's lines are the same `{ changes, record }` objects the inline body carries.

> [!WARNING]
>
> The URL is signed for 5 days. Download the file when the notification arrives
> rather than storing the URL for later. If you need the run again after that,
> the [run summary](#reading-a-past-run) issues a fresh link over the same
> records.

## Every channel gets the same link

A run writes its file once, before it fans out. A webhook, a Slack message, a Google Chat message, and an email from the same run all carry the same link to the same bytes.

Slack, Google Chat, and email messages already show a bounded preview of a run rather than every record. On a `link` watch those messages keep their preview and gain the link, so a reader who wants the records the preview left out has the full file.

## Reading a past run

The run-summary endpoint follows the watch's mode too.

```
GET https://api.crustdata.com/watch/{dataset}/{watch_id}/runs/{run_id}/summary
```

On a `link` watch the response carries a top-level `payload_delivery` block, and each entry in `notifications` keeps its delivery outcome but drops the records:

```json theme={"theme":"vitesse-black"}
{
  "id": 64200,
  "status": "SUCCESS",
  "records_searched": 5219,
  "records_matched": null,
  "records_stale": 4015,
  "records_after_filter": 1204,
  "new_records_count": 1000,
  "payload_delivery": {
    "type": "link",
    "url": "https://crustdata-batch-api-data.s3.amazonaws.com/watcher/watch=46849/run=64200/records.ndjson?...&X-Amz-Expires=432000",
    "format": "ndjson",
    "bytes": 4823901,
    "expires_at": "2026-09-01T03:20:00.000000+00:00"
  },
  "notifications": [
    { "sent_at": "2026-08-27T03:20:00Z", "http_status": 200 }
  ]
}
```

On an `inline` watch, `payload_delivery` is `{ "type": "inline" }` and `notifications[].payload` carries the records as before.

Reading a run hands you the same file the run delivered, so the bytes match what your channel received. A watch created with no channels never pushed anything, so the first read writes the file and links it.

A run that delivered nothing offers no link. A `SKIPPED` or `FAILED` run reports `{ "type": "inline" }` with an empty `notifications` list.

## Inline is never overridden

A watch left on `inline` posts its records at any size, up to its cap of 1,000 per run. Delivery does not switch a large run to a link on its own, because the mode is your choice and a silent switch would change the body shape your receiver parses.

A large inline run is split instead: records are grouped into requests of at most \~1 MB or 100 records, and each request carries its own `notification_id` (`ntf_{run_id}_{index}`) and a `metadata.chunk.index`. A run that fits in one request keeps the plain `ntf_{run_id}` id and no `chunk` key, so a small run looks exactly as it always has.

If your receiver rejects an oversize body, that is the signal to move the watch to `link`.

## If the file cannot be written

Writing the file can fail. When it does, the run falls back to delivering the records inline and says so: `metadata.payload_delivery` reports `{ "type": "inline" }` and the body carries `results` as usual. The delivery still reaches you, without the link.

This is the reason to branch on `metadata.payload_delivery.type` rather than on the watch's configured mode. A `link` watch can still hand you an inline body.

## Test sends

A test send on a `link` watch to a webhook mirrors a real delivery: the body carries `metadata.payload_delivery` with a link and no `results`, alongside the usual `metadata.test: true`. The file holds the sample records.

Each test preview writes its own file rather than reusing the run's, so a preview never overwrites the records of a real run.

## Errors

A value other than `"inline"` or `"link"` is rejected on create and on `PATCH`:

```json 400 Bad Request theme={"theme":"vitesse-black"}
{
  "error": {
    "type": "invalid_request",
    "message": "config.payload_delivery_type must be one of ['inline', 'link'].",
    "metadata": [
      {
        "field": "config.payload_delivery_type",
        "type": "enum",
        "message": "config.payload_delivery_type must be one of ['inline', 'link']."
      }
    ]
  }
}
```

The check is case sensitive, so `"LINK"` is rejected. Omitting the key, or sending it as `null`, means `inline`.

A `max_results_per_run` above `1000` is rejected while delivery is `inline`:

```json 400 Bad Request theme={"theme":"vitesse-black"}
{
  "error": {
    "type": "invalid_request",
    "message": "config.max_results_per_run above 1000 needs config.payload_delivery_type 'link'.",
    "metadata": [
      {
        "field": "config.max_results_per_run",
        "type": "link_required",
        "message": "config.max_results_per_run above 1000 needs config.payload_delivery_type 'link'."
      }
    ]
  }
}
```

The rule reads both keys together, so it fires when you leave `payload_delivery_type` out as well. The default is `inline`.

On a `PATCH` the rule is checked against the watch as it will be, not against the body alone:

* Raising the cap above `1000` on a `link` watch is accepted.
* Raising it on an inline watch is rejected.
* Sending the new cap and `"link"` in the same `PATCH` is accepted.
* Switching a watch that already carries a cap above `1000` back to `inline` is rejected. Lower the cap first.

A cap above `10000` is out of range in either mode:

```json 400 Bad Request theme={"theme":"vitesse-black"}
{
  "error": {
    "type": "invalid_request",
    "message": "config.max_results_per_run must be an integer in [1, 10000].",
    "metadata": [
      {
        "field": "config.max_results_per_run",
        "type": "less_than_equal",
        "message": "config.max_results_per_run must be an integer in [1, 10000]."
      }
    ]
  }
}
```

A `config` `PATCH` is validated as a whole block, so repeat the watch's current `trigger` alongside the key you are changing. Leave it out and both halves of the missing `trigger` come back at once:

```json 400 Bad Request theme={"theme":"vitesse-black"}
{
  "error": {
    "type": "invalid_request",
    "message": "config.trigger.type must be one of ['interval']. config.trigger.every_hours must be an integer >= 1.",
    "metadata": [
      {
        "field": "config.trigger.type",
        "type": "enum",
        "message": "config.trigger.type must be one of ['interval']."
      },
      {
        "field": "config.trigger.every_hours",
        "type": "greater_than_equal",
        "message": "config.trigger.every_hours must be an integer >= 1."
      }
    ]
  }
}
```

The keys you do send are merged into the stored config rather than replacing it, so anything you omit keeps its current value.

Both responses use the shared watcher error envelope, which is documented in full under [Error handling](https://docs.crustdata.com/watcher-docs/person/discovery.md#error-handling).

***

## Examples

Worked recipes you can copy, paste, and adapt. Each one is a full working request. Swap the notification channel for your own.

> [accordion] Set link delivery on a new discovery watch
>
> Raise `max_results_per_run` and set the mode in the same `config` block. A run that now delivers up to 10,000 people still arrives as one small request. A cap this high needs `"link"`, so the two keys travel together.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "experience.employment_details.current.title", "type": "(.)", "value": "Machine Learning Engineer" }
>       ]
>     },
>     "config": {
>       "trigger": { "type": "interval", "every_hours": 24 },
>       "max_results_per_run": 10000,
>       "payload_delivery_type": "link"
>     },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>   "id": 53640,
>   "kind": "discovery",
>   "dataset": "person",
>   "api_version": "2025-11-01",
>   "config_version": "2025-11-01",
>   "status": "active",
>   "filters": {
>     "op": "and",
>     "conditions": [
>       { "field": "experience.employment_details.current.title", "type": "(.)", "value": "Machine Learning Engineer" }
>     ]
>   },
>   "on": ["added"],
>   "config": {
>     "trigger": { "type": "interval", "every_hours": 24 },
>     "max_results_per_run": 10000,
>     "expires_at": null,
>     "preferred_hour": null,
>     "payload_delivery_type": "link",
>     "is_realtime": false,
>     "refresh_frequency_days": 30
>   },
>   "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ],
>   "created_at": "2026-10-05T12:03:28.498133Z",
>   "last_run_at": null,
>   "notifications_count": 0,
>   "credits_consumed": 0,
>   "credits": { "per_notification": 0.2 }
> }
> ```
>
> The response above is trimmed to the keys under discussion. A real create also echoes `realtime_filters`, `narrowing_filters`, `sorts`, `fields`, and `last_notified_at`, all `null` on this watch.

> [accordion] Set link delivery on a new entity watch
>
> The same key works on an entity watch, where each line of the file is a `{ changes, record }` object rather than a raw record.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "domains": ["stripe.com", "netflix.com"] },
>     "track": { "field": "headcount.total", "type": "changed" },
>     "fields": ["basic_info", "headcount"],
>     "config": {
>       "trigger": { "type": "interval", "every_hours": 24 },
>       "max_results_per_run": 1000,
>       "payload_delivery_type": "link"
>     },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Switch an existing watch to link
>
> `payload_delivery_type` is one of the mutable config keys, alongside the schedule and the result cap. Changing it leaves the watch's filters, tracked fields, and sort order exactly as they were. The change takes effect on the next run; runs already delivered keep whatever they were delivered as.
>
> ```bash Discovery watch theme={"theme":"vitesse-black"}
> curl --request PATCH \
>   --url https://api.crustdata.com/watch/person/search/46849 \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "config": {
>       "trigger": { "type": "interval", "every_hours": 24 },
>       "payload_delivery_type": "link"
>     }
>   }'
> ```
>
> ```bash Entity watch theme={"theme":"vitesse-black"}
> curl --request PATCH \
>   --url https://api.crustdata.com/watch/person/46936 \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "config": {
>       "trigger": { "type": "interval", "every_hours": 24 },
>       "payload_delivery_type": "link"
>     }
>   }'
> ```
>
> > [!WARNING]
> >
> > Repeat the current `trigger` in the body. A `config` `PATCH` is validated as a
> > whole block, and leaving `trigger` out returns `400` with
> > `config.trigger.type must be one of ['interval'].`

> [accordion] Switch a watch back to inline
>
> The same `PATCH`, with the other value. Sending `null` or omitting the key entirely also means inline.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request PATCH \
>   --url https://api.crustdata.com/watch/company/search/46849 \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "config": {
>       "trigger": { "type": "interval", "every_hours": 24 },
>       "payload_delivery_type": "inline"
>     }
>   }'
> ```

> [accordion] Branch on the delivery mode in your receiver
>
> Read `metadata.payload_delivery.type` rather than testing for `results`. A `link` watch falls back to an inline body when the file cannot be written, so both paths have to work.
>
> ```python theme={"theme":"vitesse-black"}
> def handle(body):
>     delivery = body["metadata"]["payload_delivery"]
>
>     if delivery["type"] == "link":
>         # No authorization header: the URL carries its own in the query string.
>         with requests.get(delivery["url"], stream=True) as resp:
>             resp.raise_for_status()
>             for line in resp.iter_lines():
>                 if line:
>                     yield json.loads(line)
>         return
>
>     results = body["results"]
>     # A discovery watch keys its records by polarity; an entity watch is a flat list.
>     for record in (results["added"] if isinstance(results, dict) else results):
>         yield record
> ```

> [accordion] Stream the file from the command line
>
> Fetch the file with a plain `GET`. The URL carries its own authentication in the query string, so send no `authorization` header.
>
> ```bash theme={"theme":"vitesse-black"}
> curl --silent 'https://crustdata-batch-api-data.s3.amazonaws.com/watcher/watch=46849/run=64200/records.ndjson?...&X-Amz-Expires=432000' \
>   | jq -c '.crustdata_person_id'
> ```
>
> NDJSON streams line by line, so a large run never has to be held in memory. `jq -c` on the stream works the same way for one record or for a hundred thousand.

> [accordion] Re-read a past run and get a fresh link
>
> The signed URL expires after 5 days. The run summary issues a new one over the same records, so a run is never lost to an expired link.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url https://api.crustdata.com/watch/person/46849/runs/64200/summary \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> A watch created with no channels never pushed anything, so the first read is what writes the file and links it.

***

## Pricing

Neither mode changes what a watch costs. You pay per record delivered, at the same rate either way, and reading the file costs no credits. See [Pricing](https://docs.crustdata.com/general/pricing.md) for the per-watch rates.

## What to do next

* **Set it on a watch**: see [Company discovery](https://docs.crustdata.com/watcher-docs/company/discovery.md), [Person discovery](https://docs.crustdata.com/watcher-docs/person/discovery.md), or the [Job watcher](https://docs.crustdata.com/watcher-docs/job/watch.md).
* **Set it on an entity watch**: see [Company entity](https://docs.crustdata.com/watcher-docs/company/entity.md) or [Person entity](https://docs.crustdata.com/watcher-docs/person/entity.md).
* **Check what a run delivered**: read the run summary, which follows the same mode.


## Related topics

- [Company Entity Watcher](https://docs.crustdata.com/watcher-docs/company/entity.md)
- [Person Entity Watcher](https://docs.crustdata.com/watcher-docs/person/entity.md)
- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
- [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md)
- [Job Watcher](https://docs.crustdata.com/watcher-docs/job/watch.md)
