> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Batch Search Jobs

> Retrieve every job listing in the dataset for up to **10 companies** in a single asynchronous
job. Where the non-batch `/job/search` returns one cursor page per call, the batch job walks
every page for you and delivers the complete result set as one file.

<Note>
    An account may have at most 5 active (`pending` or `processing`) batch jobs at a time;
    submitting a sixth returns `429`.
</Note>

Unlike the other batch search jobs, this endpoint does not take a `filters` group — provide a
`crustdata_company_ids` list (a JSON array of integers; comma-separated strings are rejected)
and the job returns **all** listings for those companies. To search listings by arbitrary
filters, use the non-batch `/job/search`. Records in the downloaded results file are flat,
identical to the non-batch `/job/search` record shape.

Billing is per listing delivered, at the same rate as the non-batch `/job/search` — see
[Pricing](/general/pricing#job-endpoints).




## OpenAPI

````yaml /openapi-specs/2025-11-01/batch.yaml post /batch/job/search
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
  /batch/job/search:
    post:
      tags:
        - Batch APIs
      summary: Submit a batch job-listings search job
      description: >
        Retrieve every job listing in the dataset for up to **10 companies** in
        a single asynchronous

        job. Where the non-batch `/job/search` returns one cursor page per call,
        the batch job walks

        every page for you and delivers the complete result set as one file.


        <Note>
            An account may have at most 5 active (`pending` or `processing`) batch jobs at a time;
            submitting a sixth returns `429`.
        </Note>


        Unlike the other batch search jobs, this endpoint does not take a
        `filters` group — provide a

        `crustdata_company_ids` list (a JSON array of integers; comma-separated
        strings are rejected)

        and the job returns **all** listings for those companies. To search
        listings by arbitrary

        filters, use the non-batch `/job/search`. Records in the downloaded
        results file are flat,

        identical to the non-batch `/job/search` record shape.


        Billing is per listing delivered, at the same rate as the non-batch
        `/job/search` — see

        [Pricing](/general/pricing#job-endpoints).
      operationId: submitBatchJobSearch
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: true
        description: >-
          The companies whose job listings to retrieve, plus optional field
          selection.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BatchJobSearchRequest'
            examples:
              all_listings:
                summary: All listings for one company
                value:
                  crustdata_company_ids:
                    - 6036032
              titles_and_urls:
                summary: Only title and URL per listing
                value:
                  crustdata_company_ids:
                    - 6036032
                  fields:
                    - job_details.title
                    - job_details.url
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
                batch_id: 0afed646-ce96-430a-92c0-b6b7589e937c
                status: pending
                entity: job
                action: search
                identifier_count: 1
                entities_requested: 1
                status_url: /batch/0afed646-ce96-430a-92c0-b6b7589e937c
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Invalid request — missing, malformed, or too many
            crustdata_company_ids
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                missing_ids:
                  summary: No crustdata_company_ids provided
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Exactly one identifier must be provided:
                        crustdata_company_ids
                      metadata: []
                not_a_list:
                  summary: Comma-separated string instead of a JSON array
                  value:
                    error:
                      type: invalid_request
                      message: crustdata_company_ids must be a list
                      metadata: []
                not_integers:
                  summary: Non-integer values in the list
                  value:
                    error:
                      type: invalid_request
                      message: All company_ids must be valid integers
                      metadata: []
                too_many_ids:
                  summary: More than 10 company IDs
                  value:
                    error:
                      type: invalid_request
                      message: Maximum 10 identifiers allowed for job/search. Found 11
                      metadata: []
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
                      message: You do not have permission to access /batch/job/search.
                      metadata: []
                fields_denied:
                  summary: A requested field is not enabled on the account
                  value:
                    error:
                      type: permission_error
                      message: >-
                        Access denied to fields: company.funding. Available
                        fields: job_details.title, job_details.url,
                        location.raw. To enable access, please book a call with
                        us at
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
    BatchJobSearchRequest:
      type: object
      required:
        - crustdata_company_ids
      description: >
        Request body for a batch job-listings search job. Provide the Crustdata
        company IDs whose

        listings you want; the job walks the paginated result set server-side
        and delivers every

        listing for those companies. There is no `filters` or `max_results`
        control on this endpoint.
      properties:
        crustdata_company_ids:
          type: array
          maxItems: 10
          description: >
            Crustdata company IDs whose job listings to retrieve. Maximum **10**
            per job — larger

            submissions are rejected with `400`. Must be a JSON array of
            integers; a comma-separated

            string returns `400`. Resolve IDs from a name, domain, or profile
            URL with the free

            `/company/identify` endpoint.
          example:
            - 6036032
          items:
            type: integer
            description: A Crustdata company ID.
            example: 6036032
        fields:
          description: >
            Optional list of dotted field paths to include in each record (also
            accepted as a single

            comma-separated string). When omitted, all fields permitted for your
            account are returned.

            An unsupported value returns `400` with the full list of selectable
            fields in

            `metadata.available_fields`. The selectable fields are the same as
            the non-batch

            `/job/search` endpoint.
          example:
            - job_details.title
            - job_details.url
          oneOf:
            - type: string
              description: Comma-separated dotted field paths.
              example: job_details.title,job_details.url
            - type: array
              items:
                type: string
                description: A dotted field path.
                example: job_details.title
        webhook_url:
          type: string
          format: uri
          description: >-
            Optional URL that receives a POST notification when the job
            finishes, so you do not have to poll.
          example: https://example.com/webhooks/crustdata-batch
      example:
        crustdata_company_ids:
          - 6036032
        fields:
          - job_details.title
          - job_details.url
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

- [Batch Job Postings Search API](https://docs.crustdata.com/job-docs/search/batch-search.md)
- [List Batch Jobs](https://docs.crustdata.com/api-reference/batch-apis/list-batch-jobs-for-the-authenticated-account.md)
- [Batch Search Companies](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-company-database-search-job.md)
- [Batch Search Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-database-search-job.md)
- [Get Batch Job Status](https://docs.crustdata.com/api-reference/batch-apis/get-the-status-and-download-urls-for-a-batch-job.md)
