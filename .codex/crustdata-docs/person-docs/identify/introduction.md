> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Person Identify API

> Resolve profile URLs, emails, or Google Scholar profile URLs to the people behind them: up to 25 in one synchronous call, or up to 300 emails as an async job.

## Endpoint essentials

| Detail | Value |
| - | - |
| **API key and headers** | Send `Authorization: Bearer YOUR_API_KEY` and `x-api-version: 2025-11-01` with every request. |
| **Access** | Enabled per account on request. Check your account with [Permissions](https://docs.crustdata.com/general/permissions.md). |
| **Free account** | No |
| **Credit cost** | 1 credit per identifier that resolves to a person, on both endpoints. Unmatched identifiers are free |
| **Batch size** | 25 per request on `/person/identify`, 300 per job on `/batch/person/identify` |
| **Rate limit** | `/person/identify`: 30 requests per minute. Batch: up to 5 jobs can run at the same time. |

**Use this when** you have an identifier and need to know *who* it belongs to.
Each match returns the person's `crustdata_person_id`, basic profile, and
profile URL. You pay only for identifiers that resolve to a person.

Two endpoints share the same result row:

| Endpoint | Identifiers per call | Accepts | Returns |
| - | - | - | - |
| `POST /person/identify` | 25 | `professional_network_profile_urls`, `emails`, `research_profile_urls` | Results in the same request |
| `POST /batch/person/identify` | 300 | `emails`, `business_emails`, `professional_network_profile_urls` | A job with a results file |

> [!NOTE]
>
> Identify is enabled per account. If your plan does not include it, contact
> your Crustdata account team.

> [!NOTE]
>
> **Identify vs Enrich.** Identify answers *"who is this?"*. It returns the
> matched person's `crustdata_person_id`, `basic_profile` (name, headline,
> title, location), and `social_handles` (profile URL). If you also need
> contact data, full employment history, or company IDs per role, use
> [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/introduction.md) with the profile URL
> from the match.

> [!NOTE]
>
> Replace `YOUR_API_KEY` in each example with your actual API key. All requests
> require the `x-api-version: 2025-11-01` header.

## Identify a few people now

```
POST https://api.crustdata.com/person/identify
```

Send exactly one identifier key with up to 25 values. The response comes back
in the same request, one row per identifier, in the order you sent them.
Profile URLs and Scholar profile URLs match exactly. An email
matches exactly when the address is on file; otherwise Crustdata can match it
by the name in the address at the company that owns the domain, then by a
contact vendor lookup.

**Pricing:** 1 credit per identifier that resolves to a person.
Unmatched and redacted identifiers are never charged. See [Pricing](https://docs.crustdata.com/general/pricing.md).
** Limits:** up to 25 identifiers per request, 30 requests per
minute by default. See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).

### Request

| Parameter | Type | Required | Description |
| - | - | - | - |
| `professional_network_profile_urls` | string\[] | One identifier of | Profile URLs to resolve. 1 credit per match. Result rows carry `match_type: "professional_network_profile_url"`. |
| `emails` | string\[] | One identifier of | Email addresses, business or personal. 1 credit per match. Result rows carry `match_type: "email"`. |
| `research_profile_urls` | string\[] | One identifier of | Google Scholar profile URLs, for example `https://scholar.google.com/citations?user=VGjeKSMAAAAJ`. Only Google Scholar is supported. 1 credit per match. Result rows carry `match_type: "research_profile_url"`. |

> [!NOTE]
>
> `business_emails` is not accepted here. Send business addresses in
> `emails`. An address that is not on file is matched by the name in the
> address at the company that owns the domain, when that match is confident
> enough for the company's size, and otherwise looked up with a contact
> vendor inside the same request. A match on a new address can take a few
> seconds longer than one already on file.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/person/identify \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "emails": [
      "abhilash@crustdata.com",
      "nobody@unknown-domain.com"
    ]
  }'
```

```json Response theme={"theme":"vitesse-black"}
[
  {
    "matched_on": "abhilash@crustdata.com",
    "match_type": "email",
    "match_status": "matched",
    "matches": [
      {
        "confidence_score": 1.0,
        "person_data": {
          "crustdata_person_id": 1068035,
          "basic_profile": {
            "name": "Abhilash Chowdhary",
            "headline": "Co-founder at Crustdata (YC F24) | Infra for building AI employees",
            "current_title": "Co-Founder & CEO",
            "summary": "Love building things. A software engineer with vast experience in shipping products spanning robotics, web technologies and quantitative finance.",
            "languages": ["English", "Hindi"],
            "location": {
              "city": "San Francisco",
              "state": "California",
              "country": "United States",
              "continent": "North America",
              "raw": "San Francisco, California, United States",
              "full_location": null
            }
          },
          "social_handles": {
            "professional_network_identifier": {
              "profile_url": "https://www.linkedin.com/in/abhilashchowdhary"
            },
            "dev_platform_identifier": { "profile_url": null },
            "twitter_identifier": { "slug": "" }
          },
          "updated_at": "2026-09-30T11:06:14.480375Z"
        }
      }
    ]
  },
  {
    "matched_on": "nobody@unknown-domain.com",
    "match_type": "email",
    "match_status": "not_found",
    "matches": []
  }
]
```

The example leaves some `basic_profile` fields out. A match returns the same
`basic_profile` fields, from the same source, that the
[Person Enrich reference](https://docs.crustdata.com/person-docs/enrichment/reference.md#person_data-sections)
lists. Pass `social_handles.professional_network_identifier.profile_url` to
[Person Enrich](https://docs.crustdata.com/person-docs/enrichment/introduction.md) for the full profile, or
to [Contact Enrich](https://docs.crustdata.com/person-docs/contact/enrich.md) for emails and phone numbers.

### Response

A top-level array with one row per identifier you sent, in request order.

| Field | Description |
| - | - |
| `matched_on` | The identifier as you sent it. |
| `match_type` | The request key, singular: `professional_network_profile_url`, `email`, or `research_profile_url`. |
| `match_status` | `matched`, `not_found`, or `redacted`. See below. |
| `matches` | Zero or one match. |
| `matches[].confidence_score` | `1.0` for an exact match. An email matched by name and company domain carries the match score, `0.5` to `1.0`; the minimum rises with the company's headcount. |
| `matches[].person_data` | `crustdata_person_id`, `basic_profile`, `social_handles`, and `updated_at` for the matched person. |
| `matches[].person_data.social_handles` | The person's profile URL in `professional_network_identifier.profile_url`, plus `dev_platform_identifier.profile_url` and `twitter_identifier.slug`, which can be `null` or empty. |

| `match_status` | Meaning | Billed |
| - | - | - |
| `matched` | One person matched this identifier. | 1 credit |
| `not_found` | No person in Crustdata for this identifier. `matches` is empty. | No |
| `redacted` | The person asked Crustdata to remove their data and the request was approved. `matches` is empty, and the row does not change on retry. | No |

### Error responses

An invalid request body returns `400` with `error.type` of `invalid_request`
and one of these messages:

| `error.message` | When |
| - | - |
| `Exactly one identifier must be provided: professional_network_profile_urls, emails, crustdata_person_ids, or research_profile_urls` | The body has no identifier key. |
| `Only one identifier type can be provided. Found: emails, research_profile_urls` | The body has more than one identifier key. |
| `business_emails is not accepted by /person/identify. Use emails.` | The body uses `business_emails`. |
| `Maximum 25 values allowed for emails. Found 26` | The list has more than 25 values. |
| `Invalid emails: not-an-email, jane@example.com` | An email is malformed. The message lists each bad address. |
| `Invalid LinkedIn profile URLs: https://example.com/jane` | A profile URL is malformed. The message lists each bad URL. |
| `Invalid research profile URLs (only Google Scholar profile URLs with a `user` parameter are supported): https://example.com/jane` | A research profile URL is not a Google Scholar profile URL with a `user` parameter. |

```json 400 - business_emails theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "business_emails is not accepted by /person/identify. Use emails.",
        "metadata": []
    }
}
```

If Identify is not enabled on your account, the request returns `403`:

```json 403 - not enabled theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "permission_error",
        "message": "You do not have permission to access /person/identify.",
        "metadata": []
    }
}
```

When the identification service cannot answer, the request returns `503`.
Nothing is charged. Retry after a short wait.

```json 503 - service unavailable theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "service_unavailable",
        "message": "Person identification is temporarily unavailable; retry shortly.",
        "metadata": [{ "retryable": true }]
    }
}
```

### Summary

| Detail | Value |
| - | - |
| **Endpoint** | `POST /person/identify` |
| **Auth** | Bearer token + `x-api-version: 2025-11-01` |
| **Request** | One of `professional_network_profile_urls`, `emails`, or `research_profile_urls` (max 25). |
| **Response** | Array, one row per identifier in request order: `matched_on`, `match_type`, `match_status`, `matches` (0 or 1). |
| **Billing** | 1 credit per matched identifier; unmatched and redacted free. |
| **Errors** | `400`, `401`, `402`, `403`, `429`, `500`, `503` |

***

## Identify a list in bulk

```
POST https://api.crustdata.com/batch/person/identify
```

For lists larger than 25, submit a job. It accepts `emails`,
`business_emails`, or `professional_network_profile_urls` (up to 300) and
delivers one record per identifier as a file. Batch rows carry `matched_on`,
`match_type`, and `matches` like the synchronous endpoint, and `match_type`
can also be `business_email`. Batch matches include
`social_handles.professional_network_identifier.urn_url`, the permanent form
of the profile URL.

### How it works

Reverse identify is an **asynchronous, two-call flow** — you submit a job, then
fetch the results once it finishes:

**1. Submit your emails**

`POST /batch/person/identify` with your list of `emails` (or
`professional_network_profile_urls`). You get a `batch_id` back
immediately.

**2. Poll, or wait for a webhook**

`GET /batch/{batch_id}` to check the job status — or pass a `webhook_url`
on submit and we call you when it finishes.

**3. Download the results**

Once `status` is `completed`, the status response includes a
`download_url`: a gzipped JSONL file with one record per input, valid for
5 days.

> [!NOTE]
>
> Emails already known to Crustdata resolve in seconds. Emails that require
> real-time retrieval take longer, which is why this endpoint is asynchronous.

**Pricing:** 1 credit per email that resolves to a person —
unmatched emails are free. See [Pricing](https://docs.crustdata.com/general/pricing.md) for details.
** Limits:** up to 300 identifiers per submission. Active jobs
are capped per account across the live endpoints (5 on default limits) - see
[Rate limits](https://docs.crustdata.com/general/rate-limits.md#batch-job-concurrency).

***

### 1. Submit your emails

Send your emails in `emails` — business or personal addresses both work. The
response returns a `batch_id` immediately — the job runs asynchronously.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/batch/person/identify \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "emails": [
      "abhilash@crustdata.com",
      "ankit.harbhajanka@aequs.com"
    ]
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
    "batch_id": "f0d86a5d-0031-4ca4-b350-92162fb38850",
    "status": "pending",
    "entity": "person",
    "action": "identify",
    "identifier_count": 2,
    "entities_requested": 2,
    "status_url": "/batch/f0d86a5d-0031-4ca4-b350-92162fb38850"
}
```

> [!NOTE]
>
> You can submit `professional_network_profile_urls` instead of
> `emails` to resolve profile URLs to their `crustdata_person_id`.
> Submit exactly one identifier type per job. To be notified when the job
> finishes instead of polling, include a `webhook_url` in the request body.

### 2. Get the results

Poll the `status_url` (or `GET /batch/{batch_id}`). While the job runs, `status`
is `pending` or `processing`. When it is `completed`, the response includes a
`download_url`.

```bash Request theme={"theme":"vitesse-black"}
curl --request GET \
  --url https://api.crustdata.com/batch/f0d86a5d-0031-4ca4-b350-92162fb38850 \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

```json Response theme={"theme":"vitesse-black"}
{
    "batch_id": "f0d86a5d-0031-4ca4-b350-92162fb38850",
    "status": "completed",
    "entity": "person",
    "action": "identify",
    "identifier_count": 2,
    "result_count": 2,
    "entities_requested": 2,
    "entities_fulfilled": 2,
    "created_at": "2026-10-01T08:07:32.927392+00:00",
    "completed_at": "2026-10-01T08:07:33.582570+00:00",
    "download_url": "https://crustdata-batch-api-data.s3.amazonaws.com/f0d86a5d-0031-4ca4-b350-92162fb38850/output/results.jsonl.gz?...",
    "download_urls": [
        "https://crustdata-batch-api-data.s3.amazonaws.com/f0d86a5d-0031-4ca4-b350-92162fb38850/output/part-000.jsonl.gz?..."
    ]
}
```

The `download_url` points to gzipped JSONL (`.jsonl.gz`) with one record per
submitted identifier. The link is valid for 5 days. `download_urls` lists the
same data split into parts. Both links are pre-signed, and the example trims
their query string to `?...`.

### Result format

Each line is one record for an input identifier:

```json theme={"theme":"vitesse-black"}
{
  "matched_on": "abhilash@crustdata.com",
  "match_type": "email",
  "matches": [
    {
      "confidence_score": 1.0,
      "person_data": {
        "crustdata_person_id": 1068035,
        "basic_profile": {
          "name": "Abhilash Chowdhary",
          "headline": "Co-founder at Crustdata (YC F24) | Infra for building AI employees",
          "current_title": "Co-Founder & CEO",
          "summary": "Love building things. A software engineer with vast experience in shipping products spanning robotics, web technologies and quantitative finance.",
          "languages": ["English", "Hindi"],
          "location": {
            "city": "San Francisco",
            "state": "California",
            "country": "United States",
            "continent": "North America",
            "raw": "San Francisco, California, United States",
            "full_location": null
          }
        },
        "social_handles": {
          "professional_network_identifier": {
            "profile_url": "https://www.linkedin.com/in/abhilashchowdhary",
            "urn_url": "https://www.linkedin.com/in/ACoAAAxLzxABgXUODmAZY4ZFYAxenZ10K0hTyY4"
          },
          "dev_platform_identifier": { "profile_url": null },
          "twitter_identifier": { "slug": "" }
        },
        "updated_at": "2026-09-30T11:06:14.480375Z"
      }
    }
  ]
}
```

A match carries the person's profile URL in
`social_handles.professional_network_identifier.profile_url`. Submit that URL
to [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/introduction.md) for the full profile,
or to [Batch Contact Enrich](https://docs.crustdata.com/person-docs/contact/batch.md) for emails and phone
numbers.

The same object holds `urn_url`, the permanent form of the profile URL. The
`profile_url` can change when the person edits it. The `urn_url` does not
change, so you can use it as a stable key for the person.

The example leaves some `basic_profile` fields out. A match returns the same
`basic_profile` fields that the
[Person Enrich reference](https://docs.crustdata.com/person-docs/enrichment/reference.md#person_data-sections)
lists.

An email with no match returns an empty `matches` array (and is not billed):

```json theme={"theme":"vitesse-black"}
{ "matched_on": "nobody@unknown-domain.com", "match_type": "email", "matches": [] }
```

#### Invalid emails

An invalid email does not fail the job. Its row has an empty `matches` array
and an `error_message` that gives the reason:

```json theme={"theme":"vitesse-black"}
{ "matched_on": "not-an-email", "match_type": "email", "matches": [], "error_message": "Invalid email: malformed address" }
```

| `error_message` | When |
| - | - |
| `Invalid email: malformed address` | The address is not valid email syntax, for example it has no `@`. |
| `Invalid email: contains whitespace` | The address contains a space. |
| `Invalid email: non-ASCII characters` | The address contains a non-ASCII character, such as `é`. |
| `Invalid email: placeholder domain` | The domain is a placeholder, such as `example.com`. |
| `Invalid email: unrecognized domain` | The domain does not end in a known suffix. |

You do not pay for an invalid email, and the job's `result_count` leaves it
out. If every email in the request is invalid, the submit returns `400`
instead. See [Errors](#errors).

#### Personal emails resolve too

Reverse lookup is not limited to business addresses — a personal email (for
example a Gmail address) resolves the same way when it can be matched to a
person. Submit it in `emails` like any other address:

```bash theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/batch/person/identify \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "emails": ["jane.doe91@gmail.com"]
  }'
```

The result row has the same shape as above. Personal addresses that cannot be
matched return the usual empty `matches` array and are not billed.

### Request parameters

| Parameter | Type | Required | Description |
| - | - | - | - |
| `emails` | string\[] | One identifier of | Emails to reverse-lookup — business or personal addresses. Max 300 per submission. Result rows carry `match_type: "email"`. |
| `business_emails` | string\[] | One identifier of | Emails to reverse-lookup, the same way as `emails`. Business and personal addresses both resolve. Max 300 per submission. Result rows carry `match_type: "business_email"`. |
| `professional_network_profile_urls` | string\[] | One identifier of | Profile URLs to resolve to a `crustdata_person_id`. Max 300 per submission. |
| `webhook_url` | string | No | URL to call when the job finishes, instead of polling. |

> [!NOTE]
>
> Submit exactly one identifier type per job: `emails`, `business_emails`, or
> `professional_network_profile_urls`. This endpoint does not accept `fields`.
> Every match returns the same sections.

### Response fields

| Field | Description |
| - | - |
| `matched_on` | The input value this record resolved (the email or profile URL you submitted). |
| `match_type` | `email`, `business_email`, or `professional_network_profile_url`. It mirrors the identifier key you submitted. |
| `matches` | Array of matches. Empty when nothing resolved. |
| `matches[].confidence_score` | Match confidence, `0`–`1`. |
| `matches[].person_data` | `crustdata_person_id`, `basic_profile`, `social_handles`, and `updated_at` for the matched person. |
| `matches[].person_data.social_handles` | The person's profile URL, in `professional_network_identifier.profile_url`, and its permanent form, in `professional_network_identifier.urn_url`. It also holds `dev_platform_identifier.profile_url` and `twitter_identifier.slug`, which can be `null` or empty. |
| `error_message` | Present only on a row whose email is invalid. See [Invalid emails](#invalid-emails). |

### Job lifecycle

| Status | Meaning |
| - | - |
| `pending` | Job accepted, not yet started. |
| `processing` | Job is running. |
| `completed` | Job finished — `download_url` is available. |
| `failed` | Job failed. Nothing was billed. |

### Errors

An invalid request body returns `400` with `error.type` of `invalid_request`
and one of these messages:

| `error.message` | When |
| - | - |
| `Exactly one identifier must be provided: emails, professional_network_profile_urls, or business_emails` | The body has no identifier. |
| `Only one identifier type can be provided. Found: emails, professional_network_profile_urls` | The body has more than one identifier type. |
| `Maximum 300 identifiers allowed for person/identify. Found 301` | The list has more than 300 values. |
| `'fields' is not a valid parameter.` | The body includes `fields`. |
| `Invalid emails: not-an-email, jane@example.com` | Every email in the list is invalid. The message lists them. |
| `Invalid professional_network_profile_urls: https://example.com/jane` | A profile URL is malformed. The message lists each bad URL. |

```json 400 - no identifier theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "Exactly one identifier must be provided: emails, professional_network_profile_urls, or business_emails",
        "metadata": []
    }
}
```

The API rejects the whole request when one profile URL is malformed. It accepts
a request where only some emails are invalid. See
[Invalid emails](#invalid-emails).

If Identify is not enabled on your account, the submit returns `403` with
`error.type` of `permission_error`.

<Snippet file="batch-errors.mdx" />

***

### API reference summary

| Detail | Value |
| - | - |
| **Submit** | `POST /batch/person/identify` |
| **Poll** | `GET /batch/{batch_id}` |
| **Auth** | Bearer token + `x-api-version: 2025-11-01` |
| **Request** | One of `emails`, `business_emails`, or `professional_network_profile_urls` (max 300). Optional: `webhook_url`. |
| **Response** | Submit returns `batch_id` + `status`; poll returns `status` and a `download_url` when complete. |
| **Output** | Gzipped JSONL, one record per identifier, download link valid 5 days. |
| **Billing** | 1 credit per matched person; unmatched identifiers are free. |
| **Errors** | `400`, `401`, `402`, `403`, `404`, `429`, `500` |

For credit pricing, see [Pricing](https://docs.crustdata.com/general/pricing.md). For throughput guidance, see
[Rate limits](https://docs.crustdata.com/general/rate-limits.md).

***

## What to do next

* **Need contact data?** Use [Contact Enrich](https://docs.crustdata.com/person-docs/contact/enrich.md).
* **Need full employment history?** Use [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/introduction.md) with the `profile_url` from the match.
* **Enrich contact info in bulk** — [Batch Contact Enrich](https://docs.crustdata.com/person-docs/contact/batch.md) returns emails and phone numbers for a list of profile URLs.
* **Find people first** — use [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) to build the list to identify.


## Related topics

- [Batch Identify Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-identify-reverse-email-lookup-job.md)
- [Company Identify API](https://docs.crustdata.com/company-docs/identify/introduction.md)
- [Batch Person Verification API](https://docs.crustdata.com/person-docs/verification/batch.md)
- [Identify People](https://docs.crustdata.com/api-reference/person-apis/identify-people-from-profile-urls-emails-or-google-scholar-profile-urls.md)
- [Identify Companies](https://docs.crustdata.com/api-reference/company-apis/identify-a-company-from-name-domain-id-or-profile-url.md)
