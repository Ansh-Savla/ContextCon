> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Batch Search Person

> Run one person database search query and receive up to **10,000 matching people** as a single
results file. Where the non-batch `/person/search` returns one cursor page per call, the batch
job walks every page for you and delivers the entire result set at once.

<Note>
    An account may have at most 5 active (`pending` or `processing`) batch jobs at a time;
    submitting a sixth returns `429`.
</Note>

Provide one `filters` group (`{op, conditions}`) plus optional `sorts` and `max_results`. The
non-batch paging parameters (`limit`, `page`, `preview`) are ignored by batch jobs — result
volume is controlled by `max_results` alone. Records in the downloaded results file are flat,
identical to the non-batch `/person/search` record shape.




## OpenAPI

````yaml /openapi-specs/2025-11-01/batch.yaml post /batch/person/search
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
  /batch/person/search:
    post:
      tags:
        - Batch APIs
      summary: Submit a batch person database search job
      description: >
        Run one person database search query and receive up to **10,000 matching
        people** as a single

        results file. Where the non-batch `/person/search` returns one cursor
        page per call, the batch

        job walks every page for you and delivers the entire result set at once.


        <Note>
            An account may have at most 5 active (`pending` or `processing`) batch jobs at a time;
            submitting a sixth returns `429`.
        </Note>


        Provide one `filters` group (`{op, conditions}`) plus optional `sorts`
        and `max_results`. The

        non-batch paging parameters (`limit`, `page`, `preview`) are ignored by
        batch jobs — result

        volume is controlled by `max_results` alone. Records in the downloaded
        results file are flat,

        identical to the non-batch `/person/search` record shape.
      operationId: submitBatchPersonSearch
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: true
        description: >-
          One search query (filters plus optional sorts), result-volume
          controls, and optional field selection.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BatchPersonSearchRequest'
            examples:
              engineers_by_title:
                summary: People whose current title contains "engineer"
                value:
                  filters:
                    op: and
                    conditions:
                      - field: experience.employment_details.current.title
                        type: (.)
                        value: engineer
                  max_results: 2
                  fields:
                    - basic_profile.name
                    - basic_profile.current_title
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
                batch_id: a9afc353-8876-4e64-8b84-02a599561021
                status: pending
                entity: person
                action: search
                identifier_count: 1
                entities_requested: 1
                status_url: /batch/a9afc353-8876-4e64-8b84-02a599561021
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Invalid request — missing or malformed filters, or invalid
            max_results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                missing_filters:
                  summary: No filters provided
                  value:
                    error:
                      type: invalid_request
                      message: '`filters` must be provided for search'
                      metadata: []
                bare_condition:
                  summary: Filters must be an op/conditions group
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Invalid filter shape: [{'type': 'missing', 'loc':
                        ('op',), 'msg': 'Field required', ...}]
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
                      message: >-
                        You do not have permission to access
                        /batch/person/search.
                      metadata: []
                fields_denied:
                  summary: A requested field is not enabled on the account
                  value:
                    error:
                      type: permission_error
                      message: >-
                        Access denied to fields: contact. Available fields:
                        basic_profile, education, experience. To enable access,
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
    BatchPersonSearchRequest:
      type: object
      required:
        - filters
      description: >
        Request body for a batch person database search job. Provide one
        `filters` group; the job

        walks the paginated result set server-side until `max_results` is
        reached or the results are

        exhausted. The non-batch paging parameters (`limit`, `page`, `preview`)
        are ignored.
      properties:
        filters:
          $ref: '#/components/schemas/BatchSearchFilterGroup'
        sorts:
          type: array
          default: []
          description: >-
            Optional sort directives applied to matched people in order,
            identical to the non-batch `/person/search` `sorts` parameter.
          example:
            - field: crustdata_person_id
              order: asc
          items:
            $ref: '#/components/schemas/BatchSearchSort'
        max_results:
          type: integer
          minimum: 1
          default: 10000
          description: >
            Total number of records the job will produce. Clamped to the cap of
            **10,000** — asking

            for more is silently reduced to the cap, not rejected. Defaults to
            the cap when omitted.

            Zero or negative values return `400`.
          example: 500
        limit_per_page:
          type: integer
          default: 100
          description: >-
            Optional internal page-size hint controlling how many records are
            fetched per page while the job paginates. It does not limit how many
            records you get back — use `max_results` for that.
          example: 100
        fields:
          description: >
            Optional list of dotted field paths to include in each record (also
            accepted as a single

            comma-separated string). When omitted, all fields permitted for your
            account are returned.

            Records in the results file contain exactly the requested fields.
            The selectable fields are

            the same as the non-batch `/person/search` endpoint.
          example:
            - basic_profile.name
            - basic_profile.current_title
          oneOf:
            - type: string
              description: Comma-separated dotted field paths.
              example: basic_profile.name,basic_profile.current_title
            - type: array
              items:
                type: string
                description: A dotted field path.
                example: basic_profile.current_title
        webhook_url:
          type: string
          format: uri
          description: >-
            Optional URL that receives a POST notification when the job
            finishes, so you do not have to poll.
          example: https://example.com/webhooks/crustdata-batch
      example:
        filters:
          op: and
          conditions:
            - field: experience.employment_details.current.title
              type: (.)
              value: engineer
        max_results: 2
        fields:
          - basic_profile.name
          - basic_profile.current_title
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
    BatchSearchFilterGroup:
      type: object
      required:
        - op
        - conditions
      description: >
        Boolean group of database search conditions. Unlike the non-batch search
        endpoints, batch

        search requires the top level of `filters` to be a group — sending a
        bare condition returns

        `400`. Groups can be nested inside `conditions` for complex queries.
      properties:
        op:
          type: string
          enum:
            - and
            - or
          description: Boolean operator combining the conditions in this group.
          example: and
        conditions:
          type: array
          minItems: 1
          description: >-
            Conditions in this group. Each entry is a single field condition or
            a nested group.
          example:
            - field: experience.employment_details.current.title
              type: (.)
              value: engineer
          items:
            oneOf:
              - $ref: '#/components/schemas/BatchSearchCondition'
              - $ref: '#/components/schemas/BatchSearchFilterGroup'
      example:
        op: and
        conditions:
          - field: experience.employment_details.current.title
            type: (.)
            value: engineer
    BatchSearchSort:
      type: object
      required:
        - field
        - order
      description: >-
        Sort directive specifying a field name and direction, identical to the
        non-batch search `sorts` entries.
      properties:
        field:
          type: string
          description: >-
            Field path to sort on. The sortable fields are the same as the
            corresponding non-batch search endpoint.
          example: crustdata_person_id
        order:
          type: string
          enum:
            - asc
            - desc
          description: Sort direction.
          example: asc
      example:
        field: crustdata_person_id
        order: asc
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
    BatchSearchCondition:
      type: object
      required:
        - field
        - type
        - value
      description: A single database search filter condition on one field.
      properties:
        field:
          type: string
          description: >
            Dotted field path to filter on. Batch search supports the same
            filter fields as the

            corresponding non-batch endpoint — see `/person/search` and
            `/company/search` for the full

            field catalogs.
          example: experience.employment_details.current.title
        type:
          type: string
          description: >
            Filter operator, identical to the non-batch search operators. Use
            '=' for exact match,

            '!=' for not equal, '<' and '>' for exclusive comparisons, '=<' and
            '=>' for inclusive

            comparisons, 'in'/'not_in' for set membership (value must be an
            array), '(.)' for case-insensitive

            all-words match (a piped value is AND'd across its separate words,
            not OR), '(!)' for case-insensitive fuzzy

            negation, '[.]' for case-insensitive exact-phrase match, and
            'geo_distance' for geographic

            radius. NOTE: '(!)', 'geo_distance', and 'geo_exclude' apply to
            person search only — company

            search and company batch reject them.
          enum:
            - '='
            - '!='
            - <
            - '=<'
            - '>'
            - '=>'
            - in
            - not_in
            - (.)
            - (!)
            - '[.]'
            - geo_distance
          example: (.)
        value:
          description: >
            Filter value. The type depends on the operator: a string or number
            for comparison

            operators, an array for 'in'/'not_in', a string for the fuzzy and
            substring operators, and

            an object with `location` or `lat_lng` plus `distance` and optional
            `unit` for

            'geo_distance'.
          example: engineer
          oneOf:
            - type: string
            - type: number
            - type: integer
            - type: boolean
            - type: array
              items:
                oneOf:
                  - type: string
                  - type: number
                  - type: integer
            - type: object
              description: >-
                Object value used by `geo_distance`. Supply either `location`
                (geocoded server-side) or `lat_lng` (`[lat, lng]`), plus
                `distance` and an optional `unit`.
              required:
                - distance
              properties:
                location:
                  type: string
                  description: Location name to geocode server-side.
                  example: San Francisco
                lat_lng:
                  type: array
                  description: >-
                    Explicit latitude/longitude pair; takes precedence over
                    `location`.
                  example:
                    - 37.7749
                    - -122.4194
                  items:
                    type: number
                    description: A latitude or longitude value.
                    example: 37.7749
                distance:
                  type: number
                  description: Radius distance.
                  example: 50
                unit:
                  type: string
                  description: Distance unit.
                  enum:
                    - km
                    - mi
                    - miles
                    - m
                    - ft
                  example: km
      example:
        field: experience.employment_details.current.title
        type: (.)
        value: engineer
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

- [Batch Verify Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-verification-job.md)
- [Batch Enrich Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-enrichment-job.md)
- [Batch Identify Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-identify-reverse-email-lookup-job.md)
- [Batch People Search API](https://docs.crustdata.com/person-docs/search/batch-search.md)
- [Batch Person Enrichment API](https://docs.crustdata.com/person-docs/enrichment/batch-enrich.md)
