> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Batch Contact Enrichment API

> Enrich a bulk list of profile URLs with contact data as an async job — results delivered as a file.

## Endpoint essentials

| Detail | Value |
| - | - |
| **API key and headers** | Send `Authorization: Bearer YOUR_API_KEY` and `x-api-version: 2025-11-01` with every request. |
| **Access** | Enterprise plans. Check your account with [Permissions](https://docs.crustdata.com/general/permissions.md). |
| **Free account** | No |
| **Credit cost** | Same as Contact Enrichment, up to 5.5 credits per matched person |
| **Batch size** | 300 profiles per job |
| **Rate limit** | Up to 5 jobs can run at the same time. |

**Use this when** you need contact data for hundreds of people at once — bulk lists, CRM backfills, or back-office pipelines. Submit a job, then poll or receive a webhook when it finishes. You pay per contact type returned for each matched person — never per candidate record.

> [!NOTE]
>
> **Choose this for a higher fill rate.** Submit a bulk list and get results
> as a file, typically within 2–3 minutes. For a quick, synchronous response
> on a few people, use [Contact Enrich](https://docs.crustdata.com/person-docs/contact/enrich.md) instead.

**Availability:** requires contact-enrich access (enterprise or
higher-tier plans).
** Limits:** up to 300 profile URLs per submission.

> [!NOTE]
>
> Contact endpoint rate limits are grouped with the live endpoints, not with
> in-database, so they do not move with the limits on search and enrich.
> See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).

## Pricing

Billed **per contact type returned, per matched person**, at the same prices as
[Person Contact Enrich](https://docs.crustdata.com/person-docs/contact/enrich.md). The maximum is **5** per
person, or **5.5** with `verified: true`.

| Contact type returned | Credits per matched person |
| - | - |
| Business emails | **1** |
| Personal emails | **2** |
| Phone numbers | **2** |

Counted **per type, not per record** — a person with four business-email
candidates bills once. Persons with no contact data found are not billed for
any type. Result rows contain only the contact types you requested; a
requested type with no data appears as an empty list. See
[Pricing](https://docs.crustdata.com/general/pricing.md) for all endpoints.
To see the price for your account, open the [**Pricing** tab](https://app.crustdata.com/endpoints/person-contact-enrich#pricing)
of `/person/contact/enrich` in the dashboard.

Set [`verified: true`](#verified-business-emails-only) and each matched person
who receives at least one verified business email costs **0.5** more, the same
add-on as the synchronous endpoint. Business emails alone then cost **1.5** per
matched person, and all three types cost **5.5**. You pay nothing for the
add-on on a person whose verified list comes back empty.

## How it works

Batch contact enrichment is an **asynchronous, two-call flow** — you submit a job, then fetch the results once it finishes:

**1. Submit your profile URLs**

`POST /batch/person/contact/enrich` with your list of profile URLs and
the contact `fields` you want. You get a `batch_id` back immediately.

**2. Poll, or wait for a webhook**

`GET /batch/{batch_id}` to check the job status — or pass a
`webhook_url` on submit and we call you when it finishes.

**3. Download the results**

Once `status` is `completed`, the status response includes a
`download_url`: a gzipped JSONL file with one record per URL, valid for
5 days.

> [!NOTE]
>
> Replace `YOUR_API_KEY` in each example with your actual API key. All
> requests require the `x-api-version: 2025-11-01` header.

**Pricing:** no per-profile base fee — you are charged only for
the contact values that are delivered. See [Pricing](https://docs.crustdata.com/general/pricing.md) for
per-field credit costs.
** Limits:** active jobs are capped per account across the live
endpoints (5 on default limits) - see [Rate
limits](https://docs.crustdata.com/general/rate-limits.md#batch-job-concurrency).

***

## 1. Submit your profile URLs

Send your profile URLs in `professional_network_profile_urls` along with the
contact `fields` you want. The response returns a `batch_id` immediately — the
job runs asynchronously.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/batch/person/contact/enrich \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "professional_network_profile_urls": [
      "https://www.linkedin.com/in/cassandrebay",
      "https://www.linkedin.com/in/ruchavora"
    ],
    "fields": ["business_email", "personal_contact_info"]
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
    "batch_id": "c97333e3-046f-4fd2-b888-a5b07793a0ac",
    "status": "pending",
    "entity": "person",
    "action": "contact_enrich",
    "identifier_count": 2,
    "entities_requested": 2,
    "status_url": "/batch/c97333e3-046f-4fd2-b888-a5b07793a0ac"
}
```

> [!NOTE]
>
> To be notified when the job finishes instead of polling, include a
> `webhook_url` in the request body. Crustdata sends a callback to that URL
> when the batch completes.

### Verified business emails only

Add `"verified": true` to keep only business emails that pass a deliverability
check. Crustdata re-checks cached addresses marked `deliverable` or `unknown`
before it writes the results file and drops any address that fails. Each row's
`business_email` list then holds only `deliverable` and `catch_all` entries.
Personal emails and phone numbers do not change.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/batch/person/contact/enrich \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "professional_network_profile_urls": [
      "https://www.linkedin.com/in/cassandrebay",
      "https://www.linkedin.com/in/ruchavora"
    ],
    "fields": ["business_email"],
    "verified": true
  }'
```

```json Response theme={"theme":"vitesse-black"}
{
    "batch_id": "1f5d2c7a-8e4b-4c0d-9a6e-3b2f7d1c9e45",
    "status": "pending",
    "entity": "person",
    "action": "contact_enrich",
    "identifier_count": 2,
    "entities_requested": 2,
    "status_url": "/batch/1f5d2c7a-8e4b-4c0d-9a6e-3b2f7d1c9e45"
}
```

```json Results file theme={"theme":"vitesse-black"}
{"professional_network_url": "https://www.linkedin.com/in/abhilashchowdhary", "person_id": 1068035, "business_email": [{"email": "abhilash@crustdata.com", "status": "deliverable"}]}
{"professional_network_url": "https://www.linkedin.com/in/example-profile", "person_id": 12345, "business_email": [], "business_email_message": "no verified emails found"}
```

Poll and download exactly as in the unverified flow. In the results file, a row
with no surviving address gets an empty `business_email` list and
`business_email_message` set to `no verified emails found`. The second record
above is illustrative.

> [!NOTE]
>
> `verified` only changes `business_email`. It has no effect unless you
> request `business_email`, and it adds **0.5** credits per matched person
> who receives at least one verified business email. You pay nothing for
> business emails on a row whose list is empty.

## 2. Get the results

Poll the `status_url` (or `GET /batch/{batch_id}`). While the job runs, `status`
is `pending` or `processing`. When it is `completed`, the response includes a
`download_url`.

```bash Request theme={"theme":"vitesse-black"}
curl --request GET \
  --url https://api.crustdata.com/batch/c97333e3-046f-4fd2-b888-a5b07793a0ac \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

```json Response theme={"theme":"vitesse-black"}
{
    "batch_id": "c97333e3-046f-4fd2-b888-a5b07793a0ac",
    "status": "completed",
    "entity": "person",
    "action": "contact_enrich",
    "identifier_count": 2,
    "result_count": 2,
    "entities_requested": 2,
    "entities_fulfilled": 2,
    "fill_counts": {
        "business_email": 2,
        "personal_contact_info.personal_emails": 1,
        "personal_contact_info.phone_numbers": 0
    },
    "created_at": "2026-05-28T10:00:00Z",
    "completed_at": "2026-05-28T10:06:00Z",
    "download_url": "https://crustdata-batch-api-data.s3.amazonaws.com/...&X-Amz-Expires=432000"
}
```

`fill_counts` is how many profiles came back with at least one value for each
field you requested. Use it to measure fill rate. It is only present once
`status` is `completed`, and it breaks `personal_contact_info` out into
`personal_emails` and `phone_numbers` so each is counted separately.

Do not use `entities_fulfilled` for this. It counts rows in the results file,
one per distinct profile URL you submitted, whether or not any contact was
found for it.

The `download_url` points to gzipped JSONL (`.jsonl.gz`) with one record per
submitted profile URL. The link is valid for 5 days.

Unzip it and each line looks like this:

```json One record from the results file theme={"theme":"vitesse-black"}
{
    "professional_network_url": "https://www.linkedin.com/in/abhilashchowdhary",
    "person_id": 1068035,
    "business_email": [
        { "email": "abhilash@crustdata.com", "status": "deliverable" },
        { "email": "abhilash@crustdata.co", "status": "deliverable" }
    ],
    "personal_contact_info": {
        "personal_emails": [
            { "email": "personal@example.com", "status": "deliverable" }
        ],
        "phone_numbers": ["+1 415-555-0100"],
        "phone_numbers_info": [
            {
                "country_code": "+1",
                "country": "US",
                "phone_number": "4155550100",
                "type": "mobile"
            }
        ]
    }
}
```

Join back to your input list on `professional_network_url`, which echoes the
profile URL you submitted. Only the fields you asked for in `fields` are
present. `phone_numbers_info` pairs with `phone_numbers` by position and uses
the same shape as the synchronous endpoint, see
[Phone number details](https://docs.crustdata.com/person-docs/contact/enrich.md#phone-number-details).

***

## Fields

Request any combination of these contact fields. Only professional network profile URLs are
supported as identifiers for this endpoint.

| Field | Returns |
| - | - |
| `business_email` | Business email addresses with status |
| `personal_contact_info` | Both personal emails and phone numbers |
| `personal_contact_info.personal_emails` | Personal email addresses only |
| `personal_contact_info.phone_numbers` | Phone numbers only, as `phone_numbers` and `phone_numbers_info` |

## Request parameters

| Parameter | Type | Required | Description |
| - | - | - | - |
| `professional_network_profile_urls` | string\[] | Yes | Profile URLs to enrich. Professional network profile URLs only. |
| `fields` | string\[] | Yes | Which contact fields to enrich (see the table above). |
| `webhook_url` | string | No | URL to call when the job finishes, instead of polling. |
| `verified` | boolean | No | Keep only business emails that pass a deliverability check. Default `false`. Adds 0.5 credits per matched person who receives a verified business email. See [Verified business emails only](#verified-business-emails-only). |

## Job lifecycle

| Status | Meaning |
| - | - |
| `pending` | Job accepted, not yet started. |
| `processing` | Job is running. |
| `completed` | Job finished — `download_url` is available. |
| `failed` | Job failed. No contact values were billed. |

## Errors

| Status | Meaning |
| - | - |
| `400` | Invalid request — missing identifier, invalid field, or no URLs. |
| `401` | Invalid or missing API key. |
| `403` | Permission denied or insufficient credits. |
| `429` | At the active-job cap for the live pool, or platform at capacity. |
| `500` | Internal server error. Retry with exponential backoff. |

***

## API reference summary

| Detail | Value |
| - | - |
| **Submit** | `POST /batch/person/contact/enrich` |
| **Poll** | `GET /batch/{batch_id}` |
| **Auth** | Bearer token + `x-api-version: 2025-11-01` |
| **Request** | `professional_network_profile_urls` (required), `fields` (required). Optional: `webhook_url`, `verified`. |
| **Response** | Submit returns `batch_id` + `status`; poll returns `status` and a `download_url` when complete. |
| **Output** | Gzipped JSONL, one record per profile URL, download link valid 5 days. |
| **Errors** | `400`, `401`, `403`, `429`, `500` |

For credit pricing, see [Pricing](https://docs.crustdata.com/general/pricing.md). For throughput guidance, see
[Rate limits](https://docs.crustdata.com/general/rate-limits.md).

See the [full API reference](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction.md) for the complete OpenAPI schema.

***

## What to do next

* **Enrich interactively** — [Contact Enrich](https://docs.crustdata.com/person-docs/contact/enrich.md) returns contact data synchronously for up to 25 URLs per request.
* **Find people first** — use [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) to build the list of profile URLs to enrich.


## Related topics

- [Contact Enrichment API](https://docs.crustdata.com/person-docs/contact/enrich.md)
- [Batch Person Enrichment API](https://docs.crustdata.com/person-docs/enrichment/batch-enrich.md)
- [Batch Company Enrichment API](https://docs.crustdata.com/company-docs/enrichment/batch.md)
- [Batch Contact Enrich](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-contact-enrichment-job.md)
- [Contact Enrich](https://docs.crustdata.com/api-reference/person-apis/enrich-only-person-contact-data-from-cached-dataset.md)
