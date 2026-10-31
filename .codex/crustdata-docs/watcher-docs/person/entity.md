> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Person Entity Watcher

> Watch a list of people you supply and get notified the moment their profile changes: a new job, a title move, a fresh certification. You supply the list; the watcher delivers the diff.

**Use this when** you already know which people matter: a pipeline of candidates, a set of key contacts, a target roster, and you want to hear the moment one of them moves.

A Person Entity Watcher monitors **a list of people you supply**, by profile URL, and notifies you when *their* profiles change. You describe what to watch for; each scheduled run compares every person against their last snapshot and delivers only what changed. This page walks you through the basics: your first watch, what you can track, the notification shape, and how to edit the list, then folds in worked recipes you can copy, paste, and adapt.

Every request goes to the same endpoint:

```
POST https://api.crustdata.com/watch/person
```

> [!NOTE]
>
> Replace `YOUR_API_KEY` in each example with your actual API key. All requests
> require the `x-api-version: 2025-11-01` header. This endpoint is **open to all
> API customers**, with no per-endpoint grant needed.

### Request body

| Parameter | Type | Required | Default | Description |
| - | - | - | - | - |
| `entities` | object | Yes | - | The people to watch, keyed by identifier type. See [Choosing the entities](#choosing-the-entities). |
| `track` | object | Yes | - | The change that fires a notification. A leaf or a nested `and`/`or` group. |
| `config` | object | Yes | - | Schedule, caps, and data freshness. See [config](#config) below. |
| `notifications` | object\[] | Yes | - | Delivery channels. See [Delivery channels](#delivery-channels). |
| `fields` | string\[] | No | `["basic_profile", "social_handles"]` | Field groups to include in each delivered `record`. Independent of `track`. |

#### `config`

| Parameter | Type | Required | Default | Description |
| - | - | - | - | - |
| `trigger` | object | Yes | - | `{ "type": "interval", "every_hours": N }`. How often the watch runs, integer ≥ 1. |
| `max_results_per_run` | integer | No | `25` | Notifications per run, `1` to `10000`. A value above `1000` needs `payload_delivery_type` `"link"`. |
| `refresh_frequency_days` | integer | No | `30` | How fresh to keep the tracked data, `1` to `30`. Fewer days means fresher data and a higher per-notification rate. See [Data freshness](#data-freshness). |
| `preferred_hour` | integer | No | - | Hour of day in UTC (`0` to `23`) to prefer for the run. |
| `expires_at` | string | No | - | Auto-expire date, `YYYY-MM-DD`. |
| `payload_delivery_type` | string | No | `"inline"` | `"inline"` or `"link"`. See [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md). |

### Response body

Create returns the whole watch, so you can confirm what was stored before the baseline run starts.

| Field | Type | Description |
| - | - | - |
| `id` | integer | The watch's id. Use it on every management and run-history path. |
| `kind` | string | `"entity"`. |
| `dataset` | string | `"person"`. |
| `status` | string | `active`, `paused`, `suspended`, `expired`, or `cancelled`. |
| `entities` | object | The watched list, as sent. |
| `track` | object | The saved trigger condition. |
| `fields` | array or null | The saved projection. `null` means the default minimal set. |
| `config` | object | The stored schedule, caps, and freshness. |
| `notifications` | object\[] | The configured channels. A stored channel secret is never returned. |
| `created_at` | string | When the watch was created. |
| `last_run_at` | string or null | When the watch last ran. `null` until the baseline run completes. |
| `last_notified_at` | string or null | When the watch last delivered a notification. |
| `notifications_count` | integer | All-time count of notifications this watch has delivered. |
| `credits_consumed` | number | All-time credits this watch has spent. |

### Rate limits and credits

**Pricing: you pay only for notifications.** The first run of
every watch is a **free baseline** that records each person's
starting values internally, for diffing only, and fires on nothing. It sends
you a free sample of up to five of those people so you can see the envelope,
each with an empty `changes` array. After that you
are charged per notification, one charge for each watched person that changed
on a run. A run that surfaces nothing costs nothing, and the rate does
** not** depend on how often you check (`every_hours`), only on
the [data-freshness tier](#data-freshness) you pick
(**5 credits** at the default 30-day freshness). If your balance
is too low, the run is suspended rather than partially delivered.
For your own price per person, open the
[watch builder](https://app.crustdata.com/watch?type=list\&dataset=person\&sla=30) in the dashboard.

* **Rate limit:** 10 requests per minute on `/watch/person`. Each watch path keeps its own budget. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).
* **Watched list:** up to **10,000 people** per watch, editable at any time.
* **Fixed at creation:** `track` and `fields`. To change what you watch for, create a new watch.

> [!NOTE]
>
> An Entity Watcher tracks a **known list**. To *find* people who newly match a
> filter, use the [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md).

> [card] [Examples](#examples)
>
> New jobs, title moves, credentials, relocations, freshness tiers.

> [card] [What you can track](#what-you-can-track)
>
> Operators, common signals, and how to combine them.

> [card] [Person field reference](https://docs.crustdata.com/person-docs/enrichment/reference.md)
>
> Every trackable `field` path.

***

## Your first watch: tell me when they move

Watch one person and get a webhook whenever they start a new job.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/watch/person \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "entities": {
      "professional_network_profile_urls": ["https://www.linkedin.com/in/sherryrobinson"]
    },
    "track": { "field": "experience.employment_details.current", "type": "added" },
    "config": {
      "trigger": { "type": "interval", "every_hours": 24 },
      "max_results_per_run": 100
    },
    "notifications": [
      { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" }
    ]
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
    "id": 50991,
    "kind": "entity",
    "dataset": "person",
    "api_version": "2025-11-01",
    "config_version": "2025-11-01",
    "status": "active",
    "entities": {
        "professional_network_profile_urls": ["https://www.linkedin.com/in/sherryrobinson"]
    },
    "track": { "field": "experience.employment_details.current", "type": "added" },
    "fields": null,
    "config": {
        "trigger": { "type": "interval", "every_hours": 24 },
        "max_results_per_run": 100,
        "expires_at": null,
        "preferred_hour": null,
        "refresh_frequency_days": 30,
        "payload_delivery_type": "inline"
    },
    "notifications": [
        { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" }
    ],
    "created_at": "2026-09-03T07:36:16.320381Z",
    "last_run_at": null,
    "last_notified_at": null,
    "notifications_count": 0,
    "credits_consumed": 0
}
```

### Understanding the response

* **`id`** is the handle for everything else: pause, edit the list, cancel, and read run history all take it.
* **`fields: null`** means the default minimal projection. The delivered `record` will carry only `basic_profile` and `social_handles` until you request more.
* **`config.refresh_frequency_days: 30`** is the default freshness tier, and it is what sets the 5-credit rate. See [Data freshness](#data-freshness).
* **`last_run_at: null`** until the baseline run completes.

### How a watch runs

**1. Create the watch**

`POST` your `entities`, a `track`, a `config`, and one or more `notifications`
channels. The response returns the whole watch, including its `id`.

**2. Baseline run (free)**

The first run records an internal **snapshot** of the fields you are tracking
for each person, just enough to diff against next time. It diffs nothing, so
the baseline **fires on nothing and is never charged**. It only establishes
"before".

The baseline does send you one notification, free: a sample of up to **five**
of the people it resolved, each with an empty `changes` array and the `record`
projected to your `fields`. Use it to confirm your receiver parses the
envelope before a real change arrives. To read a person's current profile on
demand, use [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/introduction.md).

**3. Recurring runs**

On your schedule (`every_hours`), the watcher re-checks each person, diffs them
against their last snapshot, and delivers a notification for every person whose
`track` condition just became true. You are charged per notification at your
chosen freshness tier.

> [!NOTE]
>
> An Entity Watcher fires only on a **transition**, the moment a value crosses
> from its previous state to a new one. It never fires on the baseline and will
> not re-notify you about a change it already reported. The baseline sample is
> not a fire: every entry in it carries `changes: []`, so a receiver that keys
> on a non-empty `changes` array skips the whole baseline on its own.

### What a notification looks like

Every fired person carries two things: the **`changes`** array, which is exactly what moved and is reported whatever `fields` says, and a **`record`**, the person's current data projected to the `fields` you requested. The person's identity travels **inside** the record as `crustdata_person_id`.

The example below is from a watch created with `fields: ["basic_profile", "experience"]`.

```json Webhook POST body theme={"theme":"vitesse-black"}
{
  "metadata": {
    "watch_id": 50991,
    "kind": "entity",
    "dataset": "person",
    "api_version": "2025-11-01",
    "run_id": 64200,
    "notification_id": "ntf_64200",
    "delivered_at": "2026-09-03T07:40:00.000000Z",
    "summary": { "delivered": 1, "total_count": 1, "records_searched": 1, "max_results_per_run": 100, "truncated": false, "records_matched": 1 },
    "payload_delivery": { "type": "inline" }
  },
  "results": [
    {
      "changes": [
        {
          "field": "experience.employment_details.current",
          "type": "added",
          "new_elements": [ { "title": "…", "name": "…", "start_date": "…" } ]
        }
      ],
      "record": {
        "basic_profile": { "name": "…", "current_title": "…", "headline": "…" },
        "experience": { "employment_details": { "current": [ { "title": "…", "name": "…", "start_date": "…" } ] } },
        "crustdata_person_id": 6324687
      }
    }
  ]
}
```

For an entity watch, `results` is a **flat list**, one object per fired person, each with its own `changes` and `record`. A `changed` scalar reports as `{ "field": …, "type": "changed", "from": …, "to": … }`; an `added` array as `{ "field": …, "type": "added", "new_elements": [ … ] }`.

To re-read a past run, or audit exactly what was delivered, the run-history endpoint returns the same content under a different envelope:

```json GET /watch/person/{id}/runs/{run_id}/summary theme={"theme":"vitesse-black"}
{
  "id": 64200,
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
        "subscription_id": 50991,
        "event_type": "indb:entity:person",
        "timestamp": "2026-09-03T07:40:00Z",
        "notifications": [
          {
            "uid": "person_6324687_64200",
            "changes": [ { "field": "experience.employment_details.current", "type": "added", "new_elements": [ { … } ] } ],
            "record": { "basic_profile": { … }, "experience": { … }, "crustdata_person_id": 6324687 }
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
| `changed` | a **scalar** field, for example `basic_profile.current_title` | the value becomes different from the last snapshot |
| `added` | an **array** field, for example `certifications`, `honors` | a new element appears in the array |
| `>`, `<`, `=`, `!=`, `=>` (≥), `=<` (≤) | a scalar, or a predicate on an array element | the comparison flips from false to true, e.g. `professional_network.connections => 500` |

> [!NOTE]
>
> Crustdata writes "greater-than-or-equal" as **`=>`** and "less-than-or-equal"
> as **`=<`**, not `>=` / `<=`. Those reversed forms return `unknown operator`.

`value` is required for the comparison operators and omitted for `changed` and `added`.

Combine leaves with a group node, `{ "op": "and" | "or", "conditions": [ … ] }`, to watch several signals at once. An `or` group fires if **any** child fires; an `and` group fires only when **all** conditions hold and at least one just became true. Groups nest.

### Tell elements apart with `keys`

A bare `added` fires on **any** new element in the array. Crustdata identifies
an element of `experience.employment_details.current` by its `position_id`, and a
promotion or a role change at the same employer gets a fresh `position_id`. The
new title reads as a new element, so the watch fires and you pay for it.

Add `keys` to the leaf to name the fields that identify an element instead:

```json theme={"theme":"vitesse-black"}
{
  "field": "experience.employment_details.current",
  "type": "added",
  "keys": ["crustdata_company_id", "name"]
}
```

The watch now fires only on an element whose `crustdata_company_id` and whose
`name` are both new to the watch. A second title at an employer it has already
seen stays silent. A move to a new employer still fires.

**Each entry is one identity, and any match counts.** The example gives two
entries, `crustdata_company_id` and `name`, and an element is already known if
either one matches. Two entries beat one here, because a company id is not always
resolved when a job first appears, and `name` covers most of those elements.

Nest an entry to build a composite identity.
`[["crustdata_company_id", "title"], ["name", "title"]]` identifies an element by
company and title, and falls back to name and title when the company id is
missing. An entry cannot identify an element when any field in that entry is
null.

> [!WARNING]
>
> **The loosest entry wins.** The watch matches the entries as a union, so the
> bare `name` entry defeats the composite in
> `[["crustdata_company_id", "title"], ["name"]]`: any element whose name the
> watch has seen is already known, so the composite never applies. Give a
> fallback entry the same fields as the entry it backs up.

> [!WARNING]
>
> **A return to a former employer stays silent.** A watch remembers every
> identity it has ever seen on the array, so a person who leaves an employer and
> rejoins it later does not fire again. This is deliberate. A person's `current`
> employment can go missing for one run and come back, and firing on that would
> bill you for a move that never happened.

> [!NOTE]
>
> `keys` is valid only with `added`, and it names fields of the array's own
> elements. `track` is fixed at creation, so you cannot add `keys` to a watch
> that already runs. Create a new watch instead.

`keys` works on any array of objects, not only employment. Key
`education.schools` on `school` to stay silent on a second degree at the same
school. An array of plain strings has no child fields to name, so `keys` on
`skills.professional_network_skills` returns `400`.

### Common person signals

Examples only. A person profile has **200+ addressable fields**, and you can track any of them: any scalar with `changed`, any array with `added`.

| Signal | `field` | `type` |
| - | - | - |
| Started a new job | `experience.employment_details.current` | `added` |
| Title changed | `basic_profile.current_title` | `changed` |
| Headline changed | `basic_profile.headline` | `changed` |
| Relocated | `basic_profile.location.raw` | `changed` |
| New certification | `certifications` (entitlement required) | `added` |
| New award or honor | `honors` | `added` |
| New education or degree | `education.schools` | `added` |
| New skill listed | `skills.professional_network_skills` | `added` |
| Connection count changed | `professional_network.connections` | `changed` |

A bare `added` on `experience.employment_details.current` fires on a promotion as
well as on a move, because both arrive as a new element. Add
[`keys`](#tell-elements-apart-with-keys) to fire on the employer change only.

> [!NOTE]
>
> `field` paths address the same profile structure the Enrich API returns, so
> browse the full set of trackable fields in the
> [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/reference.md) reference. `changed`
> requires a **scalar** path and `added` an **array** path. Mixing them returns a
> `400`: `"changed"` on the array `experience.employment_details.current` is
> rejected, and you want `basic_profile.current_title` instead.

## `track` and `fields` are different

Two independent knobs, and the distinction matters:

| Key | Controls | Answers |
| - | - | - |
| `track` | **When** the watch fires | *"What change do I want to be notified about?"* |
| `fields` | **What** the notification delivers | *"What data about the person do I want in the payload?"* |

Set them independently. Track one field but deliver many, watching for a title change yet receiving the full employment history and education, or track many and deliver few.

> [!WARNING]
>
> **`fields` defaults to a minimal projection.** Omit `fields` and the delivered
> `record` contains only `basic_profile` and `social_handles`.
>
> The field you are *tracking* is **not** automatically added to the payload. The
> fired `changes` array always tells you exactly what moved, but to get the
> surrounding profile data in `record`, request it in `fields`.

`fields` does **not** affect pricing. You are charged per notification at your chosen [data-freshness tier](#data-freshness), 5 credits at the default, no matter how many field groups you deliver. There is no wildcard: to receive the complete record, list every field group your key is entitled to. The delivered `record` uses the **same schema as [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/reference.md)**, with identical field-group names and nesting.

> [!WARNING]
>
> Some groups require a field-level entitlement on your key, `certifications`
> among them. Requesting one your key cannot access fails the create with `403`,
> not a quiet empty payload:
>
> ```json 403 Forbidden theme={"theme":"vitesse-black"}
> {
>   "error": {
>     "type": "permission_error",
>     "message": "Not entitled to fields: certifications. Contact support to request access.",
>     "metadata": []
>   }
> }
> ```
>
> The check covers `track` as well as `fields`, so a gated group cannot be used
> as a trigger either until your key is entitled to it. A field you name in
> [`keys`](#tell-elements-apart-with-keys) needs the same entitlement, and the
> watch is refused rather than keyed on a field it cannot read.

## Choosing the entities

`entities` maps an **identifier type** to a list of values. A single watch holds up to **10,000 people**.

| Accepted identifier keys | Example value |
| - | - |
| `professional_network_profile_urls` | `"https://www.linkedin.com/in/sherryrobinson"` |

```json theme={"theme":"vitesse-black"}
{ "entities": { "professional_network_profile_urls": ["https://www.linkedin.com/in/sherryrobinson"] } }
```

## Data freshness

`config.refresh_frequency_days` sets **how fresh the tracked data is kept**, meaning how recently each tracked field is refreshed before a run compares it against the last snapshot. It is independent of `trigger.every_hours`: `every_hours` is how often the watch *checks and notifies*; `refresh_frequency_days` is how up to date the data it checks against is, which is what decides how quickly a real change is detected.

Fresher data is priced higher. The per-notification charge is tiered by the freshness you choose:

| `refresh_frequency_days` | Credits per changed person |
| - | - |
| not set / `30` (default) | 5 |
| `14` | 10 |
| `7` | 20 |
| `3` | 50 |
| `1` | 150 |

The accepted range is **1 to 30**. A value between two tiers is billed at the fresher, more expensive tier. Only fields backed by a refresh asset can be kept fresh this way; if a tracked field has no backing asset, the create is rejected, so drop that field or the cadence.

## Delivery channels

Add one or more channels to `notifications` and every change fans out to all of them.

```json Webhook theme={"theme":"vitesse-black"}
{ "type": "webhook", "url": "https://your-app.com/webhooks/crustdata", "headers": { "X-Watch-Name": "key-contacts" } }
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
  --url https://api.crustdata.com/watch/person/50991 \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "config": {
      "trigger": { "type": "interval", "every_hours": 24 },
      "payload_delivery_type": "link"
    }
  }'
```

Every channel on the watch gets the same link, and the run-summary endpoint serves the same file. Read `metadata.payload_delivery.type` rather than testing for `results`: a `link` watch falls back to an inline body if the file cannot be written. See [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md).

***

## Edit the watched list any time

Unlike a saved search, an Entity Watcher's list is **mutable**. Add or remove people as your pipeline or contact list changes, without recreating the watch. `PATCH` the watch with a new `entities` object:

```bash Request theme={"theme":"vitesse-black"}
curl --request PATCH \
  --url https://api.crustdata.com/watch/person/50991 \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "entities": {
      "professional_network_profile_urls": [
        "https://www.linkedin.com/in/sherryrobinson",
        "https://www.linkedin.com/in/williamhgates"
      ]
    }
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
  "id": 50991,
  "status": "active",
  "entities": {
    "professional_network_profile_urls": [
      "https://www.linkedin.com/in/sherryrobinson",
      "https://www.linkedin.com/in/williamhgates"
    ]
  }
}
```

Newly added people are **baselined silently** on the next run. They establish their "before" snapshot first, so adding someone never fires a spurious notification. You can also `PATCH` `status` (`active` / `paused`), `config`, and `notifications`.

> [!WARNING]
>
> A watch's `track` and `fields` are fixed once created. `PATCH`ing either
> returns `400`. To change what you watch for, create a new watch.

## Smoke-test your webhook

Before a real change ever fires, push **one sample notification** through a watch to verify your receiver end to end: signature check, JSON parsing, routing, without waiting for a person to actually move. The test delivers the **exact envelope a real run sends**, same shape and same signature headers, flagged with `metadata.test: true`. It runs no diff, records no snapshot, **costs no credits**, and persists nothing.

```
POST https://api.crustdata.com/watch/person/{watch_id}/test
```

All three body fields are optional:

| Field | Type | Description |
| - | - | - |
| `notification_endpoint` | string | Deliver this one test to a URL you control instead of the watch's configured channels, handy with a request-inspection service. Must be a **public** `http(s)` URL; endpoints resolving to private, loopback, or link-local addresses are rejected. |
| `fields` | string\[] | Project the sample `record` to a specific field set for this test. Defaults to the watch's own `fields`. |
| `count` | integer | Deliver `N` sample people (`1` to `25`) in one envelope to exercise multi-record handling. Each gets a distinct `crustdata_person_id`. Default `1`. |

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/watch/person/50991/test \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "notification_endpoint": "https://your-server.example.com/webhook",
    "fields": ["basic_profile", "experience"]
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

Your receiver gets this `POST`. It is the shape of a real notification: only `metadata.test: true` and the **sample values** (`"sample_text"`, `1234`, …) mark it as a test. The `changes` array below is abbreviated to two entries; the full array mirrors your watch's `track`.

```http Request headers theme={"theme":"vitesse-black"}
Content-Type: application/json
x-api-version: 2025-11-01
x-crustdata-watch-id: 50991
x-crustdata-event-id: ntf_test_1785211467
x-crustdata-signature: t=1785211468,v1=<hex-hmac-sha256>
```

```json Webhook POST body theme={"theme":"vitesse-black"}
{
  "metadata": {
    "watch_id": 50991,
    "kind": "entity",
    "dataset": "person",
    "api_version": "2025-11-01",
    "run_id": 1785211467,
    "notification_id": "ntf_test_1785211467",
    "delivered_at": "2026-07-28T04:04:27.667425Z",
    "summary": { "delivered": 1, "total_count": 1, "records_searched": 1, "max_results_per_run": 1000, "truncated": false, "records_matched": 1 },
    "test": true
  },
  "results": [
    {
      "changes": [
        {
          "field": "experience.employment_details.current",
          "type": "added",
          "new_elements": [
            {
              "name": "sample_text",
              "title": "sample_text",
              "start_date": "sample_text",
              "is_default": true,
              "crustdata_company_id": 1234,
              "seniority_level": "sample_text"
            }
          ]
        },
        { "field": "basic_profile.current_title", "type": "changed", "value": null, "from": null, "to": "sample_text" }
      ],
      "record": {
        "crustdata_person_id": 6324687,
        "basic_profile": {
          "name": "sample_text",
          "headline": "sample_text",
          "first_name": "sample_text",
          "last_name": "sample_text",
          "current_title": "sample_text",
          "summary": "sample_text",
          "location": { "city": "sample_text", "state": "sample_text", "country": "sample_text" }
        },
        "experience": {
          "employment_details": {
            "current": [
              { "name": "sample_text", "title": "sample_text", "start_date": "sample_text", "is_default": true }
            ],
            "past": [
              { "name": "sample_text", "title": "sample_text", "start_date": "sample_text", "end_date": "sample_text" }
            ]
          }
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
> production structure without real person data. A `changed` scalar reports
> `{ "type": "changed", "value": …, "from": …, "to": … }` (`value` is the
> threshold target for `>`/`<` operators, `null` for a plain `changed`); an
> `added` array reports `{ "type": "added", "new_elements": [ … ] }`.

Pass `"count": 3` to receive three sample people in one envelope, with distinct `crustdata_person_id`s and `summary.delivered: 3`, so you can exercise how your receiver iterates `results`.

> [!NOTE]
>
> The signature is computed exactly as for a real notification: HMAC-SHA256 over
> `<timestamp>.<raw-body>` keyed by your API key, delivered as
> `x-crustdata-signature: t=<unix>,v1=<hex>`. A test that verifies here verifies
> real deliveries.

## Manage your watches

| Action | Request |
| - | - |
| List your watches | `GET /watch/person?status=active&limit=50&offset=0` |
| Get one | `GET /watch/person/{id}` |
| Pause / resume | `PATCH /watch/person/{id}` with `{ "status": "paused" }` |
| Add or remove entities | `PATCH /watch/person/{id}` with a new `entities` |
| Delete | `DELETE /watch/person/{id}` → `204` |
| Run history | `GET /watch/person/{id}/runs?limit=20` |
| One run, with records | `GET /watch/person/{id}/runs/{run_id}/summary` |

Full request and response for each, verified live:

> [accordion] List your watches: GET /watch/person
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url 'https://api.crustdata.com/watch/person?status=active&limit=50&offset=0' \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> [
>   {
>     "id": 50991,
>     "kind": "entity",
>     "dataset": "person",
>     "status": "active",
>     "entities": {
>       "professional_network_profile_urls": ["https://www.linkedin.com/in/sherryrobinson"]
>     },
>     "track": { "type": "added", "field": "experience.employment_details.current" },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 }, "max_results_per_run": 25 },
>     "notifications": [{ "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" }],
>     "created_at": "2026-09-03T07:36:16.320381Z",
>     "last_run_at": "2026-09-03T07:36:28.598964Z"
>   }
> ]
> ```
>
> Returns an array of your person watches. Filter with `status`, page with `limit` and `offset`.

> [accordion] Get one watch: GET /watch/person/\{id}
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url https://api.crustdata.com/watch/person/50991 \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>   "id": 50991,
>   "kind": "entity",
>   "dataset": "person",
>   "api_version": "2025-11-01",
>   "config_version": "2025-11-01",
>   "status": "active",
>   "entities": {
>     "professional_network_profile_urls": ["https://www.linkedin.com/in/sherryrobinson"]
>   },
>   "track": { "type": "added", "field": "experience.employment_details.current" },
>   "fields": null,
>   "config": {
>     "trigger": { "type": "interval", "every_hours": 24 },
>     "max_results_per_run": 25,
>     "expires_at": null,
>     "preferred_hour": null,
>     "refresh_frequency_days": 30,
>     "payload_delivery_type": "inline"
>   },
>   "notifications": [{ "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" }],
>   "created_at": "2026-09-03T07:36:16.320381Z",
>   "last_run_at": "2026-09-03T07:36:28.598964Z"
> }
> ```
>
> `last_run_at` is `null` until the baseline run completes, then carries the most recent run's timestamp.

> [accordion] Pause or resume: PATCH status
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request PATCH \
>   --url https://api.crustdata.com/watch/person/50991 \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{ "status": "paused" }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> { "id": 50991, "status": "paused" }
> ```
>
> A paused watch stops running until you resume it. Send `{ "status": "active" }` to resume.

> [accordion] Delete a watch: DELETE /watch/person/\{id}
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request DELETE \
>   --url https://api.crustdata.com/watch/person/50991 \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> Returns `204 No Content`. Deletion is terminal: the watch cannot be resumed.

> [accordion] Read a run's counters: GET /watch/person/\{id}/runs
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url 'https://api.crustdata.com/watch/person/50991/runs?limit=20' \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>   "runs": [
>     {
>       "id": 368092,
>       "started_at": "2026-10-09T10:42:43.467266Z",
>       "completed_at": "2026-10-09T10:42:44.588903Z",
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
> This is the baseline run of a watch created with **two** person profile URLs, one of
> which matches no record Crustdata holds. Read it left to right: `records_searched: 2`
> is the list you sent, `records_matched: 1` is the part of it that resolved, and
> `credits_deducted: 0` is the baseline being free. Read the counters to catch that
> second URL: no other field reports an identifier that matched nothing.

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

Worked recipes you can copy, paste, and adapt. Each one is a full working request, verified against the live API. Swap the notification channel for your own. For every trackable `field` path, see the [Person Enrich reference](https://docs.crustdata.com/person-docs/enrichment/reference.md).

> [accordion] Catch any career move on a roster
>
> Group the two signals that both mean "they moved": a new current employment, or a title change at the same one. An `or` group fires on either.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": {
>       "professional_network_profile_urls": [
>         "https://www.linkedin.com/in/sherryrobinson",
>         "https://www.linkedin.com/in/williamhgates"
>       ]
>     },
>     "track": {
>       "op": "or",
>       "conditions": [
>         { "field": "experience.employment_details.current", "type": "added" },
>         { "field": "basic_profile.current_title", "type": "changed" }
>       ]
>     },
>     "fields": ["basic_profile", "experience"],
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > `experience.employment_details.current` is an array, so it takes `added`.
> > `basic_profile.current_title` is a scalar, so it takes `changed`. Swapping them
> > returns `400`.
> >
> > This recipe fires on a promotion too, because a new title at the same employer
> > arrives as a new element. The next recipe adds `keys` to stop that.

> [accordion] Fire on a new employer, not a promotion
>
> Key the employment array on the employer instead of the position, so a promotion
> or a reorg at the same company stays silent. See
> [Tell elements apart with `keys`](#tell-elements-apart-with-keys) for how the two
> entries behave.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": {
>       "professional_network_profile_urls": [
>         "https://www.linkedin.com/in/sherryrobinson",
>         "https://www.linkedin.com/in/williamhgates"
>       ]
>     },
>     "track": {
>       "field": "experience.employment_details.current",
>       "type": "added",
>       "keys": ["crustdata_company_id", "name"]
>     },
>     "fields": ["basic_profile", "experience"],
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 55724,
>     "kind": "entity",
>     "dataset": "person",
>     "status": "active",
>     "track": {
>         "field": "experience.employment_details.current",
>         "type": "added",
>         "keys": ["crustdata_company_id", "name"]
>     },
>     "fields": ["basic_profile", "experience"],
>     "config": {
>         "trigger": { "type": "interval", "every_hours": 24 },
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

> [accordion] Watch for a new credential
>
> Group the array signals that mean someone added something to their record. Any one of them fires.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "professional_network_profile_urls": ["https://www.linkedin.com/in/sherryrobinson"] },
>     "track": {
>       "op": "or",
>       "conditions": [
>         { "field": "honors", "type": "added" },
>         { "field": "education.schools", "type": "added" },
>         { "field": "skills.professional_network_skills", "type": "added" }
>       ]
>     },
>     "fields": ["basic_profile", "honors", "education", "skills"],
>     "config": { "trigger": { "type": "interval", "every_hours": 168 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!WARNING]
> >
> > `certifications` belongs in this group, but it needs a field-level entitlement
> > on your key, and the check applies to `track` as well as to `fields`. Adding
> > `{ "field": "certifications", "type": "added" }` on a key without the
> > entitlement fails the create with `403` and `Not entitled to fields:
> >           certifications. Contact support to request access.`

> [accordion] Watch a headline for positioning changes
>
> A headline moves before a title does. It is the earliest public signal that someone is repositioning, looking, or has taken on something new.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "professional_network_profile_urls": ["https://www.linkedin.com/in/williamhgates"] },
>     "track": { "field": "basic_profile.headline", "type": "changed" },
>     "fields": ["basic_profile"],
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "slack", "webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX" } ]
>   }'
> ```

> [accordion] Watch for a relocation
>
> `basic_profile.location.raw` is a scalar, so `changed` fires when someone's stated location moves. Useful for territory assignment and for visa or right-to-work workflows.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "professional_network_profile_urls": ["https://www.linkedin.com/in/sherryrobinson"] },
>     "track": { "field": "basic_profile.location.raw", "type": "changed" },
>     "fields": ["basic_profile"],
>     "config": { "trigger": { "type": "interval", "every_hours": 168 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Watch for a new skill
>
> A skills array grows when someone starts working with something new, which is a quieter signal than a job change and often earlier.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "professional_network_profile_urls": ["https://www.linkedin.com/in/sherryrobinson"] },
>     "track": { "field": "skills.professional_network_skills", "type": "added" },
>     "fields": ["basic_profile", "skills"],
>     "config": { "trigger": { "type": "interval", "every_hours": 168 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Fire once on crossing an audience threshold
>
> A comparison operator fires on the transition rather than on every fluctuation, so it is the right choice for a noisy counter.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "professional_network_profile_urls": ["https://www.linkedin.com/in/williamhgates"] },
>     "track": { "field": "professional_network.connections", "type": "=>", "value": 500 },
>     "fields": ["basic_profile", "professional_network"],
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!TIP]
> >
> > Use `changed` here instead and the watch fires on every run where the count
> > moves at all, which for an active profile is most of them.

> [accordion] Detect a move faster with a fresher tier
>
> `refresh_frequency_days: 7` keeps the tracked fields refreshed weekly, so a real job change surfaces within days rather than within the month. It costs 20 credits per notification instead of 5.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "professional_network_profile_urls": ["https://www.linkedin.com/in/sherryrobinson"] },
>     "track": { "field": "experience.employment_details.current", "type": "added" },
>     "fields": ["basic_profile", "experience"],
>     "config": {
>       "trigger": { "type": "interval", "every_hours": 24 },
>       "refresh_frequency_days": 7
>     },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > Raising `every_hours` does not make a change surface sooner on its own. The
> > watch can only report what the last refresh saw, so freshness is the knob that
> > controls detection latency, and the cadence is the knob that controls when you
> > hear about it.

> [accordion] Deliver the full person record
>
> There is no wildcard, so list every field group your key is entitled to. This mirrors the Person Enrich `fields` set.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "professional_network_profile_urls": ["https://www.linkedin.com/in/sherryrobinson"] },
>     "track": { "field": "experience.employment_details.current", "type": "added" },
>     "fields": [
>       "basic_profile", "professional_network", "social_handles", "experience",
>       "education", "skills", "honors", "contact", "dev_platform_profiles"
>     ],
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > `certifications` is left out here because it needs a field-level entitlement.
> > Add it once your key has one; without it the create returns `403`.

> [accordion] Deliver a large run as a linked file
>
> A watch over thousands of people can outgrow what your receiver accepts. Raise the per-run cap and switch the payload to a link.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "entities": { "professional_network_profile_urls": ["https://www.linkedin.com/in/sherryrobinson"] },
>     "track": { "field": "experience.employment_details.current", "type": "added" },
>     "fields": ["basic_profile", "experience"],
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

A person entity watch answers every failure the same way, whether you are creating a watch, editing the watched list, testing delivery, or reading run history.

| Status | Type | Common causes |
| - | - | - |
| `400` | `invalid_request` | An `entities` key that is not one of the accepted identifier types, a `track` leaf missing its `field` or `type`, `config` or `notifications` left out, `config.trigger.every_hours` below `1`, a `refresh_frequency_days` no tracked field can be refreshed at, a missing or unsupported `x-api-version`, or a `PATCH` to a key fixed at creation. `keys` adds two: `track: 'keys' is only valid with 'added', not 'changed'`, and `track: '<path>': 'keys' must be a non-empty list of fields or field groups`. A `keys` entry naming a field the array's elements do not carry answers `track: <path>.<field>` with `metadata[0].type` set to `unknown_field`. |
| `401` | `unauthorized` | Missing or invalid API key. |
| `403` | `permission_error` | Your key is not entitled to a field group you named in `track` or `fields`, or to the person dataset. |
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
| First run (baseline snapshot, sample of up to 5 people) | **Free** |
| Each changed person delivered, at the default 30-day freshness | **5** |
| Each changed person delivered, at `refresh_frequency_days: 1` | **150** |

`fields` does not change the price, and neither does `every_hours`. A run where nothing changed costs nothing. See [Data freshness](#data-freshness) for the full tier table and [Pricing](https://docs.crustdata.com/general/pricing.md) for the catalog.

## What to do next

* **Find people instead of tracking them**: use the [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md) to deliver people who newly match a filter.
* **Browse trackable fields**: see the [Person Enrich reference](https://docs.crustdata.com/person-docs/enrichment/reference.md) for every `field` path.
* **Read a profile on demand**: use [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/introduction.md) when you want current state rather than change.
* **Choose how records travel**: see [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md) for inline versus linked NDJSON.


## Related topics

- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [Pricing](https://docs.crustdata.com/general/pricing.md)
- [Data updates](https://docs.crustdata.com/general/data-updates.md)
- [Company Entity Watcher](https://docs.crustdata.com/watcher-docs/company/entity.md)
