> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Cross-dataset filters

> Mix company, person, and job filters in a single discovery watch. A company watch can filter on the roles a company is hiring for or the people it employs, a job watch on the company behind the posting, and a person watch on their employer or its open roles.

**Use this when** the question you want to ask spans two datasets: companies hiring for a role, people at companies running a technology, jobs at companies that just doubled headcount.

A discovery watch notifies you about one kind of record: companies, people, or jobs. Its filters are not limited to that one kind. This page covers the rules that apply to every dataset: which pairings work, how a run resolves them, what the limits are, what is rejected, and how to pull the records from the other side. For the recipes themselves, each discovery page carries its own: [company](https://docs.crustdata.com/watcher-docs/company/discovery.md#examples), [person](https://docs.crustdata.com/watcher-docs/person/discovery.md#examples), and [job](https://docs.crustdata.com/watcher-docs/job/watch.md#examples).

There is no new syntax and no second filter list. You write one flat set of conditions, mixing fields from any dataset, and the watch works out where each field lives.

```json theme={"theme":"vitesse-black"}
{
  "filters": {
    "op": "and",
    "conditions": [
      { "field": "technographics.technologies.name", "type": "=",   "value": "Snowflake" },
      { "field": "job_details.title",                "type": "(.)", "value": "data engineer" }
    ]
  }
}
```

That is a company watch. `technographics.technologies.name` resolves to the company dataset and `job_details.title` is a job field, so the watch delivers companies running Snowflake that are hiring a data engineer. The job condition is the one a single-dataset company watch could not express, because open roles are not carried on company records.

> [!NOTE]
>
> This is a **discovery watch** feature. An entity watcher tracks a list you
> supply, so it has no filter to widen. See
> [company entity](https://docs.crustdata.com/watcher-docs/company/entity.md) and
> [person entity](https://docs.crustdata.com/watcher-docs/person/entity.md).

### Request body

Nothing changes. A cross-dataset watch is created the same way as any other discovery watch, on the create endpoint for the dataset you want delivered.

| Your watch delivers | Create endpoint |
| - | - |
| Companies | `POST https://api.crustdata.com/watch/company/search` |
| People | `POST https://api.crustdata.com/watch/person/search` |
| Jobs | `POST https://api.crustdata.com/watch/job/search` |

The body is the same `filters`, `config`, and `notifications` those pages document. Only the contents of `conditions` differ.

### Response body

Also unchanged. Delivery, deduplication, per-run caps, and the payload shape are identical to a single-dataset watch, and the create response is the same watch object.

### Rate limits and credits

**Pricing:** you pay for records delivered to you, at your watch's
own rate: `2 credits per company`, `0.5 per person`,
`0.5 per job`. Reading another dataset to narrow your filters is
free, and the baseline run is free.

* **Rate limit:** 10 requests per minute on each watch path, counted separately. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).
* **Baseline limit:** 500,000 records your filter may match at creation.
* **Cross-dataset breadth:** 1,000,000 companies a cross-dataset condition may cover.

> [card] [What you can combine](#what-you-can-combine)
>
> Every pairing, and the join each one runs through.

> [card] [Examples](#examples)
>
> Worked recipes for all three datasets, verified live.

> [card] [Limits](#limits)
>
> The two ceilings, and the exact errors they return.

***

## Why this exists

A job record already carries some of its company's attributes, so a job watch can filter on funding stage, headcount, industry, and head office without leaving the job dataset. Nothing marks those fields as special from the outside, which made the boundary invisible: filtering a job watch on funding stage worked, and filtering the same watch on headcount growth failed. Cross-dataset filters put every filter field on all three search endpoints within reach of any discovery watch.

## What you can combine

| Your watch delivers | You can also filter on | Joined through |
| - | - | - |
| Companies | Jobs, people | The company posting the job, the person's current employer |
| Jobs | Companies, people | The company posting the job, the person's current employer |
| People | Companies, jobs | The person's current employer |
| Social posts | People, companies | Whoever wrote the post |

Companies, jobs, and people combine freely, and one watch can pull from all three at
once.

Social posts join in one direction only. A post watch can ask about the person or the
company that wrote the post, but a person or company watch cannot ask about posts, and
a post watch cannot ask about jobs. Those return `400` at creation:

```
A social post watch cannot be combined with job filters. Please create a separate watch for those filters.
A people watch cannot be combined with social post filters. Please create a separate watch for those filters.
```

> [!NOTE]
>
> **A post's author is resolved before anything else.** A post carries one author id,
> and `actor.actor_type` says whether it points at a person or at a company. The
> watch reads that first, so a person id can never match a company that happens to
> share the number. Write the condition with ordinary person or company fields, for
> example `experience.employment_details.current.title` or `headcount.total`.

> [!NOTE]
>
> People join through their **current employer** only. A filter on a past
> employer still selects the right people, but the company it points at is where
> they work now. "Companies that hired away from Acme" means companies that
> currently employ someone whose earlier experience was at Acme.

## How a run works

**1. Field names decide the dataset**

Field names are unique across the three datasets, so the name alone
identifies where a condition belongs. `headcount.total` is a company field,
`job_details.title` a job field,
`experience.employment_details.current.title` a person field. Every name is
listed in the [Company Search](https://docs.crustdata.com/company-docs/search/reference.md),
[Person Search](https://docs.crustdata.com/person-docs/search/reference.md), and
[Job Search](https://docs.crustdata.com/job-docs/search/reference.md) references.

A handful of names appear in more than one vocabulary.
`technographics.technologies.name`, `technographics.technologies.category`,
and `technographics.technologies.super_category` are on both company and job
records, and `indexed_at` and `updated_at` are on all three. Your watch's own
dataset always wins those, so a job watch filtering on
`technographics.technologies.name` reads the job record's own copy rather than
querying the company dataset. Note that the two copies mean different things:
on a job record the field is posting-scoped, covering only the technologies
named in that posting, while on a company record it describes the whole
organization. See the
[Job Search reference](https://docs.crustdata.com/job-docs/search/reference.md#technographics-filter-only).

**2. We query the other dataset first**

Conditions from another dataset run against that dataset and come back as a
set of company IDs. We fetch the IDs and nothing else.

**3. Those IDs narrow your watch**

The IDs go back into the filter tree in the position the conditions occupied,
as a membership condition. Your watch then runs as normal.

Delivery, deduplication, per-run caps, and credits are unchanged. A cross-dataset watch behaves like any other discovery watch, and its payload is the same shape.

### Grouping

Conditions from the same dataset sitting side by side in a group are answered together, as one question. In this company watch:

```json theme={"theme":"vitesse-black"}
{
  "op": "and",
  "conditions": [
    { "field": "headcount.total",   "type": ">",   "value": 500 },
    { "field": "job_details.title", "type": "(.)", "value": "engineer" },
    { "field": "location.country",  "type": "=",   "value": "United States" }
  ]
}
```

`job_details.title` and `location.country` are both job fields, so the watch asks for one posting that is an engineering role and is in the United States. It does not return a company with an engineering role in India and a separate sales role in the United States. Writing the two job conditions inside their own `and` group means the same thing, so you can group them for readability without changing the result.

Under `or` the two forms also agree: a posting matching A, or a posting matching B, is a posting matching A or B.

### When a cross-dataset condition matches nothing

An empty result counts as false and travels up through your groups. Under `and`, the whole branch is false and the run delivers nothing. Under `or`, that branch drops out and the rest of the watch still runs.

> [!WARNING]
>
> A condition that matches nothing because of a bad value is accepted at
> creation and then quietly never fires. `{"field": "job_details.employment_type",
>       "type": "=", "value": "Full-time"}` matches zero jobs, because the stored value
> is `FULL_TIME`. A watch built on it stays silent forever. Run the condition
> through [Job Search](https://docs.crustdata.com/job-docs/search/introduction.md),
> [Company Search](https://docs.crustdata.com/company-docs/search/introduction.md), or
> [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) first and confirm
> `total_count` is not zero.

### Timing and deduplication

A single-dataset watch narrows each run to records reindexed since the previous run. That shortcut does not hold once another dataset is involved: a company posts a job on Tuesday, the job record is new, and the company record is untouched. A cross-dataset watch re-evaluates the full current match set on every run instead.

What stops a record arriving twice is the record of what has already been sent, not the time window. Each match is delivered once, ever, for a given watch. If it drops out of the set and comes back later, the watch stays quiet.

***

## Records from the other dataset

The payload carries your watch's own records and nothing else. A company watch tells you Acme matched. It does not tell you which posting or which person put Acme there, because only IDs cross between datasets, never records. That is also why you are not charged for the dataset you filtered on.

To get those records, call that dataset's own search or enrich API with the ID from the delivered record and the same conditions you filtered on.

| You have | You want | Call | Filter on |
| - | - | - | - |
| A company from a company watch | Its matching jobs | `POST /job/search` | `company.basic_info.crustdata_company_id` |
| A company from a company watch | Its matching people | `POST /person/search` | `experience.employment_details.current.company_id` |
| A job or person from their watch | The company behind it | `POST /company/search` or `POST /company/enrich` | `crustdata_company_id` |

A company watch on Snowflake and `job_details.title` contains `data engineer` delivers company `8294878`. This gets the posting that put it in the feed:

```bash theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/job/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "filters": {
      "op": "and",
      "conditions": [
        { "field": "company.basic_info.crustdata_company_id", "type": "in",  "value": [8294878] },
        { "field": "job_details.title",                       "type": "(.)", "value": "data engineer" }
      ]
    },
    "limit": 10
  }'
```

Repeat the job conditions in that call. Without them you get every open role at the company, not the ones the watch matched on. Going the other way, a delivered job record carries the company ID at `company.basic_info.crustdata_company_id`, and a delivered person record carries it as `crustdata_company_id` on each current employer.

These are ordinary search and enrich calls, billed at their normal rate. See [Pricing](https://docs.crustdata.com/general/pricing.md).

## What is not supported

### Negation across datasets

We reject the operators that negate a single record when they sit on a cross-dataset condition: `!=`, `not_in`, `(!)`, `not_contains`, and `geo_exclude`.

```json theme={"theme":"vitesse-black"}
{ "field": "job_details.title", "type": "(!)", "value": "engineer" }
```

On a company watch that reads like "companies not hiring engineers", but it means something else. Each job record is judged on its own, so a company posting both a Software Engineer role and a Salesperson role matches on the salesperson row and gets delivered. Most companies of any size are hiring a mix of roles, so nearly all of them would slip through.

The API rejects it with `400`:

```json theme={"theme":"vitesse-black"}
{
  "error": {
    "type": "invalid_request",
    "message": "filters.conditions[1]: '(!)' on a job filter matches any company with some *other* matching job record, not those with none. List the values you do want instead.",
    "metadata": [
      {
        "field": "filters.conditions[1].type",
        "type": "unsupported",
        "message": "filters.conditions[1]: '(!)' on a job filter matches any company with some *other* matching job record, not those with none. List the values you do want instead."
      }
    ]
  }
}
```

These operators are still fine on your watch's own dataset. `basic_info.year_founded != 2020` on a company watch is accepted, because there it means what it says.

### Counting

You can ask whether at least one matching record exists. You cannot ask for a number. "Five or more open engineering roles", "doubled their postings this quarter", and "three or more people left" are all out of reach.

### Growth on the other dataset

"Companies whose engineering headcount grew" works, because that figure sits on the company record. "Companies whose engineering postings grew" does not, because job records carry no growth figures.

## On a realtime watch

Everything on this page describes `filters`, which is the index tier only. A
realtime watch (`config.is_realtime: true`) refuses `filters` outright and reaches
another dataset through `narrowing_filters` instead, a block named for the dataset
it asks. Each dataset's watcher page covers that split:
[Person](https://docs.crustdata.com/watcher-docs/person/discovery.md#realtime-watches),
[Company](https://docs.crustdata.com/watcher-docs/company/discovery.md#realtime-watches),
[Job](https://docs.crustdata.com/watcher-docs/job/watch.md#realtime-watches), and
[Social Post](https://docs.crustdata.com/watcher-docs/social-post/discovery.md#realtime-watches).

Two things change once you move a cross-dataset watch to the realtime tier.

**You name the dataset instead of letting the field name pick it.** The flat list
on this page works because the watch reads each field name and routes it. A
narrowing block is one query against one index, so you write the block name and
then that dataset's own vocabulary inside it.

**The denormalized spelling does not carry over.** `company.headcount.range` is
the company's size as copied onto a job document, and that copy exists only for a
posting the index already holds. A realtime posting is never that, so the field is
refused with nowhere to move to:

```
realtime_filters: 'company.headcount.range' is not something the live search can be asked for. There is nowhere else to put it: a job watch narrows only on company, and our index has never seen the record this search returns.
```

Write `basic_info.employee_count_range` under `narrowing_filters.company` instead,
which asks the company index the same question directly.

What a realtime watch may narrow on is fixed per dataset: a person watch on
`person` or `company`, a post watch on `person` or `company`, and a company or job
watch on `company` alone. A condition about a job or a post is a condition about
the record the live search just returned, so no index can answer it.

"Hiring now" is the one cross-dataset condition that survives as-is: a job
condition on `metadata.date_added` with `=>` maps to a real facet the live search
has, so it stays in `realtime_filters` on a company watch.

## Limits

| | Limit |
| - | - |
| Baseline limit: records your filter may match at creation | 500,000 |
| Companies a cross-dataset condition may cover | 1,000,000 |

We check both when you create the watch, so you find out immediately rather than on the first run.

The first is the baseline limit. The baseline run delivers a sample of 5, but it reads the whole match set to record what already exists, and that read is what the 500,000 bounds. It is not a ceiling on the watch's lifetime: later runs deliver whatever newly matches, bounded by `config.max_results_per_run`.

A cross-dataset condition under `and` narrows the set before the baseline limit is measured, so a watch can pair a very broad condition on its own dataset with a narrow one from another. This is accepted even though `headcount.total > 10` alone matches over four million companies:

```json theme={"theme":"vitesse-black"}
{
  "op": "and",
  "conditions": [
    { "field": "headcount.total",   "type": ">",   "value": 10 },
    { "field": "job_details.title", "type": "(.)", "value": "data engineer" }
  ]
}
```

Under `or` there is no narrowing, so the same pair is rejected:

```json theme={"theme":"vitesse-black"}
{
  "error": {
    "type": "invalid_request",
    "message": "This watch would follow 4,187,426 records, more than the 500,000 a single watch can track. Please narrow your filters.",
    "metadata": []
  }
}
```

The count is measured when you create the watch, so the exact figure moves with the data. A limit like this one names no request field, so its `metadata` is empty.

The second ceiling is measured on the **cross-dataset conditions alone**, so a condition on your own dataset does not help you past it. A job watch filtering on `basic_info.year_founded > 2020` reaches roughly four million companies, and adding a job title and a country still fails, because neither is a company condition. The `400` opens `Your company filters cover more than 1,000,000 companies.` and then suggests adding another company filter: a location, a date, or a more specific title.

Adding a second **company** condition, such as `headcount.total => 50`, is what makes it acceptable.

If we cannot reach the other dataset at creation time, the watch is not created and you can retry:

```json theme={"theme":"vitesse-black"}
{
  "error": {
    "type": "invalid_request",
    "message": "We could not check your job filters just now. Please try again in a few minutes.",
    "metadata": []
  }
}
```

Every watcher error uses this one envelope. See [Error handling](https://docs.crustdata.com/watcher-docs/person/discovery.md#error-handling) for the full set, and the Watch API reference under Create a discovery watch.

***

## Examples

Worked recipes you can copy, paste, and adapt. Every one is verified against the live API. Post each to the create endpoint for the dataset you want delivered, and swap the notification channel for your own.

> [accordion] Companies hiring for a role
>
> A job field alongside a company field asks a question neither dataset answers alone. This company watch delivers companies running Snowflake that are hiring a data engineer.
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
> The payload carries companies only. To see the posting that put a company in the feed, call `POST /job/search` with the delivered `crustdata_company_id` and the same job conditions. See [Records from the other dataset](#records-from-the-other-dataset).

> [accordion] Companies hiring away from a rival
>
> A person field joins through each person's current employer, so a past-employer condition finds companies that currently employ someone who used to work elsewhere. This company watch delivers companies with more than 50 employees that employ an ex-Stripe person.
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

> [accordion] Sales hiring at fast-growing US companies
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

> [accordion] Three datasets in one watch
>
> Company, job, and person conditions in one flat list. This company watch delivers companies running Snowflake, hiring data engineers, and employing someone who used to work at Databricks.
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

> [accordion] "First time" watches, like a first ML hire
>
> Set up a company watch for companies that employ a machine learning engineer. Its free baseline run records every company that already has one and delivers almost nothing. After that, a company can only appear by joining the set for the first time. That gives you "hired their first machine learning engineer" with no extra configuration, and the same shape gives you first hire in a country, first sales hire, or first posting of any kind.
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
> Two caveats. It means first as far as our data reaches, so a coverage gap or an edited job title will both set it off. And it fires once: a company that hires an ML engineer, loses them, and hires another stays quiet the second time.

> [accordion] Jobs at a kind of company
>
> Headcount growth is not carried on the job record, so this pairing needs the company dataset. This job watch delivers sales roles at companies that grew more than 50% in six months.
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
>
> > [!TIP]
> >
> > Reach for the `company.` prefix first on a job watch. `company.headcount.total`
> > and `company.funding.last_round_type` read the copy already on the job record,
> > with no join. Use the unprefixed Company Search name only for what the job
> > record does not carry, like growth rate or founding year.

> [accordion] Jobs at recently founded companies
>
> Founding year is very broad on its own, so pair it with a second **company** condition. A job condition does not count toward the million-company ceiling.
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
> > Without the `headcount.total` condition this create returns `400` with `Your
> >           company filters cover more than 1,000,000 companies.` The title and country
> > conditions are job conditions, so they do not narrow the company side.

> [accordion] Jobs at companies employing an ex-competitor
>
> A person condition on a job watch joins through the current employer, so this finds postings at companies that already employ someone from a rival.
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

> [accordion] People at a kind of company
>
> Technology stack lives only on company records, so this pairing is out of reach from a person-only watch. This person watch delivers platform engineers at companies running Kubernetes.
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

> [accordion] People at fast-growing companies
>
> Headcount growth is a company field. This person watch delivers recruiters at companies that grew more than 50% in six months, which is close to a "they are about to hire hard" signal.
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

> [accordion] People whose employer is hiring for a role
>
> A job field on a person watch also joins through the current employer, so you can find people at companies staffing up a specific function. This person watch delivers engineering managers at companies hiring data engineers.
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

> [accordion] Founders at recently funded companies
>
> Funding dates live on the company record. This person watch delivers founders whose company closed a round on or after 2025-06-01, a fresh-budget signal for anything sold to new companies.
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

> [accordion] Pull the record from the other side
>
> The watch delivers your dataset only. This is the follow-up call that gets the posting that put a company in the feed, using the delivered `crustdata_company_id` and the same job conditions the watch matched on.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/job/search \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "filters": {
>       "op": "and",
>       "conditions": [
>         { "field": "company.basic_info.crustdata_company_id", "type": "in",  "value": [8294878] },
>         { "field": "job_details.title",                       "type": "(.)", "value": "data engineer" }
>       ]
>     },
>     "limit": 10
>   }'
> ```
>
> Leave out the job conditions and you get every open role at the company rather than the ones the watch matched on. This is an ordinary search call, billed at its normal rate.

***

## Pricing

Credits work exactly as they do on a single-dataset watch. You pay for records delivered to you, at your watch's own rate: 2 credits per company, 0.5 per person, 0.5 per job. Reading another dataset to narrow your filters is free, and the baseline run is free. See [Pricing](https://docs.crustdata.com/general/pricing.md) for the full table.

## What to do next

* **Build a company feed**: see the [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md) for the create body, the notification shape, and company recipes.
* **Build a person feed**: see the [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md).
* **Build a job feed**: see the [Job Watcher](https://docs.crustdata.com/watcher-docs/job/watch.md).
* **Check a condition before you watch it**: run it through the other dataset's search endpoint and confirm `total_count` is not zero.


## Related topics

- [Job Watcher](https://docs.crustdata.com/watcher-docs/job/watch.md)
- [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md)
- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
- [Get a discovery watch](https://docs.crustdata.com/api-reference/watch-apis/get-one-discovery-watch.md)
