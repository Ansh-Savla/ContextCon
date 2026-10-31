> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Filter value enumeration

> Downloadable lists of the valid values for person search filter fields — skills, titles, regions, and employer industries.

Several person-search filter fields accept values from a fixed vocabulary. The
[autocomplete API](https://docs.crustdata.com/person-docs/autocomplete/introduction.md) is always the current
source of truth, but these downloadable snapshots are convenient when you build
filters programmatically against a large set.

> [!WARNING]
>
> These files are point-in-time snapshots. For always-current values, use the
> [autocomplete API](https://docs.crustdata.com/person-docs/autocomplete/introduction.md).

## Person filter values

| Field | Used by | Values | Download |
| - | - | - | - |
| `skills.professional_network_skills` | [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) | 40,098 | [skills.json](https://s3.us-east-2.amazonaws.com/fulldocs.crustdata.com/examples/people-search/skills.json) |
| `CURRENT_TITLE` | [Person Live Search](https://docs.crustdata.com/person-docs/search/live-search.md) | 25,204 | [titles.json](https://s3.us-east-2.amazonaws.com/fulldocs.crustdata.com/examples/people-search/linkedin_titles.json) |
| `REGION` | [Person Live Search](https://docs.crustdata.com/person-docs/search/live-search.md) | 58,221 | [regions.json](https://s3.us-east-2.amazonaws.com/fulldocs.crustdata.com/examples/people-search/static-region-filter-values.json) |
| Employer industry | both (`INDUSTRY` live / `company_industries` indexed) | 433 | [industries.json](https://s3.us-east-2.amazonaws.com/fulldocs.crustdata.com/examples/people-search/static-linkedin-industries.json) |

> [!NOTE]
>
> **Indexed vs live.** `skills` is filterable on the indexed
> [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md). `CURRENT_TITLE` and
> `REGION` are filter fields on the real-time
> [Person Live Search](https://docs.crustdata.com/person-docs/search/live-search.md) (the uppercase,
> real-time filter fields). On indexed Person Search, titles are matched as **text**
> with the `(.)` operator rather than chosen from this list.

> [!NOTE]
>
> **Industries** are shared with company search — the same 433-value taxonomy
> applies to the employer-industry filters on both sides.

## What to do next

* **Discover values interactively** — [Person Autocomplete](https://docs.crustdata.com/person-docs/autocomplete/introduction.md)
* **Build a search** — [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md)
* **Company values** — [Company filter values](https://docs.crustdata.com/company-docs/filter-values.md)


## Related topics

- [Filter value enumeration](https://docs.crustdata.com/company-docs/filter-values.md)
- [Job Postings Search API](https://docs.crustdata.com/job-docs/search/introduction.md)
- [Cross-dataset filters](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md)
- [Person Search reference](https://docs.crustdata.com/person-docs/search/reference.md)
- [Job Watcher](https://docs.crustdata.com/watcher-docs/job/watch.md)
