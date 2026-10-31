> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Contact Enrichment API

> Get business emails, personal emails, and phone numbers for a person in a single synchronous request.

## Endpoint essentials

| Detail | Value |
| - | - |
| **API key and headers** | Send `Authorization: Bearer YOUR_API_KEY` and `x-api-version: 2025-11-01` with every request. |
| **Access** | Enterprise plans. Self-serve keys get a 403. Check your account with [Permissions](https://docs.crustdata.com/general/permissions.md). |
| **Free account** | No |
| **Credit cost** | Up to 5.5 credits per matched person: 1 for business emails, 2 for personal emails, 2 for phone numbers. With `verified: true`, a verified business email adds 0.5. No charge when nothing is found |
| **Rate limit** | 15 requests per minute, up to 25 people per request |

**Use this when** you need contact data (business emails, personal emails, phone numbers) for a small number of people and want it back in the same request. You can also send a business email to find the person behind it and get their contact data.

> [!NOTE]
>
> **Choose this for a quick response.** Contact data comes back in the same
> request for up to 25 identifiers. For a **higher fill rate** on bulk lists,
> use [Batch Contact Enrich](https://docs.crustdata.com/person-docs/contact/batch.md) — an async job
> (typically a 2–3 minute wait).

```
POST https://api.crustdata.com/person/contact/enrich
```

> [!NOTE]
>
> Replace `YOUR_API_KEY` in each example with your actual API key. All
> requests require the `x-api-version: 2025-11-01` header.

**Availability:** requires contact-enrich access (enterprise or
higher-tier plans); self-serve keys receive a `403`.
** Limits:** up to 25 identifiers per request.

> [!NOTE]
>
> Contact endpoint rate limits are grouped with the live endpoints, not with
> in-database, so they do not move with the limits on search and enrich.
> See [Rate limits](https://docs.crustdata.com/general/rate-limits.md).

## Pricing

Billed **per requested contact type, per matched person** — there is no base
credit, and only the types you request are fetched and billed.

| Contact type requested | Credits per matched person |
| - | - |
| `contact.business_emails` | **1** |
| `contact.personal_emails` | **2** |
| `contact.phone_numbers` | **2** |

Omitting `fields` requests all three (**5**, the maximum without `verified`).
`contact.phone_numbers_info` belongs to the phone tier. Requesting it, with or
without `contact.phone_numbers`, bills the same **2** once.
`contact.websites` is not one of the billed contact types, so requesting it
currently uses **0** credits. Identifiers with no match are **free**. So is an
identifier the person asked us to remove: it comes back with
`match_status: "redacted"` and an empty `matches`. See
[Pricing](https://docs.crustdata.com/general/pricing.md) for all endpoints.
To see the price for your account, open the [**Pricing** tab](https://app.crustdata.com/endpoints/person-contact-enrich#pricing) in the dashboard.

Set [`verified: true`](#verified-business-emails-only) and each matched person
who receives at least one verified business email costs **0.5** more. Business
emails alone then cost **1.5** per matched person, and all three types cost
**5.5**. You pay nothing for the add-on on a person whose verified list comes
back empty.

***

## Enrich contact data

Request the `contact` field (or specific sub-fields) for one or more profile URLs.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/person/contact/enrich \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "professional_network_profile_urls": [
      "https://www.linkedin.com/in/abhilashchowdhary"
    ],
    "fields": ["contact"]
  }'
```

```json Response theme={"theme":"vitesse-black"}
[
    {
        "matched_on": "https://www.linkedin.com/in/abhilashchowdhary",
        "match_type": "professional_network_profile_url",
        "matches": [
            {
                "confidence_score": 1.0,
                "person_data": {
                    "contact": {
                        "business_emails": [
                            { "email": "abhilash@crustdata.com", "status": "deliverable" }
                        ],
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
                        ],
                        "websites": []
                    },
                    "crustdata_person_id": 1068035
                }
            }
        ]
    }
]
```

> [!NOTE]
>
> Email records are `{ email, status }` objects, where `status` is one of
> `deliverable`, `catch_all`, `invalid`, or `unknown` (see [Email
> status](#email-status)). The personal email and phone values above are
> illustrative.

> [!TIP]
>
> Request only the sub-fields you need (for example `contact.business_emails`)
> to keep credit costs down.

> [!NOTE]
>
> This endpoint accepts contact fields only. A profile field such as
> `basic_profile` or `experience` in `fields` returns a [`400`](#errors). To
> get profile data for the same people, send a second request to [Person
> Enrich](https://docs.crustdata.com/person-docs/enrichment/introduction.md).

## Contact fields

| Field | Returns |
| - | - |
| `contact` | All contact records: emails, phone numbers, websites |
| `contact.business_emails` | Business email records |
| `contact.personal_emails` | Personal email records |
| `contact.phone_numbers` | Phone numbers, plus `phone_numbers_info` |
| `contact.phone_numbers_info` | Phone numbers split into calling code, country and national number, with a line type |
| `contact.websites` | Personal or company-linked websites |

## Email status

Every business and personal email comes back with a `status` that tells you how
deliverable the address is. Use it to decide which emails to send to.

| Status | Meaning |
| - | - |
| `deliverable` | The mailbox was confirmed to exist and accept mail at this exact address. Lowest bounce risk. |
| `catch_all` | The domain accepts mail for any address, so this specific mailbox can't be confirmed. It may work, but delivery isn't guaranteed. |
| `invalid` | The mailbox was confirmed not to exist or is otherwise undeliverable. Sending will bounce. |
| `unknown` | Deliverability couldn't be determined (for example a timeout or an inconclusive check). Returned when no status info is available. |

## Phone number details

Every phone number comes back twice: as a string in `phone_numbers`, and as a
record in `phone_numbers_info` at the same position. The string is the number as
we hold it. The record splits it so you can dial or store it without parsing.

| Key | Value |
| - | - |
| `country_code` | Calling code with a leading plus, for example `+33`. `null` when the number carries no calling code. |
| `country` | ISO 3166-1 alpha-2 region, for example `FR`. `null` when it cannot be determined from the number. |
| `phone_number` | National number, digits only. |
| `type` | `mobile`, `home`, `work`, or `other`. |

`type` tells you what kind of line it is. `other` covers landlines, VoIP lines,
and numbers with no known type. A number without a calling code is not guessed
into a country: its digits are kept and both country keys are `null`.

Request `contact.phone_numbers` and you receive both lists. Request only
`contact.phone_numbers_info`, or one of its sub-fields such as
`contact.phone_numbers_info.country_code`, and you receive only
`phone_numbers_info`, with all four keys in each record. Either way, you pay for
the phone tier once.

## Verified business emails only

Set `verified: true` to get back only business emails that pass a
deliverability check at request time. Crustdata re-checks cached addresses
marked `deliverable` or `unknown` before serving them and drops any address
that fails. The response then holds only `deliverable` and `catch_all` business
emails. Personal emails and phone numbers do not change.

```bash Request theme={"theme":"vitesse-black"}
curl --request POST \
  --url https://api.crustdata.com/person/contact/enrich \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{
    "professional_network_profile_urls": [
      "https://www.linkedin.com/in/abhilashchowdhary"
    ],
    "fields": ["contact.business_emails"],
    "verified": true
  }'
```

```json Response theme={"theme":"vitesse-black"}
[
    {
        "matched_on": "https://www.linkedin.com/in/abhilashchowdhary",
        "match_type": "professional_network_profile_url",
        "matches": [
            {
                "confidence_score": 1.0,
                "person_data": {
                    "contact": {
                        "business_emails": [
                            { "email": "abhilash@crustdata.com", "status": "deliverable" }
                        ]
                    },
                    "crustdata_person_id": 1068035
                }
            }
        ]
    }
]
```

```json Response when no address survives theme={"theme":"vitesse-black"}
[
    {
        "matched_on": "https://www.linkedin.com/in/example-profile",
        "match_type": "professional_network_profile_url",
        "matches": [
            {
                "confidence_score": 1.0,
                "person_data": {
                    "contact": {
                        "business_emails": [],
                        "business_emails_message": "no verified emails found"
                    },
                    "crustdata_person_id": 12345
                }
            }
        ]
    }
]
```

When no address survives the check, `business_emails` is an empty array and
`business_emails_message` reads `no verified emails found`. The person still
counts as matched, but you pay nothing for business emails. The second response
above is illustrative.

> [!NOTE]
>
> `verified` only changes `contact.business_emails`. It has no effect unless
> you request business emails, and it adds **0.5** credits per matched person
> who receives at least one verified business email. The check runs at
> request time, so expect a slower response than an unverified call.

## Get a specific contact type

Request a single sub-field to return only that contact type — useful for keeping
credit costs down. This endpoint always returns **contact only** (no profile
fields like `basic_profile` or `experience`).

> [accordion] Business emails only — 1 credit
>
> ```bash theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/person/contact/enrich \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "professional_network_profile_urls": ["https://www.linkedin.com/in/abhilashchowdhary"],
>     "fields": ["contact.business_emails"]
>   }'
> ```
>
> Returns only the `contact.business_emails` array — no other contact fields or profile data. Billed **1 credit** per matched person.

> [accordion] Personal emails only — 2 credits
>
> ```bash theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/person/contact/enrich \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "professional_network_profile_urls": ["https://www.linkedin.com/in/abhilashchowdhary"],
>     "fields": ["contact.personal_emails"]
>   }'
> ```
>
> Returns only the `contact.personal_emails` array. Billed **2 credits** per matched person.

> [accordion] Phone numbers only — 2 credits
>
> ```bash theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/person/contact/enrich \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "professional_network_profile_urls": ["https://www.linkedin.com/in/abhilashchowdhary"],
>     "fields": ["contact.phone_numbers"]
>   }'
> ```
>
> Returns only `contact.phone_numbers` and `contact.phone_numbers_info`. Billed **2 credits** per matched person.

> [accordion] Reverse lookup by business email
>
> Pass `business_emails` instead of profile URLs — the endpoint resolves each
> email to its person and returns their contact data in the same request. No
> separate identification call is needed.
>
> ```bash Request theme={"theme":"vitesse-black"}
> curl --request POST \
>   --url https://api.crustdata.com/person/contact/enrich \
>   --header 'authorization: Bearer YOUR_API_KEY' \
>   --header 'content-type: application/json' \
>   --header 'x-api-version: 2025-11-01' \
>   --data '{
>     "business_emails": ["abhilash@crustdata.com"],
>     "fields": ["contact.business_emails"]
>   }'
> ```
>
> ```json Response theme={"theme":"vitesse-black"}
> [
>     {
>         "matched_on": "abhilash@crustdata.com",
>         "match_type": "business_email",
>         "matches": [
>             {
>                 "confidence_score": 1.0,
>                 "person_data": {
>                     "contact": {
>                         "business_emails": [
>                             { "email": "abhilash@crustdata.co", "status": "deliverable" },
>                             { "email": "abhilash@crustdata.com", "status": "deliverable" }
>                         ]
>                     }
>                 }
>             }
>         ]
>     }
> ]
> ```
>
> > [!NOTE]
> >
> > Use exactly one identifier type per request — `business_emails` and
> > `professional_network_profile_urls` cannot be mixed in the same call. If
> > you only need to know **who** owns an email (identity, not contact data),
> > use [Person Identify](https://docs.crustdata.com/person-docs/identify/introduction.md).

## Request parameters

| Parameter | Type | Required | Description |
| - | - | - | - |
| `professional_network_profile_urls` | string\[] | One of these two identifiers | Profile URLs to enrich. Max 25. |
| `business_emails` | string\[] | One of these two identifiers | Business emails for reverse lookup. Max 25. |
| `fields` | string\[] | No | Which fields to return. Use `contact` (or its sub-fields). Any other field returns a `400`. |
| `verified` | boolean | No | Return only business emails that pass a deliverability check at request time. Default `false`. Adds 0.5 credits per matched person who receives a verified business email. See [Verified business emails only](#verified-business-emails-only). |

## Current platform behavior

The API behaves this way today. This behavior is not part of the contract.

Email records hold only `email` and `status`. The OpenAPI spec also lists
`crustdata_company_id` and `last_updated` on each email record, and the `400`
below lists them in `available_fields`. This endpoint does not return them, even
when you request them by name. `contact` carries no `last_updated` either. A
request for `contact.last_updated` returns a `403`.

## Errors

| Status | Meaning |
| - | - |
| `400` | Invalid request: a malformed or missing identifier, or a field in `fields` that is not a contact field. |
| `401` | Invalid or missing API key. |
| `403` | Permission denied or insufficient credits. |
| `500` | Internal server error. Retry with exponential backoff. |

A field that is not a contact field, such as `basic_profile`, returns this
`400`. The request uses **0** credits. `available_fields` lists the field names
that your key can request.

```json theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "invalid_request",
        "message": "Invalid fields: basic_profile",
        "metadata": [
            {
                "available_fields": [
                    "contact",
                    "contact.business_emails",
                    "contact.business_emails.crustdata_company_id",
                    "contact.business_emails.email",
                    "contact.business_emails.last_updated",
                    "contact.business_emails.status",
                    "contact.business_emails_message",
                    "contact.personal_emails",
                    "contact.personal_emails.email",
                    "contact.personal_emails.last_updated",
                    "contact.personal_emails.status",
                    "contact.phone_numbers",
                    "contact.phone_numbers_info",
                    "contact.phone_numbers_info.country",
                    "contact.phone_numbers_info.country_code",
                    "contact.phone_numbers_info.phone_number",
                    "contact.phone_numbers_info.type",
                    "contact.websites",
                    "crustdata_person_id"
                ]
            }
        ]
    }
}
```

***

## API reference summary

| Detail | Value |
| - | - |
| **Endpoint** | `POST /person/contact/enrich` |
| **Auth** | Bearer token + `x-api-version: 2025-11-01` |
| **Request** | One of `professional_network_profile_urls` or `business_emails` (max 25). `fields`: `contact`. Optional `verified`. |
| **Response** | Array: `[{ "matched_on", "match_type", "match_status", "matches": [{ "confidence_score", "person_data" }] }]`. |
| **Errors** | `400`, `401`, `403`, `500` |

For the full field catalog and identifier behavior, see the [Person Enrich reference](https://docs.crustdata.com/person-docs/enrichment/reference.md). For credit pricing, see [Pricing](https://docs.crustdata.com/general/pricing.md).

***

## What to do next

* **Enrich in bulk** — [Batch Contact Enrich](https://docs.crustdata.com/person-docs/contact/batch.md) handles large lists asynchronously with no per-profile base fee.
* **Get full profiles** — [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/introduction.md) returns profile, employment, and education data.
* **Find people first** — use [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md) to build your list of profile URLs.


## Related topics

- [Batch Contact Enrichment API](https://docs.crustdata.com/person-docs/contact/batch.md)
- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [Person Enrichment API](https://docs.crustdata.com/person-docs/enrichment/introduction.md)
- [Batch Person Enrichment API](https://docs.crustdata.com/person-docs/enrichment/batch-enrich.md)
- [Company Enrichment API](https://docs.crustdata.com/company-docs/enrichment/introduction.md)
