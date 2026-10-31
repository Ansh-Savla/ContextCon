> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Job Watcher

> Turn a job search into a recurring feed. A Job Watcher re-runs your filters on a schedule and delivers newly posted jobs to a webhook, Slack, Google Chat, or email.

**Use this when** you want new postings to keep arriving on their own: roles at your target accounts, hiring signals in a market, or every opening in a function, with no manual re-running.

A Job Watcher turns a [Job Search](https://docs.crustdata.com/job-docs/search/introduction.md) filter into a recurring feed. Each run re-evaluates your filters and delivers only the **new** matching jobs. This page walks you through the basics: your first watch, the response shape, the notification shape, and filters that reach into the company and person datasets, then folds in worked recipes you can copy, paste, and adapt.

Every request goes to the same endpoint:

```
POST https://api.crustdata.com/watch/job/search
```

> [!NOTE]
>
> Replace `YOUR_API_KEY` in each example with your actual API key. All
> requests require the `x-api-version: 2025-11-01` header.

### Request body

| Parameter | Type | Required | Default | Description |
| - | - | - | - | - |
| `filters` | object | Yes\* | - | A single filter condition or a nested `and`/`or` group, identical to [Job Search](https://docs.crustdata.com/job-docs/search/reference.md). |
| `realtime_filters` | object | No | - | What the live search is asked for on a [realtime watch](#realtime-watches). Requires `config.is_realtime`. |
| `narrowing_filters` | object | No | - | Narrows a [realtime watch](#realtime-watches) on the hiring company behind each posting, keyed by dataset. Requires `config.is_realtime`. |
| `config` | object | Yes | - | Schedule and per-run caps. See [config](#config) below. |
| `notifications` | object\[] | Yes | - | Delivery channels. May be `[]` for a pull-only watch you read from the run endpoints. |
| `fields` | string\[] | No | standard set | Dot-path fields or field groups to include in each delivered job. |
| `sorts` | object\[] | No | - | Delivery order within a run, for example `[ { "field": "metadata.date_added", "order": "desc" } ]`. |
| `on` | string\[] | No | `["added"]` | Which membership transitions notify you. Only `added` is supported today. |
| `overflow_policy` | string | No | `redeliver` | What happens to matches beyond `max_results_per_run`. `redeliver` holds them for a later run, `drop` discards them. |

\* Required on an ordinary watch and refused on a realtime one, where
`realtime_filters` is what the watch runs on and `narrowing_filters` narrows the
result.

#### `config`

| Parameter | Type | Required | Default | Description |
| - | - | - | - | - |
| `trigger` | object | Yes | - | `{ "type": "interval", "every_hours": N }`. How often the watch runs, for example `1`, `6`, `24`, `168`. |
| `max_results_per_run` | integer | No | `25` | Jobs delivered per run, `1` to `10000`. A value above `1000` needs `payload_delivery_type` `"link"`. The baseline run is always capped at 5. |
| `preferred_hour` | integer | No | - | Hour of day in UTC (`0` to `23`) to prefer for the run. |
| `expires_at` | string | No | - | Auto-expire date, `YYYY-MM-DD`. The watch stops running after it. |
| `payload_delivery_type` | string | No | `"inline"` | `"inline"` or `"link"`. See [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md). |
| `is_realtime` | boolean | No | `false` | Run the search against a live search rather than the index. Requires `realtime_filters`, and forces `every_hours` to `24` or more. See [Realtime discovery watches](#realtime-watches). |

> [!TIP]
>
> Bound your filter by posting date. A leaf like
> `{ "field": "metadata.date_added", "type": "=>", "value": "2026-08-01" }`
> keeps the watch focused on fresh postings instead of the full historical pool.
> Thirty days back is a good default.

### Response body

Create returns the whole watch, so you can confirm what was stored before the baseline run starts.

| Field | Type | Description |
| - | - | - |
| `id` | integer | The watch's id. Use it on every management and run-history path. |
| `kind` | string | `"discovery"`. |
| `dataset` | string | `"job"`. |
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
| `notifications_count` | integer | All-time count of jobs this watch has delivered. |
| `credits_consumed` | number | All-time credits this watch has spent. |

### Rate limits and credits

**Pricing:** the first run is a free baseline (a sample of up to 5
matches), then `0.5 credits per new job` delivered, or
`150 credits` at the
[1-day SLA](#realtime-watches). A run that finds
nothing new costs nothing.
For your own price per job, open the
[watch builder](https://app.crustdata.com/watch?type=discovery\&dataset=job\&sla=30) in the dashboard.

* **Rate limit:** 10 requests per minute on `/watch/job/search`. Each watch path keeps its own budget. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).
* **Baseline limit:** 500,000 jobs. See [How a watch runs](#how-a-watch-runs).
* **Watched list:** filters are fixed once created. To change what you watch for, create a new watch.

> [card] [Examples](#examples)
>
> Titles, locations, company size, recency, cross-dataset recipes.

> [card] [Cross-dataset filters](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md)
>
> Filter a job watch on the company behind the posting or the people it employs.

> [card] [Job Search reference](https://docs.crustdata.com/job-docs/search/reference.md)
>
> Every filter `field`, operator, and value.

***

## Your first watch: a role, a country, a company size

The simplest watch is a search filter plus a schedule and one channel. This one delivers new software engineer roles in the United States at companies of 3,000 or more, newest first.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/watch/job/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "filters": {
      "op": "and",
      "conditions": [
        { "field": "job_details.title", "type": "(.)", "value": "software engineer" },
        { "field": "location.country", "type": "=", "value": "United States" },
        { "field": "company.headcount.total", "type": "=>", "value": 3000 }
      ]
    },
    "config": { "trigger": { "type": "interval", "every_hours": 24 }, "max_results_per_run": 25 },
    "sorts": [ { "field": "metadata.date_added", "order": "desc" } ],
    "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
    "id": 50973,
    "kind": "discovery",
    "dataset": "job",
    "api_version": "2025-11-01",
    "config_version": "2025-11-01",
    "status": "active",
    "filters": {
        "op": "and",
        "conditions": [
            { "field": "job_details.title", "type": "(.)", "value": "software engineer" },
            { "field": "location.country", "type": "=", "value": "United States" },
            { "field": "company.headcount.total", "type": "=>", "value": 3000 }
        ]
    },
    "on": ["added"],
    "sorts": [ { "field": "metadata.date_added", "order": "desc" } ],
    "fields": null,
    "config": {
        "trigger": { "type": "interval", "every_hours": 24 },
        "max_results_per_run": 25,
        "expires_at": null,
        "preferred_hour": null,
        "payload_delivery_type": "inline"
    },
    "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ],
    "created_at": "2026-09-03T07:33:10.127537Z",
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
* **`sorts`**: sets the delivery order within a run. It does not change which jobs are new, only which ones you see first when a run is capped.

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
delivers jobs **new since the previous run**, up to `max_results_per_run`. You
are charged 0.5 credits per job delivered.

> [!NOTE]
>
> **Baseline limit: 500,000 jobs.** The baseline run only *delivers* 5, but it
> *reads* your entire match set to record what already exists. That read is
> capped at 500,000, and we check it when you create the watch, so a broader
> filter comes back `400` and you narrow it before anything runs. The cap
> applies to the baseline alone. Later runs deliver whatever newly matches,
> bounded by `config.max_results_per_run`.

### What a notification looks like

When a run has matches, we `POST` this body to each channel. Discovery records arrive under `results.added`, each carrying the posting, the company, and the location.

```json Webhook POST body theme={"theme":"vitesse-black"}
{
  "metadata": {
    "watch_id": 50973,
    "kind": "discovery",
    "dataset": "job",
    "api_version": "2025-11-01",
    "run_id": 64210,
    "notification_id": "ntf_64210",
    "delivered_at": "2026-09-03T07:35:04.000000Z",
    "summary": { "delivered": 1, "total_count": 1, "records_searched": 318, "max_results_per_run": 25, "truncated": false, "records_stale": 317 },
    "payload_delivery": { "type": "inline" }
  },
  "results": {
    "added": [
      {
        "job_details": {
          "title": "Backend Engineer, Vehicle Software",
          "url": "https://www.example-jobs.com/postings/4448814407",
          "category": "Engineering",
          "workplace_type": "On-site",
          "employment_type": "FULL_TIME"
        },
        "company": { "basic_info": { "name": "Tesla", "primary_domain": "tesla.com", "crustdata_company_id": 1034595 } },
        "location": { "raw": "Palo Alto, California, United States", "country": "United States" },
        "metadata": { "date_added": "2026-08-04T05:32:47" }
      }
    ]
  }
}
```

> [!NOTE]
>
> Response trimmed for clarity.

Each delivered job carries `company.basic_info.crustdata_company_id`, which is the handle for pulling the company's own profile with [Company Enrich](https://docs.crustdata.com/company-docs/enrichment/introduction.md).

`summary.truncated` is `true` when the run matched more jobs than `max_results_per_run` allowed. With the default `overflow_policy: "redeliver"` the overflow is held back and arrives on a later run rather than being lost.

> [!NOTE]
>
> `overflow_policy` is accepted on create but is not echoed in the watch
> object, so a `GET` will not show you which policy a watch is on. Record it
> on your side if you need to know.

***

## Realtime watches

A discovery watch reads the Crustdata index. A **realtime** watch searches the web
live on every run instead, so it finds postings as they appear rather than waiting for
our index to pick them up.

Turn one on with `config.is_realtime: true`. The watch then takes two filter trees
instead of one.

### The contract

| Key | When you send it | Who answers it | What it holds |
| - | - | - | - |
| `config.is_realtime` | To make the watch realtime | Nothing. It is the switch. | `true`. No other value and no other key turns a watch realtime. |
| `realtime_filters` | Required once `is_realtime` is `true` | The live search | Only the posting fields listed below. |
| `narrowing_filters` | Optional | The index of the dataset you name | One block, `company` only. The hiring company, in company grammar. |
| `filters` | Required on any other watch, refused here | The Crustdata index | Nothing, on a realtime watch. |

The live search runs first. `narrowing_filters` then checks the hiring company
behind each posting it returned, so it can only drop postings. It never adds any.

Send `realtime_filters` without the flag and the create fails. Neither can change
afterwards: a `PATCH` carrying `is_realtime`, `realtime_filters`, or
`narrowing_filters` is refused, so you make a new watch instead.

> [!WARNING]
>
> **`filters` is refused on a realtime watch.** It used to be where you put the
> conditions the live search could not answer, and that never worked: `filters`
> is asked of the job index, which has not yet seen a posting the live
> search just found, so every result was dropped and the watch delivered nothing
> while reporting success. Send it now and you get a `400` telling you where the
> condition really goes.

### Filter fields the live job search accepts

These are the only field paths `realtime_filters` takes on a job watch. Anything
else belongs in `narrowing_filters.company` or nowhere at all, as the next
section explains.

| Field | Operators | Values |
| - | - | - |
| `job_details.title` | `=` `(.)` | Free text keyword. `=` matches exactly, `(.)` matches loosely. |
| `content.description` | `=` `(.)` | Free text keyword. |
| `job_details.workplace_type` | `=` `in` | `On-site`, `Remote`, `Hybrid`. Nothing else. |
| `job_details.employment_type` | `=` `in` | `full_time`, `part_time`, `contract`, `temporary`, `intern`, `volunteer`, `other`. Nothing else. |
| `location.country` | `=` `in` | A country name. |
| `location.state` | `=` `in` | A state or region name. |
| `location.city` | `=` `in` | A city name. |
| `company.basic_info.industries` | `=` `in` | An industry name. |
| `company.basic_info.name` | `=` `in` | An employer name. The watch looks it up in our company index and refuses a name it cannot find. |
| `company.basic_info.professional_network_id` | `=` `in` | The employer's professional network id, as a string. The watch sends it as given. |

A city or state on its own is enough, for example `Berlin`: the watch places it
on a region the live search knows. A country or state beside it places the name
more precisely, and when you give all three the watch searches on the most
specific one. A value the watch cannot place is refused, so pick another value
from autocomplete or use `location.country`.

**One keyword per watch.** `job_details.title` and `content.description` feed the
same free-text box, so naming both folds them into a single expression rather
than two filters. Write the boolean yourself when you want control over it:

```json theme={"theme":"vitesse-black"}
{ "field": "job_details.title", "type": "(.)", "value": "\"machine learning\" OR \"applied science\"" }
```

A multi-word value is quoted for you, so the words are matched together rather
than separately.

**Workplace type and employment type take fixed values only.** The lists in the
table above are the whole vocabulary. Send anything else and the `400` tells you
which values the field takes.

**Name the employer by name or by id.** The watch looks
`company.basic_info.name` up in our company index and follows every company of
that name, so `Stripe` can mean more than one id. One condition may name at most
300 companies. `company.basic_info.professional_network_id` skips the lookup.

You write the same values here as you do on an index watch. Use
[Job Autocomplete](https://docs.crustdata.com/job-docs/autocomplete/introduction.md) to find them, exactly as
you would for an index-tier watch.

### Tree shape

The live search takes an AND of filters, with OR only between values of one
filter, so `realtime_filters` accepts:

* A top-level `and` group of leaves, or a single bare leaf.
* An `or` group inside it only when every leaf names the **same field** and uses
  an include operator (`=`, `in`, `(.)`). Use it as a value list.
* No nested `and` groups.
* No `sorts` on the watch at all. A live search has no stable order, so a job
  watch that sorts newest-first has to stay on the index tier.
* One keyword, as above.

The live job fields take no negation operators at all. A negation about the
employer goes in `narrowing_filters.company`; a negation about the posting has
nowhere to go at this tier.

### What goes in `narrowing_filters`

Conditions about the **employer**. A posting the live search just found is new by
construction, so the job index has never seen it and cannot answer anything about
it. The company that posted it has existed for years and is indexed, so that is
what narrowing asks about:

```json theme={"theme":"vitesse-black"}
"narrowing_filters": {
  "company": { "field": "basic_info.employee_count_range", "type": "in", "value": ["201-500", "501-1000"] }
}
```

| Block | Asked of | Write it in | Matched on |
| - | - | - | - |
| `company` | The company index | [Company Search](https://docs.crustdata.com/company-docs/search/reference.md) grammar | The employer on the posting |

**`company` is the only block a job watch takes.** A posting is the new record
itself, so there is no `job` block to narrow with.

A block keeps the dataset's full search grammar, unlike `realtime_filters`: an `or`
across two different fields, nested groups, and every negation operator all work,
because an index answers it rather than the live search.

> [!WARNING]
>
> **Write the employer condition in company grammar, not the cross-dataset
> spelling.** An index-tier job watch takes `company.headcount.range`, a copy of
> the company's size carried on the job document. That copy exists only for a
> posting the index already holds, so a realtime watch cannot use it at all:
>
> ```
> realtime_filters: 'company.headcount.range' is not something the live search can be asked for. There is nowhere else to put it: a job watch narrows only on company, and our index has never seen the record this search returns.
> ```
>
> Write `basic_info.employee_count_range` under `narrowing_filters.company`
> instead, which is the same condition asked of the company index directly.

**A job field the live search cannot ask has nowhere to go.**
`job_details.category`, salary, and experience level all describe the posting, and
no index holds the posting yet:

```
realtime_filters: 'job_details.category' is not something the live search can be asked for. There is nowhere else to put it: a job watch narrows only on company, and our index has never seen the record this search returns.
```

Keep a watch that needs one of those on the index tier, where `filters` answers
it. See [Filters from other datasets](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md).

> [!NOTE]
>
> **Leave `narrowing_filters` out and nothing is dropped.** Every posting the
> live search returns is delivered.
>
> Send a block and it is checked against the company index. A posting whose
> employer the index does not hold is dropped rather than delivered unchecked,
> so add a block when you would rather miss a posting than deliver one nobody
> checked.

You cannot write one `or` spanning both keys. They are separate, which matches
what the watch can do: a posting the live search never returned cannot be brought
back by a later stage.

### Limits

| | |
| - | - |
| How often it runs | Once a day at most. `config.trigger.every_hours` must be `24` or more. |
| How many postings it may follow | **No limit checked at creation.** The live job search pages through results instead of counting them, so there is no total to check your filters against. A broad watch is accepted and simply costs more, since each run bills per new posting. Narrow it yourself. |
| What a posting costs | 150 credits at the 1-day SLA, against 0.5 at the 30-day SLA an index watch runs on. The create response echoes `config.refresh_frequency_days: 1`. The first run is still a free sample of up to 5, and a run that finds nothing new costs nothing. See [Pricing](https://docs.crustdata.com/general/pricing.md). |
| What comes back | Only the fields a live posting carries. Leave `fields` out and the create response lists them for you. |

### Realtime examples

> [accordion] A role and a country, narrowed by employer size
>
> The live search handles the title, the country, and the employer's industry. The
> employer's size band is a condition about the company, so it narrows afterwards
> through the `company` block.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "job_details.title", "type": "(.)", "value": "Staff Machine Learning Engineer" },
>         { "field": "location.country", "type": "in", "value": ["United States"] },
>         { "field": "company.basic_info.industries", "type": "in", "value": ["Software Development"] }
>       ]
>     },
>     "narrowing_filters": {
>       "company": {
>         "op": "and",
>         "conditions": [
>           { "field": "basic_info.employee_count_range", "type": "in", "value": ["201-500", "501-1000"] }
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
>     "id": 53059,
>     "kind": "discovery",
>     "dataset": "job",
>     "api_version": "2025-11-01",
>     "status": "active",
>     "filters": null,
>     "narrowing_filters": {
>         "company": {
>             "op": "and",
>             "conditions": [
>                 { "field": "basic_info.employee_count_range", "type": "in", "value": ["201-500", "501-1000"] }
>             ]
>         }
>     },
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "job_details.title", "type": "(.)", "value": "Staff Machine Learning Engineer" },
>             { "field": "location.country", "type": "in", "value": ["United States"] },
>             { "field": "company.basic_info.industries", "type": "in", "value": ["Software Development"] }
>         ]
>     },
>     "on": ["added"],
>     "sorts": null,
>     "fields": [
>         "job_details.title",
>         "job_details.category",
>         "job_details.url",
>         "job_details.workplace_type",
>         "job_details.reposted_job",
>         "job_details.employment_type",
>         "content.description",
>         "location.raw",
>         "location.country",
>         "metadata.date_added",
>         "metadata.date_updated",
>         "company.basic_info.name",
>         "company.basic_info.professional_network_id"
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
> Response trimmed to the keys under discussion. `fields` comes back filled with
> everything a live posting carries.

> [accordion] A technology in the description, folded with the title
>
> Both keyword fields feed one box, so this pair goes out as a single expression.
> The founding year narrows on the employer afterwards.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "content.description", "type": "(.)", "value": "Kubernetes" },
>         { "field": "job_details.title", "type": "(.)", "value": "Platform Engineer" },
>         { "field": "location.country", "type": "in", "value": ["United States"] }
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
>     "notifications": []
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 53060,
>     "kind": "discovery",
>     "dataset": "job",
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
>             { "field": "content.description", "type": "(.)", "value": "Kubernetes" },
>             { "field": "job_details.title", "type": "(.)", "value": "Platform Engineer" },
>             { "field": "location.country", "type": "in", "value": ["United States"] }
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
> Response trimmed to the keys under discussion. Each term is also re-checked
> against its own field on the postings that come back, so a description match does
> not pass as a title match.

> [accordion] Every posting in one city, with no keyword
>
> A keyword is optional. A location and an industry are enough on their own, which
> gives you the whole hiring feed for a market rather than one role in it.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "location.city", "type": "in", "value": ["Seattle"] },
>         { "field": "location.state", "type": "in", "value": ["Washington"] },
>         { "field": "location.country", "type": "in", "value": ["United States"] },
>         { "field": "company.basic_info.industries", "type": "in", "value": ["Software Development"] }
>       ]
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 52476,
>     "kind": "discovery",
>     "dataset": "job",
>     "status": "active",
>     "filters": null,
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "location.city", "type": "in", "value": ["Seattle"] },
>             { "field": "location.state", "type": "in", "value": ["Washington"] },
>             { "field": "location.country", "type": "in", "value": ["United States"] },
>             { "field": "company.basic_info.industries", "type": "in", "value": ["Software Development"] }
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
> Response trimmed to the keys under discussion. Nothing checks how broad a job watch
> is at creation, so a feed this wide is accepted and simply bills per new posting.

> [accordion] On-site and hybrid roles in one city
>
> A city search returns country-wide remote postings too, which can crowd out the
> local ones. Name the workplace types you want and the live search drops the rest
> before the watch sees them.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "job_details.title", "type": "(.)", "value": "Account Executive" },
>         { "field": "location.city", "type": "in", "value": ["Austin"] },
>         { "field": "job_details.workplace_type", "type": "in", "value": ["On-site", "Hybrid"] },
>         { "field": "job_details.employment_type", "type": "=", "value": "full_time" }
>       ]
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 53509,
>     "kind": "discovery",
>     "dataset": "job",
>     "status": "active",
>     "filters": null,
>     "narrowing_filters": null,
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "job_details.title", "type": "(.)", "value": "Account Executive" },
>             { "field": "location.city", "type": "in", "value": ["Austin"] },
>             { "field": "job_details.workplace_type", "type": "in", "value": ["On-site", "Hybrid"] },
>             { "field": "job_details.employment_type", "type": "=", "value": "full_time" }
>         ]
>     },
>     "config": {
>         "trigger": { "type": "interval", "every_hours": 24 },
>         "max_results_per_run": 25,
>         "payload_delivery_type": "inline",
>         "is_realtime": true,
>         "refresh_frequency_days": 1
>     },
>     "credits": { "per_notification": 150.0 },
>     "notifications": []
> }
> ```
>
> Response trimmed to the keys under discussion.

> [accordion] Every opening at named employers
>
> Name the employers in `realtime_filters` and the live search returns only their
> postings. `company.basic_info.professional_network_id` works the same way with
> ids in place of names.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "realtime_filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "company.basic_info.name", "type": "in", "value": ["Stripe", "Figma"] },
>         { "field": "job_details.employment_type", "type": "=", "value": "full_time" }
>       ]
>     },
>     "config": { "is_realtime": true, "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> {
>     "id": 53510,
>     "kind": "discovery",
>     "dataset": "job",
>     "status": "active",
>     "filters": null,
>     "narrowing_filters": null,
>     "realtime_filters": {
>         "op": "and",
>         "conditions": [
>             { "field": "company.basic_info.name", "type": "in", "value": ["Stripe", "Figma"] },
>             { "field": "job_details.employment_type", "type": "=", "value": "full_time" }
>         ]
>     },
>     "config": {
>         "trigger": { "type": "interval", "every_hours": 24 },
>         "max_results_per_run": 25,
>         "payload_delivery_type": "inline",
>         "is_realtime": true,
>         "refresh_frequency_days": 1
>     },
>     "credits": { "per_notification": 150.0 },
>     "notifications": []
> }
> ```
>
> Response trimmed to the keys under discussion. The watch follows every company of
> that name, so a shared name widens the watch rather than failing it.

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
| A posting field the live job search cannot ask | `'<field>' is not something the live search can be asked for. There is nowhere else to put it...` |
| A city or state the watch cannot place | `value '<place>' for 'location.city' is not something the live search can be asked for. Couldn't resolve this city to a place the live search knows. Try another value from job autocomplete on location.city, or use location.country...` |
| A workplace or employment type outside the fixed list | `value '<value>' for '<field>' is not something the live search can be asked for. Accepted values: <list>...` |
| An employer name the company index does not hold | `value '<name>' for 'company.basic_info.name' is not something the live search can be asked for. No company in our index by that name...` |
| More than 300 employers in one condition | `These name <count> companies; the live search takes at most 300...` |
| An `or` across two different fields | `An 'or' is available only across values of one field.` |
| A nested `and` group | `Nested 'and' groups are not available.` |
| `sorts` on a realtime watch | `The live search has no stable sort order.` |
| `every_hours` under `24` | `config.trigger.every_hours must be at least 24...` |
| `config.refresh_frequency_days`, any value | `config.refresh_frequency_days is not accepted on a discovery watch...` |
| A company field in `realtime_filters` | `'<field>' is not something the live search can be asked for. Move it under 'narrowing_filters.company'...` |
| The cross-dataset spelling `company.headcount.range` | `'company.headcount.range' is not something the live search can be asked for. There is nowhere else to put it...` |
| A block other than `company` | `A job watch cannot narrow on <name>. It may narrow on: company...` |
| `PATCH` carrying `is_realtime`, `realtime_filters`, or `narrowing_filters` | `config.<key> cannot be changed on a discovery watch. Create a new watch.` |

> [accordion] A workplace or employment type outside the fixed list
>
> The accepted values come back in the message, so you can correct the value without
> looking anything up.
>
> ```json 400 theme={"theme":"vitesse-black"}
> {
>     "error": {
>         "type": "invalid_request",
>         "message": "realtime_filters: value 'onsite' for 'job_details.workplace_type' is not something the live search can be asked for. Accepted values: On-site, Remote, Hybrid. There is nowhere else to put it: a job watch narrows only on company, and our index has never seen the record this search returns.",
>         "metadata": [
>             {
>                 "field": "realtime_filters",
>                 "type": "unsupported",
>                 "message": "realtime_filters: value 'onsite' for 'job_details.workplace_type' is not something the live search can be asked for. Accepted values: On-site, Remote, Hybrid. There is nowhere else to put it: a job watch narrows only on company, and our index has never seen the record this search returns."
>             }
>         ]
>     }
> }
> ```

> [accordion] An employer name the company index does not hold
>
> The live search matches an employer by id, so the watch refuses a name it cannot
> resolve rather than quietly widening to every company.
>
> ```json 400 theme={"theme":"vitesse-black"}
> {
>     "error": {
>         "type": "invalid_request",
>         "message": "realtime_filters: value 'Nobody Inc Zzz' for 'company.basic_info.name' is not something the live search can be asked for. No company in our index by that name. There is nowhere else to put it: a job watch narrows only on company, and our index has never seen the record this search returns.",
>         "metadata": [
>             {
>                 "field": "realtime_filters",
>                 "type": "unsupported",
>                 "message": "realtime_filters: value 'Nobody Inc Zzz' for 'company.basic_info.name' is not something the live search can be asked for. No company in our index by that name. There is nowhere else to put it: a job watch narrows only on company, and our index has never seen the record this search returns."
>             }
>         ]
>     }
> }
> ```

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

> [accordion] sorts on a realtime watch
>
> A job watch that sorts newest-first cannot be realtime. Drop `sorts`, or drop
> `is_realtime` and stay on the index tier.
>
> ```json 400 theme={"theme":"vitesse-black"}
> {
>     "error": {
>         "type": "invalid_request",
>         "message": "realtime_filters: 'sorts' is not something the live search can be asked for. The live search has no stable sort order.",
>         "metadata": [
>             {
>                 "field": "realtime_filters",
>                 "type": "unsupported",
>                 "message": "realtime_filters: 'sorts' is not something the live search can be asked for. The live search has no stable sort order."
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
{ "type": "webhook", "url": "https://your-app.com/webhooks/crustdata", "headers": { "X-Watch-Name": "swe-us-3000" } }
```

```json Slack theme={"theme":"vitesse-black"}
{ "type": "slack", "webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX" }
```

```json Email theme={"theme":"vitesse-black"}
{ "type": "email", "to": ["you@company.com"] }
```

```json Google Chat theme={"theme":"vitesse-black"}
{ "type": "google_chat", "url": "https://chat.googleapis.com/v1/spaces/…" }
```

```json Multiple theme={"theme":"vitesse-black"}
[
  { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" },
  { "type": "email", "to": ["you@company.com"] }
]
```

```json Pull-only theme={"theme":"vitesse-black"}
[]
```

> [!WARNING]
>
> A Slack channel must be a genuine Slack incoming webhook
> (`https://hooks.slack.com/services/…`). Any other URL will fail delivery.

An empty `notifications` array is valid. The watch runs and records everything, pushes nothing, and you read each run from the [run endpoints](#read-what-a-run-delivered).

### Where the records travel

By default a run's jobs arrive inside the notification, under `results`. Set `config.payload_delivery_type` to `"link"` and the body carries no records at all. It carries `metadata.payload_delivery.url` instead, a pre-signed S3 URL for one NDJSON file holding every record of that run.

Switch when a run can outgrow what your receiver accepts. An AWS Lambda proxy integration caps a request at 6 MB and an ALB target at 1 MB, and an oversize body is refused whole.

```bash theme={"theme":"vitesse-black"}
curl --request PATCH \
  --url https://api.crustdata.com/watch/job/search/50973 \
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

A job watch is not limited to job fields. Drop a company field or a person field into the same flat `conditions` list and the watch filters on the company behind the posting:

```json theme={"theme":"vitesse-black"}
{
  "op": "and",
  "conditions": [
    { "field": "headcount.growth_percent.6m", "type": ">", "value": 50 },
    { "field": "job_details.category",        "type": "=", "value": "Sales" }
  ]
}
```

Sales roles at companies that grew headcount more than 50% in six months.

Some company attributes are carried on each job record already, under a `company.` prefix: funding stage, headcount, industry, and head office all work as `company.funding.last_round_type`, `company.headcount.total`, and so on. Growth rate, founding year, competitor list, and the rest of the company vocabulary are not carried there, and those now work too. Use the unprefixed [Company Search](https://docs.crustdata.com/company-docs/search/reference.md) name for them.

> [!NOTE]
>
> Cross-dataset filters are a **discovery watch** feature, which is what a job
> watch is. There is no job entity watcher: a posting does not change, it appears
> and disappears.

### What you can combine

| A job watch can also filter on | Joined through |
| - | - |
| Company fields | The company posting the job |
| Person fields | The person's current employer, matched to the posting company |

A single watch can pull from all three datasets at once.

> [!NOTE]
>
> People join through their **current employer** only. A filter on a past
> employer still selects the right people, but the company it points at is where
> they work now. "Jobs at companies that hired away from Acme" means companies
> that currently employ someone whose earlier experience was at Acme.

### The rules in one place

Field names decide the dataset, so there is nothing to declare:
`job_details.title` is a job field, `headcount.total` a company field, and
`experience.employment_details.current.title` a person field. Conditions from
another dataset are answered first, come back as a set of company IDs, and narrow
your watch through the posting company. Delivery, deduplication, per-run caps, and
the payload shape are unchanged, and you are still charged 0.5 credits per job.
Reading the other dataset is free.

A cross-dataset condition may cover at most **1,000,000 companies**, checked at
creation and measured on the cross-dataset conditions alone, so adding a job
condition does not get you past it. Row-level negation (`!=`, `not_in`, `(!)`,
`not_contains`, `geo_exclude`) is rejected on a condition from another dataset,
because it matches jobs whose company has *some other* matching row rather than
none.

Nothing beyond the `company.` fields already on the job record comes back with a
cross-dataset filter. For the rest of the company's profile, call
`POST /company/enrich` yourself with the delivered
`company.basic_info.crustdata_company_id`.

> [!WARNING]
>
> A condition that matches nothing because of a bad value is accepted at
> creation and then quietly never fires.
> `{"field": "job_details.employment_type", "type": "=", "value": "Full-time"}`
> matches zero jobs, because the stored value is `FULL_TIME`. Run every
> condition through [Job Search](https://docs.crustdata.com/job-docs/search/introduction.md) first and
> confirm `total_count` is not zero.

See [Cross-dataset filters](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md) for the join
rules, the grouping semantics, the lookup fields for that follow-up call, the
limits with their exact errors, and how timing and deduplication change.

***

## Test your receiver before a run fires

Push one sample notification through a watch to verify your receiver end to end, without waiting for a posting to appear.

```
POST https://api.crustdata.com/watch/job/search/{watch_id}/test
```

The sample is built from **real current matches** of the watch's own filter and shaped through the same processor a real run uses, so the payload is identical to production apart from `metadata.test: true`. The call records nothing: it creates no run, does not advance the seen set, and costs no credits.

| Field | Type | Description |
| - | - | - |
| `notification_endpoint` | string | Deliver this one test to a URL you control instead of the watch's channels. Must be a **public** `http(s)` URL. |
| `count` | integer | Deliver `N` sample jobs (`1` to `25`) in one envelope. Default `1`. |
| `deliver` | boolean | Send `false` to get the envelope back without any outbound request. |

```bash theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/watch/job/search/50973/test \
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
| List your watches | `GET /watch/job/search?status=active&limit=50&offset=0` |
| Get one | `GET /watch/job/search/{id}` |
| Pause / resume | `PATCH /watch/job/search/{id}` with `{ "status": "paused" }` |
| Reschedule | `PATCH /watch/job/search/{id}` with a new `config` |
| Replace the channels | `PATCH /watch/job/search/{id}` with a new `notifications` |
| Cancel | `DELETE /watch/job/search/{id}` → `204` |

```bash Pause / resume theme={"theme":"vitesse-black"}
curl --request PATCH \
  --url https://api.crustdata.com/watch/job/search/50973 \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{ "status": "paused" }'
```

```bash Cancel a watch theme={"theme":"vitesse-black"}
curl --request DELETE \
  --url https://api.crustdata.com/watch/job/search/50973 \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

```bash List your job watches theme={"theme":"vitesse-black"}
curl --request GET \
  --url https://api.crustdata.com/watch/job/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

> [!WARNING]
>
> `filters`, `sorts`, `fields`, and `on` are fixed once the watch exists.
> `PATCH`ing any of them returns `400`. To change what you watch for, create a
> new watch.

## Read what a run delivered

Every run is readable after the fact, so a watch is never a black box between deliveries. The read paths drop the `search/` segment that create and manage use.

```bash Run history theme={"theme":"vitesse-black"}
curl --request GET \
  --url 'https://api.crustdata.com/watch/job/50973/runs?limit=20' \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

```bash One run, with its records theme={"theme":"vitesse-black"}
curl --request GET \
  --url https://api.crustdata.com/watch/job/50973/runs/54811/summary \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

### Reading a run

`runs` returns each run newest first, with `status`, the five record counters below, `credits_deducted`, and `notification_http_status`. It is paginated by `cursor`.

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

`summary` returns one run in full: its activity log, and every delivery attempt with the jobs it carried under `notifications[].payload.notifications[].record`. That is the same record shape your channel receives, so the records are readable here even when no channel is configured.

***

## Examples

Worked recipes you can copy, paste, and adapt. Each one is a full working request, verified against the live API. Swap the notification channel for your own. For the operator list, field catalog, and validation rules, see the [Job Search reference](https://docs.crustdata.com/job-docs/search/reference.md).

> [accordion] Follow a function at recently funded companies
>
> Bound the feed by posting date so it stays about fresh hiring, and by funding stage so it stays about companies with new budget. This watch delivers engineering roles posted since 2026-08-01 at Series A and Series B companies, to Slack.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "job_details.category", "type": "=", "value": "Engineering" },
>         { "field": "metadata.date_added", "type": "=>", "value": "2026-08-01" },
>         { "field": "company.funding.last_round_type", "type": "in", "value": ["series_a", "series_b"] }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "slack", "webhook_url": "https://hooks.slack.com/services/T000/B000/XXXX" } ]
>   }'
> ```
>
> > [!WARNING]
> >
> > Round-type values on a job record are lowercase with underscores: `series_a`,
> > `series_b`, `seed`. `"Series A"` matches zero jobs and the watch stays silent.

> [accordion] Follow remote roles at accounts you track
>
> Name the companies by domain and let the watch tell you when they post something remote. This one checks every six hours.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "company.basic_info.primary_domain", "type": "in", "value": ["stripe.com", "figma.com"] },
>         { "field": "job_details.workplace_type", "type": "=", "value": "Remote" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 6 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!NOTE]
> >
> > `job_details.workplace_type` takes `Remote`, `Hybrid`, or `On-site`. For
> > employment type, the stored values are uppercase with underscores, so filter on
> > `FULL_TIME` rather than `Full-time`.

> [accordion] Watch full-time remote roles
>
> Combine the two posting attributes that decide whether a role is worth surfacing to a candidate at all.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "job_details.employment_type", "type": "=", "value": "FULL_TIME" },
>         { "field": "job_details.workplace_type", "type": "=", "value": "Remote" },
>         { "field": "job_details.category", "type": "=", "value": "Engineering" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "sorts": [ { "field": "metadata.date_added", "order": "desc" } ],
>     "notifications": [ { "type": "email", "to": ["you@company.com"] } ]
>   }'
> ```

> [accordion] Watch a radius around a city
>
> The `geo_distance` operator works on `location` and `location.raw`, which catches the metro rather than one city string. This watch delivers sales roles within 50 km of New York.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         {
>           "field": "location.raw",
>           "type": "geo_distance",
>           "value": { "location": "New York, NY", "distance": 50, "unit": "km" }
>         },
>         { "field": "job_details.category", "type": "=", "value": "Sales" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!WARNING]
> >
> > `geo_distance` and `geo_exclude` only work on `location` and `location.raw`.
> > Using either on another field, or sending a malformed geo value, returns `500`.

> [accordion] Hunt for a keyword in the job description
>
> `content.description` is full-text, so it catches requirements a title never mentions. This watch delivers engineering roles whose description mentions Kubernetes.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "content.description", "type": "(.)", "value": "kubernetes" },
>         { "field": "job_details.category", "type": "=", "value": "Engineering" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 }, "max_results_per_run": 100 },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Follow a title in one city
>
> `location.city` is the normalized city facet, so it does not need the full raw location string. This watch delivers account executive roles in London.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "location.city", "type": "=", "value": "London" },
>         { "field": "job_details.title", "type": "(.)", "value": "account executive" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Follow roles at well-funded employers
>
> `company.funding.total_investment_usd` rides on the job record, so this needs no cross-dataset join. This watch delivers US engineering roles at companies that have raised more than \$50M.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "company.funding.total_investment_usd", "type": ">", "value": 50000000 },
>         { "field": "job_details.category", "type": "=", "value": "Engineering" },
>         { "field": "location.country", "type": "=", "value": "United States" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!WARNING]
> >
> > Drop the country condition and this filter matches 1,030,186 jobs, past the
> > baseline limit, and the create comes back
> > `This watch would follow 1,030,186 records, more than the 500,000 a single
> >           watch can track. Please narrow your filters.`
>
> > [!TIP]
> >
> > Reach for the `company.` prefix first. It reads the copy already on the job
> > record, with no join. Use the unprefixed Company Search name only for the
> > attributes the job record does not carry, like growth rate or founding year.

> [accordion] Cross-dataset: sales roles at fast-growing companies
>
> Headcount growth is not carried on the job record, so this pairing needs the company dataset. This watch delivers sales roles at companies that grew more than 50% in six months.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "headcount.growth_percent.6m", "type": ">", "value": 50 },
>         { "field": "job_details.category",        "type": "=", "value": "Sales" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Cross-dataset: roles at recently founded companies
>
> Founding year is not on the job record either. It is also very broad, so pair it with a second **company** condition, not just a job one.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "basic_info.year_founded", "type": ">",   "value": 2020 },
>         { "field": "headcount.total",         "type": "=>",  "value": 50 },
>         { "field": "job_details.title",       "type": "(.)", "value": "account executive" },
>         { "field": "location.country",        "type": "=",   "value": "United States" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```
>
> > [!WARNING]
> >
> > The million-company ceiling is measured on the **company** conditions alone, so
> > a job condition does not help you past it. `basic_info.year_founded > 2020` on
> > its own reaches roughly four million companies and is rejected with `Your
> >           company filters cover more than 1,000,000 companies.`, followed by a suggestion
> > to add a location, a date, or a more specific title. The `headcount.total`
> > condition here is what makes it acceptable.

> [accordion] Cross-dataset: roles at companies hiring away from a rival
>
> A person condition joins through the current employer, so this finds postings at companies that already employ someone from a competitor. This watch delivers software engineer roles at companies employing an ex-Stripe person.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "job_details.title",                               "type": "(.)", "value": "software engineer" },
>         { "field": "experience.employment_details.past.company_name", "type": "=",   "value": "Stripe" }
>       ]
>     },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": [ { "type": "webhook", "url": "https://your-app.com/webhooks/crustdata" } ]
>   }'
> ```

> [accordion] Deliver a large run as a linked file
>
> Raise the per-run cap and switch the payload to a link when a run can outgrow what your receiver accepts.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "job_details.category", "type": "=", "value": "Engineering" },
>         { "field": "location.country", "type": "=", "value": "United States" }
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
>   --url https://api.crustdata.com/watch/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": { "field": "job_details.category", "type": "=", "value": "Engineering" },
>     "config": { "trigger": { "type": "interval", "every_hours": 24 } },
>     "notifications": []
>   }'
> ```
>
> ```bash Read a run theme={"theme":"vitesse-black"}
> curl --request GET \
>   --url https://api.crustdata.com/watch/job/50973/runs/54811/summary \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'x-api-version: 2025-11-01'
> ```
>
> The records are readable from `summary` even with no channel configured, so this is a good way to sanity-check a filter before you wire delivery to it.

***

***

## Error handling

A job watch answers every failure the same way, whether you are creating a watch, editing one, testing delivery, or reading run history.

| Status | Type | Common causes |
| - | - | - |
| `400` | `invalid_request` | An unknown filter field or operator, `filters` or `config` left out, `config.trigger.every_hours` below `1`, a `fields` entry that is not a job field path, a filter set broader than the 500,000-record baseline cap, a missing or unsupported `x-api-version`, or a `PATCH` to a key fixed at creation. |
| `401` | `unauthorized` | Missing or invalid API key. |
| `403` | `permission_error` | Your key is not entitled to the job dataset, or to a field group you named in `fields`. |
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
| Each new job delivered on later runs | **0.5** |

You are charged only for jobs actually delivered, never for a run that finds nothing new, and never for reading another dataset to narrow your filters. See [Pricing](https://docs.crustdata.com/general/pricing.md) for the full catalog.

## What to do next

* **Pull the full match set**: use [Job Search](https://docs.crustdata.com/job-docs/search/introduction.md) to see everything that matches right now, not just what is new.
* **Look up operators and fields**: see the [Job Search reference](https://docs.crustdata.com/job-docs/search/reference.md) for the full filter catalog.
* **Watch companies or people instead**: the same recurring-feed model runs over [companies](https://docs.crustdata.com/watcher-docs/company/discovery.md) and [people](https://docs.crustdata.com/watcher-docs/person/discovery.md).
* **Choose how records travel**: see [Payload delivery](https://docs.crustdata.com/watcher-docs/payload-delivery.md) for inline versus linked NDJSON.


## Related topics

- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [Cross-dataset filters](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md)
- [Payload delivery: inline or link](https://docs.crustdata.com/watcher-docs/payload-delivery.md)
- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
- [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md)
