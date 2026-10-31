> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Batch Contact Enrich

> Enrich contact information — business email, personal emails, and phone numbers — for up to
**300 people** in a single asynchronous job. Provide `professional_network_profile_urls` (the
only identifier type accepted) and a required `fields` list naming which contact kinds to
retrieve for each profile.

<Note>
    An account may have at most 5 active (`pending` or `processing`) batch jobs at a time;
    submitting a sixth returns `429`.
</Note>

The job responds immediately with a `batch_id`. Poll `GET /batch/{batch_id}` (or provide a
`webhook_url`) and download the gzipped JSONL results file when the job completes. Each record
is wrapped in an `{original_identifier, internal_id, data}` envelope, where `data` holds the
resolved contact information — `business_email` plus a nested `personal_contact_info` object —
in the same shape as the non-batch `/person/contact/enrich` response. Profiles for which no
requested contact kind could be found are still listed with empty values (compare
`entities_requested` with `entities_fulfilled`).

Set `verified: true` to keep only business emails that pass a deliverability check. Cached
addresses marked `deliverable` or `unknown` are re-checked before the results file is written,
and each record's `business_email` list holds only `deliverable` and `catch_all` entries. A
record with no surviving address gets an empty `business_email` list and
`business_email_message` set to `no verified emails found`. The flag only affects
`business_email` and adds **0.5** credits per matched person who receives at least one
verified business email.




## OpenAPI

````yaml /openapi-specs/2025-11-01/batch.yaml post /batch/person/contact/enrich
openapi: 3.0.3
info:
  title: Batch API
  version: '2025-11-01'
  description: >
    The Batch API is the asynchronous, high-volume alternative to the standard
    Company, Person, and Job endpoints.

    You submit a single job describing what you want, Crustdata processes it in
    the background, and you

    download the complete result set as a file. Batch jobs return the same data
    and the same record shapes

    as the corresponding non-batch endpoints — the difference is scale,
    delivery, and convenience.


    Every batch job follows the same three-step lifecycle:


    1. **Submit** — `POST` to a batch endpoint with your identifiers or query.
    The response returns
       immediately with a `batch_id`, an initial `status` of `pending`, and a `status_url`. No data is
       returned at submit time.
    2. **Poll** — `GET /batch/{batch_id}` until `status` reaches `completed` (or
    `failed`). Provide a
       `webhook_url` at submit time to receive a notification instead of polling.
    3. **Download** — completed jobs include a `download_url` (one merged
    results file) and `download_urls`
       (the same data split into parts). Files are gzipped JSONL — one record per line — and the links
       stay valid for 5 days.

    **Result-file record shapes**


    - **Enrich jobs** (database and live) wrap each record in an envelope:
      `{"original_identifier": ..., "internal_id": ..., "data": {...}}`. `original_identifier` echoes the
      exact value you submitted and `internal_id` is the resolved Crustdata ID, so you can join results
      back to your input list.
    - **Search jobs** (database and live) emit flat records identical to the
    corresponding non-batch
      endpoint's record shape — no envelope.

    **Limits and billing**


    - An account may have at most **5 active** (`pending` or `processing`) batch
    jobs at a time;
      submitting a sixth returns `429`.
    - The `x-api-version: 2025-11-01` header is required when submitting jobs.
    It is not required on the
      job status and list endpoints.
    - Billing is based on the number of records actually delivered in the
    results file
      (`entities_fulfilled`), not on how many you requested. Failed jobs are not charged.
servers:
  - url: https://api.crustdata.com
    description: Production API server
security:
  - bearerAuth: []
tags:
  - name: Batch APIs
    description: >-
      Asynchronous, high-volume jobs for enriching and searching companies,
      people, and job listings
paths:
  /batch/person/contact/enrich:
    post:
      tags:
        - Batch APIs
      summary: Submit a batch person contact enrichment job
      description: >
        Enrich contact information — business email, personal emails, and phone
        numbers — for up to

        **300 people** in a single asynchronous job. Provide
        `professional_network_profile_urls` (the

        only identifier type accepted) and a required `fields` list naming which
        contact kinds to

        retrieve for each profile.


        <Note>
            An account may have at most 5 active (`pending` or `processing`) batch jobs at a time;
            submitting a sixth returns `429`.
        </Note>


        The job responds immediately with a `batch_id`. Poll `GET
        /batch/{batch_id}` (or provide a

        `webhook_url`) and download the gzipped JSONL results file when the job
        completes. Each record

        is wrapped in an `{original_identifier, internal_id, data}` envelope,
        where `data` holds the

        resolved contact information — `business_email` plus a nested
        `personal_contact_info` object —

        in the same shape as the non-batch `/person/contact/enrich` response.
        Profiles for which no

        requested contact kind could be found are still listed with empty values
        (compare

        `entities_requested` with `entities_fulfilled`).


        Set `verified: true` to keep only business emails that pass a
        deliverability check. Cached

        addresses marked `deliverable` or `unknown` are re-checked before the
        results file is written,

        and each record's `business_email` list holds only `deliverable` and
        `catch_all` entries. A

        record with no surviving address gets an empty `business_email` list and

        `business_email_message` set to `no verified emails found`. The flag
        only affects

        `business_email` and adds **0.5** credits per matched person who
        receives at least one

        verified business email.
      operationId: submitBatchPersonContactEnrich
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: true
        description: >-
          A list of person profile URLs plus the required contact `fields` to
          retrieve, with optional webhook and chunking options.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BatchPersonContactEnrichRequest'
            examples:
              enrich_contact_by_profile_url:
                summary: Enrich business email and personal contact info for one person
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/in/dvdhsu/
                  fields:
                    - business_email
                    - personal_contact_info
              enrich_verified_business_email:
                summary: Keep only business emails that pass a deliverability check
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/in/dvdhsu/
                  fields:
                    - business_email
                  verified: true
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Batch job accepted for processing
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchSubmitResponse'
              example:
                batch_id: 7e96a0d7-0ea6-463c-8937-dfa59365c2e9
                status: pending
                entity: person
                action: contact_enrich
                identifier_count: 1
                entities_requested: 1
                status_url: /batch/7e96a0d7-0ea6-463c-8937-dfa59365c2e9
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Invalid request — missing identifier, missing or unsupported fields,
            or invalid chunk size
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                missing_identifier:
                  summary: No profile URLs provided
                  value:
                    error:
                      type: invalid_request
                      message: professional_network_profile_urls must be provided
                      metadata: []
                missing_fields:
                  summary: fields omitted or empty
                  value:
                    error:
                      type: invalid_request
                      message: fields must be a non-empty list
                      metadata: []
                invalid_field:
                  summary: Unsupported value in `fields`
                  value:
                    error:
                      type: invalid_request
                      message: 'Invalid fields: bogus.field'
                      metadata:
                        - available_fields:
                            - business_email
                            - personal_contact_info
                            - personal_contact_info.personal_emails
                            - personal_contact_info.phone_numbers
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Forbidden. Your account is not entitled to this batch endpoint, or a
            requested field is not enabled on it.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                endpoint_not_enabled:
                  summary: The account is not entitled to this endpoint
                  value:
                    error:
                      type: permission_error
                      message: >-
                        You do not have permission to access
                        /batch/person/contact/enrich.
                      metadata: []
                fields_denied:
                  summary: A requested field is not enabled on the account
                  value:
                    error:
                      type: permission_error
                      message: >-
                        Access denied to fields: personal_contact_info.
                        Available fields: business_email. To enable access,
                        please book a call with us at
                        https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request
                      metadata: []
        '429':
          $ref: '#/components/responses/TooManyActiveJobs'
        '500':
          $ref: '#/components/responses/InternalError'
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
components:
  parameters:
    ApiVersion:
      name: x-api-version
      in: header
      required: true
      schema:
        type: string
        enum:
          - '2025-11-01'
        default: '2025-11-01'
        example: '2025-11-01'
      description: >-
        API version to use. Batch job submission requires `2025-11-01`; requests
        without this header are rejected with `400`.
  schemas:
    BatchPersonContactEnrichRequest:
      type: object
      required:
        - professional_network_profile_urls
        - fields
      description: >
        Request body for a batch person contact enrichment job.
        `professional_network_profile_urls`

        is the only identifier type accepted, and `fields` is required — it
        names which contact kinds

        to retrieve for each profile.
      properties:
        professional_network_profile_urls:
          description: >-
            Person profile URLs to enrich. Maximum 300 identifiers per job —
            larger submissions are rejected with `400`. Also accepted as a
            single comma-separated string.
          example:
            - https://www.linkedin.com/in/dvdhsu/
          oneOf:
            - type: string
              description: Comma-separated person profile URLs.
              example: >-
                https://www.linkedin.com/in/dvdhsu/,https://www.linkedin.com/in/example/
            - type: array
              maxItems: 300
              items:
                type: string
                description: A person profile URL.
                example: https://www.linkedin.com/in/dvdhsu/
        fields:
          description: >
            Required, non-empty list naming which contact kinds to retrieve for
            each profile (also

            accepted as a single comma-separated string). An empty value returns
            `400`; any value

            outside the supported set returns `400` with the full list in
            `metadata.available_fields`.

            `personal_contact_info` is shorthand for both
            `personal_contact_info.personal_emails` and

            `personal_contact_info.phone_numbers`.
          example:
            - business_email
            - personal_contact_info
          oneOf:
            - type: string
              description: Comma-separated contact-field paths.
              example: business_email,personal_contact_info
            - type: array
              minItems: 1
              items:
                type: string
                enum:
                  - business_email
                  - personal_contact_info
                  - personal_contact_info.personal_emails
                  - personal_contact_info.phone_numbers
                description: A contact-field path to retrieve.
                example: business_email
        webhook_url:
          type: string
          format: uri
          description: >-
            Optional URL that receives a POST notification when the job
            finishes, so you do not have to poll.
          example: https://example.com/webhooks/crustdata-batch
        verified:
          type: boolean
          default: false
          description: >-
            Keep only business emails that pass a deliverability check. Cached
            addresses marked `deliverable` or `unknown` are re-checked before
            the results file is written, and each record's `business_email` list
            holds only `deliverable` and `catch_all` entries. A record with no
            surviving address gets an empty list and `business_email_message`
            set to `no verified emails found`. Only affects `business_email`.
            Adds 0.5 credits per matched person who receives at least one
            verified business email.
          example: true
        chunk_size:
          type: integer
          minimum: 10
          maximum: 1000
          default: 100
          description: >-
            Optional internal processing chunk size (number of identifiers per
            processing unit). Values outside 10-1000 return `400`.
          example: 100
      example:
        professional_network_profile_urls:
          - https://www.linkedin.com/in/dvdhsu/
        fields:
          - business_email
          - personal_contact_info
    BatchSubmitResponse:
      type: object
      required:
        - batch_id
        - status
        - entity
        - action
        - identifier_count
        - entities_requested
        - status_url
      description: >-
        Returned immediately when a batch job is accepted. No data is returned
        at submit time — poll `status_url` for progress and download links.
      properties:
        batch_id:
          type: string
          format: uuid
          description: Unique ID of the batch job. Use it to poll `GET /batch/{batch_id}`.
          example: 53ab686b-c054-496b-8baf-baff5ecc85cf
        status:
          type: string
          enum:
            - pending
          description: Initial job status. Always `pending` at submit time.
          example: pending
        entity:
          type: string
          enum:
            - company
            - person
            - social_post
          description: Entity type the job operates on.
          example: company
        action:
          type: string
          enum:
            - enrich
            - enrich_live
            - contact_enrich
            - search
            - search_live
            - verify
          description: >-
            Internal action name for the job. Live endpoints report
            `enrich_live` / `search_live`; the person contact enrichment
            endpoint reports `contact_enrich`; the person verification endpoint
            reports `verify`.
          example: enrich
        identifier_count:
          type: integer
          description: >-
            Number of identifiers submitted. Search jobs always report `1` (the
            query).
          example: 2
        entities_requested:
          type: integer
          description: >-
            Number of entities the job was asked to produce. For enrich jobs
            this equals `identifier_count`; for search jobs it is `1` until
            results are known.
          example: 2
        status_url:
          type: string
          description: Relative URL to poll for the job status (`GET /batch/{batch_id}`).
          example: /batch/53ab686b-c054-496b-8baf-baff5ecc85cf
      example:
        batch_id: 53ab686b-c054-496b-8baf-baff5ecc85cf
        status: pending
        entity: company
        action: enrich
        identifier_count: 2
        entities_requested: 2
        status_url: /batch/53ab686b-c054-496b-8baf-baff5ecc85cf
    ErrorResponse:
      type: object
      required:
        - error
      description: >-
        Standard error response returned by the Batch API endpoints when a
        request fails.
      properties:
        error:
          type: object
          required:
            - type
            - message
          description: Error details.
          properties:
            type:
              type: string
              enum:
                - invalid_request
                - authentication_error
                - not_found
                - insufficient_credits
                - credit_limit_exceeded
                - permission_error
                - rate_limit_error
                - internal_error
              description: Category of the error.
              example: invalid_request
            message:
              type: string
              description: Human-readable error message.
              example: >-
                Exactly one identifier must be provided: names, domains,
                professional_network_profile_urls, or crustdata_company_ids
            metadata:
              type: array
              default: []
              description: >-
                Additional structured context (for example `available_fields` on
                invalid-field errors).
              items:
                type: object
                additionalProperties: true
                description: One structured context entry.
              example: []
      example:
        error:
          type: invalid_request
          message: >-
            Exactly one identifier must be provided: names, domains,
            professional_network_profile_urls, or crustdata_company_ids
          metadata: []
    AuthenticationErrorResponse:
      type: object
      required:
        - message
      description: >-
        Returned by the API gateway when the API key is missing or invalid.
        Unlike other errors, this body is not wrapped in an `error` object.
      properties:
        message:
          type: string
          description: Human-readable authentication error message.
          example: Invalid API key in request
      example:
        message: Invalid API key in request
  headers:
    XCreditsUsed:
      description: >-
        Exact credits this request deducted, as a decimal string (for example
        `3` or `0.03`). Present on success and error responses alike; `0` when
        the request deducted nothing (free endpoints, error responses, and
        asynchronous job submissions billed when the job runs). Responses
        generated before a request reaches the API, such as rate-limit `429`s,
        do not carry it.
      schema:
        type: string
        example: '0.03'
  responses:
    Unauthorized:
      description: Unauthorized — invalid or missing API key
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/AuthenticationErrorResponse'
          example:
            message: Invalid API key in request
    TooManyActiveJobs:
      description: >-
        Too many active jobs. The account already has 5 batch jobs in `pending`
        or `processing` status. A job active for more than 24 hours stops
        counting toward the limit. This check runs before the endpoint
        permission check and the credit gate, so a `429` here consumes no
        credits.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error:
              type: rate_limit_error
              message: >-
                You already have 5 active batch jobs. Please wait for one to
                complete before submitting another.
              metadata: []
    InternalError:
      description: Internal server error — the job could not be started
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error:
              type: internal_error
              message: Failed to start batch processing. Credits will be refunded.
              metadata: []
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: API key passed as a Bearer token in the Authorization header.

````

## Related topics

- [Contact Enrichment API](https://docs.crustdata.com/person-docs/contact/enrich.md)
- [Person Identify API](https://docs.crustdata.com/person-docs/identify/introduction.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
- [Batch Contact Enrichment API](https://docs.crustdata.com/person-docs/contact/batch.md)
- [Contact Enrich](https://docs.crustdata.com/api-reference/person-apis/enrich-only-person-contact-data-from-cached-dataset.md)
