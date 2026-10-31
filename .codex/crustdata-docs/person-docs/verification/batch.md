> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Batch Person Verification API

> Check whether a person's claimed work history is real, in a single asynchronous job of up to 10 profiles, with a verdict, a confidence score, reasoning, and cited sources for each.

## Endpoint essentials

| Detail | Value |
| - | - |
| **API key and headers** | Send `Authorization: Bearer YOUR_API_KEY` and `x-api-version: 2025-11-01` with every request. |
| **Access** | Add-on, enabled per account on request. Check your account with [Permissions](https://docs.crustdata.com/general/permissions.md). |
| **Free account** | No |
| **Credit cost** | 10 credits per verdict. A profile with no verdict is free |
| **Batch size** | 10 profiles per job |
| **Rate limit** | Up to 5 jobs can run at the same time. |

Batch verify takes a list of people you already have and answers one question
for each: is the work history on their profile real? Each result carries a
verdict, a confidence score, the reasoning behind it, and the web sources it
relied on.

```
POST https://api.crustdata.com/batch/person/verify
```

> [!NOTE]
>
> Verification is an add-on, enabled per account. If your plan does not
> include it, contact your Crustdata account team.

**Pricing:** 10 credits per verdict returned. A profile that
does not reach a verdict is free. See [Pricing](https://docs.crustdata.com/general/pricing.md) for
details.
To see the price for your account, open the [**Pricing** tab](https://app.crustdata.com/endpoints/batch-person-verify#pricing) in the dashboard.
** Limits:** up to 10 profiles per submission. Submissions are
capped at 5 per minute, and active jobs are capped per account across the
live endpoints - see [Rate limits](https://docs.crustdata.com/general/rate-limits.md#batch-job-concurrency).

<Snippet file="batch-headers-note.mdx" />

***

## How a profile is checked

For each person the service runs three checks, then asks a language model to
weigh the whole picture:

* Dates: a full-time job that overlaps full-time study by more than six months is flagged.
* Social graph: the person's own recent posts are fetched. The people who reacted or commented are looked up in the Crustdata people database and matched to the claimed employer. Coworker engagement can lift a verdict to `probably_genuine`, never higher.
* Web search: the model searches the web for independent evidence of the current role. Profile mirror sites that only restate the claim carry no weight.

The current role decides the verdict. Old roles that cannot be verified add a
`past_roles_unverified` flag instead of dragging the verdict down.

A job usually finishes in a minute or two.

***

## Submit a job

`POST /batch/person/verify` takes `professional_network_profile_urls`, a list
of person profile URLs, with up to 10 values per job for now. Sending none
returns `400`.

You can also pass `webhook_url`, a URL on your side. When the job finishes,
Crustdata sends a `POST` to it with the download link, so you do not have to
poll. See [Skip polling with webhooks](#skip-polling-with-webhooks).

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/batch/person/verify \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "professional_network_profile_urls": ["https://www.linkedin.com/in/rishabhhq/"]
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
    "batch_id": "b82e4e5e-8812-4f47-bccd-0439315695b0",
    "status": "pending",
    "entity": "person",
    "action": "verify",
    "identifier_count": 1,
    "entities_requested": 1,
    "status_url": "/batch/b82e4e5e-8812-4f47-bccd-0439315695b0"
}
```

The `action` is `verify` wherever you poll or list jobs.

## Poll for the results file

Poll `GET /batch/{batch_id}` until `status` is `completed`. The response then
carries `download_url`, a link to a gzipped JSON lines file with one record
per person. The link expires after 5 days.

```bash Request theme={"theme":"vitesse-black"}
curl --request GET \
  --url https://api.crustdata.com/batch/3f806ed3-ec4c-4f10-a853-a0f05c723f7d \
  --header 'authorization: Bearer YOUR_API_KEY'
```

```json Response theme={"theme":"vitesse-black"}
{
    "batch_id": "3f806ed3-ec4c-4f10-a853-a0f05c723f7d",
    "status": "completed",
    "entity": "person",
    "action": "verify",
    "identifier_count": 3,
    "result_count": 3,
    "entities_requested": 3,
    "entities_fulfilled": 3,
    "created_at": "2026-09-10T05:41:24.883865+00:00",
    "completed_at": "2026-09-10T05:43:15.198554+00:00",
    "download_url": "https://crustdata-batch-api-data.s3.amazonaws.com/3f806ed3-ec4c-4f10-a853-a0f05c723f7d/output/results.jsonl.gz?...",
    "download_urls": [
        "https://crustdata-batch-api-data.s3.amazonaws.com/3f806ed3-ec4c-4f10-a853-a0f05c723f7d/output/part-000.jsonl.gz?..."
    ]
}
```

Download and unpack it:

```bash theme={"theme":"vitesse-black"}
curl -s "$DOWNLOAD_URL" -o results.jsonl.gz
gunzip results.jsonl.gz
```

## Read the results

When the job completes, each line in the downloaded file is one person wrapped
in the standard batch envelope. `original_identifier` echoes the URL you
sent, and `internal_id` is the numeric Crustdata person ID.

```json One record from the results file theme={"theme":"vitesse-black"}
{
    "original_identifier": "https://www.linkedin.com/in/rishabhhq/",
    "internal_id": 1052069,
    "data": {
        "verdict": "probably_genuine",
        "confidence": 0.65,
        "reasoning": "Current Crustdata Founding Engineer role is carried to 'supported' by social-graph engagement meeting the 3+ verified-employees/2+ posts threshold, corroborated by a Product Hunt maker listing that supplies identity anchors alongside known Crustdata staff. The three past roles have no independent corroborating or contradicting evidence; these are short internships and a mid-level IC role at scale, which is expected to be low-visibility and does not lower the overall assessment.",
        "flags": [],
        "coverage": {
            "social_ran": true,
            "posts_fetched": 2,
            "posts_checked": 2,
            "engagers_seen": 58,
            "engagers_resolved": 56,
            "coworker_hits": 7,
            "timeline_flags": 0,
            "flags": []
        },
        "citations": [
            {
                "url": "https://www.producthunt.com/products/crustdata-2/makers",
                "title": "Crustdata Makers and Employees (2025) | Product Hunt",
                "cited_text": "Rishabh Raj Building Crustdata · People Dataset ..."
            }
        ]
    }
}
```

> [!NOTE]
>
> `reasoning` and `cited_text` are shortened here. A profile that cannot be
> resolved, or whose check fails, is left out of the results file rather
> than written as an error, so `result_count` can be lower than
> `identifier_count`. Billing follows `result_count`: you pay for the
> verdicts you get back, not the profiles you sent.

### Fields in `data`

| Field | Type | Meaning |
| - | - | - |
| `verdict` | string | One of the seven values below. |
| `confidence` | number | `0` to `1`. Bands are fixed per verdict, so the same verdict lands in the same range across runs. |
| `reasoning` | string | Plain-text explanation of the verdict. |
| `flags` | array | Date conflicts and other caveats found on the profile, for example `past_roles_unverified`. |
| `coverage` | object | What the checks managed to look at, as counts (see below). |
| `citations` | array | Each source the model relied on: `url`, `title`, and the `cited_text` it quoted. |

### Verdicts

| `verdict` | Meaning |
| - | - |
| `clearly_genuine` | Independent sources confirm the current role. |
| `probably_genuine` | Evidence supports the claim, for example coworker engagement, but does not confirm it outright. |
| `cannot_verify` | No usable evidence either way. Expected for people with little web footprint. |
| `probably_fabricated` | No evidence was found where some was expected, given the seniority or visibility of the claimed role. |
| `clearly_fabricated` | Evidence contradicts the claim. |
| `reclassified_employment` | The relationship is real but not what the profile says, for example an advisor listed as an employee. |
| `non_person` | The profile is not a person, for example a company or a group page. |

### Coverage counts

| Field | Meaning |
| - | - |
| `social_ran` | Whether the social graph check ran at all. |
| `posts_fetched` | Recent posts by the person that were retrieved. |
| `posts_checked` | Posts whose reactions and comments were examined. |
| `engagers_seen` | Distinct people who reacted or commented. |
| `engagers_resolved` | Engagers that resolved to a record in the people database. |
| `coworker_hits` | Resolved engagers who work at the claimed employer. |
| `timeline_flags` | Date conflicts found by the dates check. |
| `flags` | Caveats from the checks themselves, for example `posts_unavailable` when no posts came back. |

`posts_unavailable` means no posts were retrieved. It cannot tell a retrieval
failure from a person who never posts, so read a `cannot_verify` with this flag
as "unchecked" rather than "suspicious".

***

<Snippet file="batch-job-lifecycle.mdx" />

***

## Rate limits

Submissions are limited to 5 per minute, and verify jobs count toward the
live pool of active jobs. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).

## Errors

Sending a body without `professional_network_profile_urls` returns `400` with
`error.type` of `invalid_request`.

<Snippet file="batch-errors.mdx" />

***

## What to do next

* Need the full profile too? See [Person Batch Enrich](https://docs.crustdata.com/person-docs/enrichment/batch-enrich.md) to pull the record you are verifying.
* Only have emails? [Person Identify](https://docs.crustdata.com/person-docs/identify/introduction.md) resolves them to profiles first.


## Related topics

- [Batch Person Enrichment API](https://docs.crustdata.com/person-docs/enrichment/batch-enrich.md)
- [Batch Verify Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-verification-job.md)
- [Batch Enrich Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-enrichment-job.md)
- [Batch Identify Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-identify-reverse-email-lookup-job.md)
- [Batch Search Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-database-search-job.md)
