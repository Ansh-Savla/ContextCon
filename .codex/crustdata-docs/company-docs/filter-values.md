> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Filter value enumeration

> Downloadable lists of the valid values for company search filter fields — industries, categories, company types, funding round types, headcount ranges, and countries.

Several search filter fields accept values from a fixed vocabulary. The
[autocomplete API](https://docs.crustdata.com/company-docs/autocomplete/introduction.md) is always the
current source of truth, but when you build filters programmatically against a
large set, these downloadable snapshots are convenient.

> [!WARNING]
>
> These files are point-in-time snapshots. For always-current values — and for
> fields with very large or dynamic vocabularies — use the
> [autocomplete API](https://docs.crustdata.com/company-docs/autocomplete/introduction.md).

## Company filter values

Each file is the value list for one company-search filter field.

| Field | Values | Download |
| - | - | - |
| `basic_info.industries` | 433 | [industries.json](https://s3.us-east-2.amazonaws.com/fulldocs.crustdata.com/examples/people-search/static-linkedin-industries.json) |
| `taxonomy.categories` | 801 | [categories.json](https://s3.us-east-2.amazonaws.com/fulldocs.crustdata.com/examples/company-discovery/crunchbase_categories.json) |
| `basic_info.company_type` | 8 | [company-types.json](https://s3.us-east-2.amazonaws.com/fulldocs.crustdata.com/examples/company-discovery/company_type.json) |
| `funding.last_round_type` | 28 | [funding-round-types.json](https://s3.us-east-2.amazonaws.com/fulldocs.crustdata.com/examples/company-discovery/last_funding_round_type.json) |
| `basic_info.employee_count_range` | 9 | [headcount-ranges.json](https://s3.us-east-2.amazonaws.com/fulldocs.crustdata.com/examples/company-discovery/employee_count_range.json) |
| `locations.country` | 196 | [countries.json](https://s3.us-east-2.amazonaws.com/fulldocs.crustdata.com/examples/company-discovery/largest_headcount_country.json) |

> [!NOTE]
>
> **Countries:** `countries.json` is a list of `{ iso_alpha3, name }`
> objects. Filter `locations.country` with the `iso_alpha3` value, such as
> `"USA"` or `"GBR"`. The `name` values are formal ISO names, such as
> `"United States of America (the)"`, and some of them match no companies.
> To filter by country name, use a name from
> [Autocomplete](https://docs.crustdata.com/company-docs/autocomplete/introduction.md), such as
> `"United States"`.

> [!NOTE]
>
> **Headcount:** `headcount-ranges.json` lists the indexed
> `basic_info.employee_count_range` buckets (`2-10`, `11-50`, … `10001+`). The
> real-time [Company Live Search](https://docs.crustdata.com/company-docs/search/live-search.md)
> `COMPANY_HEADCOUNT` filter uses comma-formatted buckets instead
> (`1,001-5,000`, `Self-employed`, …), listed under
> [fixed values](https://docs.crustdata.com/company-docs/search/live-search.md#filter-fields-with-fixed-values).

## Person filter values

Person-search vocabularies (regions, titles, and employer industries) are large
and change more often. Use [Person Autocomplete](https://docs.crustdata.com/person-docs/autocomplete/introduction.md)
to discover current values for person-search filter fields.

## What to do next

* **Discover values interactively** — [Company Autocomplete](https://docs.crustdata.com/company-docs/autocomplete/introduction.md)
* **Build a search** — [Company Search](https://docs.crustdata.com/company-docs/search/introduction.md)
* **Person values** — [Person filter values](https://docs.crustdata.com/person-docs/filter-values.md)


## Related topics

- [Filter value enumeration](https://docs.crustdata.com/person-docs/filter-values.md)
- [Job Postings Search API](https://docs.crustdata.com/job-docs/search/introduction.md)
- [Cross-dataset filters](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md)
- [Person Search reference](https://docs.crustdata.com/person-docs/search/reference.md)
- [Job Watcher](https://docs.crustdata.com/watcher-docs/job/watch.md)
