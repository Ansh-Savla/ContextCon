> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Data Export

> Export every person or company matching a search as a scheduled CSV or JSONL file, with the columns you pick, straight from the Crustdata dashboard.

Export everyone who matches a search as a file, once or on a schedule.

Data Export lives in the dashboard at
[app.crustdata.com/data-exports](https://app.crustdata.com/data-exports). There
is no API for it.

## Create an export

**1. Pick People or Companies**

Fixed once you save.

**2. Choose the filter**

Pick a template, or describe your own in plain English.

![Template cards and the Describe your own box](https://mintcdn.com/crustdata/alqB64hx4VtFTD-6/images/data-export/query.png?fit=max\&auto=format\&n=alqB64hx4VtFTD-6\&q=85\&s=f873bcd19dd6bb10e83f3f25b1085515)

**Describe a change** refines it. **Edit the query** opens the raw JSON.

**3. Choose the columns**

One column per field, with a recommended set already selected.

![The column picker with the Current employment group open](https://mintcdn.com/crustdata/alqB64hx4VtFTD-6/images/data-export/columns.png?fit=max\&auto=format\&n=alqB64hx4VtFTD-6\&q=85\&s=5e2b5953de862769900b574326d2e154)

The picker starts on **Recommended for you**; the link beneath shows every
group. Both list only the fields your team can read. If a saved export's
columns stop being readable, editing it drops them.

**4. Name it, then set size, cadence, and format**

The match count and credit estimate update as you go.

![Name, number of entries, cadence, format, and the credit estimate](https://mintcdn.com/crustdata/alqB64hx4VtFTD-6/images/data-export/schedule.png?fit=max\&auto=format\&n=alqB64hx4VtFTD-6\&q=85\&s=ea61871b178d792415e704fc1a7e8192)

**5. Review and start**

Accept the terms, then **Start export**. The first run starts immediately.

![The review summary and the columns it will write](https://mintcdn.com/crustdata/alqB64hx4VtFTD-6/images/data-export/review.png?fit=max\&auto=format\&n=alqB64hx4VtFTD-6\&q=85\&s=08001b5e7734bb20844c33c2f6c7287b)

## Filters

An export filter is the same filter tree that
[Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) and
[Company Search](https://docs.crustdata.com/company-docs/search/introduction.md) accept.

```json theme={"theme":"vitesse-black"}
{
  "op": "and",
  "conditions": [
    { "field": "taxonomy.categories", "type": "[.]", "value": "FinTech" },
    { "field": "funding.last_round_type", "type": "=", "value": "series_a" }
  ]
}
```

An export rejects natural-language ranking through `search.query` and custom
`sorts`. Sort the file after you download it.

For fields and operators, see the
[Person Search reference](https://docs.crustdata.com/person-docs/search/reference.md) and the
[Company Search reference](https://docs.crustdata.com/company-docs/search/reference.md).

## Schedules

| Cadence | What happens |
| - | - |
| Once | Runs once, right after you save. |
| Daily | Every day, around this time. |
| Weekly | Every week, same day and time. |
| Monthly | Every month, same day. |

Your rows per run decide which cadences you are offered.

| Rows per run | Cadences available |
| - | - |
| Up to 1,000,000 | Once, Daily, Weekly, Monthly |
| 1,000,001 to 10,000,000 | Once, Weekly, Monthly |
| Over 10,000,000 | Once, Monthly |

* **Run now** triggers an extra run at any time, including on a paused export.
* **Pause schedule** stops future runs. **Resume schedule** waits one full
  period before the next run, so a daily export resumed today runs tomorrow.
* Missed runs are never replayed. An overdue export runs once, then returns to
  its cadence.
* Three failed scheduled runs in a row pause the export.
* Edits apply to the next run. A run in progress keeps the configuration it
  started with.

## Files

Both formats download gzipped.

| Format | Shape |
| - | - |
| CSV | One column per selected field, in selection order. Opens in Excel or Google Sheets. |
| JSONL | One JSON object per line, nested like the API. |

### Lists in CSV

List fields spread across numbered columns named `path[i].leaf`. Selecting
`experience.employment_details.past.title` gives you
`experience.employment_details.past[0].title`,
`experience.employment_details.past[1].title`, and so on. Every row gets as many
slots as the widest row needs.

The list fields are `education.schools` and current and past employment for
people, and `basic_info.all_domains`, `basic_info.markets`, `funding.investors`,
`locations.all_office_addresses`, `revenue.public_markets.stock_symbols`, and
the `taxonomy` lists for companies. Pick JSONL to keep the nesting.

## Limits

* **Rows per run.** Prefilled with 100,000, or your ceiling if that is lower.
  The default ceiling is 1,000,000 and your team's may differ. A search matching
  more rows than your cap still runs, writes up to the cap, and marks the run
  `capped`.
* **Concurrency.** One run at a time per export, two per team. A run that cannot
  start is skipped and recorded, not queued.

Need more than the ceiling? [Contact us](mailto:support@crustdata.co) about a
managed export.

## Runs

Every run lands in the export's history with its status, rows written out of
rows matched, credits, duration, and a download link. Expand a run for its
completion report, which shows how many rows carried a value in each column.

![The run history with a completion report and the export configuration](https://mintcdn.com/crustdata/alqB64hx4VtFTD-6/images/data-export/runs.png?fit=max\&auto=format\&n=alqB64hx4VtFTD-6\&q=85\&s=33ef756212a334820ee63f9f2f678e02)

| Status | What it means |
| - | - |
| Queued | Accepted, waiting to start. |
| Running | Writing rows now. Cancel it to stop early. |
| Completed | Finished. There is always a file, even when nothing matched. |
| Partial | Stopped early. The file holds the rows written so far. |
| Failed | No file. Costs nothing. |
| Cancelled | You stopped it. The file keeps the rows written so far. |
| Skipped | Never started, so no file and no charge. |

Download links are minted on click and last one hour. Anyone with the link can
download the file.

## Pricing

A run bills per row written, at your plan's
[Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) or
[Company Search](https://docs.crustdata.com/company-docs/search/introduction.md) rate. Premium filters and
columns add their own per-row charge.

* Previews are free.
* Failed and skipped runs cost nothing.
* A run that stops part-way bills only the rows it wrote.
* If your balance will not cover the first run, you can still save. The run is
  skipped until you top up.

See [Pricing](https://docs.crustdata.com/general/pricing.md) for your rate and [Credits](https://docs.crustdata.com/general/credits.md) for
your balance.

## When a run does not finish

| What you see | What happened |
| - | - |
| Not enough credits | Your balance would not cover the run. Nothing was charged. |
| Columns no longer permitted | A selected column left your plan. Edit the columns and run again. |
| A run was already in progress | Wait for it, or cancel it. |
| Team already had 2 runs in progress | Try again when one finishes. |
| Timed out | The run exceeded its time limit. |
| Something went wrong on our side | Ours to fix. Contact support if it repeats. |

Running out of credits mid-run stops the run at its next checkpoint, keeps the
rows already written, and bills only those. It shows as `Partial`.

## Roles

| Role | What you can do |
| - | - |
| Admin | Create, edit, run, pause, and delete exports, and download files. |
| Member | View every export and its runs, and download files. No changes. |

## Managed exports

Bulk dumps Crustdata provisions for your team appear under **Managed exports**,
below your own, each with its own run history. They are read only here; to
change one, contact your account manager.

## Terms

Creating an export means accepting the
[Terms of Service](https://crustdata.com/terms) and the
[Data Export Terms](https://app.crustdata.com/terms/data-export): internal use
only, no resale or redistribution, and you handle personal data under the
privacy laws that apply to you.

## What to do next

> [card] [Person filters](https://docs.crustdata.com/person-docs/search/reference.md)
>
> Every field and operator an export filter accepts.

> [card] [Company filters](https://docs.crustdata.com/company-docs/search/reference.md)
>
> The same for companies.

> [card] [Track changes instead](https://docs.crustdata.com/watcher-docs/person/discovery.md)
>
> For only what is new since last time, use a discovery watcher.


## Related topics

- [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md)
- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
- [Usage](https://docs.crustdata.com/general/usage.md)
- [Usage summary](https://docs.crustdata.com/api-reference/account-apis/get-a-usage-summary.md)
- [Jobs Search reference](https://docs.crustdata.com/job-docs/search/reference.md)
