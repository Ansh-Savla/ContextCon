> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# List watch runs

> Returns the watch's runs, newest first, with cursor pagination. Works for both watch kinds. The
read paths drop the `search/` segment that discovery create and manage use, so a discovery watch
created at `/watch/job/search` reads its runs at `/watch/job/{watch_id}/runs`.

Each run carries five counters, and each one means something different per watch kind. Read
`records_searched` as what the run started from, `records_after_filter` as what was new, and
`new_records_count` as what was delivered. `records_matched` is set on an entity run only, and
`records_stale` on a discovery run only; the other is `null`. A run that finished before these
two counters shipped carries `null` for both.

Check `notification_http_status` before concluding that a quiet channel means nothing happened:
a non-2xx there means the run found matches and the delivery itself was rejected. Pass
`only_credited=true` to see only the runs that actually charged you.




## OpenAPI

````yaml /openapi-specs/2025-11-01/watch.yaml get /watch/{dataset}/{watch_id}/runs
openapi: 3.0.3
info:
  title: Watch API
  version: '2025-11-01'
  description: >
    The Watch API turns a Crustdata query into a recurring feed. A watch runs on
    your schedule and

    delivers only what is new or what changed since its previous run, to a
    webhook, Slack, Google Chat,

    or email.


    There are two kinds of watch, and the kind decides the URL:


    - **Discovery watches** (`/watch/{dataset}/search`) re-run a *search filter*
    and deliver records that
      newly match it. Use one to find people, companies, jobs, or social posts you do not know yet.
      Available for `person`, `company`, `job`, and `social_post`.
    - **Entity watches** (`/watch/{dataset}`) monitor a *list you supply* and
    deliver a notification when
      a tracked field on one of those records changes. Use one to follow a known set. Available for
      `person` and `company`.

    Both kinds share the same `config`, `notifications`, and run-history
    surfaces, and both start with a

    free baseline run: a discovery watch delivers a sample of up to 5 current
    matches, an entity watch

    records each subject's starting values and never fires. Every request needs
    an `Authorization` Bearer

    API key and the `x-api-version: 2025-11-01` header.


    **Credits.** Every watch is priced by its SLA, how fresh the data behind a
    notification is kept,

    written as `config.refresh_frequency_days`. At the 30-day default a
    discovery watch is charged per

    new record delivered: 0.5 for a person, 2 for a company, 0.5 for a job, 2
    for a social post. At a

    1-day SLA it is charged 150 per new record on every dataset, because each
    run searches live rather

    than reading the index; a discovery watch asks for that SLA with
    `config.is_realtime: true` and the

    create response echoes `config.refresh_frequency_days: 1`. An entity watch
    is charged per

    notification at the same SLA scale: 5 credits at the 30-day default, 10 at
    14 days, 20 at 7 days,

    50 at 3 days, 150 at 1 day. A run that finds nothing costs nothing, and the
    baseline run is free

    for both kinds.


    **Rate limit.** Watch-management requests are limited to 10 requests per
    minute, counted per

    endpoint: exhausting `/watch/company/search` leaves `/watch/company`,
    `/watch/person/search`,

    and `/watch/job/search` with a full allowance. Every response carries
    `X-RateLimit-Limit`,

    `X-RateLimit-Remaining`, and `X-RateLimit-Reset`, the seconds until the
    window rolls over.


    **Access.** Creating a watch is open to any authenticated API customer, and
    the 10-requests-per-minute

    limit is what bounds abuse. What is gated is the data underneath: a create
    is rejected with `403` when

    the key is not entitled to the dataset, or when `fields` or `track` name
    field groups the key may not

    receive. Contact info@crustdata.com to request access.
servers:
  - url: https://api.crustdata.com
    description: Production API server
security:
  - bearerAuth: []
tags:
  - name: Watch APIs
    description: Recurring feeds over the Crustdata datasets
  - name: Discovery Watches
    description: Watches that re-run a search filter and deliver newly matching records
  - name: Entity Watches
    description: >-
      Watches that monitor a supplied list of people or companies for field
      changes
  - name: Watch Runs
    description: Run history and per-run delivery detail, shared by both watch kinds
paths:
  /watch/{dataset}/{watch_id}/runs:
    get:
      tags:
        - Watch APIs
        - Watch Runs
      summary: List a watch's runs
      description: >
        Returns the watch's runs, newest first, with cursor pagination. Works
        for both watch kinds. The

        read paths drop the `search/` segment that discovery create and manage
        use, so a discovery watch

        created at `/watch/job/search` reads its runs at
        `/watch/job/{watch_id}/runs`.


        Each run carries five counters, and each one means something different
        per watch kind. Read

        `records_searched` as what the run started from, `records_after_filter`
        as what was new, and

        `new_records_count` as what was delivered. `records_matched` is set on
        an entity run only, and

        `records_stale` on a discovery run only; the other is `null`. A run that
        finished before these

        two counters shipped carries `null` for both.


        Check `notification_http_status` before concluding that a quiet channel
        means nothing happened:

        a non-2xx there means the run found matches and the delivery itself was
        rejected. Pass

        `only_credited=true` to see only the runs that actually charged you.
      operationId: listWatchRuns
      parameters:
        - $ref: '#/components/parameters/DatasetPath'
        - $ref: '#/components/parameters/WatchId'
        - $ref: '#/components/parameters/ApiVersion'
        - name: limit
          in: query
          required: false
          description: Runs per page.
          schema:
            type: integer
            minimum: 1
            maximum: 1000
            default: 20
            example: 20
        - name: cursor
          in: query
          required: false
          description: >-
            The `next_cursor` from the previous page. Runs with an id below this
            are returned.
          schema:
            type: integer
            example: 54811
        - name: only_credited
          in: query
          required: false
          description: Return only runs that deducted credits.
          schema:
            type: boolean
            default: false
            example: false
      responses:
        '200':
          description: A page of runs, newest first.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WatchRunsResponse'
        '400':
          description: A query parameter failed validation.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WatcherErrorResponse'
              example:
                error:
                  type: invalid_request
                  message: 'limit: Ensure this value is less than or equal to 1000.'
                  metadata:
                    - field: limit
                      type: less_than_equal
                      message: 'limit: Ensure this value is less than or equal to 1000.'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/WatchNotFound'
        '429':
          $ref: '#/components/responses/RateLimited'
components:
  parameters:
    DatasetPath:
      name: dataset
      in: path
      required: true
      description: The dataset the watch is built on.
      schema:
        type: string
        enum:
          - person
          - company
          - job
          - social_post
        example: person
    WatchId:
      name: watch_id
      in: path
      required: true
      description: The watch's `id`, returned when it was created.
      schema:
        type: integer
        example: 46936
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
      description: >
        API version to use. `2025-11-01` is the only accepted value. Send it on
        every call: it is

        enforced today on `POST /watch/{dataset}/search`, where a missing or
        unrecognized value returns

        `400`, and the other watch routes accept a request without it rather
        than relying on that.
  schemas:
    WatchRunsResponse:
      type: object
      description: A page of runs, newest first.
      properties:
        runs:
          type: array
          items:
            $ref: '#/components/schemas/WatchRun'
        next_cursor:
          type: integer
          nullable: true
          description: >-
            Pass this back as `cursor` for the next page. `null` on the last
            page.
          example: 54790
        total_count:
          type: integer
          description: All runs matching the query, not just this page.
          example: 42
    WatcherErrorResponse:
      type: object
      description: >
        Every watcher failure, whatever the status code. `type` is the
        machine-readable code,

        `message` is the sentence you can show a user, and `metadata` carries
        per-problem detail.


        Validation collects every failure in one pass, so a body with three
        problems answers once

        with three `metadata` entries and a `message` that joins them. Each
        validation entry is a

        `{field, type, message}` triple: `field` is the request path that
        failed, indexed into

        filter and track trees; `type` is drawn from the vocabulary the search
        and enrich APIs use

        (`missing`, `enum`, `greater_than_equal`, `less_than_equal`,
        `string_type`, `int_type`,

        `bool_type`, `list_type`, `dict_type`, `too_long`, `date_parsing`,
        `extra_forbidden`,

        `invalid`) plus `unknown_field` and `unsupported`, which only watcher
        emits.


        A limit that names no request field, such as the tracking cap, carries
        an empty `metadata`.

        Three responses put something other than a triple in it: `Invalid
        fields: ...` carries

        `available_fields`, `Access denied to fields: ...` carries
        `denied_fields` and

        `permitted_fields`, and a test send that was never attempted carries the
        `delivered` and

        `envelope` it had built. Check for the keys you expect before iterating.
      required:
        - error
      example:
        error:
          type: not_found
          message: Watch not found
          metadata: []
      properties:
        error:
          type: object
          required:
            - type
            - message
            - metadata
          properties:
            type:
              type: string
              description: Machine-readable error type.
              enum:
                - invalid_request
                - unauthorized
                - permission_error
                - not_found
                - rate_limit_error
                - internal_error
              example: not_found
            message:
              type: string
              description: >
                Human-readable description. On a validation failure this is
                every entry's

                message joined in order.
              example: Watch not found
            metadata:
              type: array
              description: >-
                One entry per problem, empty when the failure names no request
                field.
              items:
                type: object
                additionalProperties: true
                properties:
                  field:
                    type: string
                    description: The request path that failed.
                    example: config.trigger.every_hours
                  type:
                    type: string
                    description: The failure code for this one problem.
                    example: greater_than_equal
                  message:
                    type: string
                    description: The sentence for this one problem.
                    example: config.trigger.every_hours must be an integer >= 1.
              example:
                - field: config.trigger.every_hours
                  type: greater_than_equal
                  message: config.trigger.every_hours must be an integer >= 1.
    WatchRun:
      type: object
      description: One run of a watch, as it appears in run history.
      properties:
        id:
          type: integer
          example: 54811
        started_at:
          type: string
          format: date-time
          example: '2026-08-04T05:30:00Z'
        completed_at:
          type: string
          format: date-time
          nullable: true
          example: '2026-08-04T05:32:47Z'
        status:
          type: string
          enum:
            - RUNNING
            - SUCCESS
            - FAILED
            - SKIPPED
          example: SUCCESS
        failure_reason:
          type: string
          nullable: true
          enum:
            - EXPIRED
            - PAUSED
            - CANCELLED
            - INSUFFICIENT_CREDITS
            - SUSPENDED
            - USER_NOT_FOUND
            - UNKNOWN
          description: Why the run did not deliver. Set on a `FAILED` or `SKIPPED` run.
          example: null
        records_searched:
          type: integer
          description: >
            What the run started from. On a discovery watch, everything the
            query returned before the

            new-record check and the cap; on a realtime discovery watch, the
            rows the live retrieval

            returned. On an entity watch, the identifiers you listed in
            `entities`.
          example: 723
        records_matched:
          type: integer
          nullable: true
          description: >
            Entity watches only. Identifiers that resolved to a record Crustdata
            holds. A gap between

            this and `records_searched` is the part of your list that matches
            nothing, which a run

            would otherwise pass over in silence. `null` on a discovery run.
          example: null
        records_stale:
          type: integer
          nullable: true
          description: >
            Discovery watches only. Matches an earlier run already handled, so
            `records_searched`

            minus `records_stale` is `records_after_filter`. On a job or post
            watch it counts the

            records posted before the last run. `null` on an entity run.
          example: 0
        records_after_filter:
          type: integer
          description: >
            New records the run found, before the cap. On a discovery watch, the
            new matches. On an

            entity watch, the entities that changed, and on its first run every
            subject Crustdata

            resolved.
          example: 723
        new_records_count:
          type: integer
          description: >-
            Records this run delivered. It is below `records_after_filter` when
            the cap cut the run short.
          example: 5
        credits_deducted:
          type: number
          description: >-
            Credits this run charged. `0` on a baseline run and on a run that
            found nothing.
          example: 1.5
        notification_http_status:
          type: integer
          nullable: true
          description: >
            Status the delivery channel answered with. A non-2xx here means the
            run found matches

            and the delivery itself was rejected, so check it before concluding
            that a quiet channel

            means nothing happened.


            On a watch with several channels the webhook wins: you get the
            webhook's status when the

            run sent one, and `null` when that webhook never answered. A run
            that sent only Slack or

            email reports `200`. A run that sent nothing reports `null`.
          example: 200
  responses:
    Unauthorized:
      description: >
        The API key is missing or not valid. Both failures answer with the same
        body, so the

        response does not tell you which of the two happened.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/WatcherErrorResponse'
          example:
            error:
              type: unauthorized
              message: Invalid API key in request.
              metadata: []
    WatchNotFound:
      description: No watch with that id belongs to this key on this dataset.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/WatcherErrorResponse'
          example:
            error:
              type: not_found
              message: Watch not found
              metadata: []
    RateLimited:
      description: >
        Too many watch requests. The per-endpoint limit is 10 requests per
        minute per API key, which is

        what bounds bursty create and update loops. Steady use is unaffected.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/WatcherErrorResponse'
          example:
            error:
              type: rate_limit_error
              message: >-
                Rate limit exceeded for this endpoint. Please write to
                gtm@crustdata.co.
              metadata: []
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: API key passed as a Bearer token in the Authorization header.

````

## Related topics

- [List entity watches](https://docs.crustdata.com/api-reference/watch-apis/list-your-entity-watches.md)
- [List discovery watches](https://docs.crustdata.com/api-reference/watch-apis/list-your-discovery-watches.md)
- [Company Entity Watcher](https://docs.crustdata.com/watcher-docs/company/entity.md)
- [Person Entity Watcher](https://docs.crustdata.com/watcher-docs/person/entity.md)
- [Get a watch run summary](https://docs.crustdata.com/api-reference/watch-apis/get-one-run-with-the-records-it-delivered.md)
