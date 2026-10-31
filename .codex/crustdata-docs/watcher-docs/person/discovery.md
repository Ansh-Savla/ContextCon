> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Person Discovery Watcher

> Turn a person search into a recurring feed. A Person Discovery Watcher re-runs your filters on a schedule and delivers the people who newly match to a webhook, Slack, Google Chat, or email.

**Use this when** you want a persona to keep delivering itself: candidates entering a title band, decision-makers appearing at accounts you sell to, or people who just changed jobs, with no manual re-running.

A Person Discovery Watcher turns a [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) filter into a recurring feed. Each run re-evaluates your filters and delivers only the **new** matches. This page walks you through the basics: your first watch, the response shape, the notification shape, and filters that reach into the company and job datasets, then folds in worked recipes you can copy, paste, and adapt.

Every request goes to the same endpoint:

```
POST https://api.crustdata.com/watch/person/search
```

> [!NOTE]
>
> Replace `YOUR_API_KEY` in each example with your actual API key. All
> requests require the `x-api-version: 2025-11-01` header.

### Request body

| Parameter | Type | Required | Default | Description |
| - | - | - | - | - |
| `filters` | object | Yes\* | - | A single filter condition or a nested `and`/`or` group, identical to [Person Search](https://docs.crustdata.com/person-docs/search/reference.md). |
| `realtime_filters` | object | No | - | What the live search is asked for on a [realtime watch](#realtime-watches). Requires `config.is_realtime`. |
| `narrowing_filters` | object | No | - | Narrows a [realtime watch](#realtime-watches) on the person or the employer behind each result, keyed by dataset. Requires `config.is_realtime`. |
| `config` | object | Yes | - | Schedule and per-run caps. See [config](#config) below. |
| `notifications` | object\[] | Yes | - | Delivery channels. May be `[]` for a pull-only watch you read from the run endpoints. |
| `fields` | string\[] | No | standard set | Dot-path fields or field groups to include in each delivered person. |
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
| `max_results_per_run` | integer | No | `25` | People delivered per run, `1` to `10000`. A value above `1000` needs `payload_delivery_type` `"link"`. The baseline run is always capped at 5. |
| `preferred_hour` | integer | No | - | Hour of day in UTC (`0` to `23`) to prefer for the run. |
| `expires_at` | string | No | - | Auto-expire date, `YYYY-MM-DD`. The watch stops running after it. |
| `payload_delivery_type` | string | No | `"inline"` | `"inline"` or `"link"`. See [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md). |
| `is_realtime` | boolean | No | `false` | Run the search against a live search rather than the index. Requires `realtime_filters`, and forces `every_hours` to `24` or more. See [Realtime discovery watches](#realtime-watches). |

> [!TIP]
>
> **Looking for the list of fields you can filter on?** See [Filterable
> fields](https://docs.crustdata.com/person-docs/search/reference.md) in the Person Search reference. Use
> [Autocomplete](https://docs.crustdata.com/person-docs/autocomplete/introduction.md) to discover valid
> *values* for fields like `experience.employment_details.current.company_name`
> or `professional_network.location.country`.

### Response body

Create returns the whole watch, so you can confirm what was stored before the baseline run starts.

| Field | Type | Description |
| - | - | - |
| `id` | integer | The watch's id. Use it on every management and run-history path. |
| `kind` | string | `"discovery"`. |
| `dataset` | string | `"person"`. |
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
| `notifications_count` | integer | All-time count of people this watch has delivered. |
| `credits_consumed` | number | All-time credits this watch has spent. |

### Rate limits and credits

**Pricing:** the first run is a free baseline (a sample of up to 5
matches), then `0.5 credits per new person` delivered, or
`150 credits` at the
[1-day SLA](#realtime-watches). A run that finds nothing new costs nothing.
For your own price per person, open the
[watch builder](https://app.crustdata.com/watch?type=discovery\&dataset=person\&sla=30) in the dashboard.

* **Rate limit:** 10 requests per minute on `/watch/person/search`. Each watch path keeps its own budget. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).
* **Baseline limit:** 500,000 people. See [How a watch runs](#how-a-watch-runs).
* **Watched list:** filters are fixed once created. To change what you watch for, create a new watch.

> [!NOTE]
>
> A Discovery Watcher finds people you don't know yet: it re-runs a *filter* and
> surfaces whoever newly matches. To track a *known list* of people and hear
> when their profiles change, use the
> [Person Entity Watcher](https://docs.crustdata.com/watcher-docs/person/entity.md).

> [card] [Examples](#examples)
>
> Personas, seniority, tenure, movement signals, cross-dataset recipes.

> [card] [Cross-dataset filters](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md)
>
> Filter a person watch on their employer or on what it is hiring for.

> [card] [Realtime watches](#realtime-watches)
>
> Search live on each run instead of the index, with `realtime_filters`
> and `narrowing_filters`.

> [card] [Person Search reference](https://docs.crustdata.com/person-docs/search/reference.md)
>
> Every filter `field`, operator, and value.

***

## Your first watch: a persona in a city

The simplest watch is a search filter plus a schedule and one channel. This one delivers machine learning engineers in Paris, checked once a day.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/watch/person/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "filters": {
      "op": "and",
      "conditions": [
        { "field": "experience.employment_details.current.title", "type": "(.)", "value": "Machine Learning Engineer" },
        { "field": "professional_network.location.raw", "type": "(.)", "value": "Paris" }
      ]
    },
    "config": { "trigger": { "type": "interval", "every_hours": 24 }, "max_results_per_run": 25 },
    "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
    "id": 50960,
    "kind": "discovery",
    "dataset": "person",
    "api_version": "2025-11-01",
    "config_version": "2025-11-01",
    "status": "active",
    "filters": {
        "op": "and",
        "conditions": [
            { "field": "experience.employment_details.current.title", "type": "(.)", "value": "Machine Learning Engineer" },
            { "field": "professional_network.location.raw", "type": "(.)", "value": "Paris" }
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
    "created_at": "2026-09-03T07:30:43.674009Z",
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
delivers people **new or refreshed since the previous run**, up to
`max_results_per_run`. You are charged 0.5 credits per person delivered.

> [!NOTE]
>
> **Baseline limit: 500,000 people.** The baseline run only *delivers* 5, but it
> *reads* your entire match set to record what already exists. That read is
> capped at 500,000, and we check it when you create the watch, so a broader
> filter comes back `400` and you narrow it before anything runs. The cap
> applies to the baseline alone. Later runs deliver whatever newly matches,
> bounded by `config.max_results_per_run`.

> [!NOTE]
>
> Each run delivers matches whose profile was **added or updated since the last
> run**, a feed of *movement* within your filter set rather than a one-time
> export. For the full current match set, use
> [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md), or
> [Data Export](https://docs.crustdata.com/export-docs/data-export.md) to get it as a file.

### What a notification looks like

When a run has matches, we `POST` this body to each channel. Discovery records arrive under `results.added`, each in the person record shape projected to the watch's `fields`.

```json Webhook POST body theme={"theme":"vitesse-black"}
{
  "metadata": {
    "watch_id": 50960,
    "kind": "discovery",
    "dataset": "person",
    "api_version": "2025-11-01",
    "run_id": 64200,
    "notification_id": "ntf_64200",
    "delivered_at": "2026-09-03T07:31:20.000000Z",
    "summary": { "delivered": 2, "total_count": 2, "records_searched": 1204, "max_results_per_run": 25, "truncated": false, "records_stale": 1202 },
    "payload_delivery": { "type": "inline" }
  },
  "results": {
    "added": [
      {
        "crustdata_person_id": 6324687,
        "basic_profile": { "name": "…", "current_title": "Machine Learning Engineer", "headline": "…" },
        "social_handles": { "twitter_handle": "…" }
      },
      {
        "crustdata_person_id": 6324688,
        "basic_profile": { "name": "…", "current_title": "Senior Machine Learning Engineer", "headline": "…" },
        "social_handles": { "twitter_handle": "…" }
      }
    ]
  }
}
```

> [!NOTE]
>
> Response trimmed for clarity.

`summary.truncated` is `true` when the run matched more people than `max_results_per_run` allowed. With the default `overflow_policy: "redeliver"` the overflow is held back and arrives on a later run rather than being lost.

> [!NOTE]
>
> `overflow_policy` is accepted on create but is not echoed in the watch
> object, so a `GET` will not show you which policy a watch is on. Record it
> on your side if you need to know.

### Controlling which fields come back

`fields` picks exactly what each delivered person carries, using the same field-group names as [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/reference.md). Omit it and you get the standard projection.

```json theme={"theme":"vitesse-black"}
{
  "filters": { "field": "recently_changed_jobs", "type": "=", "value": true },
  "fields": ["basic_profile", "experience", "education"],
  "config": { "trigger": { "type": "interval", "every_hours": 24 } },
  "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
}
```

> [!NOTE]
>
> `fields` does **not** change the price. A delivered person costs 0.5 credits
> whether it carries one field group or ten. Every requested field is checked
> against your key's entitlements at creation, so a group your key cannot access
> fails the create rather than arriving empty.

***

## Realtime watches

A discovery watch reads the Crustdata index. A **realtime** watch searches the web
live on every run instead, so it finds people as they appear rather than waiting for
our index to pick them up.

Turn one on with `config.is_realtime: true`. The watch then takes two filter trees
instead of one.

### The contract

| Key | When you send it | Who answers it | What it holds |
| - | - | - | - |
| `config.is_realtime` | To make the watch realtime | Nothing. It is the switch. | `true`. No other value and no other key turns a watch realtime. |
| `realtime_filters` | Required once `is_realtime` is `true` | The live search | Only the person fields listed below. |
| `narrowing_filters` | Optional | The index of the dataset you name | One block, `person` or `company`, in that dataset's own grammar. |
| `filters` | Required on any other watch, refused here | The Crustdata index | Nothing, on a realtime watch. |

The live search runs first. `narrowing_filters` then checks the entity behind each
person it returned, so it can only drop people. It never adds any.

Send `realtime_filters` without the flag and the create fails. Neither can change
afterwards: a `PATCH` carrying `is_realtime`, `realtime_filters`, or
`narrowing_filters` is refused, so you make a new watch instead.

> [!WARNING]
>
> **`filters` is refused on a realtime watch.** It used to be where you put the
> conditions the live search could not answer, and that never worked: `filters`
> is asked of the person index, which has not yet seen a person the live search
> just found, so every result was dropped and the watch delivered nothing while
> reporting success. Send it now and you get a `400` telling you where the
> condition really goes.

### Filter fields the live person search accepts

These are the only field paths `realtime_filters` takes on a person watch.
Anything else, including any other person search field, belongs in
`narrowing_filters.person`.

**Role and employer**

| Field | Operators | Values |
| - | - | - |
| `experience.employment_details.current.title` | `=` `!=` `in` `not_in` `(.)` | Free text. |
| `experience.employment_details.past.title` | `=` `!=` `in` `not_in` `(.)` | Free text. |
| `experience.employment_details.current.seniority_level` | `=` `!=` `in` `not_in` | `Owner / Partner`, `CXO`, `Vice President`, `Director`, `Experienced Manager`, `Entry Level Manager`, `Strategic`, `Senior`, `Entry Level`, `In Training` |
| `experience.employment_details.current.company_name` | `=` `!=` `in` `not_in` | A company name, resolved to company IDs before the search runs. |
| `experience.employment_details.current.company_id` | `=` `!=` `in` `not_in` | A company ID you already hold. |
| `experience.employment_details.current.company_linkedin_profile_url` | `=` `!=` `in` `not_in` | A company profile URL. |
| `experience.employment_details.current.company_website_domain` | `=` `!=` `in` `not_in` | A domain, for example `stripe.com`. |
| `experience.employment_details.past.company_name` | `=` `!=` `in` `not_in` | The same four employer spellings, under `past`. |
| `experience.employment_details.past.company_id` | `=` `!=` `in` `not_in` | |
| `experience.employment_details.past.company_linkedin_profile_url` | `=` `!=` `in` `not_in` | |
| `experience.employment_details.past.company_website_domain` | `=` `!=` `in` `not_in` | |
| `experience.employment_details.last_company.name` | `=` `!=` `in` `not_in` | Checked per person on what the search returned, not sent to the search. |

The four employer spellings all mean the same filter, so pick whichever one you
already hold. A name is resolved to company IDs first, which is what makes
`company_name` match the same people here as it does on the index rather than
every company whose name contains the word.

**Employer firmographics**

| Field | Operators | Values |
| - | - | - |
| `experience.employment_details.current.company_headcount_range` | `=` `in` | `myself only`, `2-10`, `11-50`, `51-200`, `201-500`, `501-1000`, `1001-5000`, `5001-10000`, `10001+` |
| `experience.employment_details.current.company_industries` | `=` `!=` `in` `not_in` | An industry name. |
| `experience.employment_details.current.company_headquarters_country` | `=` `!=` `in` `not_in` | A country name. |

**Location**

| Field | Operators | Values |
| - | - | - |
| `basic_profile.location.country` | `=` `!=` `in` `not_in` | A country name. |
| `basic_profile.location.state` | `=` `!=` `in` `not_in` | A state or region name. |
| `basic_profile.location.city` | `=` `!=` `in` `not_in` | A city name. |

A city or state on its own is enough, for example `Berlin`: the watch places it
on a region the live search knows. A country or state beside it places the name
more precisely, and when you give all three the watch searches on the most
specific one. A value the watch cannot place is refused, so pick another value
from autocomplete or use `basic_profile.location.country`.

**Tenure**

| Field | Operators | Values |
| - | - | - |
| `years_of_experience` | `=>` `=<` | A bucket edge: `=>` one of `0`, `1`, `3`, `6`, `11`; `=<` one of `0`, `2`, `5`, `10`. |
| `experience.employment_details.current.start_date` | `=>` `=<` | The same edges written as `now-<N>y`, whole years only. |
| `experience.employment_details.current.years_at_employer` | `=>` `=<` | The same bucket edges. |

These map to the live search's tenure bands: under 1 year, 1 to 2, 3 to 5, 6 to
10, and over 10. A bound inside a band rather than on its edge is refused, with
the accepted bounds in the message. `start_date` reads as an age, so
`=< now-1y` means "at least a year in the role".

**Keywords and signals**

| Field | Operators | Values |
| - | - | - |
| `basic_profile.headline` | `(.)` | Free text. Counts as the watch's one keyword. |
| `basic_profile.summary` | `(.)` | Free text. Counts as the watch's one keyword. |
| `basic_profile.first_name` | `=` | Free text. |
| `basic_profile.last_name` | `=` | Free text. |
| `education.schools.school` | `=` `!=` `in` `not_in` `(.)` | A school name. |
| `recently_changed_jobs` | `=` | `true` only. |
| `professional_network.recently_posted` | `=` | `true` only. |
| `professional_network.mentioned_in_news` | `=` | `true` only. |

The three flags take `= true` and nothing else. `= false` is refused rather than
read as "exclude", because the live search has no filter for the absence of a
signal. `recently_posted` and `mentioned_in_news` exist only on a realtime watch:
they are not person index fields, so they are refused in `narrowing_filters.person`.

You write the same values here as you do on an index watch. Use
[Person Autocomplete](https://docs.crustdata.com/person-docs/autocomplete/introduction.md) and
[filter values](https://docs.crustdata.com/person-docs/filter-values.md) to find them, exactly as you would for
an index-tier watch.

### Tree shape

The live search takes an AND of filters, with OR only between values of one
filter, so `realtime_filters` accepts:

* A top-level `and` group of leaves, or a single bare leaf.
* An `or` group inside it only when every leaf names the **same field** and uses
  an include operator (`=`, `in`, `(.)`). Use it as a value list.
* No nested `and` groups.
* No `sorts` on the watch at all. A live search has no stable order.
* One keyword per watch. `headline` and `summary` feed a single free-text box, so
  naming both folds them into one expression.

Exclusion is only where the operator column says so. `company_headcount_range`
takes `=` and `in` because the live search cannot exclude a size band; put that
negation in `narrowing_filters.person`, where every negation operator works.

### What goes in `narrowing_filters`

Everything the live search cannot be asked. A person the live search just found
is too new for the person index to hold, so narrowing asks about the durable entity
behind them instead: the person as our index already knows them, or the
company they work at now.

```json theme={"theme":"vitesse-black"}
"narrowing_filters": {
  "person": { "op": "and", "conditions": [ ... ] }
}
```

| Block | Asked of | Write it in | Matched on |
| - | - | - | - |
| `person` | The person index | [Person Search](https://docs.crustdata.com/person-docs/search/reference.md) grammar | The profile URL the live search returned |
| `company` | The company index | [Company Search](https://docs.crustdata.com/company-docs/search/reference.md) grammar | The employer with no end date on the profile |

**Name one block.** A person watch may narrow on `person` or on `company`, and a
watch names whichever one its condition is about.

A block keeps the dataset's full search grammar, unlike `realtime_filters`: an `or`
across two different fields, nested groups, and every negation operator all work,
because an index answers it rather than the live search.

So put in `narrowing_filters.person`:

* Any person field not in the tables above, such as
  `experience.employment_details.current.function_category`.
* `or` across two different fields, nested groups, and every negation operator.

And in `narrowing_filters.company`, any condition about the current employer, in
company grammar: `basic_info.employee_count_range`, `basic_info.year_founded`,
funding, and the rest of [Company Search](https://docs.crustdata.com/company-docs/search/reference.md). Naming
a company field in `realtime_filters` is refused and the message points you here.

A block is a plain tree in its own dataset's vocabulary, so a person field inside
the `company` block is refused rather than resolved:

```
'basic_profile.location.country' is a person field, so it cannot be asked of the company block. Put it under 'narrowing_filters.person' instead.
```

`job` and `social_post` are not narrowing blocks. Only a durable entity has an
index copy to ask about, so a condition about anything else belongs in
`realtime_filters`.

> [!NOTE]
>
> **Leave `narrowing_filters` out and nothing is dropped.** Every person the
> live search returns is delivered.
>
> Send a block and it is checked against that dataset's index. A person whose
> entity the index does not hold is dropped rather than delivered unchecked, so
> add a block when you would rather miss a person than deliver one nobody
> checked.

You cannot write one `or` spanning both keys. They are separate, which matches
what the watch can do: a person the live search never returned cannot be brought
back by a later stage.

### Limits

| | |
| - | - |
| How often it runs | Once a day at most. `config.trigger.every_hours` must be `24` or more. |
| How many people it may follow | **10,000.** The live person search reports how many people your `realtime_filters` cover, and a watch over the cap is refused at creation. The count is taken on `realtime_filters` alone, so a narrow `narrowing_filters` will not bring a broad watch under it. |
| What a person costs | 150 credits at the 1-day SLA, against 0.5 at the 30-day SLA an index watch runs on. The create response echoes `config.refresh_frequency_days: 1`. The first run is still a free sample of up to 5, and a run that finds nothing new costs nothing. See [Pricing](https://docs.crustdata.com/general/pricing.md). |
| What comes back | Only the fields a live person carries. Leave `fields` out and the create response lists them for you. |

### Realtime examples

> [accordion] A persona, searched live and narrowed by function
>
> The live search handles the title, seniority, and region. `function_category` is
> a person index field with no live filter behind it, so it narrows afterwards.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "experience.employment_details.current.title", "type": "(.)", "value": "Head of Revenue Operations" },
>         { "field": "experience.employment_details.current.seniority_level", "type": "in", "value": ["Director", "Vice President"] },
>         { "field": "basic_profile.location.country", "type": "in", "value": ["United States"] }
>       ]
>     },
>     "narrowing_filters": {
>       "person": {
>         "op": "and",
>         "conditions": [
>           { "field": "experience.employment_details.current.function_category", "type": "in", "value": ["Sales", "Operations"] }
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
>     "id": 53047,
>     "kind": "discovery",
>     "dataset": "person",
>     "api_version": "2025-11-01",
>     "config_version": "2025-11-01",
>     "status": "active",
>     "filters": null,
>     "narrowing_filters": {
>         "person": {
>             "op": "and",
>             "conditions": [
>                 { "field": "experience.employment_details.current.function_category", "type": "in", "value": ["Sales", "Operations"] }
>             ]
>         }
>     },
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "experience.employment_details.current.title", "type": "(.)", "value": "Head of Revenue Operations" },
>             { "field": "experience.employment_details.current.seniority_level", "type": "in", "value": ["Director", "Vice President"] },
>             { "field": "basic_profile.location.country", "type": "in", "value": ["United States"] }
>         ]
>     },
>     "on": ["added"],
>     "sorts": null,
>     "fields": [
>         "basic_profile.name",
>         "basic_profile.headline",
>         "basic_profile.summary",
>         "basic_profile.current_title",
>         "basic_profile.languages",
>         "basic_profile.location",
>         "basic_profile.profile_picture_permalink",
>         "professional_network.connections",
>         "social_handles.professional_network_identifier",
>         "social_handles.twitter_identifier",
>         "experience.employment_details.current",
>         "experience.employment_details.past",
>         "skills",
>         "education.schools"
>     ],
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
>     "created_at": "2026-09-17T13:02:11.482913Z",
>     "last_run_at": null,
>     "last_notified_at": null,
>     "notifications_count": 0,
>     "credits_consumed": 0
> }
> ```
>
> `fields` comes back filled with everything a live person record carries, and
> `config` echoes `is_realtime: true`.

> [accordion] People who just changed jobs
>
> `recently_changed_jobs` is a live-only signal: a new decision maker who has not
> yet chosen their tooling. The employer size band is a condition about the company
> they just joined, so it goes in the `company` block and is answered by the company
> index.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "recently_changed_jobs", "type": "=", "value": true },
>         { "field": "experience.employment_details.current.title", "type": "(.)", "value": "VP of Sales" },
>         { "field": "basic_profile.location.country", "type": "in", "value": ["United States"] }
>       ]
>     },
>     "narrowing_filters": {
>       "company": { "field": "basic_info.employee_count_range", "type": "in", "value": ["51-200", "201-500"] }
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 53048,
>     "kind": "discovery",
>     "dataset": "person",
>     "status": "active",
>     "filters": null,
>     "narrowing_filters": {
>         "company": { "field": "basic_info.employee_count_range", "type": "in", "value": ["51-200", "201-500"] }
>     },
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "recently_changed_jobs", "type": "=", "value": true },
>             { "field": "experience.employment_details.current.title", "type": "(.)", "value": "VP of Sales" },
>             { "field": "basic_profile.location.country", "type": "in", "value": ["United States"] }
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
> Response trimmed to the keys under discussion. The live search has its own size
> band, `experience.employment_details.current.company_headcount_range`, so this
> could have gone in `realtime_filters` instead. Putting it in the `company` block
> leaves the live search to do the one thing only it can do, which is spot the job
> change.

> [accordion] Executives showing up in the news
>
> `mentioned_in_news` only exists at the live tier. This watch needs several
> conditions because the cap is measured on `realtime_filters`.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/person/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "professional_network.mentioned_in_news", "type": "=", "value": true },
>         { "field": "experience.employment_details.current.seniority_level", "type": "in", "value": ["CXO"] },
>         { "field": "experience.employment_details.current.company_industries", "type": "in", "value": ["Software Development"] },
>         { "field": "experience.employment_details.current.company_headcount_range", "type": "in", "value": ["201-500", "501-1000"] },
>         { "field": "basic_profile.location.state", "type": "in", "value": ["California"] },
>         { "field": "basic_profile.location.country", "type": "in", "value": ["United States"] }
>       ]
>     },
>     "narrowing_filters": {
>       "person": {
>         "op": "and",
>         "conditions": [
>           { "field": "experience.employment_details.current.function_category", "type": "in", "value": ["Engineering"] }
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
>     "id": 53049,
>     "kind": "discovery",
>     "dataset": "person",
>     "status": "active",
>     "filters": null,
>     "narrowing_filters": {
>         "person": {
>             "op": "and",
>             "conditions": [
>                 { "field": "experience.employment_details.current.function_category", "type": "in", "value": ["Engineering"] }
>             ]
>         }
>     },
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "professional_network.mentioned_in_news", "type": "=", "value": true },
>             { "field": "experience.employment_details.current.seniority_level", "type": "in", "value": ["CXO"] },
>             { "field": "experience.employment_details.current.company_industries", "type": "in", "value": ["Software Development"] },
>             { "field": "experience.employment_details.current.company_headcount_range", "type": "in", "value": ["201-500", "501-1000"] },
>             { "field": "basic_profile.location.state", "type": "in", "value": ["California"] },
>             { "field": "basic_profile.location.country", "type": "in", "value": ["United States"] }
>         ]
>     },
>     "config": {
>         "trigger": { "type": "interval", "every_hours": 24 },
>         "is_realtime": true,
>         "refresh_frequency_days": 1
>     },
>     "notifications": []
> }
> ```
>
> Response trimmed to the keys under discussion. Drop the state and the size band
> and the same watch is refused for covering 78,123 people.

### Realtime errors

Every failure is a `400` in the usual envelope. `error.metadata[].field` tells a
`realtime_filters` problem from a `narrowing_filters` one, and names the block.

| What you did | What comes back |
| - | - |
| `filters` on a realtime watch | `'filters' is the index tier's tree and cannot narrow a realtime watch...` |
| `is_realtime: true`, no `realtime_filters` | `realtime_filters is required when config.is_realtime is true...` |
| `realtime_filters`, no `is_realtime` | `realtime_filters needs config.is_realtime: true...` plus `filters` now required |
| `narrowing_filters`, no `is_realtime` | `narrowing_filters needs config.is_realtime: true...` |
| `narrowing_filters` inside `config` | `narrowing_filters goes at the top level of the body, beside realtime_filters...` |
| A person index field in `realtime_filters` | `'<field>' is not something the live search can be asked for. Move it under 'narrowing_filters.person'...` |
| A city or state the watch cannot place | `value '<place>' for 'basic_profile.location.city' is not something the live search can be asked for. Couldn't resolve this city to a place the live search knows. Try another value from person autocomplete on basic_profile.location.city, or use basic_profile.location.country...` |
| A company condition in `realtime_filters` | `'company filters on a person watch' is not something the live search can be asked for. Move it under 'narrowing_filters.company'...` |
| A block other than `person` or `company` | `A person watch cannot narrow on <name>. It may narrow on: person, company...` |
| A person field inside the `company` block | `'<field>' is a person field, so it cannot be asked of the company block...` |
| An `or` across two different fields | `An 'or' is available only across values of one field.` |
| A nested `and` group | `Nested 'and' groups are not available.` |
| `sorts` on a realtime watch | `The live search has no stable sort order.` |
| `every_hours` under `24` | `config.trigger.every_hours must be at least 24...` |
| `realtime_filters` matching over 10,000 people | `This watch would follow N records, more than the 10,000...` |
| `config.refresh_frequency_days`, any value | `config.refresh_frequency_days is not accepted on a discovery watch...` |
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

> [accordion] A person index field in realtime\_filters
>
> ```json 400 theme={"theme":"vitesse-black"}
> {
>     "error": {
>         "type": "invalid_request",
>         "message": "realtime_filters: 'experience.employment_details.current.function_category' is not something the live search can be asked for. Move it under 'narrowing_filters.person', expressed in person's own vocabulary.",
>         "metadata": [
>             {
>                 "field": "realtime_filters",
>                 "type": "unsupported",
>                 "message": "realtime_filters: 'experience.employment_details.current.function_category' is not something the live search can be asked for. Move it under 'narrowing_filters.person', expressed in person's own vocabulary."
>             }
>         ]
>     }
> }
> ```
>
> The message names the field you wrote and where it can go instead. The same shape
> covers an operator the field does not take and a value outside its list.

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
{ "type": "webhook", "url": "https://your-app.com/webhooks/crustdata", "headers": { "X-Watch-Name": "ml-engineers-paris" } }
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

By default a run's people arrive inside the notification, under `results`. Set `config.payload_delivery_type` to `"link"` and the body carries no records at all. It carries `metadata.payload_delivery.url` instead, a pre-signed S3 URL for one NDJSON file holding every record of that run.

Switch when a run can outgrow what your receiver accepts. An AWS Lambda proxy integration caps a request at 6 MB and an ALB target at 1 MB, and an oversize body is refused whole.

```bash theme={"theme":"vitesse-black"}
curl --request PATCH \
  --url https://api.crustdata.com/watch/person/search/50960 \
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

A person watch is not limited to person fields. Drop a company field or a job field into the same flat `conditions` list and the watch filters on where those people work, or on what their employer is hiring for:

```json theme={"theme":"vitesse-black"}
{
  "op": "and",
  "conditions": [
    { "field": "experience.employment_details.current.title", "type": "(.)", "value": "platform engineer" },
    { "field": "technographics.technologies.name",            "type": "=",   "value": "Kubernetes" }
  ]
}
```

Platform engineers at companies running Kubernetes. Technology stack lives only on company records, so that second half is not reachable from a person-only watch.

There is no new syntax and no second filter list. You write one flat set of conditions, mixing fields from any dataset, and the watch works out where each field lives.

> [!NOTE]
>
> Cross-dataset filters are an **index-tier discovery watch** feature. An
> [entity watcher](https://docs.crustdata.com/watcher-docs/person/entity.md) tracks a list you supply, so it
> has no filter to widen, and a [realtime watch](#realtime-watches) reaches the
> employer through `narrowing_filters.company` instead, which is one named block
> rather than a flat list the watch sorts by field name.

### What you can combine

| A person watch can also filter on | Joined through |
| - | - |
| Company fields | The person's current employer |
| Job fields | The person's current employer, through the roles it posts |

A single watch can pull from all three datasets at once.

> [!NOTE]
>
> The join runs through each person's **current employer** only. A company
> condition describes where they work now, not anywhere they have worked.

### The rules in one place

Field names decide the dataset, so there is nothing to declare:
`experience.employment_details.current.title` is a person field,
`headcount.total` a company field, and `job_details.title` a job field.
Conditions from another dataset are answered first, come back as a set of company
IDs, and narrow your watch through each person's current employer. Delivery,
deduplication, per-run caps, and the payload shape are unchanged, and you are
still charged 0.5 credits per person. Reading the other dataset is free.

A cross-dataset condition may cover at most **1,000,000 companies**, checked at
creation and measured on the cross-dataset conditions alone. Row-level negation
(`!=`, `not_in`, `(!)`, `not_contains`, `geo_exclude`) is rejected on a condition
from another dataset, because it matches people whose employer has *some other*
matching row rather than none.

The payload carries people and nothing else. To pull the employer's own record,
call `POST /company/enrich` yourself with the `crustdata_company_id` on the
delivered person's current employer.

See [Cross-dataset filters](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md) for the join
rules, the grouping semantics, the lookup fields for that follow-up call, the
limits with their exact errors, and how timing and deduplication change.

***

## Test your receiver before a run fires

Push one sample notification through a watch to verify your receiver end to end, without waiting for a person to actually appear.

```
POST https://api.crustdata.com/watch/person/search/{watch_id}/test
```

The sample is built from **real current matches** of the watch's own filter and shaped through the same processor a real run uses, so the payload is identical to production apart from `metadata.test: true`. The call records nothing: it creates no run, does not advance the seen set, and costs no credits.

| Field | Type | Description |
| - | - | - |
| `notification_endpoint` | string | Deliver this one test to a URL you control instead of the watch's channels. Must be a **public** `http(s)` URL. |
| `count` | integer | Deliver `N` sample people (`1` to `25`) in one envelope. Default `1`. |
| `deliver` | boolean | Send `false` to get the envelope back without any outbound request. |

```bash theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/watch/person/search/50960/test \
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
| List your watches | `GET /watch/person/search?status=active&limit=50&offset=0` |
| Get one | `GET /watch/person/search/{id}` |
| Pause / resume | `PATCH /watch/person/search/{id}` with `{ "status": "paused" }` |
| Reschedule | `PATCH /watch/person/search/{id}` with a new `config` |
| Replace the channels | `PATCH /watch/person/search/{id}` with a new `notifications` |
| Cancel | `DELETE /watch/person/search/{id}` → `204` |
| Run history | `GET /watch/person/{id}/runs?limit=20` |
| One run, with records | `GET /watch/person/{id}/runs/{run_id}/summary` |

```bash List runs theme={"theme":"vitesse-black"}
curl --request GET \
  --url 'https://api.crustdata.com/watch/person/50960/runs?limit=20' \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

```bash Run detail (delivered records) theme={"theme":"vitesse-black"}
curl --request GET \
  --url https://api.crustdata.com/watch/person/50960/runs/54811/summary \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

```bash Pause a watch theme={"theme":"vitesse-black"}
curl --request PATCH \
  --url https://api.crustdata.com/watch/person/search/50960 \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{ "status": "paused" }'
```

```bash Cancel a watch theme={"theme":"vitesse-black"}
curl --request DELETE \
  --url https://api.crustdata.com/watch/person/search/50960 \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

> [!NOTE]
>
> The read paths drop the `search/` segment that create and manage use:
> you create at `/watch/person/search` and read runs at
> `/watch/person/{id}/runs`.

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

Worked recipes you can copy, paste, and adapt. Each one is a full working request, verified against the live API. Swap the notification channel for your own. For the operator list, field catalog, and validation rules, see the [Person Search reference](https://docs.crustdata.com/person-docs/search/reference.md).

> [accordion] Follow a persona at a company-size band
>
> Combine a set of titles with a headcount band on the current employer. This watch delivers new finance leaders at companies between 51 and 500 employees.
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
>         { "field": "experience.employment_details.current.title", "type": "in", "value": ["Chief Financial Officer", "VP Finance", "Vice President Finance"] },
>         { "field": "experience.employment_details.current.company_headcount_latest", "type": "=>", "value": 51 },
>         { "field": "experience.employment_details.current.company_headcount_latest", "type": "=<", "value": 500 }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > `in` is an exact-match list, so it catches only the title strings you name.
> > Use `(.)` when you want every variant of a title, at the cost of a broader
> > match set.

> [accordion] Follow a seniority level with a specific skill
>
> Pair `seniority_level` with a skill so the feed stays about the right kind of person, not just the right rank. This watch delivers CXO-level people with machine-learning skills, to Slack.
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
>         { "field": "experience.employment_details.current.seniority_level", "type": "=", "value": "CXO" },
>         { "field": "skills.professional_network_skills", "type": "(.)", "value": "machine learning" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "slack", "webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX" } ]
>   }'
> ```

> [accordion] Catch people who just changed jobs
>
> `recently_changed_jobs` is a movement signal: a new decision-maker who has not yet chosen their tooling. This watch delivers VPs of Sales who recently moved.
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
>         { "field": "experience.employment_details.current.title", "type": "(.)", "value": "VP of Sales" },
>         { "field": "recently_changed_jobs", "type": "=", "value": true }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "fields": ["basic_profile", "experience"],
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!TIP]
> >
> > Request `experience` in `fields` so the payload carries the new employer, not
> > just the person. Without it you get the default projection and have to look the
> > employer up yourself.

> [accordion] Follow alumni, excluding employers you don't care about
>
> `not_in` is fine on your watch's own dataset, so you can subtract employers from a persona. This watch delivers Stanford alumni who are not currently at Google, Meta, or Amazon, checked weekly.
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
>         { "field": "education.schools.school", "type": "(.)", "value": "Stanford" },
>         { "field": "experience.employment_details.current.company_name", "type": "not_in", "value": ["Google", "Meta", "Amazon"] }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 168 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Follow people who left a company for a smaller one
>
> A past-employer condition plus a headcount bound on the current employer gives you a "left the big company" feed. This watch delivers ex-Stripe people now at companies of 200 or fewer.
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
>         { "field": "experience.employment_details.past.company_name", "type": "=", "value": "Stripe" },
>         { "field": "experience.employment_details.current.company_headcount_latest", "type": "=<", "value": 200 }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "fields": ["basic_profile", "experience"],
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Watch a radius around a city
>
> The `geo_distance` operator on `professional_network.location.raw` bounds a watch to a metro rather than a named city string, which catches the suburbs a `(.)` match misses. This watch delivers founders within 25 miles of San Francisco.
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
>         {
>           "field": "professional_network.location.raw",
>           "type": "geo_distance",
>           "value": { "location": "San Francisco", "distance": 25, "unit": "mi" }
>         },
>         { "field": "experience.employment_details.current.title", "type": "(.)", "value": "founder" }
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
> > explicit `lat_lng` pair, which skips geocoding. `distance` is required; `unit`
> > defaults to `km` and also accepts `mi`.

> [accordion] Follow a certification in a country
>
> Certifications are a strong proxy for a skill a person actually invested in. This watch delivers AWS Solutions Architects in India.
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
>         { "field": "certifications.name", "type": "(.)", "value": "AWS Certified Solutions Architect" },
>         { "field": "professional_network.location.country", "type": "=", "value": "India" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "fields": ["basic_profile", "certifications"],
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Bound a persona by years of experience
>
> `years_of_experience` keeps a title feed away from people who are too junior for it. This watch delivers US product managers with eight or more years of experience.
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
>         { "field": "experience.employment_details.current.title", "type": "(.)", "value": "product manager" },
>         { "field": "years_of_experience", "type": "=>", "value": 8 },
>         { "field": "professional_network.location.country", "type": "=", "value": "United States" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 }, "max_results_per_run": 100 },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!WARNING]
> >
> > Drop the country condition and this filter matches 914,062 people, past the
> > baseline limit, and the create comes back `This watch would follow 914,062
> >           records, more than the 500,000 a single watch can track. Please narrow your
> >           filters.`

> [accordion] Filter on a normalized department instead of a raw title
>
> Raw titles vary by company; the normalized department does not. This watch delivers US executive leadership who recently changed jobs, without you having to enumerate every title variant.
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
>         { "field": "basic_profile.normalized_title.department", "type": "=", "value": "Executive Leadership" },
>         { "field": "professional_network.location.country", "type": "=", "value": "United States" },
>         { "field": "recently_changed_jobs", "type": "=", "value": true }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > `basic_profile.normalized_title.*` is beta and its values are a fixed
> > vocabulary, so check yours against
> > [Job title normalization](https://docs.crustdata.com/guides/job-title-normalization.md) before you rely on
> > it. A department string outside that vocabulary matches nothing and the watch
> > stays silent.
>
> > [!WARNING]
> >
> > A department is a wide net on its own. Department plus country alone matches
> > 12,071,056 people and is rejected past the baseline limit, so the
> > `recently_changed_jobs` condition here is what makes the watch creatable.

> [accordion] Cross-dataset: people at companies running a technology
>
> A company field alongside a person field asks a question neither dataset answers alone. This watch delivers platform engineers at companies running Kubernetes.
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
>         { "field": "experience.employment_details.current.title", "type": "(.)", "value": "platform engineer" },
>         { "field": "technographics.technologies.name",            "type": "=",   "value": "Kubernetes" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> The delivered payload carries people only. To pull the employer's own record, call `POST /company/enrich` with the `crustdata_company_id` on the delivered person's current employer. See [Records from the other dataset](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md#records-from-the-other-dataset).

> [accordion] Cross-dataset: people at fast-growing companies
>
> Headcount growth lives only on the company record, so this pairing is out of reach from a person-only watch. This watch delivers recruiters at companies that grew more than 50% in six months, which is close to a "they are about to hire hard" signal.
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
>         { "field": "experience.employment_details.current.title", "type": "(.)", "value": "recruiter" },
>         { "field": "headcount.growth_percent.6m",                 "type": ">",   "value": 50 }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Cross-dataset: people whose employer is hiring for a role
>
> A job field joins through the current employer, so you can find people at companies staffing up a specific function. This watch delivers engineering managers at companies hiring data engineers.
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
>         { "field": "experience.employment_details.current.title", "type": "(.)", "value": "engineering manager" },
>         { "field": "job_details.title",                           "type": "(.)", "value": "data engineer" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Cross-dataset: founders at recently funded companies
>
> Funding dates live on the company record. This watch delivers founders whose company closed a round on or after 2025-06-01, a fresh-budget signal for anything sold to new companies.
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
>         { "field": "experience.employment_details.current.title", "type": "(.)", "value": "founder" },
>         { "field": "funding.last_fundraise_date",                 "type": "=>",  "value": "2025-06-01" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "fields": ["basic_profile", "experience"],
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Deliver a large run as a linked file
>
> Raise the per-run cap and switch the payload to a link when a run can outgrow what your receiver accepts.
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
>   --url https://api.crustdata.com/watch/person/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": { "field": "recently_changed_jobs", "type": "=", "value": true },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```bash Read a run theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url https://api.crustdata.com/watch/person/50960/runs/54811/summary \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> Useful when you would rather poll than expose a receiver, and for a first pass at a filter before you wire a channel to it.

***

***

## Error handling

A person discovery watch answers every failure the same way, whether you are creating a watch, editing one, testing delivery, or reading run history.

| Status | Type | Common causes |
| - | - | - |
| `400` | `invalid_request` | An unknown filter field or operator, `filters` or `config` left out, `config.trigger.every_hours` below `1`, a `fields` entry that is not a person field path, a filter set broader than the 500,000-record baseline cap, a missing or unsupported `x-api-version`, or a `PATCH` to a key fixed at creation. |
| `401` | `unauthorized` | Missing or invalid API key. |
| `403` | `permission_error` | Your key is not entitled to the person dataset, or to a field group you named in `fields`. |
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
| Each new person delivered on later runs | **0.5** |

You are charged only for people actually delivered, never for a run that finds nothing new, and never for reading another dataset to narrow your filters. See [Pricing](https://docs.crustdata.com/general/pricing.md) for the full catalog.

## What to do next

* **Watch a known list instead**: use the [Person Entity Watcher](https://docs.crustdata.com/watcher-docs/person/entity.md) to track profile changes on people you already hold.
* **Look up operators and fields**: see the [Person Search reference](https://docs.crustdata.com/person-docs/search/reference.md) for the full filter catalog.
* **Check a filter before you watch it**: run it through [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) and confirm `total_count` is not zero.
* **Choose how records travel**: see [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md) for inline versus linked NDJSON.


## Related topics

- [Person Entity Watcher](https://docs.crustdata.com/watcher-docs/person/entity.md)
- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [Pricing](https://docs.crustdata.com/general/pricing.md)
- [Cross-dataset filters](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md)
- [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md)
