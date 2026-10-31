> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Semantic People Search API

> Use natural-language search on POST /person/search to rank people by role, skills, location, and broader profile context.

> [!NOTE]
>
> Person Semantic Search is currently in **beta** on `POST /person/search`.
> Request fields, ranking behavior, and query-constraint extraction may evolve
> based on feedback. To share input or request access, write to
> [support@crustdata.co](mailto:support@crustdata.co).

**Use this when** you want to search for people using natural language instead
of building every filter by hand, for recruiting searches, persona discovery,
market mapping, and exploratory lead lists.

Person Semantic Search lets you pass a natural-language `search.query` to
[Person Search](https://docs.crustdata.com/person-docs/search/introduction.md). Crustdata uses the query to
rank matching people by profile context such as title, skills, company history,
education, location, and summary text. You can also combine semantic ranking
with structured `filters`.

> [!WARNING]
>
> This is **current platform behavior** for the live `/person/search`
> endpoint. The checked-in OpenAPI reference may not yet list the beta
> `search` object or top-level semantic `mode` field.

### Where semantic search is available

| API | Request field | Notes |
| - | - | - |
| [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) | `search` | Add a natural-language query to rank and recall people semantically. |
| [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) | `mode` | Optional top-level recall mode: `managed` (default) or `exact`. |

### At a glance

| Detail | Value |
| - | - |
| **Endpoint** | `POST https://api.crustdata.com/person/search` |
| **Auth** | `Authorization: Bearer YOUR_API_KEY` |
| **API version** | `x-api-version: 2025-11-01` header |
| **Beta request field** | `search.query` |
| **Retrieval modes** | `search.mode`: `hybrid` (default), `lexical`, or `semantic` |
| **Recall modes** | top-level `mode`: `managed` (default) or `exact` |
| **Keyword operators** | `search.query_syntax`: `plain` (default) or `boolean` (lexical + exact only) |
| **Query length limit** | `search.query` accepts up to \~32,000 tokens (131,072 characters) |
| **Response** | Paginated Person Search shape: `profiles` (each head profile with a relevance `fit` tier), `next_cursor`, `total_count`, `total_count_relation` |
| **Pricing** | Same as Person Search: **0.03 credits per result**, plus a premium group's price when you filter on it and again when you receive it, see [Premium fields in search](https://docs.crustdata.com/general/pricing.md#premium-fields-in-search) |
| **Rate limit** | Same as Person Search: **30 requests per minute** |

***

## The problem: rigid filter-only search

Structured filters are precise, but they force you to know the exact fields,
operators, and indexed values before you search. That works for narrow
queries, but it breaks down when your intent is broader:

* **Persona searches** - "founding engineers at developer tools startups."
* **Skill-heavy searches** - "backend engineers with Golang and distributed systems experience."
* **Job-description searches** - paste the most important parts of a role and find similar profiles.
* **Exploratory recruiting** - start with a plain-language role description, then tighten with filters.

Without semantic search, you need to manually translate those ideas into many
field-specific filters.

## The solution: natural-language ranking

Add a `search` object to a Person Search request:

```json theme={"theme":"vitesse-black"}
{
    "search": {
        "query": "founding engineers at developer tools startups",
        "mode": "hybrid"
    },
    "limit": 10
}
```

The `search.query` is used to find and rank people whose profiles match the
meaning of the query. You can send `search` by itself, or combine it with
structured `filters`.

> [!NOTE]
>
> Do not send `sorts` with semantic search. Semantic results are already
> rank-ordered by relevance.

### Limits

`search.query` accepts up to \~32,000 tokens (131,072 characters) — enough to
paste a full job description. Requests over the limit return **HTTP 400** with
an error explaining the limit and the length of the query you sent.

### Retrieval modes

The nested `search.mode` field controls which retrieval signals are used for
the natural-language query.

| `search.mode` | Meaning | Use when |
| - | - | - |
| `hybrid` | Combines lexical keyword matching and semantic vector search. | You want the best default for natural-language people search. |
| `lexical` | Uses keyword matching only. | You want exact terms, acronyms, names, or IDs to dominate. |
| `semantic` | Uses vector similarity only. | You want concept matching even when profiles use different words. |

`hybrid` is the default. Use it unless you have a specific reason to isolate
keyword-only or vector-only behavior.

### Recall modes

The top-level `mode` field controls how Crustdata combines your natural-language
query with explicit `filters`.

| `mode` | Behavior | Use when |
| - | - | - |
| `managed` (default) | Crustdata can extract extra constraints from the query and union them with your filters before reranking. | You want better recall and are comfortable with adaptive results. |
| `exact` | Only your explicit `filters` define the hard result set. The query still ranks results inside that set. | You need filters enforced as hard constraints or reproducible counts. |

> [!WARNING]
>
> In `managed` mode, explicit `filters` are a recall and ranking signal, not
> always a hard global constraint. A strong profile can be returned if it
> matches constraints extracted from the natural-language query. Use `mode:
>       "exact"` when every returned profile must satisfy your explicit filters.

### What a prompt does to your result set

A prompt ranks people inside your filters. It never removes a profile your
filters selected. In the default `mode: "managed"` it can add profiles: Crustdata
parses constraints out of your prompt and unions them with your filters, so
`total_count` can be far larger than your filters alone, and a returned profile
need not match every filter you sent.

### How deep a prompt reaches

With a prompt, `total_count` is the size of the population Crustdata searched,
not the number of profiles you can page to. Results come from a reranked head of
up to 200 profiles plus a fused tail, and the cursor stops after 10,000 profiles.
Head profiles carry a `fit` tier and tail profiles carry `fit: null`. A page where
every `fit` is `null` means nothing cleared the internal relevance bar for that
prompt. A shorter, more specific prompt usually fixes it.

Three more things worth knowing:

* `total_count_relation` carries a value only on a response to a request that
  carried a prompt, where it reads `"eq"`. A filter-only search returns the key
  with `null` in it.
* A filter-only search has no such cap. The cursor walks the whole set.
* Prompt length does not change which profiles are eligible. A very long prompt
  is shortened for ranking only, so the population stays the same. A 25,000
  character prompt returned the same 49,205 profiles as the one-line prompt
  above.

### Boolean keyword operators

For precise keyword search, set `search.query_syntax: "boolean"` to read the
query as a boolean expression instead of plain text. Punctuation becomes search
operators:

| Operator | Example | Matches profiles that |
| - | - | - |
| space (AND) | `golang kubernetes` | contain **both** terms |
| `\|` (OR) | `golang \| rust` | contain **either** term |
| `+` (require) | `engineer +kubernetes` | must contain the `+` term |
| `-` (exclude) | `engineer -manager` | must not contain the `-` term |
| `"…"` (phrase) | `"site reliability engineer"` | contain the exact phrase |
| `*` (prefix) | `kuber*` | match a term prefix |
| `()` (group) | `+(golang \| rust) engineer` | group operators together |

A space means **AND** — every space-separated term is required. Use `|` for OR.
This follows standard keyword-search conventions.

Boolean syntax is honored only with `search.mode: "lexical"` and the top-level
recall `mode: "exact"`. Any other combination returns a `400`. The default,
`query_syntax: "plain"`, is unchanged — existing queries keep matching as before.

```bash theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/person/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "search": {
      "query": "\"site reliability\" +kubernetes (golang | rust) -recruiter",
      "mode": "lexical",
      "query_syntax": "boolean"
    },
    "mode": "exact",
    "fields": ["fit", "basic_profile"],
    "limit": 5
  }'
```

***

## Example: search from a natural-language query

This request finds people who match a plain-language recruiting query.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/person/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "search": {
      "query": "backend engineers with Golang and distributed systems experience",
      "mode": "hybrid"
    },
    "fields": [
      "fit",
      "basic_profile",
      "experience.employment_details.current"
    ],
    "limit": 5
  }'
```

```python Python theme={"theme":"vitesse-black"}
import os
import requests

response = requests.post(
    "https://api.crustdata.com/person/search",
    headers={
        "Authorization": f"Bearer {os.environ['CRUSTDATA_API_KEY']}",
        "Content-Type": "application/json",
        "x-api-version": "2025-11-01",
    },
    json={
        "search": {
            "query": "backend engineers with Golang and distributed systems experience",
            "mode": "hybrid",
        },
        "fields": [
            "fit",
            "basic_profile",
            "experience.employment_details.current",
        ],
        "limit": 5,
    },
)
response.raise_for_status()
profiles = response.json()["profiles"]
```

```javascript Node.js theme={"theme":"vitesse-black"}
const response = await fetch("https://api.crustdata.com/person/search", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${process.env.CRUSTDATA_API_KEY}`,
        "Content-Type": "application/json",
        "x-api-version": "2025-11-01",
    },
    body: JSON.stringify({
        search: {
            query: "backend engineers with Golang and distributed systems experience",
            mode: "hybrid",
        },
        fields: [
            "fit",
            "basic_profile",
            "experience.employment_details.current",
        ],
        limit: 5,
    }),
});
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const { profiles } = await response.json();
```

The response uses the normal Person Search shape, plus a per-profile `fit`
relevance tier and a top-level `total_count_relation`:

```json Response shape theme={"theme":"vitesse-black"}
{
    "profiles": [
        {
            "crustdata_person_id": 123,
            "fit": "strong",
            "basic_profile": {
                "name": "Example Person",
                "current_title": "Senior Backend Engineer"
            }
        }
    ],
    "next_cursor": "H4sIA...",
    "total_count": 1250,
    "total_count_relation": "eq"
}
```

> [!NOTE]
>
> The response above shows shape only. Actual profile values depend on the
> query, requested `fields`, and account permissions.

### Relevance tier (`fit`) and result counts

Semantic responses add two fields on top of the standard Person Search shape:

| Field | Where | Meaning |
| - | - | - |
| `fit` | per profile | Coarse relevance tier for that profile against your query: `strong`, `possible`, or `weak`. Use it to threshold or group results without reading raw scores. |
| `total_count_relation` | top level | Whether `total_count` is an exact count (`"eq"`) or a lower bound (`"gte"`). |

Use `fit` to keep only high-confidence matches (for example, surface `strong`
results and review `possible` ones):

```python theme={"theme":"vitesse-black"}
strong = [p for p in response.json()["profiles"] if p.get("fit") == "strong"]
```

> [!NOTE]
>
> `fit` is returned by default. If you pass an explicit `fields` list, add
> `"fit"` to keep it in the response. `fit` can be `null` on deeper result
> pages, where results are not reranked.

`fit` covers the reranked head only, which holds at most 200 profiles and is
often shorter. Every profile past the head carries `fit: null`, whether you
reach it with a large `limit` or with the cursor. See
[How deep a prompt reaches](#how-deep-a-prompt-reaches).

***

## Example: semantic ranking inside hard filters

Use `mode: "exact"` when your filters must be enforced. This example limits the
result set to people in San Francisco, then uses the natural-language query to
rank the best machine-learning profiles inside that set.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/person/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "search": {
      "query": "machine learning engineers who have built recommender systems",
      "mode": "hybrid"
    },
    "mode": "exact",
    "filters": {
      "field": "basic_profile.location.full_location",
      "type": "(.)",
      "value": "San Francisco"
    },
    "fields": [
      "basic_profile",
      "experience.employment_details.current"
    ],
    "limit": 5
  }'
```

Use this pattern when you need deterministic membership for handoffs to agents,
workflows, or downstream systems.

***

## When to use each approach

| You want to | Use |
| - | - |
| Find people from a natural-language role or persona | `search.query` with `search.mode: "hybrid"` |
| Match concepts even when profiles use different wording | `search.mode: "semantic"` |
| Match exact terms, acronyms, names, or IDs | `search.mode: "lexical"` |
| Use boolean operators (`+ - \| "phrase" * ()`) | `search.query_syntax: "boolean"` with `search.mode: "lexical"` + top-level `mode: "exact"` |
| Keep explicit filters as hard constraints | top-level `mode: "exact"` |
| Maximize recall and let Crustdata improve query parsing | top-level `mode: "managed"` |
| Build a fully deterministic filter query | Filter-only [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) |
| Discover exact filter values before filtering | [Person Autocomplete](https://docs.crustdata.com/person-docs/autocomplete/introduction.md) |

***

## What to do next

* **Search with filters** - see [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) for the standard filter workflow.
* **Look up operators and fields** - see [Person Search reference](https://docs.crustdata.com/person-docs/search/reference.md).
* **Discover filter values** - use [Person Autocomplete](https://docs.crustdata.com/person-docs/autocomplete/introduction.md).
* **Feedback** - Person Semantic Search is in beta; send ranking or query-parsing feedback to [support@crustdata.co](mailto:support@crustdata.co).


## Related topics

- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [People Search API](https://docs.crustdata.com/person-docs/search/introduction.md)
- [Batch People Search API](https://docs.crustdata.com/person-docs/search/batch-search.md)
- [Company Search API](https://docs.crustdata.com/company-docs/search/introduction.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
