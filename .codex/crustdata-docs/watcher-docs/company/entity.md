> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Company Entity Watcher

> Watch a list of companies you supply and get notified the moment a profile changes: a headcount move, a funding round, a news mention, a rebrand. You supply the list; the watcher delivers the diff.

**Use this when** you already know which companies matter: a book of accounts, a competitor set, a portfolio, and you want to hear the moment one of them moves.

A Company Entity Watcher monitors **a list of companies you supply** and notifies you when *their* profiles change. You provide the companies by domain, name, profile URL, or Crustdata company ID, and describe what to watch for. On each scheduled run, the watcher diffs every company against its last snapshot and delivers only what changed. This page walks you through the basics: your first watch, what you can track, the notification shape, and how to edit the list, then folds in worked recipes you can copy, paste, and adapt.

Every request goes to the same endpoint:

```
POST https://api.crustdata.com/watch/company
```

> [!NOTE]
>
> Replace `YOUR_API_KEY` in each example with your actual API key. All requests
> require the `x-api-version: 2025-11-01` header. This endpoint is **open to all
> API customers**, with no per-endpoint grant needed.

### Request body

| Parameter | Type | Required | Default | Description |
| - | - | - | - | - |
| `entities` | object | Yes | - | The companies to watch, keyed by identifier type. See [Choosing the companies](#choosing-the-companies). |
| `track` | object | Yes | - | The change that fires a notification. A leaf or a nested `and`/`or` group. |
| `config` | object | Yes | - | Schedule and per-run caps. See [config](#config) below. |
| `notifications` | object\[] | Yes | - | Delivery channels. See [Delivery channels](#delivery-channels). |
| `fields` | string\[] | No | `["basic_info"]` | Field groups to include in each delivered `record`. Independent of `track`. |

#### `config`

| Parameter | Type | Required | Default | Description |
| - | - | - | - | - |
| `trigger` | object | Yes | - | `{ "type": "interval", "every_hours": N }`. How often the watch runs, integer ≥ 1. |
| `max_results_per_run` | integer | No | `25` | Notifications per run, `1` to `10000`. A value above `1000` needs `payload_delivery_type` `"link"`. |
| `preferred_hour` | integer | No | - | Hour of day in UTC (`0` to `23`) to prefer for the run. |
| `expires_at` | string | No | - | Auto-expire date, `YYYY-MM-DD`. |
| `payload_delivery_type` | string | No | `"inline"` | `"inline"` or `"link"`. See [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md). |

> [!NOTE]
>
> Because you pay per notification rather than per run, a higher
> `every_hours` frequency only makes changes surface sooner. It does not raise
> the price.

### Response body

Create returns the whole watch, so you can confirm what was stored before the baseline run starts.

| Field | Type | Description |
| - | - | - |
| `id` | integer | The watch's id. Use it on every management and run-history path. |
| `kind` | string | `"entity"`. |
| `dataset` | string | `"company"`. |
| `status` | string | `active`, `paused`, `suspended`, `expired`, or `cancelled`. |
| `entities` | object | The watched list, as sent. |
| `track` | object | The saved trigger condition. |
| `fields` | array or null | The saved projection. `null` means the default minimal set. |
| `config` | object | The stored schedule and caps. |
| `notifications` | object\[] | The configured channels. A stored channel secret is never returned. |
| `created_at` | string | When the watch was created. |
| `last_run_at` | string or null | When the watch last ran. `null` until the baseline run completes. |
| `last_notified_at` | string or null | When the watch last delivered a notification. |
| `notifications_count` | integer | All-time count of notifications this watch has delivered. |
| `credits_consumed` | number | All-time credits this watch has spent. |

### Rate limits and credits

**Pricing: you pay only for notifications.** Every watch's first
run is a **free baseline**: it records each company's starting
values internally for diffing and fires on nothing. It sends you a free sample
of up to five of those companies so you can see the envelope, each with an
empty `changes` array. After that you pay
** 5 credits per notification**, one charge for each watched
company that changed on a run. A run that surfaces nothing costs nothing, and
the price is the same whether you check hourly or monthly. If your balance is
too low, the run is suspended rather than partially delivered.
For your own price per company, open the
[watch builder](https://app.crustdata.com/watch?type=list\&dataset=company\&sla=30) in the dashboard.

* **Rate limit:** 10 requests per minute on `/watch/company`. Each watch path keeps its own budget. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).
* **Watched list:** up to **10,000 companies** per watch, editable at any time.
* **Fixed at creation:** `track` and `fields`. To change what you watch for, create a new watch.

> [!NOTE]
>
> An Entity Watcher tracks a **known list**. To *find* companies that newly match
> a filter, use the [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md).

> [card] [Examples](#examples)
>
> Funding, news, headcount thresholds, rebrands, hiring activity.

> [card] [What you can track](#what-you-can-track)
>
> Operators, common signals, and how to combine them.

> [card] [Company field reference](https://docs.crustdata.com/company-docs/enrichment/reference.md)
>
> Every trackable `field` path.

***

## Your first watch: two companies, two signals

Watch two companies and get a message whenever either changes headcount **or** appears in the news.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/watch/company \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "entities": { "domains": ["netflix.com", "stripe.com"] },
    "track": {
      "op": "or",
      "conditions": [
        { "field": "headcount.total", "type": "changed" },
        { "field": "news", "type": "added" }
      ]
    },
    "config": {
      "trigger": { "type": "interval", "every_hours": 168 },
      "max_results_per_run": 100
    },
    "notifications": [
      { "type": "slack", "webhook_url": "https://hooks.slack.com/services/T00/B00/xxxxxxxx" }
    ]
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
    "id": 50981,
    "kind": "entity",
    "dataset": "company",
    "api_version": "2025-11-01",
    "config_version": "2025-11-01",
    "status": "active",
    "entities": { "domains": ["netflix.com", "stripe.com"] },
    "track": {
        "op": "or",
        "conditions": [
            { "field": "headcount.total", "type": "changed" },
            { "field": "news", "type": "added" }
        ]
    },
    "fields": null,
    "config": {
        "trigger": { "type": "interval", "every_hours": 168 },
        "max_results_per_run": 100,
        "expires_at": null,
        "preferred_hour": null,
        "refresh_frequency_days": 30,
        "payload_delivery_type": "inline"
    },
    "notifications": [
        { "type": "slack", "webhook_url": "https://hooks.slack.com/services/T00/B00/xxxxxxxx" }
    ],
    "created_at": "2026-09-03T07:34:53.423635Z",
    "last_run_at": null,
    "last_notified_at": null,
    "notifications_count": 0,
    "credits_consumed": 0
}
```

### Understanding the response

* **`id`** is the handle for everything else: pause, edit the list, cancel, and read run history all take it.
* **`fields: null`** means the default minimal projection. The delivered `record` will carry only `basic_info` until you request more.
* **`last_run_at: null`** until the baseline run completes.
* **`config.refresh_frequency_days: 30`** is echoed on every company entity watch. Company watches run at the 30-day baseline, so this is the only rate that applies to them: 5 credits per changed company.

### How a watch runs

**1. Create the watch**

`POST` your `entities`, a `track`, a `config`, and one or more `notifications`
channels. The response returns the whole watch, including its `id`.

**2. Baseline run (free)**

On the first run, the watcher records an internal **snapshot** of the fields
you are tracking, just enough to diff next time. It diffs nothing, so the
baseline **fires on nothing and is never charged**. It only establishes
"before".

The baseline does send you one notification, free: a sample of up to **five**
of the companies it resolved, each with an empty `changes` array and the
`record` projected to your `fields`. Use it to confirm your receiver parses
the envelope before a real change arrives. To read a company's current profile
on demand, use [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/introduction.md).

**3. Recurring runs**

On your schedule (`every_hours`), the watcher re-checks each company, diffs it
against its last snapshot, and delivers a notification for every company whose
`track` condition just became true. You are charged 5 credits per
notification.

> [!NOTE]
>
> An Entity Watcher fires only on a **transition**, the moment a value crosses
> from its previous state to a new one. It never fires on the baseline and will
> not re-notify you about a change it already reported. The baseline sample is
> not a fire: every entry in it carries `changes: []`, so a receiver that keys
> on a non-empty `changes` array skips the whole baseline on its own.

### What a notification looks like

Every fired company carries two things: the **`changes`** array, which is exactly what moved and is reported whatever `fields` says, and a **`record`**, the company's current data projected to the `fields` you requested. The company's identity travels **inside** the record as `crustdata_company_id`.

The example below is from a watch created with `fields: ["basic_info", "headcount", "news"]`.

```json Webhook POST body theme={"theme":"vitesse-black"}
{
  "metadata": {
    "watch_id": 50981,
    "kind": "entity",
    "dataset": "company",
    "api_version": "2025-11-01",
    "run_id": 64210,
    "notification_id": "ntf_64210",
    "delivered_at": "2026-09-03T07:40:00.000000Z",
    "summary": { "delivered": 1, "total_count": 1, "records_searched": 1, "max_results_per_run": 100, "truncated": false, "records_matched": 1 },
    "payload_delivery": { "type": "inline" }
  },
  "results": [
    {
      "changes": [
        { "field": "headcount.total", "type": "changed", "from": 8200, "to": 8460 }
      ],
      "record": {
        "basic_info": { "name": "…", "primary_domain": "…" },
        "headcount": { "total": 8460 },
        "news": [ { "title": "…", "url": "…", "published_at": "…" } ],
        "crustdata_company_id": 631480
      }
    }
  ]
}
```

For an entity watch, `results` is a **flat list**, one object per fired company, each with its own `changes` and `record`. A `changed` scalar reports as `{ "field": …, "type": "changed", "from": …, "to": … }`; an `added` array reports as `{ "field": …, "type": "added", "new_elements": [ … ] }`.

To re-read a past run, or audit exactly what was delivered, the run-history endpoint returns the same content under a different envelope:

```json GET /watch/company/{id}/runs/{run_id}/summary theme={"theme":"vitesse-black"}
{
  "id": 64210,
  "status": "SUCCESS",
  "records_searched": 1,
  "records_matched": 1,
  "records_stale": null,
  "records_after_filter": 1,
  "new_records_count": 1,
  "notifications": [
    {
      "sent_at": "2026-09-03T07:40:00Z",
      "http_status": 200,
      "payload": {
        "subscription_id": 50981,
        "event_type": "indb:entity:company",
        "timestamp": "2026-09-03T07:40:00Z",
        "notifications": [
          {
            "uid": "company_631480_64210",
            "changes": [ { "field": "headcount.total", "type": "changed", "from": 8200, "to": 8460 } ],
            "record": { "basic_info": { … }, "headcount": { … }, "news": [ … ], "crustdata_company_id": 631480 }
          }
        ]
      }
    }
  ]
}
```

***

## What you can track

The `track` describes the change that triggers a notification. It is a tree of condition **leaves**, optionally combined with `and` / `or` groups.

A leaf has the shape:

```json theme={"theme":"vitesse-black"}
{ "field": "<dot-path into the profile>", "type": "<operator>", "value": "<optional>" }
```

| Operator | Applies to | Fires when |
| - | - | - |
| `changed` | a **scalar** field, for example `headcount.total` | the value becomes different from the last snapshot |
| `added` | an **array** field, for example `news`, `funding.investors` | a new element appears in the array |
| `>`, `<`, `=`, `!=`, `=>` (≥), `=<` (≤) | a scalar, or a predicate on an array element | the comparison flips from false to true, e.g. `headcount.total => 1000` |

> [!NOTE]
>
> Crustdata writes "greater-than-or-equal" as **`=>`** and "less-than-or-equal"
> as **`=<`**, not `>=` / `<=`. Those reversed forms return `unknown operator`.

`value` is required for the comparison operators, and omitted for `changed` and `added`.

Combine leaves with a group node, `{ "op": "and" | "or", "conditions": [ … ] }`, to watch several signals at once. An `or` group fires if **any** child fires; an `and` group fires only when **all** its conditions hold and at least one just became true. Groups nest.

### Tell elements apart with `keys`

A bare `added` fires on **any** new element in the array. A company array can
carry the same thing twice under two identities: a syndicated article reposted at
a second URL, or an acquisition that arrives again with a different id. Each
arrival is a new element, so the watch fires again and you pay again.

Add `keys` to the leaf to name the fields that identify an element instead:

```json theme={"theme":"vitesse-black"}
{ "field": "news", "type": "added", "keys": ["article_url"] }
```

The watch now fires once per `article_url`. A second copy of an article it has
already seen stays silent.

**Each entry is one identity, and any match counts.** Give two entries and an
element is already known if either one matches, which is how you cover a field
that is not always populated. Nest an entry to build a composite identity. On
`funding.milestones`, `[["round_type", "date"]]` identifies a round by its type
and its date, so a later restatement of the same round stays silent. An entry
cannot identify an element when any field in that entry is null.

> [!WARNING]
>
> **The loosest entry wins.** The watch matches the entries as a union, so the
> bare `round_type` entry defeats the composite in
> `[["round_type", "date"], ["round_type"]]`: any element whose round type the
> watch has seen is already known, so the composite never applies. Give a
> fallback entry the same fields as the entry it backs up.

> [!WARNING]
>
> **An identity never expires.** A watch remembers every identity it has ever
> seen on the array, so an element that leaves and comes back does not fire
> again. This is deliberate. An array can go short for one run and recover, and
> firing on the recovery would bill you for news that is not new.

> [!NOTE]
>
> `keys` is valid only with `added`, and it names fields of the array's own
> elements. `track` is fixed at creation, so you cannot add `keys` to a watch
> that already runs. Create a new watch instead.

`keys` needs an array of objects. `news`, `funding.acquisitions` and
`funding.milestones` qualify. `funding.investors` is an array of plain strings
with no child fields to name, so `keys` on it returns `400`.

### Common company signals

These are examples. A company profile has **500+ addressable fields**, and you can track any of them: any scalar with `changed`, any array with `added`.

| Signal | `field` | `type` |
| - | - | - |
| Headcount changed | `headcount.total` | `changed` |
| Crossed a headcount threshold | `headcount.total` | `=>` (with `value`) |
| In the news | `news` | `added` |
| Raised funding | `funding.total_investment_usd` | `changed` |
| New funding round | `funding.last_round_type` | `changed` |
| New investor | `funding.investors` | `added` |
| Made an acquisition | `funding.acquisitions` | `added` |
| Funding milestone | `funding.milestones` | `added` |
| Follower count changed | `followers.count` | `changed` |
| Hiring activity | `hiring.openings_count` | `changed` |
| Industry changed | `taxonomy.professional_network_industry` | `changed` |
| HQ relocated | `locations.country` | `changed` |
| Name change or rebrand | `basic_info.name` | `changed` |

A bare `added` fires on every arrival, including a second copy of something the
watch has already reported. Add [`keys`](#tell-elements-apart-with-keys) to fire
once per article, acquisition, or round instead.

> [!NOTE]
>
> `field` paths address the same profile structure the Enrich API returns, so you
> can browse every trackable field in the
> [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/reference.md) reference. `changed`
> requires a **scalar** path and `added` requires an **array** path. Mixing them
> returns a `400`: `"changed"` on the array `news` is rejected, and you want
> `"added"` there.

## `track` and `fields` are different

These are two independent knobs, and the distinction matters:

| Key | Controls | Answers |
| - | - | - |
| `track` | **When** the watch fires | *"What change do I want to be notified about?"* |
| `fields` | **What** the notification delivers | *"What data about the company do I want in the payload?"* |

Set them independently. You can track one field but deliver many, watching for a headcount change yet receiving full funding history and news in the payload, or track many and deliver few.

> [!WARNING]
>
> **`fields` defaults to a minimal projection.** Omit `fields` and the delivered
> `record` contains only `basic_info`.
>
> The field you are *tracking* is **not** automatically added to the payload. The
> fired `changes` array always tells you exactly what moved, but to get the
> surrounding profile data in `record`, request it in `fields`.

`fields` does **not** affect pricing. An entity watch is a flat 5 credits per notification no matter how many field groups you deliver, so there is no cost reason to keep the payload thin. There is no wildcard: to receive the complete record, list every field group your key is entitled to. The delivered `record` uses the **same schema as [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/reference.md)**, with identical field-group names and nesting.

> [!WARNING]
>
> Some groups require a field-level entitlement on your key, for example
> `technographics`. Requesting one your key cannot access fails the create with
> `403`, not a quiet empty payload:
>
> ```json 403 Forbidden theme={"theme":"vitesse-black"}
> {
>   "error": {
>     "type": "permission_error",
>     "message": "Not entitled to fields: technographics. Contact support to request access.",
>     "metadata": []
>   }
> }
> ```
>
> The check covers `track` as well as `fields`. A field you name in
> [`keys`](#tell-elements-apart-with-keys) needs the same entitlement, and the
> watch is refused rather than keyed on a field it cannot read.

## Choosing the companies

`entities` is an object mapping an **identifier type** to a list of values. You can mix identifier types in one watch. A single watch holds up to **10,000 companies**.

| Accepted identifier keys | Example value |
| - | - |
| `domains` | `"stripe.com"` |
| `names` | `"Retool"` |
| `professional_network_profile_urls` | `"https://www.linkedin.com/company/stripe"` |
| `crustdata_company_ids` | `631466` |

```json theme={"theme":"vitesse-black"}
{ "entities": { "domains": ["netflix.com", "stripe.com"] } }
```

> [!TIP]
>
> Prefer `domains` or `crustdata_company_ids`. A `names` entry has to be resolved
> to a company first, and a common name can resolve to something you did not
> mean. Use [Company Identify](https://docs.crustdata.com/company-docs/identify/introduction.md) to turn a
> messy name into an id, then watch the id.

## Delivery channels

Add one or more channels to `notifications` and every change fans out to all of them.

```json Webhook theme={"theme":"vitesse-black"}
{ "type": "webhook", "url": "https://your-app.com/webhooks/crustdata", "headers": { "X-Watch-Name": "key-accounts" } }
```

```json Slack theme={"theme":"vitesse-black"}
{ "type": "slack", "webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX" }
```

```json Google Chat theme={"theme":"vitesse-black"}
{ "type": "google_chat", "url": "https://chat.googleapis.com/v1/spaces/…" }
```

```json Email theme={"theme":"vitesse-black"}
{ "type": "email", "to": ["you@company.com"] }
```

> [!NOTE]
>
> Every delivery is also recorded, so beyond the live push you can re-read a
> watch's past runs from the [run-history endpoint](#manage-your-watches).

### Where the records travel

By default a run's change events arrive inside the notification, under `results`. Set `config.payload_delivery_type` to `"link"` and the body carries no records at all. It carries `metadata.payload_delivery.url` instead, a pre-signed S3 URL for one NDJSON file holding every record of that run.

Switch when a run can outgrow what your receiver accepts. An AWS Lambda proxy integration caps a request at 6 MB and an ALB target at 1 MB, and an oversize body is refused whole.

```bash theme={"theme":"vitesse-black"}
curl --request PATCH \
  --url https://api.crustdata.com/watch/company/50981 \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "config": {
      "trigger": { "type": "interval", "every_hours": 168 },
      "payload_delivery_type": "link"
    }
  }'
```

Every channel on the watch gets the same link, and the run-summary endpoint serves the same file. Read `metadata.payload_delivery.type` rather than testing for `results`: a `link` watch falls back to an inline body if the file cannot be written. See [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md).

***

## Edit the watched list any time

Unlike a saved search, an Entity Watcher's list is **mutable**. Add or remove companies as your account book or portfolio changes, without recreating the watch. `PATCH` the watch with a new `entities` object:

```bash Request theme={"theme":"vitesse-black"}
curl --request PATCH \
  --url https://api.crustdata.com/watch/company/50981 \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "entities": {
      "domains": ["netflix.com", "stripe.com", "airbnb.com"]
    }
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
  "id": 50981,
  "status": "active",
  "entities": {
    "domains": ["netflix.com", "stripe.com", "airbnb.com"]
  }
}
```

Newly added companies are **baselined silently** on the next run. They establish their "before" snapshot first, so adding one never fires a spurious notification. You can also `PATCH` `status` (`active` / `paused`), `config`, and `notifications`.

> [!WARNING]
>
> A watch's `track` and `fields` are fixed once created. `PATCH`ing either
> returns `400`. To change what you watch for, create a new watch.

## Smoke-test your webhook

Before a real change ever fires, push **one sample notification** through a watch to verify your receiver end to end: signature check, JSON parsing, routing, without waiting for a company to actually move. The test delivers the **exact envelope a real run sends**, same shape and same signature headers, flagged with `metadata.test: true`. It runs no diff, records no snapshot, **costs no credits**, and persists nothing.

```
POST https://api.crustdata.com/watch/company/{watch_id}/test
```

All three body fields are optional:

| Field | Type | Description |
| - | - | - |
| `notification_endpoint` | string | Deliver this one test to a URL you control instead of the watch's configured channels, handy with a request-inspection service. Must be a **public** `http(s)` URL; endpoints resolving to private, loopback, or link-local addresses are rejected. |
| `fields` | string\[] | Project the sample `record` to a specific field set for this test. Defaults to the watch's own `fields`. |
| `count` | integer | Deliver `N` sample companies (`1` to `25`) in one envelope to exercise multi-record handling. Each gets a distinct `crustdata_company_id`. Default `1`. |

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/watch/company/50981/test \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "notification_endpoint": "https://your-server.example.com/webhook",
    "fields": ["basic_info", "funding"]
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
  "delivered": [
    {
      "type": "webhook",
      "endpoint": "https://your-server.example.com/webhook",
      "http_status": 200,
      "ok": true,
      "response": "…your receiver's response body, truncated to 500 chars…"
    }
  ],
  "envelope": { "…the exact body delivered to your webhook, shown below…" }
}
```

Your receiver gets this `POST`. It is the shape of a real notification: only `metadata.test: true` and the **sample values** (`"sample_text"`, `1234`, …) mark it as a test.

```http Request headers theme={"theme":"vitesse-black"}
Content-Type: application/json
x-api-version: 2025-11-01
x-crustdata-watch-id: 50981
x-crustdata-event-id: ntf_test_1785211468
x-crustdata-signature: t=1785211468,v1=<hex-hmac-sha256>
```

```json Webhook POST body theme={"theme":"vitesse-black"}
{
  "metadata": {
    "watch_id": 50981,
    "kind": "entity",
    "dataset": "company",
    "api_version": "2025-11-01",
    "run_id": 1785211468,
    "notification_id": "ntf_test_1785211468",
    "delivered_at": "2026-07-28T04:04:28.168658Z",
    "summary": { "delivered": 1, "total_count": 1, "records_searched": 1, "max_results_per_run": 25, "truncated": false, "records_matched": 1 },
    "test": true
  },
  "results": [
    {
      "changes": [
        { "field": "headcount.total", "type": "changed", "value": null, "from": null, "to": 1234 }
      ],
      "record": {
        "crustdata_company_id": 814313,
        "basic_info": {
          "name": "sample_text",
          "primary_domain": "sample_text",
          "website": "sample_text",
          "company_type": "sample_text",
          "year_founded": 1234,
          "employee_count_range": "sample_text",
          "industries": ["sample_text"]
        },
        "funding": {
          "total_investment_usd": 12.5,
          "last_round_type": "sample_text",
          "last_round_amount_usd": 12.5,
          "last_fundraise_date": "2026-06-01",
          "investors": ["sample_text"],
          "milestones": [
            { "date": "2026-06-01", "amount_usd": 12.5, "round_type": "sample_text" }
          ]
        }
      }
    }
  ]
}
```

> [!NOTE]
>
> The sample `record` carries **placeholder values** with the exact **shape** of
> a real notification, so your parser, signature check, and routing see
> production structure without real company data. The `changes` array mirrors
> your watch's `track`: a `changed` scalar reports
> `{ "type": "changed", "value": …, "from": …, "to": … }` (`value` is the
> threshold target for `>`/`<` operators, `null` for a plain `changed`), and an
> `added` array reports `{ "type": "added", "new_elements": [ … ] }`.

Pass `"count": 3` to receive three sample companies in one envelope, with distinct `crustdata_company_id`s (`814313`, `814314`, `814315`) and `summary.delivered: 3`, so you can exercise how your receiver iterates `results`.

> [!NOTE]
>
> The signature is computed exactly as for a real notification: HMAC-SHA256 over
> `<timestamp>.<raw-body>` keyed by your API key, delivered as
> `x-crustdata-signature: t=<unix>,v1=<hex>`. A test that verifies here verifies
> real deliveries.

## Manage your watches

| Action | Request |
| - | - |
| List your watches | `GET /watch/company?status=active&limit=50&offset=0` |
| Get one | `GET /watch/company/{id}` |
| Pause / resume | `PATCH /watch/company/{id}` with `{ "status": "paused" }` |
| Add or remove companies | `PATCH /watch/company/{id}` with a new `entities` |
| Delete | `DELETE /watch/company/{id}` → `204` |
| Run history | `GET /watch/company/{id}/runs?limit=20` |
| One run, with records | `GET /watch/company/{id}/runs/{run_id}/summary` |

Full request and response for each, verified live:

> [accordion] List your watches: GET /watch/company
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url 'https://api.crustdata.com/watch/company?status=active&limit=50&offset=0' \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> [
>   {
>     "id": 50981,
>     "kind": "entity",
>     "dataset": "company",
>     "status": "active",
>     "entities": { "domains": ["netflix.com", "stripe.com"] },
>     "track": { "type": "changed", "field": "headcount.total" },
>     "config": { "trigger": { "type": "interval", "every_hours": 168 }, "max_results_per_run": 25 },
>     "notifications": [{ "type": "slack", "webhook_url": "https://hooks.slack.com/services/T00/B00/xxxxxxxx" }],
>     "created_at": "2026-09-03T07:34:53.423635Z",
>     "last_run_at": "2026-09-03T07:35:04.598964Z"
>   }
> ]
> ```
>
> Returns an array of your company watches. Filter with `status`, page with `limit` and `offset`.

> [accordion] Get one watch: GET /watch/company/\{id}
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url https://api.crustdata.com/watch/company/50981 \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>   "id": 50981,
>   "kind": "entity",
>   "dataset": "company",
>   "api_version": "2025-11-01",
>   "config_version": "2025-11-01",
>   "status": "active",
>   "entities": { "domains": ["netflix.com", "stripe.com"] },
>   "track": { "type": "changed", "field": "headcount.total" },
>   "fields": null,
>   "config": {
>     "trigger": { "type": "interval", "every_hours": 168 },
>     "max_results_per_run": 25,
>     "expires_at": null,
>     "preferred_hour": null,
>     "refresh_frequency_days": 30,
>     "payload_delivery_type": "inline"
>   },
>   "notifications": [{ "type": "slack", "webhook_url": "https://hooks.slack.com/services/T00/B00/xxxxxxxx" }],
>   "created_at": "2026-09-03T07:34:53.423635Z",
>   "last_run_at": "2026-09-03T07:35:04.598964Z"
> }
> ```
>
> `last_run_at` is `null` until the baseline run completes, then carries the timestamp of the most recent run.

> [accordion] Pause or resume: PATCH status
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request PATCH \
>   --url https://api.crustdata.com/watch/company/50981 \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{ "status": "paused" }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> { "id": 50981, "status": "paused" }
> ```
>
> A paused watch stops running until you resume it. Send `{ "status": "active" }` to resume.

> [accordion] Delete a watch: DELETE /watch/company/\{id}
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request DELETE \
>   --url https://api.crustdata.com/watch/company/50981 \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> Returns `204 No Content`. Deletion is terminal: the watch cannot be resumed.

> [accordion] Read a run's counters: GET /watch/company/\{id}/runs
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url 'https://api.crustdata.com/watch/company/50981/runs?limit=20' \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>   "runs": [
>     {
>       "id": 368095,
>       "started_at": "2026-10-09T10:44:16.493833Z",
>       "completed_at": "2026-10-09T10:44:17.920955Z",
>       "status": "SUCCESS",
>       "failure_reason": null,
>       "records_searched": 2,
>       "records_matched": 1,
>       "records_stale": null,
>       "records_after_filter": 1,
>       "new_records_count": 1,
>       "credits_deducted": 0,
>       "notification_http_status": 200
>     }
>   ],
>   "next_cursor": null,
>   "total_count": 1
> }
> ```
>
> This is the baseline run of a watch created with **two** company domains, one of
> which matches no record Crustdata holds. Read it left to right: `records_searched: 2`
> is the list you sent, `records_matched: 1` is the part of it that resolved, and
> `credits_deducted: 0` is the baseline being free. Read the counters to catch that
> second domain: no other field reports an identifier that matched nothing.

### Reading a run

Every run carries five counters. Each one answers a different question, and two
of the five apply to one watch kind only:

| Field | Discovery watch | Entity watch |
| - | - | - |
| `records_searched` | Everything the query returned, before the new-record check and the cap | The identifiers you listed in `entities` |
| `records_matched` | `null` | Identifiers that resolved to a record Crustdata holds |
| `records_stale` | Matches an earlier run already handled | `null` |
| `records_after_filter` | New matches, before the cap | Entities that changed, before the cap |
| `new_records_count` | Records delivered | Records delivered |

Read them as a funnel. On a discovery run, `records_searched` minus
`records_stale` is `records_after_filter`. A large `records_stale` means the query
is broad and you have already seen most of what it finds.

On an entity run, a gap between `records_searched` and `records_matched` is the
part of your list that matches no record Crustdata holds. No other field reports
that gap, and every run skips those identifiers in silence.

`new_records_count` is below `records_after_filter` when `max_results_per_run`
cut the run short. On a realtime discovery watch, `records_searched` counts the
rows the live retrieval returned.

A **first run** is where those last two counters sit furthest apart. It delivers a
free sample of up to five records, so `new_records_count` is at most `5` however
large `records_after_filter` is. You did not lose the rest. The baseline marked
every one of those records as handled, which is why later runs report only
movement. A first discovery run has nothing to call stale yet, so `records_stale`
is `0` and `records_searched` equals `records_after_filter`.

> [!NOTE]
>
> `records_matched` and `records_stale` shipped after the other three. A run
> that finished before then carries `null` for both, whatever its watch kind.

***

## Examples

Worked recipes you can copy, paste, and adapt. Each one is a full working request, verified against the live API. Swap the notification channel for your own. For every trackable `field` path, see the [Company Enrich reference](https://docs.crustdata.com/company-docs/enrichment/reference.md).

> [accordion] Alert when an account crosses a headcount threshold
>
> A comparison operator fires on the transition, the run where the value first crosses your threshold. It does not re-fire while the value stays above it.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "domains": ["stripe.com"] },
>     "track": { "field": "headcount.total", "type": "=>", "value": 1000 },
>     "fields": ["basic_info", "headcount"],
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > Request `headcount` in `fields` so the payload carries the new value in
> > `record`, not just the `from` and `to` in `changes`.

> [accordion] Follow every funding move on a portfolio
>
> Group three funding signals with `or` so any one of them fires: a new round type, a new investor, or a new acquisition.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "domains": ["anthropic.com", "openai.com"] },
>     "track": {
>       "op": "or",
>       "conditions": [
>         { "field": "funding.last_round_type", "type": "changed" },
>         { "field": "funding.investors", "type": "added" },
>         { "field": "funding.acquisitions", "type": "added" }
>       ]
>     },
>     "fields": ["basic_info", "funding"],
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> `funding.investors` and `funding.acquisitions` are arrays, so they take `added`. `funding.last_round_type` is a scalar, so it takes `changed`. Mixing those up returns `400`.

> [accordion] Watch a competitor's news mentions
>
> `news` is an array, so `added` fires whenever a new item lands. A six-hour cadence surfaces it the same day without costing more, because you pay per notification and not per run.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "domains": ["netflix.com"] },
>     "track": { "field": "news", "type": "added" },
>     "fields": ["basic_info", "news"],
>     "config": { "trigger": { "type": "interval", "every_hours": 6 } },
>     "notifications": [ { "type": "slack", "webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX" } ]
>   }'
> ```
>
> The `changes` entry for an array reads `{ "field": "news", "type": "added", "new_elements": [ … ] }`, so you get the new items themselves without diffing the payload yourself.

> [accordion] Fire once per article, not once per repost
>
> Key `news` on `article_url` so a syndicated article the watch has already
> reported stays silent the second time. See
> [Tell elements apart with `keys`](#tell-elements-apart-with-keys) for how an
> entry is matched.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "domains": ["netflix.com"] },
>     "track": { "field": "news", "type": "added", "keys": ["article_url"] },
>     "fields": ["basic_info", "news"],
>     "config": { "trigger": { "type": "interval", "every_hours": 6 } },
>     "notifications": [ { "type": "slack", "webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX" } ]
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 55726,
>     "kind": "entity",
>     "dataset": "company",
>     "status": "active",
>     "entities": { "domains": ["netflix.com"] },
>     "track": { "field": "news", "type": "added", "keys": ["article_url"] },
>     "fields": ["basic_info", "news"],
>     "config": {
>         "trigger": { "type": "interval", "every_hours": 6 },
>         "max_results_per_run": 25,
>         "refresh_frequency_days": 30,
>         "payload_delivery_type": "inline"
>     },
>     "last_run_at": null,
>     "notifications_count": 0,
>     "credits_consumed": 0
> }
> ```
>
> The response is trimmed to the keys under discussion. The create echoes `track`
> back with `keys` on it, which is how you confirm the override is in place.

> [accordion] Catch a rebrand, a relocation, or an industry shift
>
> Three `changed` scalars under one `or`. Useful on a CRM sync: these are the fields that quietly go stale and break matching.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "crustdata_company_ids": [631466, 635252] },
>     "track": {
>       "op": "or",
>       "conditions": [
>         { "field": "basic_info.name", "type": "changed" },
>         { "field": "locations.country", "type": "changed" },
>         { "field": "taxonomy.professional_network_industry", "type": "changed" }
>       ]
>     },
>     "fields": ["basic_info", "locations", "taxonomy"],
>     "config": { "trigger": { "type": "interval", "every_hours": 168 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Require two things at once with and
>
> An `and` group fires only when every condition holds **and** at least one just became true. This watch fires when a company is at 1,000 or more employees and its open-role count moves, which reads as "scaling and still hiring".
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "domains": ["figma.com"] },
>     "track": {
>       "op": "and",
>       "conditions": [
>         { "field": "headcount.total", "type": "=>", "value": 1000 },
>         { "field": "hiring.openings_count", "type": "changed" }
>       ]
>     },
>     "fields": ["basic_info", "headcount", "hiring"],
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Track audience growth
>
> `followers.count` is a scalar, so `changed` fires on any movement. Pair it with a weekly cadence unless you want every small fluctuation.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "names": ["Retool"] },
>     "track": { "field": "followers.count", "type": "changed" },
>     "fields": ["basic_info", "followers"],
>     "config": { "trigger": { "type": "interval", "every_hours": 168 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!TIP]
> >
> > Use `=>` with a `value` instead of `changed` when you only care about crossing
> > a round number, for example 100,000 followers. `changed` on a noisy counter can
> > fire on every run.

> [accordion] Watch companies by profile URL
>
> A profile URL works as an identifier when that is what your CRM stores, with no need to resolve it to a domain first.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "professional_network_profile_urls": ["https://www.linkedin.com/company/stripe"] },
>     "track": { "field": "headcount.total", "type": "changed" },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Deliver the full company record
>
> There is no wildcard, so list every field group your key is entitled to. This mirrors the full Company Enrich `fields` set.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "domains": ["stripe.com"] },
>     "track": { "field": "headcount.total", "type": "changed" },
>     "fields": [
>       "basic_info", "revenue", "headcount", "funding", "hiring", "locations",
>       "taxonomy", "people", "competitors", "followers", "web_traffic", "seo",
>       "news", "social_profiles", "software_reviews", "employee_reviews",
>       "reviews", "public_launches", "market_intel"
>     ],
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > Groups that need a field-level entitlement, `technographics` among them, are
> > left out here. Adding one your key cannot access fails the create with `403`
> > and the message `Not entitled to fields: <group>. Contact support to request
> >           access.`

> [accordion] Deliver a large run as a linked file
>
> A watch over thousands of companies can outgrow what your receiver accepts. Raise the per-run cap and switch the payload to a link.
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
>
> Each line of the linked NDJSON file is one `{ changes, record }` object, the same shape the inline body carries. See [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md).

***

***

## Error handling

A company entity watch answers every failure the same way, whether you are creating a watch, editing the watched list, testing delivery, or reading run history.

| Status | Type | Common causes |
| - | - | - |
| `400` | `invalid_request` | An `entities` key that is not one of the accepted identifier types, a `track` leaf missing its `field` or `type`, `config` or `notifications` left out, `config.trigger.every_hours` below `1`, a `refresh_frequency_days` no tracked field can be refreshed at, a missing or unsupported `x-api-version`, or a `PATCH` to a key fixed at creation. `keys` adds two: `track: 'keys' is only valid with 'added', not 'changed'`, and `track: '<path>': 'keys' must be a non-empty list of fields or field groups`. A `keys` entry naming a field the array's elements do not carry answers `track: <path>.<field>` with `metadata[0].type` set to `unknown_field`. |
| `401` | `unauthorized` | Missing or invalid API key. |
| `403` | `permission_error` | Your key is not entitled to a field group you named in `track` or `fields`, or to the company dataset. |
| `404` | `not_found` | No watch with that id on your account. The watch, test, and run paths all answer the same way. |
| `405` | `invalid_request` | A method the path does not serve, such as `PUT` on the create path. |
| `429` | `rate_limit_error` | More than 10 watch-management requests in a minute. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md). |

Every watcher failure comes back in the same envelope the search and enrich APIs
use, whatever the status code:

```json theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "Watch not found",
        "metadata": []
    }
}
```

`type` is the machine-readable code you branch on, `message` is the sentence you
can show a user, and `metadata` carries per-problem detail when there is any.
Read `error.message`, not the top level: there is no `detail` key and no
`non_field_errors` key on any watcher response.

### Every problem in one response

Validation collects **every** failure in one pass, so a payload with three
things wrong costs one round trip rather than three. `metadata` carries one
entry per problem, and `message` is those entries joined in order:

```json 400 - three problems, one response theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "config.trigger.every_hours must be an integer >= 1. on: 'removed' is not yet supported. Unknown filter field at filters.conditions[0]: 'headcount'.",
        "metadata": [
            {
                "field": "config.trigger.every_hours",
                "type": "greater_than_equal",
                "message": "config.trigger.every_hours must be an integer >= 1."
            },
            {
                "field": "on",
                "type": "unsupported",
                "message": "on: 'removed' is not yet supported."
            },
            {
                "field": "filters.conditions[0].field",
                "type": "unknown_field",
                "message": "Unknown filter field at filters.conditions[0]: 'headcount'."
            }
        ]
    }
}
```

Each entry carries three keys:

| Key | What it holds |
| - | - |
| `field` | The request path that failed, indexed into filter and track trees, for example `filters.conditions[0].field` or `config.trigger.every_hours`. |
| `type` | The failure code. Mostly the vocabulary the search and enrich APIs use (`missing`, `enum`, `greater_than_equal`, `less_than_equal`, `string_type`, `int_type`, `bool_type`, `list_type`, `dict_type`, `too_long`, `date_parsing`, `extra_forbidden`, `invalid`), plus `unknown_field`, `unsupported`, and `link_required`, which only watcher emits. |
| `message` | The sentence for that one problem, naming its field. |

> [!NOTE]
>
> The shape of the body is checked before the rules that read across fields, so
> a payload that is both malformed and semantically wrong can still take two
> round trips: the first response names the shape problems, the second names
> the rules. Two is the worst case.

### Exact responses

```json 401 - bad or missing key theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "unauthorized",
        "message": "Invalid API key in request.",
        "metadata": []
    }
}
```

```json 404 - no such watch theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "not_found",
        "message": "Watch not found",
        "metadata": []
    }
}
```

```json 400 - required field left out theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "filters: This field is required. config: This field is required.",
        "metadata": [
            { "field": "filters", "type": "missing", "message": "filters: This field is required." },
            { "field": "config", "type": "missing", "message": "config: This field is required." }
        ]
    }
}
```

```json 400 - missing version header theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "Missing required header: x-api-version",
        "metadata": []
    }
}
```

```json 405 - method the path does not serve theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "Method \"PUT\" not allowed.",
        "metadata": []
    }
}
```

```json 429 - watch-management rate limit theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "rate_limit_error",
        "message": "Rate limit exceeded for this endpoint. Please write to gtm@crustdata.co.",
        "metadata": []
    }
}
```

A missing `Authorization` header and a wrong key give the same `401` body, so
the response does not tell you which of the two happened.

> [!WARNING]
>
> **`metadata` is not always a `{field, type, message}` triple.** Three
> responses put a different object in it:
>
> * `Invalid fields: ...` carries `[{ "available_fields": [...] }]`, the full
>   list of field paths you may project, which runs to a few hundred entries.
> * `Access denied to fields: ...` carries
>   `[{ "denied_fields": [...], "permitted_fields": [...] }]`.
> * A test send that could not be attempted carries the delivery result it
>   built, under `delivered` and `envelope`.
>
> Check for the keys you expect before you iterate `metadata`, and fall back to
> `error.message` for anything you show a user.

> [!NOTE]
>
> A path that does not route never reaches the watcher and so never gets this
> envelope. `POST /watch/widget/search` returns the gateway's
> `{"error_msg": "404 Route Not Found"}`, and an entity path on a dataset that
> has no entity watcher returns an HTML `404`. Branch on the status code first,
> then parse.

## Pricing

| | Credits |
| - | - |
| First run (baseline snapshot, sample of up to 5 companies) | **Free** |
| Each changed company delivered on later runs | **5** |

`fields` does not change the price, and neither does `every_hours`. A run where nothing changed costs nothing. See [Pricing](https://docs.crustdata.com/general/pricing.md) for the full catalog.

## What to do next

* **Find companies instead of tracking them**: use the [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md) to deliver companies that newly match a filter.
* **Browse trackable fields**: see the [Company Enrich reference](https://docs.crustdata.com/company-docs/enrichment/reference.md) for every `field` path.
* **Read a profile on demand**: use [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/introduction.md) when you want current state rather than change.
* **Choose how records travel**: see [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md) for inline versus linked NDJSON.


## Related topics

- [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md)
- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [Pricing](https://docs.crustdata.com/general/pricing.md)
- [Person Entity Watcher](https://docs.crustdata.com/watcher-docs/person/entity.md)
- [Job Watcher](https://docs.crustdata.com/watcher-docs/job/watch.md)
