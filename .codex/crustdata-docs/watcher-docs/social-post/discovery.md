> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Social Post Watcher

> Turn a post search into a recurring feed. A Social Post Watcher re-runs your filters on a schedule and delivers newly matching posts to a webhook, Slack, Google Chat, or email.

**Use this when** you want posts on a topic to keep arriving on their own: funding announcements in a market, launches from companies you sell to, or anything your buyers say publicly, with no manual re-running.

A Social Post Watcher turns a [Social Post Search](https://docs.crustdata.com/social-post-docs/indexed-search/introduction.md) filter into a recurring feed. Each run re-evaluates your filters and delivers only the **new** matching posts, so what arrives is movement rather than a repeated export.

Every request goes to the same endpoint:

```
POST https://api.crustdata.com/watch/social_post/search
```

> [!NOTE]
>
> Replace `YOUR_API_KEY` in each example with your actual API key. All
> requests require the `x-api-version: 2025-11-01` header.

### Request body

| Parameter | Type | Required | Default | Description |
| - | - | - | - | - |
| `filters` | object | Yes\* | - | A single filter condition or a nested `and`/`or` group, identical to [Social Post Search](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md#filter-grammar). |
| `realtime_filters` | object | No | - | What the live search is asked for on a [realtime watch](#realtime-watches). Requires `config.is_realtime`. |
| `narrowing_filters` | object | No | - | Narrows a [realtime watch](#realtime-watches) on the author behind each post, keyed by dataset. Requires `config.is_realtime`. |
| `config` | object | Yes | - | Schedule and per-run caps. See [config](#config) below. |
| `notifications` | object\[] | Yes | - | Delivery channels. May be `[]` for a pull-only watch you read from the run endpoints. |
| `fields` | string\[] | No | standard set | Dot-path fields to include in each delivered post. |
| `sorts` | object\[] | No | - | Delivery order within a run. Each has `field` and `order` (`asc` or `desc`). |
| `on` | string\[] | No | `["added"]` | Which membership transitions notify you. Only `added` is supported today. |
| `overflow_policy` | string | No | `redeliver` | What happens to matches beyond `max_results_per_run`. `redeliver` holds them for a later run, `drop` discards them. |

\* Required on an ordinary watch and refused on a realtime one, where
`realtime_filters` is what the watch runs on and `narrowing_filters` narrows the
result.

#### `config`

| Parameter | Type | Required | Default | Description |
| - | - | - | - | - |
| `trigger` | object | Yes | - | `{ "type": "interval", "every_hours": N }`. How often the watch runs, for example `1`, `6`, `24`, `168`. |
| `max_results_per_run` | integer | No | `25` | Posts delivered per run, `1` to `10000`. A value above `1000` needs `payload_delivery_type` `"link"`. The baseline run is always capped at 5. |
| `preferred_hour` | integer | No | - | Hour of day in UTC (`0` to `23`) to prefer for the run. |
| `expires_at` | string | No | - | Auto-expire date, `YYYY-MM-DD`. The watch stops running after it. |
| `payload_delivery_type` | string | No | `"inline"` | `"inline"` or `"link"`. See [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md). |
| `is_realtime` | boolean | No | `false` | Run the search against a live search rather than the index. Requires `realtime_filters`, and forces `every_hours` to `24` or more. See [Realtime discovery watches](#realtime-watches). |

### Response body

Create returns the whole watch, so you can confirm what was stored before the baseline run starts.

| Field | Type | Description |
| - | - | - |
| `id` | integer | The watch's id. Use it on every management and run-history path. |
| `kind` | string | `"discovery"`. |
| `dataset` | string | `"social_post"`. |
| `status` | string | `active`, `paused`, `suspended`, `expired`, or `cancelled`. |
| `filters` | object | The saved filter, as sent. `null` on a realtime watch. |
| `narrowing_filters` | object or null | The saved narrowing blocks, as sent. `null` unless the watch narrows. |
| `sorts` | array or null | The saved sort rules. |
| `fields` | array or null | The saved projection. `null` means the standard set. |
| `config` | object | The stored schedule and caps. |
| `notifications` | object\[] | The configured channels. A stored channel secret is never returned. |
| `created_at` | string | When the watch was created. |
| `last_run_at` | string or null | When the watch last ran. `null` until the baseline run completes. |
| `last_notified_at` | string or null | When the watch last delivered a notification. |
| `notifications_count` | integer | All-time count of posts this watch has delivered. |
| `credits_consumed` | number | All-time credits this watch has spent. |

### Rate limits and credits

**Pricing:** the first run is a free baseline (a sample of up to 5
matches), then `2 credits per new post` delivered, or
`150 credits` at the
[1-day SLA](#realtime-watches). A run that finds
nothing new costs nothing.
For your own price per post, open the
[watch builder](https://app.crustdata.com/watch?type=discovery\&dataset=social_post\&sla=30) in the dashboard.

* **Rate limit:** 10 requests per minute on `/watch/social_post/search`. Each watch path keeps its own budget. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).
* **Baseline limit:** 500,000 posts. A broader filter is refused at creation, before anything runs.
* **Watched filter:** fixed once created. To change what you watch for, create a new watch.

***

## Your first watch: a topic, checked every six hours

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/watch/social_post/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "filters": {
      "op": "and",
      "conditions": [
        { "field": "text", "type": "(.)", "value": "series B funding round" },
        { "field": "actor.actor_type", "type": "=", "value": "company" },
        { "field": "engagement.total_reactions", "type": "=>", "value": 50 }
      ]
    },
    "config": { "trigger": { "type": "interval", "every_hours": 6 } },
    "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
    "id": 52242,
    "kind": "discovery",
    "dataset": "social_post",
    "api_version": "2025-11-01",
    "config_version": "2025-11-01",
    "status": "active",
    "filters": {
        "op": "and",
        "conditions": [
            { "field": "text", "type": "(.)", "value": "series B funding round" },
            { "field": "actor.actor_type", "type": "=", "value": "company" },
            { "field": "engagement.total_reactions", "type": "=>", "value": 50 }
        ]
    },
    "on": ["added"],
    "sorts": null,
    "fields": null,
    "config": {
        "trigger": { "type": "interval", "every_hours": 6 },
        "max_results_per_run": 25,
        "expires_at": null,
        "preferred_hour": null,
        "payload_delivery_type": "inline"
    },
    "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ],
    "created_at": "2026-09-17T10:00:59.371614Z",
    "last_run_at": null,
    "last_notified_at": null,
    "notifications_count": 0,
    "credits_consumed": 0
}
```

> [!NOTE]
>
> Response trimmed for clarity.

That watch delivers company posts about a Series B that cleared 50 reactions, checked every six hours. `"fields": null` means the standard post payload, and `"filters"` comes back exactly as you sent it.

### Understanding the response

* **`id`**: the handle for everything else. Pause, reconfigure, cancel, and read run history all take it.
* **`status`**: `active` the moment the watch is created. A run is `suspended` by the system rather than half-delivered when your balance is too low.
* **`last_run_at`**: `null` until the baseline run completes, usually within seconds.
* **`filters`, `sorts`, `fields`, `on`**: echoed back exactly as stored. These are fixed at creation; `status`, `config`, and `notifications` are the mutable parts.

### How a watch runs

**1. Create the watch**

`POST` your `filters`, a `config`, and one or more `notifications` channels.
The response returns the whole watch, including its `id`.

**2. Baseline run (free)**

The first run happens within seconds and delivers a **free sample of up to 5
posts** so you can confirm the setup and payload shape. No credits are
charged. Behind that sample, the baseline reads your entire match set to
record what already exists.

**3. Recurring runs**

On the schedule you set (`every_hours`), the watcher re-runs your filters and
delivers posts that are **new since the previous run**, up to
`max_results_per_run`. You are charged 2 credits per post delivered.

> [!NOTE]
>
> **Baseline limit: 500,000 posts.** The baseline run only *delivers* 5, but it
> *reads* your entire match set to record what already exists. That read is
> capped at 500,000, and we check it when you create the watch, so a broader
> filter comes back `400` and you narrow it before anything runs. Later runs
> deliver whatever newly matches, bounded by `config.max_results_per_run`.

### What a notification looks like

When a run has matches, we `POST` this body to each channel. Posts arrive under `results.added`, each in the post record shape projected to the watch's `fields`. This one came from a test send, so it carries `metadata.test`; a scheduled run sends the same body without it.

```json Delivery body theme={"theme":"vitesse-black"}
{
  "metadata": {
    "watch_id": 52243,
    "kind": "discovery",
    "dataset": "social_post",
    "api_version": "2025-11-01",
    "run_id": 1789639668721276,
    "notification_id": "ntf_test_1789639668721276_0673529a69e8",
    "delivered_at": "2026-09-17T10:07:48.721301+00:00",
    "summary": { "delivered": 1, "total_count": 2582, "records_searched": 2582, "max_results_per_run": 25, "truncated": true, "records_stale": 0 },
    "payload_delivery": { "type": "inline" },
    "test": true
  },
  "results": {
    "added": [
      {
        "backend_urn": "urn:li:activity:7504048671777263616",
        "share_url": "https://www.linkedin.com/posts/indianstartupnews_uber-investment-startup-activity-7504048671777263616-XBJ5",
        "text": "Indian fleet management startup Carrum Mobility has raised $10 million (about Rs 96 crore) from Uber as part of its Series B funding round...",
        "date_posted": "2026-09-11T14:18:10Z",
        "post_type": "original",
        "has_video": true,
        "hashtags": ["uber", "investment", "startup", "indianstartupnews"],
        "actor": {
          "actor_type": "company",
          "crustdata_entity_id": 721022,
          "name": "Indian Startup News",
          "headline": "765,834 followers",
          "industry": "Software Development",
          "location": { "raw": "Bhilai, Chhattisgarh, India", "state": "Chhattīsgarh", "country": "IND" },
          "professional_network_url": "https://www.linkedin.com/company/indianstartupnews/posts"
        },
        "engagement": {
          "total_reactions": 466,
          "total_comments": 5,
          "num_shares": 2,
          "reactions_by_type": { "LIKE": 462, "EMPATHY": 4, "PRAISE": 0, "INTEREST": 0, "APPRECIATION": 0, "ENTERTAINMENT": 0 }
        }
      }
    ]
  }
}
```

> [!NOTE]
>
> Response trimmed for clarity: one post is shown, and its `text` is cut.

`summary.truncated` is `true` when the run matched more posts than `max_results_per_run` allowed. With the default `overflow_policy: "redeliver"` the overflow is held back and arrives on a later run rather than being lost.

Use a test send to wire a receiver before a scheduled run fires. It builds the same body against your current match set, marks it with `metadata.test`, and delivers nothing to your credit balance.

***

## Realtime watches

A discovery watch reads the Crustdata index. A **realtime** watch searches the web
live on every run instead, so it finds posts as they appear rather than waiting for
our index to pick them up.

Turn one on with `config.is_realtime: true`. The watch then takes two filter trees
instead of one.

### The contract

| Key | When you send it | Who answers it | What it holds |
| - | - | - | - |
| `config.is_realtime` | To make the watch realtime | Nothing. It is the switch. | `true`. No other value and no other key turns a watch realtime. |
| `realtime_filters` | Required once `is_realtime` is `true` | The live search | Only the post fields listed below. |
| `narrowing_filters` | Optional | The index of the dataset you name | One block, one of `person` or `company`. The author, in that dataset's own grammar. |
| `filters` | Required on any other watch, refused here | The Crustdata index | Nothing, on a realtime watch. |

The live search runs first. `narrowing_filters` then checks the author behind each
post it returned, so it can only drop posts. It never adds any.

Send `realtime_filters` without the flag and the create fails. Neither can change
afterwards: a `PATCH` carrying `is_realtime`, `realtime_filters`, or
`narrowing_filters` is refused, so you make a new watch instead.

> [!WARNING]
>
> **`filters` is refused on a realtime watch.** It used to be where you put the
> conditions the live search could not answer, and that never worked: `filters`
> is asked of the post index, which has not yet seen a post the live
> search just found, so every result was dropped and the watch delivered nothing
> while reporting success. Send it now and you get a `400` telling you where the
> condition really goes.

### Filter fields the live post search accepts

These are the only field paths `realtime_filters` takes on a post watch. Anything
else, including `hashtags`, `post_type`, engagement counts, and the nested
`reactors.*` and `comments.*` conditions, belongs in `narrowing_filters` or
nowhere at all, as the next section explains.

**Asked of the search**

| Field | Operators | Values |
| - | - | - |
| `text` | `=` `(.)` | Free text keyword, and the search's main input. `=` matches exactly. |
| `date_posted` | `=>` | One of five windows: `now-24h`, `now-7d`, `now-1M`, `now-3M`, `now-1y`. |
| `actor.industry` | `=` `in` | An industry name. |

A multi-word keyword is quoted for you, so the words are matched together rather
than separately. Write a boolean yourself when you want control over it, for
example `"\"we are hiring\" OR \"join our team\""`.

**Checked on the posts that come back**

The live search has no facet for these, so the watch applies them to what it
returned rather than sending them out.

| Field | Operators | Values |
| - | - | - |
| `actor.actor_type` | `=` `!=` `in` `not_in` | `person` or `company`. |
| `actor.company_url` | `=` `!=` `in` `not_in` | A company profile URL. |
| `classification.category` | `=` `!=` `in` `not_in` | Your own category names. Each post is sorted into one of them. |
| `classification.intent` | `=` `!=` | One sentence describing what the post should be about. |

`classification.category` and `classification.intent` are read per post rather
than looked up, so they take your own words instead of a fixed vocabulary. A
category list sorts each post into one of your buckets; an intent sentence keeps
or drops the post whole.

You write the same values here as you do on an index watch, so `actor.industry` takes
the industry names
[Social Post Search](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md#filterable-fields)
takes.

### Tree shape

The live search takes an AND of filters, with OR only between values of one
filter, so `realtime_filters` accepts:

* A top-level `and` group of leaves, or a single bare leaf.
* An `or` group inside it only when every leaf names the **same field** and uses
  an include operator (`=`, `in`, `(.)`). Use it as a value list.
* No nested `and` groups.
* No `sorts` on the watch at all. A live search has no stable order.
* One keyword per watch.

### What goes in `narrowing_filters`

Conditions about the **author**. A post the live search just found was published
minutes ago, so the post index has never seen it and cannot answer anything about
it. The person or company who wrote it has existed for years and is indexed, so
that is what narrowing asks about:

```json theme={"theme":"vitesse-black"}
"narrowing_filters": {
  "person": {
    "op": "and",
    "conditions": [
      { "field": "experience.employment_details.current.title", "type": "(.)", "value": "Talent Acquisition" },
      { "field": "basic_profile.location.country", "type": "in", "value": ["United States"] }
    ]
  }
}
```

| Block | Asked of | Write it in | Matched on |
| - | - | - | - |
| `person` | The person index | [Person Search](https://docs.crustdata.com/person-docs/search/reference.md) grammar | The author's profile URL on the post |
| `company` | The company index | [Company Search](https://docs.crustdata.com/company-docs/search/reference.md) grammar | The company page that posted |

**Name one block.** A post watch may narrow on `person` or on `company`, and a
watch names whichever one its author condition is about. A post written by a
person carries no company page, and one written by a company page carries no
person, so pair the block with `actor.actor_type` in `realtime_filters` when you
want to be explicit about which kind of author you are after.

A block keeps the dataset's full search grammar, unlike `realtime_filters`: an `or`
across two different fields, nested groups, and every negation operator all work,
because an index answers it rather than the live search.

A block is a plain tree in its own dataset's vocabulary, so a person field inside
the `company` block is refused rather than resolved:

```
'basic_profile.location.country' is a person field, so it cannot be asked of the company block. Put it under 'narrowing_filters.person' instead.
```

**A post field the live search cannot ask has nowhere to go.** `hashtags`,
`post_type`, engagement counts, and the nested `reactors.*` and `comments.*`
conditions all describe the post, and no index holds the post yet:

```
realtime_filters: 'hashtags' is not something the live search can be asked for. There is nowhere else to put it: a social_post watch narrows only on person, company, and our index has never seen the record this search returns.
```

Keep a watch that needs one of those on the index tier, where `filters` answers
it. See [Filters from other datasets](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md).

> [!NOTE]
>
> **Leave `narrowing_filters` out and nothing is dropped.** Every post the live
> search returns is delivered.
>
> Send a block and it is checked against that dataset's index. A post whose
> author the index does not hold is dropped rather than delivered unchecked, so
> add a block when you would rather miss a post than deliver one nobody checked.

You cannot write one `or` spanning both keys. They are separate, which matches
what the watch can do: a post the live search never returned cannot be brought
back by a later stage.

### Limits

| | |
| - | - |
| How often it runs | Once a day at most. `config.trigger.every_hours` must be `24` or more. |
| How many posts it may follow | **No limit checked at creation.** The live post search pages through results instead of counting them, so there is no total to check your filters against. A broad watch is accepted and simply costs more, since each run bills per new post. Narrow it yourself. |
| What a post costs | 150 credits at the 1-day SLA, against 2 at the 30-day SLA an index watch runs on. The create response echoes `config.refresh_frequency_days: 1`. The first run is still a free sample of up to 5, and a run that finds nothing new costs nothing. See [Pricing](https://docs.crustdata.com/general/pricing.md). |
| What comes back | Only the fields a live post carries. Leave `fields` out and the create response lists them for you. |

### Realtime examples

> [accordion] A hiring keyword from the past week
>
> The live search handles the keyword, the window, and the author's industry.
> `actor.actor_type` is checked on the posts that come back, keeping company pages
> out of a feed meant to surface individual hiring managers. Nothing here needs the
> index, so the watch sends no `narrowing_filters` at all.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/social_post/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "text", "type": "(.)", "value": "we are hiring a solutions engineer" },
>         { "field": "date_posted", "type": "=>", "value": "now-7d" },
>         { "field": "actor.industry", "type": "in", "value": ["Software Development"] },
>         { "field": "actor.actor_type", "type": "=", "value": "person" }
>       ]
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 53061,
>     "kind": "discovery",
>     "dataset": "social_post",
>     "api_version": "2025-11-01",
>     "status": "active",
>     "filters": null,
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "text", "type": "(.)", "value": "we are hiring a solutions engineer" },
>             { "field": "date_posted", "type": "=>", "value": "now-7d" },
>             { "field": "actor.industry", "type": "in", "value": ["Software Development"] }
>         ]
>     },
>     "on": ["added"],
>     "sorts": null,
>     "fields": [
>         "backend_urn",
>         "share_urn",
>         "share_url",
>         "text",
>         "date_posted",
>         "has_video",
>         "hyperlinks",
>         "actor",
>         "engagement"
>     ],
>     "config": {
>         "trigger": { "type": "interval", "every_hours": 24 },
>         "max_results_per_run": 25,
>         "payload_delivery_type": "inline",
>         "is_realtime": true,
>         "refresh_frequency_days": 1
>     },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
> }
> ```
>
> Response trimmed to the keys under discussion. The keyword is multi-word, so it
> is quoted for you and the words are matched together.

> [accordion] Job-change announcements, filtered by intent
>
> `classification.intent` is read per post, so it takes a sentence rather than a
> value from a list. It is what separates a real announcement from a post that
> merely mentions one.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/social_post/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "text", "type": "(.)", "value": "starting a new position" },
>         { "field": "date_posted", "type": "=>", "value": "now-24h" },
>         { "field": "classification.intent", "type": "=", "value": "The post announces the author starting a new job." }
>       ]
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 52320,
>     "kind": "discovery",
>     "dataset": "social_post",
>     "status": "active",
>     "filters": null,
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "text", "type": "(.)", "value": "starting a new position" },
>             { "field": "date_posted", "type": "=>", "value": "now-24h" },
>             { "field": "classification.intent", "type": "=", "value": "The post announces the author starting a new job." }
>         ]
>     },
>     "config": {
>         "trigger": { "type": "interval", "every_hours": 24 },
>         "max_results_per_run": 25,
>         "payload_delivery_type": "inline",
>         "is_realtime": true,
>         "refresh_frequency_days": 1
>     },
>     "notifications": []
> }
> ```
>
> Response trimmed to the keys under discussion. `filters` is optional on a realtime
> watch, and comes back `null` when you leave it out.

> [accordion] Posts whose author is a person you care about
>
> The live search finds the posts. The `person` block then asks our person index
> about whoever wrote them, so you can filter on the author with ordinary person
> fields.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/social_post/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "text", "type": "(.)", "value": "we are hiring a solutions engineer" },
>         { "field": "date_posted", "type": "=>", "value": "now-7d" }
>       ]
>     },
>     "narrowing_filters": {
>       "person": {
>         "op": "and",
>         "conditions": [
>           { "field": "experience.employment_details.current.title", "type": "(.)", "value": "Head of Talent" }
>         ]
>       }
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 53062,
>     "kind": "discovery",
>     "dataset": "social_post",
>     "status": "active",
>     "filters": null,
>     "narrowing_filters": {
>         "person": {
>             "op": "and",
>             "conditions": [
>                 { "field": "experience.employment_details.current.title", "type": "(.)", "value": "Head of Talent" }
>             ]
>         }
>     },
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "text", "type": "(.)", "value": "we are hiring a solutions engineer" },
>             { "field": "date_posted", "type": "=>", "value": "now-7d" }
>         ]
>     },
>     "config": {
>         "trigger": { "type": "interval", "every_hours": 24 },
>         "max_results_per_run": 25,
>         "payload_delivery_type": "inline",
>         "is_realtime": true,
>         "refresh_frequency_days": 1
>     },
>     "notifications": []
> }
> ```
>
> Response trimmed to the keys under discussion. Write the author condition as a
> person field. `actor.title` in `realtime_filters` is refused, because the live
> search has no facet for it.

> [accordion] Posts from a company of a certain size
>
> A post written by a company page is narrowed through the `company` block, asked
> of the company index the same way.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/social_post/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "text", "type": "(.)", "value": "we are hiring a solutions engineer" },
>         { "field": "date_posted", "type": "=>", "value": "now-7d" }
>       ]
>     },
>     "narrowing_filters": {
>       "company": {
>         "op": "and",
>         "conditions": [
>           { "field": "headcount.total", "type": "=>", "value": 201 }
>         ]
>       }
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 53063,
>     "kind": "discovery",
>     "dataset": "social_post",
>     "status": "active",
>     "filters": null,
>     "narrowing_filters": {
>         "company": {
>             "op": "and",
>             "conditions": [
>                 { "field": "headcount.total", "type": "=>", "value": 201 }
>             ]
>         }
>     },
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "text", "type": "(.)", "value": "we are hiring a solutions engineer" },
>             { "field": "date_posted", "type": "=>", "value": "now-7d" }
>         ]
>     },
>     "config": {
>         "trigger": { "type": "interval", "every_hours": 24 },
>         "max_results_per_run": 25,
>         "payload_delivery_type": "inline",
>         "is_realtime": true,
>         "refresh_frequency_days": 1
>     },
>     "notifications": []
> }
> ```
>
> Response trimmed to the keys under discussion. A post carries one author id, and the
> watch reads `actor.actor_type` to know whether it points at a person or a company,
> so a person id can never match a company that happens to share the number.

### Realtime errors

Every failure is a `400` in the usual envelope. `error.metadata[].field` tells a
`realtime_filters` problem from a `narrowing_filters` one, and names the block.

| What you did | What comes back |
| - | - |
| `filters` on a realtime watch | `'filters' is the index tier's tree and cannot narrow a realtime watch...` |
| `narrowing_filters`, no `is_realtime` | `narrowing_filters needs config.is_realtime: true...` |
| `narrowing_filters` inside `config` | `narrowing_filters goes at the top level of the body, beside realtime_filters...` |
| `is_realtime: true`, no `realtime_filters` | `realtime_filters is required when config.is_realtime is true...` |
| `realtime_filters`, no `is_realtime` | `realtime_filters needs config.is_realtime: true...` plus `filters` now required |
| A post field the live post search cannot ask | `'<field>' is not something the live search can be asked for. There is nowhere else to put it...` |
| A `date_posted` bound outside the five windows | `Available lower bounds: now-24h, now-7d, now-1M, now-3M, now-1y.` |
| An `or` across two different fields | `An 'or' is available only across values of one field.` |
| A nested `and` group | `Nested 'and' groups are not available.` |
| `sorts` on a realtime watch | `The live search has no stable sort order.` |
| `every_hours` under `24` | `config.trigger.every_hours must be at least 24...` |
| `config.refresh_frequency_days`, any value | `config.refresh_frequency_days is not accepted on a discovery watch...` |
| An author condition in `realtime_filters` | `'person filters on a social_post watch' is not something the live search can be asked for. Move it under 'narrowing_filters.person'...` |
| A block other than `person` or `company` | `A social_post watch cannot narrow on <name>. It may narrow on: person, company...` |
| A person field inside the `company` block | `'<field>' is a person field, so it cannot be asked of the company block...` |
| `PATCH` carrying `is_realtime`, `realtime_filters`, or `narrowing_filters` | `config.<key> cannot be changed on a discovery watch. Create a new watch.` |

> [accordion] filters on a realtime watch
>
> ```json 400 theme={"theme":"vitesse-black"}
> {
>     "error": {
>         "type": "invalid_request",
>         "message": "'filters' is the index tier's tree and cannot narrow a realtime watch: it would be asked of an index that has never seen the record the live search just found, which drops every result. Put conditions the live search answers in 'realtime_filters', and conditions about the author or the hiring company in narrowing_filters, keyed by dataset.",
>         "metadata": [
>             {
>                 "field": "filters",
>                 "type": "extra_forbidden",
>                 "message": "'filters' is the index tier's tree and cannot narrow a realtime watch: it would be asked of an index that has never seen the record the live search just found, which drops every result. Put conditions the live search answers in 'realtime_filters', and conditions about the author or the hiring company in narrowing_filters, keyed by dataset."
>             }
>         ]
>     }
> }
> ```

> [accordion] A date window the live search does not offer
>
> ```json 400 theme={"theme":"vitesse-black"}
> {
>     "error": {
>         "type": "invalid_request",
>         "message": "realtime_filters: value 'now-14d' for 'date_posted' is not something the live search can be asked for. Available lower bounds: now-24h, now-7d, now-1M, now-3M, now-1y. There is nowhere else to put it: a social_post watch narrows only on person, company, and our index has never seen the record this search returns.",
>         "metadata": [
>             {
>                 "field": "realtime_filters",
>                 "type": "unsupported",
>                 "message": "realtime_filters: value 'now-14d' for 'date_posted' is not something the live search can be asked for. Available lower bounds: now-24h, now-7d, now-1M, now-3M, now-1y. There is nowhere else to put it: a social_post watch narrows only on person, company, and our index has never seen the record this search returns."
>             }
>         ]
>     }
> }
> ```
>
> Pick the next window out. A realtime watch cannot trim the window afterwards,
> because `date_posted` describes the post and no index holds the post yet.

> [accordion] config.refresh\_frequency\_days on a discovery watch
>
> A discovery watch picks how it reads with `is_realtime`, so it has no freshness
> cadence of its own. The key is refused on both tiers, whatever value you give it.
>
> ```json 400 theme={"theme":"vitesse-black"}
> {
>     "error": {
>         "type": "invalid_request",
>         "message": "config.refresh_frequency_days is not accepted on a discovery watch. Use config.is_realtime: true for the live tier, and leave it out for the index tier.",
>         "metadata": [
>             {
>                 "field": "config.refresh_frequency_days",
>                 "type": "extra_forbidden",
>                 "message": "config.refresh_frequency_days is not accepted on a discovery watch. Use config.is_realtime: true for the live tier, and leave it out for the index tier."
>             }
>         ]
>     }
> }
> ```

> [accordion] Runs scheduled more often than daily
>
> An index-tier post watch can run every six hours. A realtime one cannot.
>
> ```json 400 theme={"theme":"vitesse-black"}
> {
>     "error": {
>         "type": "invalid_request",
>         "message": "config.trigger.every_hours must be at least 24 when refresh_frequency_days is 1: a live run fetches from the source and is billed per new record. Use refresh_frequency_days 30 to run more often.",
>         "metadata": [
>             {
>                 "field": "config.trigger.every_hours",
>                 "type": "greater_than_equal",
>                 "message": "config.trigger.every_hours must be at least 24 when refresh_frequency_days is 1: a live run fetches from the source and is billed per new record. Use refresh_frequency_days 30 to run more often."
>             }
>         ]
>     }
> }
> ```

***

## Filters

A post watch takes the same filter tree as [Social Post Search](https://docs.crustdata.com/social-post-docs/indexed-search/introduction.md): one condition, or an `and`/`or` group of them, over dot-path fields.

> [!TIP]
>
> **Looking for the list of fields you can filter on?** See [Filterable
> fields](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md#filterable-fields) in the
> Social Post Search reference. The post body, the author, engagement counts,
> hashtags, reactors, and commenters are all filterable, with the same
> operators.

Two operators do most of the work on `text`:

| Operator | Match |
| - | - |
| `[.]` | Exact phrase. The words must appear contiguously and in order. Use it for product names, brands, and anything you want matched literally. |
| `(.)` | All words, in any order, with typo tolerance. Looser, and it overmatches on short words. |

```json theme={"theme":"vitesse-black"}
{
  "op": "and",
  "conditions": [
    { "field": "text", "type": "[.]", "value": "Series B" },
    { "field": "actor.industry", "type": "=", "value": "Software Development" },
    { "field": "engagement.total_reactions", "type": "=>", "value": 50 }
  ]
}
```

> [!NOTE]
>
> `content_type`, the virtual filter on the live Social Post Search API, is
> **not** a watch filter. A watch that names it comes back
> `Unknown filter field at filters: 'content_type'.` Filter on `has_video`
> instead.

### What the author fields carry

The fields under `actor` are filled according to who wrote the post, and the two
halves never overlap. Combining one from each half under `and` matches nothing,
so the watch is created and then stays silent forever.

| Filled on | Fields |
| - | - |
| Person authors only | `actor.title`, `actor.headline` |
| Company authors only | `actor.industry`, `actor.location` and every `actor.location.*` path |
| Either | `actor.name`, `actor.company_name`, `actor.actor_type`, and the identifier fields |

So `actor.title` with `actor.industry` returns nothing, and neither does
`actor.title` with `actor.location.country`. Pick the half that matches the
author you want, and add `actor.actor_type` when you want to be explicit about
it. `actor.company_name` works on both, though it is mostly people: it is the
author's current employer, not the posting company.

> [!TIP]
>
> Before you wire a channel to a watch, run the same filter through
> [Social Post Search](https://docs.crustdata.com/social-post-docs/indexed-search/introduction.md) with
> `"limit": 1` and check `total_count`. A zero there is a watch that will never
> fire.

***

## Manage a watch

A post watch takes the same management paths as every other discovery watch. Pause, reconfigure, read run history, and cancel with the `id` from create.

| Action | Request |
| - | - |
| List | `GET /watch/social_post/search` |
| Get one | `GET /watch/social_post/search/{watch_id}` |
| Update | `PATCH /watch/social_post/search/{watch_id}` |
| Delete | `DELETE /watch/social_post/search/{watch_id}` |
| Test delivery | `POST /watch/social_post/search/{watch_id}/test` |
| Run history | `GET /watch/social_post/{watch_id}/runs` |

`status`, `config`, and `notifications` are the mutable parts. `filters`, `sorts`, `fields`, and `on` are fixed at creation; `PATCH`ing any of them returns `400`.

> [!NOTE]
>
> A `config` `PATCH` is validated as a whole block, so repeat the watch's current
> `trigger` alongside the key you are changing. The keys you do send are merged
> into the stored config rather than replacing it.

### Reading a run

`runs` returns each run newest first, with `status`, the five record counters below, `credits_deducted`, and `notification_http_status`.

A non-2xx `notification_http_status` means the run found matches and the delivery itself was rejected, so check it before concluding a quiet channel means nothing happened. On a watch with several channels the webhook wins. You get the webhook's status when the run sent one, and `null` when that webhook never answered. A run that sent only Slack or email reports `200`, and a run that sent nothing reports `null`.

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

For a post watch, `records_stale` counts the posts published before the last run. A watch on a busy topic can show a `records_stale` far above `records_after_filter` on every run. That is the seen set working as intended.

***

## Examples

Worked recipes you can copy, paste, and adapt. Each one is a full working request, verified against the live API. Swap the notification channel for your own. For the operator list and field catalog, see the [Social Post Search reference](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md).

> [accordion] Funding announcements from companies in a market
>
> Company pages announcing a raise, filtered to the US and to posts that got some traction. `[.]` matches the phrase literally, so it does not drift onto posts that merely contain the words separately.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/social_post/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "text", "type": "[.]", "value": "we raised" },
>         { "field": "actor.actor_type", "type": "=", "value": "company" },
>         { "field": "actor.location.country", "type": "=", "value": "USA" },
>         { "field": "engagement.total_reactions", "type": "=>", "value": 25 }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 6 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > `actor.location.country` is filled on company authors only, so this watch
> > would deliver nothing if you swapped `actor_type` to `person`. See
> > [What the author fields carry](#what-the-author-fields-carry).

> [accordion] Hiring posts from the people at a company
>
> `actor.company_name` selects posts by people who work somewhere, rather than posts from the company page itself. Pair it with a keyword to keep the feed on topic.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/social_post/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "actor.company_name", "type": "=", "value": "Stripe" },
>         { "field": "text", "type": "(.)", "value": "hiring" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] A hashtag feed with an engagement floor
>
> `hashtags` matches case-insensitively against any tag on the post, and `in` accepts a list. The reaction floor keeps a busy tag down to the posts people actually engaged with.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/social_post/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "hashtags", "type": "in", "value": ["ai", "genai"] },
>         { "field": "engagement.total_reactions", "type": "=>", "value": 100 }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 6 }, "max_results_per_run": 50 },
>     "notifications": [ { "type": "slack", "url": "https://hooks.slack.com/services/T000/B000/XXXX" } ]
>   }'
> ```

> [accordion] Posts from people in a title band
>
> `actor.title` is the author's current job title, so this watch follows what a role is saying rather than what one company is saying.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/social_post/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "actor.title", "type": "(.)", "value": "head of engineering" },
>         { "field": "text", "type": "(.)", "value": "hiring" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > `(.)` tolerates typos and word order, so it also catches "Head of Platform
> > Engineering". Use `=` when you want the exact title string and nothing else.

> [accordion] Posts that mention a company you track
>
> `mentions.company_id` takes a Crustdata company id and matches posts that link to that company, whoever wrote them. This is the reliable way to follow mentions, because it survives a company renaming its page.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/social_post/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "mentions.company_id", "type": "=", "value": 631394 },
>         { "field": "actor.actor_type", "type": "=", "value": "person" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 6 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > Get the id from [Company Search](https://docs.crustdata.com/company-docs/search/introduction.md) or
> > [Company Identify](https://docs.crustdata.com/company-docs/identify/introduction.md). `631394` is Stripe.
> > The `actor_type` condition drops the company's own posts so you see what
> > other people say about it.

> [accordion] Posts the people at a company reacted to
>
> `reactors.*` filters on who reacted rather than who posted, which surfaces what an account is paying attention to. This watch delivers posts somebody at Stripe reacted to.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/social_post/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "reactors.company", "type": "=", "value": "Stripe" },
>         { "field": "engagement.total_reactions", "type": "=>", "value": 10 }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > Conditions on `reactors.*` inside one `and` group bind to the **same**
> > reactor. See [Nested-array
> > matching](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md#nested-array-matching-all_of-and-has_all)
> > for how that works and how to express cross-element requirements.

> [accordion] Launch posts that carry a video
>
> `content_type` is a search-only filter, so a watch selects attachments through `has_video`, `document.title`, `article.title`, or `poll.question` instead.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/social_post/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "text", "type": "[.]", "value": "excited to launch" },
>         { "field": "has_video", "type": "=", "value": true }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 12 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

***

## Error handling

A social post watch answers every failure the same way, whether you are creating a watch, editing one, testing delivery, or reading run history.

| Status | Type | Common causes |
| - | - | - |
| `400` | `invalid_request` | An unknown filter field or operator, `filters` or `config` left out, `config.trigger.every_hours` below `1`, a `fields` entry that is not a post field path, a filter set broader than the 500,000-record baseline cap, a missing or unsupported `x-api-version`, or a `PATCH` to a key fixed at creation. |
| `401` | `unauthorized` | Missing or invalid API key. |
| `403` | `permission_error` | Your key is not entitled to the social post dataset, or to a field group you named in `fields`. |
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

***

## Pricing

| | Credits |
| - | - |
| First run (baseline, up to 5 matches) | **Free** |
| Each new post delivered on later runs | **2** |

You are charged only for posts actually delivered, never for a run that finds nothing new. See [Pricing](https://docs.crustdata.com/general/pricing.md) for the full catalog.

## What to do next

* **Run a one-off search instead**: [Social Post Search](https://docs.crustdata.com/social-post-docs/indexed-search/introduction.md) returns the current match set in one call.
* **Look up operators and fields**: see the [Social Post Search reference](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md) for the full filter catalog.
* **Choose how records travel**: see [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md) for inline versus linked NDJSON.
* **Watch another dataset**: [Person](https://docs.crustdata.com/watcher-docs/person/discovery.md), [Company](https://docs.crustdata.com/watcher-docs/company/discovery.md), and [Job](https://docs.crustdata.com/watcher-docs/job/watch.md) discovery watchers work the same way.


## Related topics

- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
- [Social Post Search](https://docs.crustdata.com/api-reference/social-post-apis/search-the-social-post-dataset.md)
- [Social Post Search API](https://docs.crustdata.com/social-post-docs/indexed-search/introduction.md)
- [Social Post Search reference](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md)
