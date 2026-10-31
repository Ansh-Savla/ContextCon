> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# List Batch Jobs

> List your batch jobs, most recent first, with cursor-based pagination and optional status
filtering. Job summaries carry the same fields as the job-status endpoint minus the download
links — poll `GET /batch/{batch_id}` for a specific job to obtain its `download_url`.



The `x-api-version` header is not required on this endpoint.




## OpenAPI

````yaml /openapi-specs/2025-11-01/batch.yaml get /batch/
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
  /batch/:
    get:
      tags:
        - Batch APIs
      summary: List batch jobs for the authenticated account
      description: >
        List your batch jobs, most recent first, with cursor-based pagination
        and optional status

        filtering. Job summaries carry the same fields as the job-status
        endpoint minus the download

        links — poll `GET /batch/{batch_id}` for a specific job to obtain its
        `download_url`.




        The `x-api-version` header is not required on this endpoint.
      operationId: listBatchJobs
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
            example: 2
          description: >-
            Maximum number of jobs to return per page. Values outside 1-100 are
            clamped into range.
        - name: status
          in: query
          required: false
          schema:
            type: string
            enum:
              - pending
              - processing
              - completed
              - failed
            example: completed
          description: Return only jobs in this status. Any other value returns `400`.
        - name: cursor
          in: query
          required: false
          schema:
            type: string
            format: uuid
            example: afb80886-2f90-45f9-a2c7-db407e227ca8
          description: >-
            The `next_cursor` value from the previous page (the batch ID of that
            page's last job). Omit on the first page.
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Paginated list of batch jobs
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchJobListResponse'
              example:
                jobs:
                  - batch_id: 48b676de-f0d1-4ae5-af52-4e021991efe6
                    status: completed
                    entity: person
                    action: search
                    identifier_count: 1
                    result_count: 6
                    entities_requested: 1
                    entities_fulfilled: 6
                    created_at: '2026-06-12T12:02:00.220799+00:00'
                    completed_at: '2026-06-12T12:02:01.816021+00:00'
                  - batch_id: afb80886-2f90-45f9-a2c7-db407e227ca8
                    status: completed
                    entity: company_v2024
                    action: enrich
                    identifier_count: 2
                    result_count: 2
                    entities_requested: 2
                    entities_fulfilled: 2
                    created_at: '2026-03-05T01:06:43.941233+00:00'
                    completed_at: '2026-03-05T01:06:44.904341+00:00'
                next_cursor: afb80886-2f90-45f9-a2c7-db407e227ca8
                has_more: true
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Invalid query parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                invalid_status:
                  summary: Unknown status filter value
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Invalid status filter. Must be one of: completed,
                        failed, pending, processing
                      metadata: []
                invalid_limit:
                  summary: Non-integer limit
                  value:
                    error:
                      type: invalid_request
                      message: limit must be an integer
                      metadata: []
        '401':
          $ref: '#/components/responses/Unauthorized'
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
    BatchJobListResponse:
      type: object
      required:
        - jobs
        - next_cursor
        - has_more
      description: >-
        Paginated list of batch jobs for the authenticated account, most recent
        first.
      properties:
        jobs:
          type: array
          description: Batch jobs on this page.
          items:
            $ref: '#/components/schemas/BatchJobSummary'
        next_cursor:
          type: string
          format: uuid
          nullable: true
          description: >-
            Batch ID to pass as `cursor` for the next page, or `null` when there
            are no more pages.
          example: afb80886-2f90-45f9-a2c7-db407e227ca8
        has_more:
          type: boolean
          description: Whether more jobs exist after this page.
          example: true
      example:
        jobs:
          - batch_id: 48b676de-f0d1-4ae5-af52-4e021991efe6
            status: completed
            entity: person
            action: search
            identifier_count: 1
            result_count: 6
            entities_requested: 1
            entities_fulfilled: 6
            created_at: '2026-06-12T12:02:00.220799+00:00'
            completed_at: '2026-06-12T12:02:01.816021+00:00'
        next_cursor: afb80886-2f90-45f9-a2c7-db407e227ca8
        has_more: true
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
    BatchJobSummary:
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
      description: >-
        One batch job in the list response. Carries the same fields as the
        job-status endpoint minus the download links — poll `GET
        /batch/{batch_id}` to obtain them.
      properties:
        batch_id:
          type: string
          format: uuid
          description: Unique ID of the batch job.
          example: 48b676de-f0d1-4ae5-af52-4e021991efe6
        status:
          type: string
          enum:
            - pending
            - processing
            - completed
            - failed
          description: Job lifecycle status.
          example: completed
        entity:
          type: string
          description: >-
            Entity type the job operates on (`company` or `person`; historical
            jobs may report legacy entity names).
          example: person
        action:
          type: string
          description: >-
            Internal action name for the job (`enrich`, `enrich_live`, `search`,
            or `search_live`).
          example: search
        identifier_count:
          type: integer
          description: >-
            Number of identifiers submitted. Search jobs always report `1` (the
            query).
          example: 1
        result_count:
          type: integer
          description: Number of records the job produced.
          example: 6
        entities_requested:
          type: integer
          description: Number of entities the job was asked to produce.
          example: 1
        entities_fulfilled:
          type: integer
          description: Number of entities actually delivered.
          example: 6
        created_at:
          type: string
          format: date-time
          nullable: true
          description: When the job was submitted (ISO 8601).
          example: '2026-06-12T12:02:00.220799+00:00'
        completed_at:
          type: string
          format: date-time
          nullable: true
          description: >-
            When the job finished (ISO 8601). `null` while the job is still
            pending or processing.
          example: '2026-06-12T12:02:01.816021+00:00'
        error_message:
          type: string
          description: >-
            Human-readable reason the job failed (for example, when the
            processing workflow could not be started). Present only when the job
            has an error.
      example:
        batch_id: 48b676de-f0d1-4ae5-af52-4e021991efe6
        status: completed
        entity: person
        action: search
        identifier_count: 1
        result_count: 6
        entities_requested: 1
        entities_fulfilled: 6
        created_at: '2026-06-12T12:02:00.220799+00:00'
        completed_at: '2026-06-12T12:02:01.816021+00:00'
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

- [Batch Search Jobs](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-job-listings-search-job.md)
- [Batch Job Postings Search API](https://docs.crustdata.com/job-docs/search/batch-search.md)
- [Get Batch Job Status](https://docs.crustdata.com/api-reference/batch-apis/get-the-status-and-download-urls-for-a-batch-job.md)
- [Rate limits](https://docs.crustdata.com/general/rate-limits.md)
- [Credits](https://docs.crustdata.com/general/credits.md)
