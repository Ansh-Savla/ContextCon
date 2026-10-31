> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Company Discovery Watcher

> Turn a company search into a recurring feed. A Company Discovery Watcher re-runs your filters on a schedule and delivers the companies that newly match to a webhook, Slack, Google Chat, or email.

**Use this when** you want a segment to keep delivering itself: new accounts entering your ICP, companies crossing a growth band, or fresh portfolio candidates in a market, with no manual re-running.

A Company Discovery Watcher turns a [Company Search](https://docs.crustdata.com/company-docs/search/introduction.md) filter into a recurring feed. Each run re-evaluates your filters against Crustdata's database and delivers only the **new** matches. This page walks you through the basics: your first watch, the response shape, the notification shape, and filters that reach into the job and person datasets, then folds in worked recipes you can copy, paste, and adapt.

Every request goes to the same endpoint:

```
POST https://api.crustdata.com/watch/company/search
```

> [!NOTE]
>
> Replace `YOUR_API_KEY` in each example with your actual API key. All
> requests require the `x-api-version: 2025-11-01` header.

### Request body

| Parameter | Type | Required | Default | Description |
| - | - | - | - | - |
| `filters` | object | Yes\* | - | A single filter condition or a nested `and`/`or` group, identical to [Company Search](https://docs.crustdata.com/company-docs/search/reference.md). |
| `realtime_filters` | object | No | - | What the live search is asked for on a [realtime watch](#realtime-watches). Requires `config.is_realtime`. |
| `narrowing_filters` | object | No | - | Narrows a [realtime watch](#realtime-watches) on the company behind each result, keyed by dataset. Requires `config.is_realtime`. |
| `config` | object | Yes | - | Schedule and per-run caps. See [config](#config) below. |
| `notifications` | object\[] | Yes | - | Delivery channels. May be `[]` for a pull-only watch you read from the run endpoints. |
| `fields` | string\[] | No | standard set | Dot-path fields or field groups to include in each delivered company. |
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
| `max_results_per_run` | integer | No | `25` | Companies delivered per run, `1` to `10000`. A value above `1000` needs `payload_delivery_type` `"link"`. The baseline run is always capped at 5. |
| `preferred_hour` | integer | No | - | Hour of day in UTC (`0` to `23`) to prefer for the run. |
| `expires_at` | string | No | - | Auto-expire date, `YYYY-MM-DD`. The watch stops running after it. |
| `payload_delivery_type` | string | No | `"inline"` | `"inline"` or `"link"`. See [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md). |
| `is_realtime` | boolean | No | `false` | Run the search against a live search rather than the index. Requires `realtime_filters`, and forces `every_hours` to `24` or more. See [Realtime discovery watches](#realtime-watches). |

> [!TIP]
>
> **Looking for the list of fields you can filter on?** See [Searchable
> fields](https://docs.crustdata.com/company-docs/search/reference.md#searchable-fields) in the Company
> Search reference for the full table of `filters.field` values. Use
> [Autocomplete](https://docs.crustdata.com/company-docs/autocomplete/introduction.md) to discover valid
> *values* for fields like `basic_info.industries`,
> `taxonomy.professional_network_industry`, or `locations.country`.

### Response body

Create returns the whole watch, so you can confirm what was stored before the baseline run starts.

| Field | Type | Description |
| - | - | - |
| `id` | integer | The watch's id. Use it on every management and run-history path. |
| `kind` | string | `"discovery"`. |
| `dataset` | string | `"company"`. |
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
| `notifications_count` | integer | All-time count of companies this watch has delivered. |
| `credits_consumed` | number | All-time credits this watch has spent. |

### Rate limits and credits

**Pricing:** the first run is a free baseline (a sample of up to 5
matches), then `2 credits per new company` delivered, or
`150 credits` at the
[1-day SLA](#realtime-watches). A run that
finds nothing new costs nothing.
For your own price per company, open the
[watch builder](https://app.crustdata.com/watch?type=discovery\&dataset=company\&sla=30) in the dashboard.

* **Rate limit:** 10 requests per minute on `/watch/company/search`. Each watch path keeps its own budget. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).
* **Baseline limit:** 500,000 companies. See [How a watch runs](#how-a-watch-runs).
* **Watched list:** filters are fixed once created. To change what you watch for, create a new watch.

> [!NOTE]
>
> A Discovery Watcher tracks companies that **newly match a filter**. To watch a
> **known list** of companies for profile changes instead, use the
> [Company Entity Watcher](https://docs.crustdata.com/watcher-docs/company/entity.md).

> [card] [Examples](#examples)
>
> Growth bands, funding, investors, geo radius, cross-dataset recipes.

> [card] [Cross-dataset filters](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md)
>
> Filter a company watch on the roles it posts or the people it employs.

> [card] [Realtime watches](#realtime-watches)
>
> Search live on each run instead of the index, with `realtime_filters`.

> [card] [Company Search reference](https://docs.crustdata.com/company-docs/search/reference.md)
>
> Every filter `field`, operator, and value.

***

## Your first watch: new companies entering a segment

The simplest watch is a search filter plus a schedule and one channel. This one delivers US software companies that newly cross 200 employees, checked once a day.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/watch/company/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "filters": {
      "op": "and",
      "conditions": [
        { "field": "taxonomy.professional_network_industry", "type": "=", "value": "Software Development" },
        { "field": "locations.country", "type": "in", "value": ["USA"] },
        { "field": "headcount.total", "type": "=>", "value": 200 }
      ]
    },
    "config": { "trigger": { "type": "interval", "every_hours": 24 }, "max_results_per_run": 25 },
    "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
    "id": 50943,
    "kind": "discovery",
    "dataset": "company",
    "api_version": "2025-11-01",
    "config_version": "2025-11-01",
    "status": "active",
    "filters": {
        "op": "and",
        "conditions": [
            { "field": "taxonomy.professional_network_industry", "type": "=", "value": "Software Development" },
            { "field": "locations.country", "type": "in", "value": ["USA"] },
            { "field": "headcount.total", "type": "=>", "value": 200 }
        ]
    },
    "on": ["added"],
    "sorts": null,
    "fields": null,
    "config": {
        "trigger": { "type": "interval", "every_hours": 24 },
        "max_results_per_run": 25,
        "expires_at": null,
        "preferred_hour": null,
        "payload_delivery_type": "inline"
    },
    "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ],
    "created_at": "2026-09-03T07:28:08.259278Z",
    "last_run_at": null,
    "last_notified_at": null,
    "notifications_count": 0,
    "credits_consumed": 0
}
```

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
matches** so you can confirm the setup and payload shape. No credits are
charged. Behind that sample, the baseline reads your entire match set to
record what already exists.

**3. Recurring runs**

On the schedule you set (`every_hours`), the watcher re-runs your filters and
delivers companies that are **new since the previous run**, up to
`max_results_per_run`. You are charged 2 credits per company delivered.

> [!NOTE]
>
> **Baseline limit: 500,000 companies.** The baseline run only *delivers* 5, but
> it *reads* your entire match set to record what already exists. That read is
> capped at 500,000, and we check it when you create the watch, so a broader
> filter comes back `400` and you narrow it before anything runs. The cap
> applies to the baseline alone. Later runs deliver whatever newly matches,
> bounded by `config.max_results_per_run`.

> [!NOTE]
>
> Each run delivers companies **new since the last run**, a feed of *movement*
> within your filter set rather than a one-time export. For the full current
> match set, use [Company Search](https://docs.crustdata.com/company-docs/search/introduction.md), or
> [Data Export](https://docs.crustdata.com/export-docs/data-export.md) to get it as a file.

### What a notification looks like

When a run has matches, we `POST` this body to each channel. Discovery records arrive under `results.added`, each in the company record shape projected to the watch's `fields`.

```json Webhook POST body theme={"theme":"vitesse-black"}
{
  "metadata": {
    "watch_id": 50943,
    "kind": "discovery",
    "dataset": "company",
    "api_version": "2025-11-01",
    "run_id": 64210,
    "notification_id": "ntf_64210",
    "delivered_at": "2026-09-03T07:32:20.000000Z",
    "summary": { "delivered": 2, "total_count": 2, "records_searched": 1204, "max_results_per_run": 25, "truncated": false, "records_stale": 1202 },
    "payload_delivery": { "type": "inline" }
  },
  "results": {
    "added": [
      {
        "crustdata_company_id": 633593,
        "basic_info": { "name": "Retool", "primary_domain": "retool.com" },
        "headcount": { "total": 443 },
        "locations": { "country": "USA" }
      },
      {
        "crustdata_company_id": 628895,
        "basic_info": { "name": "Serve Robotics", "primary_domain": "serverobotics.com" },
        "headcount": { "total": 404 },
        "locations": { "country": "USA" }
      }
    ]
  }
}
```

> [!NOTE]
>
> Response trimmed for clarity.

`summary.truncated` is `true` when the run matched more companies than `max_results_per_run` allowed. With the default `overflow_policy: "redeliver"` the overflow is held back and arrives on a later run rather than being lost.

> [!NOTE]
>
> `overflow_policy` is accepted on create but is not echoed in the watch
> object, so a `GET` will not show you which policy a watch is on. Record it
> on your side if you need to know.

### Controlling which fields come back

`fields` picks exactly what each delivered company carries, using the same field-group names as [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/reference.md). Omit it and you get the standard projection.

```json theme={"theme":"vitesse-black"}
{
  "filters": { "field": "headcount.growth_percent.6m", "type": ">", "value": 30 },
  "fields": ["basic_info", "headcount", "funding", "locations"],
  "config": { "trigger": { "type": "interval", "every_hours": 24 } },
  "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
}
```

> [!NOTE]
>
> `fields` does **not** change the price. A delivered company costs 2 credits
> whether it carries one field group or twelve. Every requested field is checked
> against your key's entitlements at creation, so a group your key cannot access
> fails the create rather than arriving empty.

***

## Realtime watches

A discovery watch reads the Crustdata index. A **realtime** watch searches the web
live on every run instead, so it finds companies as they appear rather than waiting for
our index to pick them up.

Turn one on with `config.is_realtime: true`. The watch then takes two filter trees
instead of one.

### The contract

| Key | When you send it | Who answers it | What it holds |
| - | - | - | - |
| `config.is_realtime` | To make the watch realtime | Nothing. It is the switch. | `true`. No other value and no other key turns a watch realtime. |
| `realtime_filters` | Required once `is_realtime` is `true` | The live search | Only the company fields listed below. |
| `narrowing_filters` | Optional | The index of the dataset you name | One block, `company` only. The company as our index already knows it. |
| `filters` | Required on any other watch, refused here | The Crustdata index | Nothing, on a realtime watch. |

The live search runs first. `narrowing_filters` then asks the company index about
each company it returned, so it can only drop companies. It never adds any.

Send `realtime_filters` without the flag and the create fails. Neither can change
afterwards: a `PATCH` carrying `is_realtime`, `realtime_filters`, or
`narrowing_filters` is refused, so you make a new watch instead.

> [!WARNING]
>
> **`filters` is refused on a realtime watch.** It used to be where you put the
> conditions the live search could not answer, and that never worked: `filters`
> is asked of the company index, which has not yet seen a company the live
> search just found, so every result was dropped and the watch delivered nothing
> while reporting success. Send it now and you get a `400` telling you where the
> condition really goes.

### Filter fields the live company search accepts

These are the only field paths `realtime_filters` takes on a company watch.
Anything else, including any other company search field, belongs in
`narrowing_filters.company`. A tree with a `funding.*` field is the exception, as
the funding table below explains.

**Firmographics**

| Field | Operators | Values |
| - | - | - |
| `taxonomy.professional_network_industry` | `=` `!=` `in` `not_in` | An industry name. |
| `locations.headquarters` | `=` `!=` `in` `not_in` | A headquarters from Company Autocomplete, for example `San Francisco, California, United States`. |
| `locations.country` | `=` `!=` `in` `not_in` | A country name. |
| `basic_info.employee_count_range` | `=` `in` | `myself only`, `2-10`, `11-50`, `51-200`, `201-500`, `501-1000`, `1001-5000`, `5001-10000`, `10001+` |
| `basic_info.fortune_rank` | `=` `in` | `50`, `51-100`, `101-250`, `251-500` |

A realtime company watch refuses `locations.city` and `locations.state`, so name
the place with `locations.headquarters`. The watch places each headquarters on a
region the live search knows. A value it cannot place is refused, so pick another value from
autocomplete or use `locations.country`.

A headquarters already names its country, so an included `locations.country`
beside it is refused. Put that country in `narrowing_filters.company` if you need
it. An excluded country (`!=`, `not_in`) beside a headquarters works, and
`locations.country` on its own works too.

**Headcount, growth, and revenue**

| Field | Operators | Values |
| - | - | - |
| `headcount.total` | `=>` `=<` | A bucket edge: `=>` one of `1`, `11`, `51`, `201`, `501`, `1001`, `5001`, `10001`; `=<` one of `10`, `50`, `200`, `500`, `1000`, `5000`, `10000`. |
| `headcount.growth_percent.12m` | `=>` `=<` | A percentage. The growth window is fixed at 12 months. |
| `roles.distribution.<department>` | `=>` `=<` | A headcount in that department. |
| `roles.growth_yoy.<department>` | `=>` `=<` | A percentage, over a fixed 12-month window. |
| `followers.count` | `=>` `=<` | A bucket edge: `=>` one of `1`, `51`, `101`, `1001`, `5001`; `=<` one of `50`, `100`, `1000`, `5000`. |
| `revenue.estimated.lower_bound_usd` | `=>` | USD. Lower bound only. |
| `revenue.estimated.upper_bound_usd` | `=<` | USD. Upper bound only. |
| `people.senior_leadership_changed_recently` | `=` | `true` only. Covers the last three months. |

Departments go in the field path, lowercase with underscores, for example
`roles.distribution.customer_success_and_support`: accounting, administrative,
arts and design, business development, community and social services, consulting,
education, engineering, entrepreneurship, finance, healthcare services, human
resources, information technology, legal, marketing, media and communication,
military and protective services, operations, product management, program and
project management, purchasing, quality assurance, real estate, research, sales,
and customer success and support.

**Funding**

| Field | Operators | Values |
| - | - | - |
| `funding.last_fundraise_date` | `=>` `=<` | An ISO date such as `2026-09-01`, or date math such as `now-30d`. |
| `funding.last_round_type` | `=` `in` | A round type, for example `series_a`. |
| Any other `funding.*` field | Its index operators | For example `funding.total_investment_usd` or `funding.investors`. |

Any `funding.*` field sends the whole `realtime_filters` tree to the company index,
which answers it as written. That tree takes `funding.*` fields only. Put location,
size, industry, or any other company condition in `narrowing_filters.company`. A
tree that mixes them is refused with a `400` that names the first other field.
`basic_info.fortune_rank` and `people.senior_leadership_changed_recently` exist only
in the live search, so `narrowing_filters.company` refuses them too, with
`Unknown filter field at narrowing_filters.company: '<field>'.` To filter on either
one, leave the `funding.*` fields out. Without them, both work as realtime filters
beside the other fields in the table above.

No date window is added for you. Without a date the watch follows every company
whose funding matches, so a broad one is refused by the 10,000-company limit. Add
`funding.last_fundraise_date` to keep it to recent rounds.

You write the same values here as you do on an index watch. Use
[Company Autocomplete](https://docs.crustdata.com/company-docs/autocomplete/introduction.md) and
[filter values](https://docs.crustdata.com/company-docs/filter-values.md) to find them, exactly as you would
for an index-tier watch.

### Tree shape

The live search takes an AND of filters, with OR only between values of one
filter, so `realtime_filters` accepts:

* A top-level `and` group of leaves, or a single bare leaf.
* An `or` group inside it only when every leaf names the **same field** and uses
  an include operator (`=`, `in`, `(.)`). Use it as a value list.
* No nested `and` groups.
* No `sorts` on the watch at all. A live search has no stable order.

A tree with a `funding.*` field is not bound by these rules. The company index
answers it, so nested groups and an `or` across different funding fields both work
there.

Exclusion is only where the operator column says so. `employee_count_range`,
`fortune_rank`, and `followers.count` take no negation because the live search
cannot exclude on them; put that negation in `narrowing_filters.company`, where every negation
operator works.

### What goes in `narrowing_filters`

Everything the live search cannot be asked. A company the live search just found
may be too new for the company index to hold every detail of, so narrowing asks
the company index about the company itself:

```json theme={"theme":"vitesse-black"}
"narrowing_filters": {
  "company": { "field": "basic_info.year_founded", "type": "=>", "value": 2020 }
}
```

| Block | Asked of | Write it in | Matched on |
| - | - | - | - |
| `company` | The company index | [Company Search](https://docs.crustdata.com/company-docs/search/reference.md) grammar | The company identifier the live search returned |

A block keeps the dataset's full search grammar, unlike `realtime_filters`: an `or`
across two different fields, nested groups, and every negation operator all work,
because an index answers it rather than the live search.

**`company` is the only block a company watch takes.** Name `person`, `job`, or
`social_post` and the create is refused:

```
A company watch cannot narrow on person. It may narrow on: company. A condition about the record the search returns belongs in 'realtime_filters'.
```

So put in `narrowing_filters.company`:

* Any company field not in the tables above, such as `basic_info.year_founded` or
  `technographics.technologies.name`.
* `or` across two different fields, nested groups, and every negation operator.

**Conditions about a job or a person have nowhere to go on a realtime company
watch.** An index-tier company watch can filter on the roles a company posts or
the people it employs; a realtime one cannot, because those conditions describe
records the index has not seen. The refusal says so:

```
realtime_filters: 'person filters on a company watch' is not something the live search can be asked for. There is nowhere else to put it: a company watch narrows only on company, and our index has never seen the record this search returns.
```

Keep that watch on the index tier. See
[Filters from other datasets](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md).

> [!NOTE]
>
> **Leave `narrowing_filters` out and nothing is dropped.** Every company the
> live search returns is delivered.
>
> Send a block and it is checked against the company index. A company the index
> does not hold is dropped rather than delivered unchecked, so add a block when
> you would rather miss a company than deliver one nobody checked.

You cannot write one `or` spanning both keys. They are separate, which matches
what the watch can do: a company the live search never returned cannot be brought
back by a later stage.

### Limits

| | |
| - | - |
| How often it runs | Once a day at most. `config.trigger.every_hours` must be `24` or more. |
| How many companies it may follow | **10,000.** The live company search reports how many companies your `realtime_filters` cover, and a watch over the cap is refused at creation. The count is taken on `realtime_filters` alone, so a narrow `narrowing_filters` will not bring a broad watch under it. |
| What a company costs | 150 credits at the 1-day SLA, against 2 at the 30-day SLA an index watch runs on. The create response echoes `config.refresh_frequency_days: 1`. The first run is still a free sample of up to 5, and a run that finds nothing new costs nothing. See [Pricing](https://docs.crustdata.com/general/pricing.md). |
| What comes back | Only the fields a live company carries. Leave `fields` out and the create response lists them for you. |

### Realtime examples

> [accordion] Companies growing headcount, narrowed by founding year
>
> The live search handles industry, region, size, and the 12-month growth band.
> `basic_info.year_founded` has no live filter behind it, so it narrows afterwards
> through the `company` block.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "taxonomy.professional_network_industry", "type": "in", "value": ["Software Development"] },
>         { "field": "locations.country", "type": "in", "value": ["United States"] },
>         { "field": "headcount.total", "type": "=>", "value": 51 },
>         { "field": "headcount.total", "type": "=<", "value": 200 },
>         { "field": "headcount.growth_percent.12m", "type": "=>", "value": 25 }
>       ]
>     },
>     "narrowing_filters": {
>       "company": {
>         "op": "and",
>         "conditions": [
>           { "field": "basic_info.year_founded", "type": "=>", "value": 2015 }
>         ]
>       }
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 53057,
>     "kind": "discovery",
>     "dataset": "company",
>     "api_version": "2025-11-01",
>     "status": "active",
>     "filters": null,
>     "narrowing_filters": {
>         "company": {
>             "op": "and",
>             "conditions": [
>                 { "field": "basic_info.year_founded", "type": "=>", "value": 2015 }
>             ]
>         }
>     },
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "taxonomy.professional_network_industry", "type": "in", "value": ["Software Development"] },
>             { "field": "locations.country", "type": "in", "value": ["United States"] },
>             { "field": "headcount.total", "type": "=>", "value": 51 },
>             { "field": "headcount.total", "type": "=<", "value": 200 },
>             { "field": "headcount.growth_percent.12m", "type": "=>", "value": 25 }
>         ]
>     },
>     "on": ["added"],
>     "sorts": null,
>     "config": {
>         "trigger": { "type": "interval", "every_hours": 24 },
>         "max_results_per_run": 25,
>         "expires_at": null,
>         "preferred_hour": null,
>         "payload_delivery_type": "inline",
>         "is_realtime": true,
>         "refresh_frequency_days": 1
>     },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ],
>     "created_at": "2026-09-17T13:03:26.771204Z",
>     "last_run_at": null,
>     "notifications_count": 0,
>     "credits_consumed": 0
> }
> ```
>
> Response trimmed to the keys under discussion. The two `headcount.total` bounds
> land on bucket edges, so they become one size band rather than two filters.

> [accordion] Companies staffing up one department
>
> `roles.distribution.*` and `roles.growth_yoy.*` both take the department in the
> field path. This watch follows engineering teams over 50 people that grew more
> than 20% in a year.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "taxonomy.professional_network_industry", "type": "in", "value": ["Software Development"] },
>         { "field": "locations.country", "type": "in", "value": ["United States"] },
>         { "field": "roles.distribution.engineering", "type": "=>", "value": 50 },
>         { "field": "roles.growth_yoy.engineering", "type": "=>", "value": 20 }
>       ]
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 52315,
>     "kind": "discovery",
>     "dataset": "company",
>     "status": "active",
>     "filters": null,
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "taxonomy.professional_network_industry", "type": "in", "value": ["Software Development"] },
>             { "field": "locations.country", "type": "in", "value": ["United States"] },
>             { "field": "roles.distribution.engineering", "type": "=>", "value": 50 },
>             { "field": "roles.growth_yoy.engineering", "type": "=>", "value": 20 }
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

> [accordion] Companies that just raised
>
> A funding field sends the whole `realtime_filters` tree to the company index, and
> that tree takes funding fields only. Location and size go in
> `narrowing_filters.company`. This watch follows San Francisco companies with at
> least 11 employees whose last round was seed, Series A, or Series B, raised in the
> last 30 days. It is sent with `"preview": true`, so nothing is created: the response says
> whether the watch can be created and shows a sample. Drop the flag to create it.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "preview": true,
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "funding.last_round_type", "type": "in", "value": ["seed", "series_a", "series_b"] },
>         { "field": "funding.last_fundraise_date", "type": "=>", "value": "now-30d" }
>       ]
>     },
>     "narrowing_filters": {
>       "company": {
>         "op": "and",
>         "conditions": [
>           { "field": "locations.headquarters", "type": "in", "value": ["San Francisco, California, United States"] },
>           { "field": "headcount.total", "type": "=>", "value": 11 }
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
>     "can_create": true,
>     "count": null,
>     "sample": [
>         {
>             "crustdata_company_id": 1085886,
>             "basic_info": {
>                 "name": "Flam",
>                 "professional_network_url": "https://www.linkedin.com/company/flamappofficial"
>             },
>             "taxonomy": {
>                 "professional_network_industry": "Technology, Information and Internet"
>             }
>         }
>     ],
>     "counted_against": "index",
>     "credits": { "per_notification": 150.0 },
>     "error": null,
>     "error_field": null
> }
> ```
>
> `sample` trimmed to one company. The funding date is yours to choose. Leave it out
> and the watch follows every company whose last round matches, which can exceed
> the 10,000 companies a realtime watch may follow.

> [accordion] Companies past a size floor that are still growing fast
>
> A size floor plus a growth band follows companies that are already substantial and
> still adding people. The growth window is fixed at 12 months.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "taxonomy.professional_network_industry", "type": "in", "value": ["Software Development"] },
>         { "field": "locations.country", "type": "in", "value": ["United States"] },
>         { "field": "headcount.total", "type": "=>", "value": 201 },
>         { "field": "headcount.growth_percent.12m", "type": "=>", "value": 25 }
>       ]
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 52471,
>     "kind": "discovery",
>     "dataset": "company",
>     "status": "active",
>     "filters": null,
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "taxonomy.professional_network_industry", "type": "in", "value": ["Software Development"] },
>             { "field": "locations.country", "type": "in", "value": ["United States"] },
>             { "field": "headcount.total", "type": "=>", "value": 201 },
>             { "field": "headcount.growth_percent.12m", "type": "=>", "value": 25 }
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
> Response trimmed to the keys under discussion. `headcount.total` with only a `=>`
> bound sets a floor and leaves the top open.

> [accordion] The first hire into a department
>
> Bounding a department to exactly one person catches a company the moment it starts
> building that function, which is usually the moment it starts buying for it.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "taxonomy.professional_network_industry", "type": "in", "value": ["Software Development"] },
>         { "field": "locations.country", "type": "in", "value": ["United States"] },
>         { "field": "headcount.total", "type": "=>", "value": 51 },
>         { "field": "headcount.total", "type": "=<", "value": 200 },
>         { "field": "roles.distribution.engineering", "type": "=>", "value": 1 },
>         { "field": "roles.distribution.engineering", "type": "=<", "value": 1 }
>       ]
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 52473,
>     "kind": "discovery",
>     "dataset": "company",
>     "status": "active",
>     "filters": null,
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "taxonomy.professional_network_industry", "type": "in", "value": ["Software Development"] },
>             { "field": "locations.country", "type": "in", "value": ["United States"] },
>             { "field": "headcount.total", "type": "=>", "value": 51 },
>             { "field": "headcount.total", "type": "=<", "value": 200 },
>             { "field": "roles.distribution.engineering", "type": "=>", "value": 1 },
>             { "field": "roles.distribution.engineering", "type": "=<", "value": 1 }
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
> Response trimmed to the keys under discussion. Swap `engineering` for any other
> department in the list above.

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
| A company index field in `realtime_filters` | `'<field>' is not something the live search can be asked for. Move it under 'narrowing_filters.company'...` |
| Any other field beside a `funding.*` field in `realtime_filters` | `'<field>' is not something the live search can be asked for. A realtime funding search takes funding fields only. Move it under 'narrowing_filters.company'...` |
| `locations.city` or `locations.state` in `realtime_filters` | `'locations.city' is not something the live search can be asked for. Use 'locations.headquarters' instead...` |
| A headquarters the watch cannot place | `value '<place>' for 'locations.headquarters' is not something the live search can be asked for. Couldn't resolve this headquarters to a place the live search knows. Try another value from company autocomplete on locations.headquarters, or use locations.country...` |
| An included `locations.country` beside `locations.headquarters` | `'locations.country' is not something the live search can be asked for. 'locations.headquarters' already names the country...` |
| `not_in` on a filter that cannot exclude | `Exclusion is not available on this filter.` |
| An `or` across two different fields | `An 'or' is available only across values of one field.` |
| `sorts` on a realtime watch | `The live search has no stable sort order.` |
| `every_hours` under `24` | `config.trigger.every_hours must be at least 24...` |
| `realtime_filters` matching over 10,000 companies | `This watch would follow N records, more than the 10,000 a daily-refresh watch can track. Please narrow down your search with other filters, such as a date filter like funding.last_fundraise_date on a funding watch.` |
| `config.refresh_frequency_days`, any value | `config.refresh_frequency_days is not accepted on a discovery watch...` |
| A job or person condition in `realtime_filters` | `'person filters on a company watch' is not something the live search can be asked for. There is nowhere else to put it...` |
| A block other than `company` | `A company watch cannot narrow on <name>. It may narrow on: company...` |
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

> [accordion] A headquarters the watch cannot place
>
> A preview (`"preview": true`) answers `200` with `can_create: false` and the same
> message in `error`, so you can check a place before you create the watch:
>
> ```json Preview response theme={"theme":"vitesse-black"}
> {
>     "can_create": false,
>     "count": null,
>     "sample": [],
>     "counted_against": null,
>     "credits": null,
>     "error": "value 'Qzxqvbq, Xjvqzw' for 'locations.headquarters' is not something the live search can be asked for. Couldn't resolve this headquarters to a place the live search knows. Try another value from company autocomplete on locations.headquarters, or use locations.country. Move it under 'narrowing_filters.company', expressed in company's own vocabulary.",
>     "error_field": "realtime_filters"
> }
> ```

> [accordion] Excluding a size band
>
> ```json 400 theme={"theme":"vitesse-black"}
> {
>     "error": {
>         "type": "invalid_request",
>         "message": "realtime_filters: operator 'not_in' on 'basic_info.employee_count_range' is not something the live search can be asked for. Exclusion is not available on this filter. Move it under 'narrowing_filters.company', expressed in company's own vocabulary.",
>         "metadata": [
>             {
>                 "field": "realtime_filters",
>                 "type": "unsupported",
>                 "message": "realtime_filters: operator 'not_in' on 'basic_info.employee_count_range' is not something the live search can be asked for. Exclusion is not available on this filter. Move it under 'narrowing_filters.company', expressed in company's own vocabulary."
>             }
>         ]
>     }
> }
> ```

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

## Delivery channels

Every watch takes a `notifications` array. Add one or more and matches fan out to all of them.

```json Webhook theme={"theme":"vitesse-black"}
{ "type": "webhook", "url": "https://your-app.com/webhooks/crustdata", "headers": { "X-Watch-Name": "brazil-software-growth" } }
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

```json Multiple theme={"theme":"vitesse-black"}
[
  { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" },
  { "type": "slack", "webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX" }
]
```

```json Pull-only theme={"theme":"vitesse-black"}
[]
```

> [!WARNING]
>
> A Slack channel must be a genuine Slack incoming webhook
> (`https://hooks.slack.com/services/…`). Any other URL will fail delivery.

An empty `notifications` array is valid. The watch runs and records everything, pushes nothing, and you read each run from the [run-history endpoints](#manage-a-watch).

### Where the records travel

By default a run's companies arrive inside the notification, under `results`. Set `config.payload_delivery_type` to `"link"` and the body carries no records at all. It carries `metadata.payload_delivery.url` instead, a pre-signed S3 URL for one NDJSON file holding every record of that run.

Switch when a run can outgrow what your receiver accepts. An AWS Lambda proxy integration caps a request at 6 MB and an ALB target at 1 MB, and an oversize body is refused whole.

```bash theme={"theme":"vitesse-black"}
curl --request PATCH \
  --url https://api.crustdata.com/watch/company/search/50943 \
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

Every channel on the watch gets the same link, and the run-summary endpoint serves the same file. Read `metadata.payload_delivery.type` rather than testing for `results`: a `link` watch falls back to an inline body if the file cannot be written. See [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md) for the file format, the link lifetime, and the errors.

***

## Filters from other datasets

A company watch is not limited to company fields. Drop a job field or a person field into the same flat `conditions` list and the watch filters on the roles a company is hiring for, or on the people it employs:

```json theme={"theme":"vitesse-black"}
{
  "op": "and",
  "conditions": [
    { "field": "technographics.technologies.name", "type": "=",   "value": "Snowflake" },
    { "field": "job_details.title",                "type": "(.)", "value": "data engineer" }
  ]
}
```

Companies running Snowflake that are hiring a data engineer. Open roles are not carried on company records, so that second half is not reachable from a company-only watch.

There is no new syntax and no second filter list. You write one flat set of conditions, mixing fields from any dataset, and the watch works out where each field lives.

> [!NOTE]
>
> Cross-dataset filters are a **discovery watch** feature. An
> [entity watcher](https://docs.crustdata.com/watcher-docs/company/entity.md) tracks a list you supply, so it
> has no filter to widen.

### What you can combine

| A company watch can also filter on | Joined through |
| - | - |
| Job fields | The company posting the job |
| Person fields | The person's current employer |

A single watch can pull from all three datasets at once.

> [!NOTE]
>
> People join through their **current employer** only. A filter on a past
> employer still selects the right people, but the company it points at is where
> they work now. "Companies that hired away from Acme" means companies that
> currently employ someone whose earlier experience was at Acme.

### The rules in one place

Field names decide the dataset, so there is nothing to declare: `headcount.total`
is a company field, `job_details.title` a job field, and
`experience.employment_details.current.title` a person field. Conditions from
another dataset are answered first, come back as a set of company IDs, and narrow
your watch from there. Delivery, deduplication, per-run caps, and the payload
shape are unchanged, and you are still charged 2 credits per company. Reading the
other dataset is free.

A cross-dataset condition may cover at most **1,000,000 companies**, checked at
creation and measured on the cross-dataset conditions alone. Row-level negation
(`!=`, `not_in`, `(!)`, `not_contains`, `geo_exclude`) is rejected on a condition
from another dataset, because it matches companies with *some other* matching row
rather than companies with none.

The payload carries companies and nothing else. To see the posting or the person
that put a company in the feed, call `POST /job/search` or `POST /person/search`
yourself with the delivered `crustdata_company_id`.

See [Cross-dataset filters](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md) for the join
rules, the grouping semantics, the lookup fields for that follow-up call, the
limits with their exact errors, and how timing and deduplication change.

***

## Test your receiver before a run fires

Push one sample notification through a watch to verify your receiver end to end, without waiting for a company to actually appear.

```
POST https://api.crustdata.com/watch/company/search/{watch_id}/test
```

The sample is built from **real current matches** of the watch's own filter and shaped through the same processor a real run uses, so the payload is identical to production apart from `metadata.test: true`. The call records nothing: it creates no run, does not advance the seen set, and costs no credits.

| Field | Type | Description |
| - | - | - |
| `notification_endpoint` | string | Deliver this one test to a URL you control instead of the watch's channels. Must be a **public** `http(s)` URL. |
| `count` | integer | Deliver `N` sample companies (`1` to `25`) in one envelope. Default `1`. |
| `deliver` | boolean | Send `false` to get the envelope back without any outbound request. |

```bash theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/watch/company/search/50943/test \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{ "notification_endpoint": "https://your-server.example.com/webhook", "count": 3 }'
```

> [!WARNING]
>
> A watch whose filter currently matches nothing has nothing to sample, and the
> call returns `400` with
> `This watch's filter currently matches 0 records - nothing to sample.` That is
> a useful signal in itself: a watch that cannot produce a sample will not
> produce a delivery either.

## Manage a watch

| Action | Request |
| - | - |
| List your watches | `GET /watch/company/search?status=active&limit=50&offset=0` |
| Get one | `GET /watch/company/search/{id}` |
| Pause / resume | `PATCH /watch/company/search/{id}` with `{ "status": "paused" }` |
| Reschedule | `PATCH /watch/company/search/{id}` with a new `config` |
| Replace the channels | `PATCH /watch/company/search/{id}` with a new `notifications` |
| Cancel | `DELETE /watch/company/search/{id}` → `204` |
| Run history | `GET /watch/company/{id}/runs?limit=20` |
| One run, with records | `GET /watch/company/{id}/runs/{run_id}/summary` |

```bash List runs theme={"theme":"vitesse-black"}
curl --request GET \
  --url 'https://api.crustdata.com/watch/company/50943/runs?limit=20' \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

```bash Run detail (delivered records) theme={"theme":"vitesse-black"}
curl --request GET \
  --url https://api.crustdata.com/watch/company/50943/runs/54811/summary \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

```bash Pause a watch theme={"theme":"vitesse-black"}
curl --request PATCH \
  --url https://api.crustdata.com/watch/company/search/50943 \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{ "status": "paused" }'
```

```bash Cancel a watch theme={"theme":"vitesse-black"}
curl --request DELETE \
  --url https://api.crustdata.com/watch/company/search/50943 \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

> [!NOTE]
>
> The read paths drop the `search/` segment that create and manage use:
> you create at `/watch/company/search` and read runs at
> `/watch/company/{id}/runs`.

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

> [!WARNING]
>
> `filters`, `sorts`, `fields`, and `on` are fixed once the watch exists.
> `PATCH`ing any of them returns `400`. To change what you watch for, create a
> new watch.

***

## Examples

Worked recipes you can copy, paste, and adapt. Each one is a full working request, verified against the live API. Swap the notification channel for your own. For the operator list, field catalog, and validation rules, see the [Company Search reference](https://docs.crustdata.com/company-docs/search/reference.md).

> [accordion] Find new well-funded companies in a country
>
> A common sales and investor-research feed: companies in a specific market that cross a funding threshold. This watch delivers US companies that have raised more than \$10M, checked daily, to Slack.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "locations.country", "type": "in", "value": ["USA"] },
>         { "field": "funding.total_investment_usd", "type": ">", "value": 10000000 }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "slack", "webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > `locations.country` accepts both ISO 3166-1 alpha-3 codes (`"USA"`, `"CAN"`)
> > and full country names (`"United States"`, `"Canada"`).

> [accordion] Track a segment crossing a growth band
>
> Combine an industry, a country, a headcount band, and a growth threshold. This watch delivers new Brazilian software companies between 50 and 500 employees that grew headcount 30% or more in six months.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "taxonomy.professional_network_industry", "type": "=", "value": "Software Development" },
>         { "field": "locations.country", "type": "in", "value": ["Brazil"] },
>         { "field": "headcount.total", "type": "=>", "value": 50 },
>         { "field": "headcount.total", "type": "=<", "value": 500 },
>         { "field": "headcount.growth_percent.6m", "type": "=>", "value": 30 }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 }, "max_results_per_run": 25 },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > The dotted period paths (`headcount.growth_percent.6m`, and the same shape for
> > `.1m`, `.3m`, `.12m`) are filterable. `headcount.growth_absolute.*` gives you
> > absolute employee deltas over the same periods.

> [accordion] Follow high-growth mid-market companies
>
> Narrow to a headcount band and a growth rate, with no industry or geography filter. This watch delivers companies between 200 and 2,000 employees growing more than 15% in six months.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "headcount.growth_percent.6m", "type": ">", "value": 15 },
>         { "field": "headcount.total", "type": "=>", "value": 200 },
>         { "field": "headcount.total", "type": "=<", "value": 2000 }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Watch a revenue band
>
> Bound estimated revenue from both sides so the whole range sits inside your target. This watch delivers software companies whose estimated revenue is entirely between $1M and $50M, checked weekly.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "revenue.estimated.lower_bound_usd", "type": "=>", "value": 1000000 },
>         { "field": "revenue.estimated.upper_bound_usd", "type": "=<", "value": 50000000 },
>         { "field": "taxonomy.professional_network_industry", "type": "=", "value": "Software Development" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 168 } },
>     "fields": ["basic_info", "revenue", "headcount"],
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > Use `=>` and `=<` for inclusive bounds. Crustdata writes them that way round;
> > `>=` and `<=` return `unknown operator`.

> [accordion] Follow an investor's new portfolio companies
>
> Filter on `funding.investors` to catch every company an investor backs, and pair it with a date so the feed is about recent activity. This watch delivers Sequoia-backed companies whose latest round closed on or after 2025-01-01.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "funding.investors", "type": "in", "value": ["Sequoia Capital"] },
>         { "field": "funding.last_fundraise_date", "type": "=>", "value": "2025-01-01" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "fields": ["basic_info", "funding"],
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > `funding.investors` covers known investors across the company's whole funding
> > history. Combined with a `funding.last_*` filter it means the company has that
> > investor and its latest round matches, not that the investor joined the latest
> > round.

> [accordion] Catch companies raising a Series A or B
>
> Combine `funding.last_round_type` with `funding.last_fundraise_date` for a feed of recent rounds at a specific stage.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "funding.last_round_type", "type": "in", "value": ["series_a", "series_b"] },
>         { "field": "funding.last_fundraise_date", "type": "=>", "value": "2025-06-01" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "sorts": [ { "field": "funding.last_fundraise_date", "order": "desc" } ],
>     "fields": ["basic_info", "funding", "headcount"],
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > Round-type values are lowercase with underscores: `series_a`, `series_b`,
> > `seed`. `sorts` sets the delivery order within a run, which matters when a run
> > is capped by `max_results_per_run`.

> [accordion] Follow a category, like AI
>
> `taxonomy.categories` gives you finer segmentation than industry alone. This watch delivers AI companies with more than 50 employees.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "taxonomy.categories", "type": "in", "value": ["Artificial Intelligence (AI)"] },
>         { "field": "headcount.total", "type": "=>", "value": 50 }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!TIP]
> >
> > Case does not matter for category values under `in`, but the wording does.
> > Use [Autocomplete](https://docs.crustdata.com/company-docs/autocomplete/introduction.md) to find the
> > stored value. The AI category is stored as `"Artificial Intelligence (AI)"`.

> [accordion] Follow newly founded companies
>
> Use a comparison operator on `basic_info.year_founded` for a sourcing feed of young companies, checked weekly.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "basic_info.year_founded", "type": ">", "value": 2020 },
>         { "field": "taxonomy.professional_network_industry", "type": "=", "value": "Software Development" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 168 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Watch a radius around a city
>
> The `geo_distance` operator on `locations.headquarters` bounds a watch to companies headquartered near a point. This watch delivers companies with more than 100 employees within 50 km of Palo Alto.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         {
>           "field": "locations.headquarters",
>           "type": "geo_distance",
>           "value": { "location": "Palo Alto, CA", "distance": 50, "unit": "km" }
>         },
>         { "field": "headcount.total", "type": ">", "value": 100 }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > The `value` centre is either a `location` string, geocoded server-side, or an
> > explicit `lat_lng` pair, which skips geocoding. `distance` is required;
> > `unit` defaults to `km` and also accepts `mi`. See the
> > [`geo_distance` reference](https://docs.crustdata.com/company-docs/search/reference#geo_distance--radius-around-headquarters).

> [accordion] Use or and nested logic
>
> Nest an `or` group inside an `and` group when a company should match any of several conditions but must also satisfy a hard requirement. This watch delivers US companies that are either software companies or have raised more than \$5M.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         {
>           "op": "or",
>           "conditions": [
>             { "field": "taxonomy.professional_network_industry", "type": "=", "value": "Software Development" },
>             { "field": "funding.total_investment_usd", "type": ">", "value": 5000000 }
>           ]
>         },
>         { "field": "locations.country", "type": "=", "value": "USA" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Cross-dataset: companies hiring for a role
>
> A job field alongside a company field asks a question neither dataset answers alone. This watch delivers companies running Snowflake that are hiring a data engineer.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "technographics.technologies.name", "type": "=",   "value": "Snowflake" },
>         { "field": "job_details.title",                "type": "(.)", "value": "data engineer" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> The delivered payload carries companies only. To see the posting that put a company in the feed, call `POST /job/search` with the delivered `crustdata_company_id` and the same job conditions. See [Records from the other dataset](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md#records-from-the-other-dataset).

> [accordion] Cross-dataset: companies hiring away from a rival
>
> A person field joins through each person's current employer, so a past-employer condition finds companies that currently employ someone who used to work elsewhere. This watch delivers companies with more than 50 employees that employ an ex-Stripe person.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "headcount.total",                                 "type": ">", "value": 50 },
>         { "field": "experience.employment_details.past.company_name", "type": "=", "value": "Stripe" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Cross-dataset: sales hiring at fast-growing US companies
>
> Two job conditions in the same group are answered together, so this asks for one posting that is both a sales role and in the United States, at a company growing more than 20% in six months.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "headcount.growth_percent.6m", "type": ">", "value": 20 },
>         { "field": "job_details.category",        "type": "=", "value": "Sales" },
>         { "field": "location.country",            "type": "=", "value": "United States" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Cross-dataset: three datasets in one watch
>
> Company, job, and person conditions in one flat list. This watch delivers companies running Snowflake, hiring data engineers, and employing someone who used to work at Databricks.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "technographics.technologies.name",                "type": "=",   "value": "Snowflake" },
>         { "field": "job_details.title",                               "type": "(.)", "value": "data engineer" },
>         { "field": "experience.employment_details.past.company_name", "type": "=",   "value": "Databricks" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Cross-dataset: "first time" signals, like a first ML hire
>
> Set up a watch for companies that employ a machine learning engineer. The free baseline run records every company that already has one and delivers almost nothing. After that, a company can only appear by joining the set for the first time, which gives you "hired their first machine learning engineer" with no extra configuration.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "headcount.total", "type": ">", "value": 50 },
>         { "field": "experience.employment_details.current.title", "type": "(.)", "value": "machine learning engineer" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> The same shape gives you first hire in a country, first sales hire, or first posting of any kind. Two caveats: it means first as far as our data reaches, so a coverage gap or an edited job title will both set it off, and it fires once. A company that hires an ML engineer, loses them, and hires another stays quiet the second time.

> [accordion] Deliver a large run as a linked file
>
> Raise the per-run cap and switch the payload to a link when a run can outgrow what your receiver accepts.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "basic_info.company_type", "type": "=", "value": "Public Company" },
>         { "field": "headcount.growth_percent.6m", "type": ">", "value": 10 }
>       ]
>     },
>     "config": {
>       "trigger": { "type": "interval", "every_hours": 24 },
>       "max_results_per_run": 1000,
>       "payload_delivery_type": "link"
>     },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> The notification then carries `metadata.payload_delivery.url`, a pre-signed URL for one NDJSON file holding the whole run, and no `results` key. See [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md).

> [accordion] Run a watch with no channel and pull the results
>
> Send `notifications: []` and the watch pushes nothing. It still runs on schedule, still records every match, and you read each run yourself.
>
> ```bash Create theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/company/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": { "field": "headcount.growth_percent.6m", "type": ">", "value": 40 },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```bash Read a run theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url https://api.crustdata.com/watch/company/50943/runs/54811/summary \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> Useful when you would rather poll than expose a receiver, and for a first pass at a filter before you wire a channel to it.

***

***

## Error handling

A company discovery watch answers every failure the same way, whether you are creating a watch, editing one, testing delivery, or reading run history.

| Status | Type | Common causes |
| - | - | - |
| `400` | `invalid_request` | An unknown filter field or operator, `filters` or `config` left out, `config.trigger.every_hours` below `1`, a `fields` entry that is not a company field path, a filter set broader than the 500,000-record baseline cap, a missing or unsupported `x-api-version`, or a `PATCH` to a key fixed at creation. |
| `401` | `unauthorized` | Missing or invalid API key. |
| `403` | `permission_error` | Your key is not entitled to the company dataset, or to a field group you named in `fields`. |
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
| First run (baseline, up to 5 matches) | **Free** |
| Each new company delivered on later runs | **2** |

You are charged only for companies actually delivered, never for a run that finds nothing new, and never for reading another dataset to narrow your filters. See [Pricing](https://docs.crustdata.com/general/pricing.md) for the full catalog.

## What to do next

* **Watch a known list instead**: use the [Company Entity Watcher](https://docs.crustdata.com/watcher-docs/company/entity.md) to track profile changes on companies you already hold.
* **Look up operators and fields**: see the [Company Search reference](https://docs.crustdata.com/company-docs/search/reference.md) for the full filter catalog.
* **Check a filter before you watch it**: run it through [Company Search](https://docs.crustdata.com/company-docs/search/introduction.md) and confirm `total_count` is not zero.
* **Choose how records travel**: see [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md) for inline versus linked NDJSON.


## Related topics

- [Company Entity Watcher](https://docs.crustdata.com/watcher-docs/company/entity.md)
- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [Pricing](https://docs.crustdata.com/general/pricing.md)
- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
- [Job Watcher](https://docs.crustdata.com/watcher-docs/job/watch.md)
