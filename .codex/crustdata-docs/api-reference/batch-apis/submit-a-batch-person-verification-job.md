> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Batch Verify Person

> Check whether the work history on up to **10 people** is real, in a single asynchronous
job. Provide a list of `professional_network_profile_urls`. For each person the service checks employment dates against education,
looks up who engages with the person's recent posts and whether they work at the claimed
employer, and searches the web for independent evidence of the current role. A language model
then returns a verdict, a confidence score, its reasoning, and the sources it cited.

A job usually completes in a minute or two.

<Note>
    Verification is enabled per account. Without access, submits return `403`. Each
    verdict written to the results file costs 10 credits; a profile that is left out
    of the file is not charged.
</Note>

The job responds immediately with a `batch_id`. Poll `GET /batch/{batch_id}` (or provide a
`webhook_url`) and download the gzipped JSONL results file when the job completes. Each record
is wrapped in an `{original_identifier, internal_id, data}` envelope, where `internal_id` is
the numeric Crustdata person ID and `data` holds `verdict`, `confidence`, `reasoning`, `flags`,
`coverage`, and `citations`. A person that cannot be resolved or checked is left out of the
file rather than written as an error.




## OpenAPI

````yaml /openapi-specs/2025-11-01/batch.yaml post /batch/person/verify
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
  /batch/person/verify:
    post:
      tags:
        - Batch APIs
      summary: Submit a batch person verification job
      description: >
        Check whether the work history on up to **10 people** is real, in a
        single asynchronous

        job. Provide a list of `professional_network_profile_urls`. For each
        person the service checks employment dates against education,

        looks up who engages with the person's recent posts and whether they
        work at the claimed

        employer, and searches the web for independent evidence of the current
        role. A language model

        then returns a verdict, a confidence score, its reasoning, and the
        sources it cited.


        A job usually completes in a minute or two.


        <Note>
            Verification is enabled per account. Without access, submits return `403`. Each
            verdict written to the results file costs 10 credits; a profile that is left out
            of the file is not charged.
        </Note>


        The job responds immediately with a `batch_id`. Poll `GET
        /batch/{batch_id}` (or provide a

        `webhook_url`) and download the gzipped JSONL results file when the job
        completes. Each record

        is wrapped in an `{original_identifier, internal_id, data}` envelope,
        where `internal_id` is

        the numeric Crustdata person ID and `data` holds `verdict`,
        `confidence`, `reasoning`, `flags`,

        `coverage`, and `citations`. A person that cannot be resolved or checked
        is left out of the

        file rather than written as an error.
      operationId: submitBatchPersonVerify
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: true
        description: Profile URLs to verify, plus an optional webhook.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BatchPersonVerifyRequest'
            examples:
              verify_by_profile_url:
                summary: Verify one person by profile URL
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/in/rishabhhq/
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
                batch_id: b82e4e5e-8812-4f47-bccd-0439315695b0
                status: pending
                entity: person
                action: verify
                identifier_count: 1
                entities_requested: 1
                status_url: /batch/b82e4e5e-8812-4f47-bccd-0439315695b0
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Invalid request — no identifier
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Forbidden. Verification is not enabled on your account.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                error:
                  type: permission_error
                  message: You do not have permission to access /batch/person/verify.
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
    BatchPersonVerifyRequest:
      type: object
      required:
        - professional_network_profile_urls
      description: >
        Request body for a batch person verification job. Provide
        `professional_network_profile_urls`.

        Omitting it returns `400`.
      properties:
        professional_network_profile_urls:
          description: Person profile URLs to verify. Up to 10 per job for now.
          type: array
          maxItems: 10
          items:
            type: string
            description: A person profile URL.
            example: https://www.linkedin.com/in/rishabhhq/
          example:
            - https://www.linkedin.com/in/rishabhhq/
        webhook_url:
          type: string
          format: uri
          description: >-
            Optional URL that receives a POST notification when the job
            finishes, so you do not have to poll.
          example: https://example.com/webhooks/crustdata-batch
      example:
        professional_network_profile_urls:
          - https://www.linkedin.com/in/rishabhhq/
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

- [Batch Person Verification API](https://docs.crustdata.com/person-docs/verification/batch.md)
- [Batch Enrich Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-enrichment-job.md)
- [Batch Identify Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-identify-reverse-email-lookup-job.md)
- [Batch Search Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-database-search-job.md)
- [Batch Person Enrichment API](https://docs.crustdata.com/person-docs/enrichment/batch-enrich.md)
