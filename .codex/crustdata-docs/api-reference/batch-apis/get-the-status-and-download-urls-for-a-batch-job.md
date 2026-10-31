> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Batch Job Status

> Poll the current state of a batch job. The `status` moves `pending` → `processing` →
`completed` or `failed`. When the job is `completed`, the response includes a `download_url`
for the merged results file and `download_urls` for the same data split into parts; both are
pre-signed links valid for **5 days**. When the job is `failed`, `error_message` carries a
human-readable reason.

Results files are gzipped JSONL (one record per line). Enrichment job records are wrapped in
an `{original_identifier, internal_id, data}` envelope; search job records are flat and match
the corresponding non-batch endpoint's record shape.

The `x-api-version` header is not required on this endpoint.




## OpenAPI

````yaml /openapi-specs/2025-11-01/batch.yaml get /batch/{batch_id}
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
  /batch/{batch_id}:
    get:
      tags:
        - Batch APIs
      summary: Get the status and download URLs for a batch job
      description: >
        Poll the current state of a batch job. The `status` moves `pending` →
        `processing` →

        `completed` or `failed`. When the job is `completed`, the response
        includes a `download_url`

        for the merged results file and `download_urls` for the same data split
        into parts; both are

        pre-signed links valid for **5 days**. When the job is `failed`,
        `error_message` carries a

        human-readable reason.


        Results files are gzipped JSONL (one record per line). Enrichment job
        records are wrapped in

        an `{original_identifier, internal_id, data}` envelope; search job
        records are flat and match

        the corresponding non-batch endpoint's record shape.


        The `x-api-version` header is not required on this endpoint.
      operationId: getBatchJob
      parameters:
        - name: batch_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
            example: 53ab686b-c054-496b-8baf-baff5ecc85cf
          description: The batch job ID returned at submit time.
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Current state of the batch job, with download links when completed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchJobDetailResponse'
              examples:
                completed:
                  summary: Completed job with download links
                  value:
                    batch_id: 53ab686b-c054-496b-8baf-baff5ecc85cf
                    status: completed
                    entity: company
                    action: enrich
                    identifier_count: 2
                    result_count: 2
                    entities_requested: 2
                    entities_fulfilled: 2
                    created_at: '2026-06-12T12:23:03.945900+00:00'
                    completed_at: '2026-06-12T12:23:15.993293+00:00'
                    download_url: >-
                      https://crustdata-batch-api-data.s3.amazonaws.com/53ab686b-c054-496b-8baf-baff5ecc85cf/output/results.jsonl.gz
                    download_urls:
                      - >-
                        https://crustdata-batch-api-data.s3.amazonaws.com/53ab686b-c054-496b-8baf-baff5ecc85cf/output/part-000.jsonl.gz
                completed_zero_results:
                  summary: Completed job where no identifiers resolved
                  value:
                    batch_id: dc260602-07fe-4179-94e2-f7d52f8fd257
                    status: completed
                    entity: person
                    action: enrich
                    identifier_count: 1
                    result_count: 0
                    entities_requested: 1
                    entities_fulfilled: 0
                    created_at: '2026-06-12T12:23:36.320775+00:00'
                    completed_at: '2026-06-12T12:23:36.774903+00:00'
                    download_url: >-
                      https://crustdata-batch-api-data.s3.amazonaws.com/dc260602-07fe-4179-94e2-f7d52f8fd257/output/results.jsonl.gz
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Batch job not found or does not belong to the authenticated account
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                error:
                  type: not_found
                  message: Batch job not found
                  metadata: []
components:
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
  schemas:
    BatchJobDetailResponse:
      type: object
      required:
        - batch_id
        - status
        - entity
        - action
        - identifier_count
        - result_count
        - entities_requested
        - entities_fulfilled
        - created_at
        - completed_at
      description: >
        Current state of a batch job. `download_url` and `download_urls` appear
        only when `status` is

        `completed`; `error_message` appears only when the job has an error.
        Note that a completed job

        with `result_count: 0` may still include a `download_url` that points to
        a file that was never

        written (fetching it returns `404`) — check `result_count` before
        downloading.
      properties:
        batch_id:
          type: string
          format: uuid
          description: Unique ID of the batch job.
          example: 53ab686b-c054-496b-8baf-baff5ecc85cf
        status:
          type: string
          enum:
            - pending
            - processing
            - completed
            - failed
          description: >-
            Job lifecycle status. Moves `pending` → `processing` → `completed`
            or `failed`.
          example: completed
        entity:
          type: string
          description: Entity type the job operates on (`company` or `person`).
          example: company
        action:
          type: string
          description: >-
            Internal action name for the job (`enrich`, `enrich_live`, `search`,
            or `search_live`).
          example: enrich
        identifier_count:
          type: integer
          description: >-
            Number of identifiers submitted. Search jobs always report `1` (the
            query).
          example: 2
        result_count:
          type: integer
          description: >-
            Number of records the job has produced so far. For completed jobs,
            this is the number of lines in the results file.
          example: 2
        entities_requested:
          type: integer
          description: Number of entities the job was asked to produce.
          example: 2
        entities_fulfilled:
          type: integer
          description: >-
            Number of entities actually delivered. May be lower than
            `entities_requested` when some identifiers cannot be resolved; for
            search jobs it equals `result_count` and may exceed
            `entities_requested`.
          example: 2
        created_at:
          type: string
          format: date-time
          nullable: true
          description: When the job was submitted (ISO 8601).
          example: '2026-06-12T12:23:03.945900+00:00'
        completed_at:
          type: string
          format: date-time
          nullable: true
          description: >-
            When the job finished (ISO 8601). `null` while the job is still
            pending or processing.
          example: '2026-06-12T12:23:15.993293+00:00'
        error_message:
          type: string
          description: >-
            Human-readable reason the job failed (for example, when the
            processing workflow could not be started). Present only when the job
            has an error.
        download_url:
          type: string
          format: uri
          description: >
            Pre-signed URL for the single merged results file (gzipped JSONL,
            one record per line).

            Present only for completed jobs. The real URL carries signed
            authentication query

            parameters (elided in the example) and stays valid for 5 days.
          example: >-
            https://crustdata-batch-api-data.s3.amazonaws.com/53ab686b-c054-496b-8baf-baff5ecc85cf/output/results.jsonl.gz
        download_urls:
          type: array
          description: >
            Pre-signed URLs for the same data split into part files, useful for
            streaming very large

            result sets. Present only for completed jobs that wrote results. The
            real URLs carry

            signed authentication query parameters (elided in the example) and
            stay valid for 5 days.
          example:
            - >-
              https://crustdata-batch-api-data.s3.amazonaws.com/53ab686b-c054-496b-8baf-baff5ecc85cf/output/part-000.jsonl.gz
          items:
            type: string
            format: uri
            description: Pre-signed URL of one results part file.
            example: >-
              https://crustdata-batch-api-data.s3.amazonaws.com/53ab686b-c054-496b-8baf-baff5ecc85cf/output/part-000.jsonl.gz
      example:
        batch_id: 53ab686b-c054-496b-8baf-baff5ecc85cf
        status: completed
        entity: company
        action: enrich
        identifier_count: 2
        result_count: 2
        entities_requested: 2
        entities_fulfilled: 2
        created_at: '2026-06-12T12:23:03.945900+00:00'
        completed_at: '2026-06-12T12:23:15.993293+00:00'
        download_url: >-
          https://crustdata-batch-api-data.s3.amazonaws.com/53ab686b-c054-496b-8baf-baff5ecc85cf/output/results.jsonl.gz
        download_urls:
          - >-
            https://crustdata-batch-api-data.s3.amazonaws.com/53ab686b-c054-496b-8baf-baff5ecc85cf/output/part-000.jsonl.gz
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
  responses:
    Unauthorized:
      description: Unauthorized — invalid or missing API key
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/AuthenticationErrorResponse'
          example:
            message: Invalid API key in request
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: API key passed as a Bearer token in the Authorization header.

````

## Related topics

- [List Batch Jobs](https://docs.crustdata.com/api-reference/batch-apis/list-batch-jobs-for-the-authenticated-account.md)
- [Batch Job Postings Search API](https://docs.crustdata.com/job-docs/search/batch-search.md)
- [Batch Contact Enrichment API](https://docs.crustdata.com/person-docs/contact/batch.md)
- [Batch Search Jobs](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-job-listings-search-job.md)
- [Batch Verify Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-verification-job.md)
