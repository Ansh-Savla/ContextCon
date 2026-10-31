> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get a watch run summary

> Returns one run in full: its counts, its per-stage activity log, and every delivery attempt with
the records it carried under `notifications[].payload.notifications[]`. That is the same record
shape your channel receives, so a watch is readable here even when no channel is configured.

A watch whose `config.payload_delivery_type` is `link` serves its records from a file instead.
The response then carries a top-level `payload_delivery` block with a fresh link, and each
`notifications[]` entry keeps its outcome and drops `payload`. Reading a run hands you the same
file the run delivered, so the bytes match what your channel received; a watch with no channels
never pushed one, so the first read writes it.

Records are returned only for a run whose `status` is `SUCCESS`. A run can leave rows behind
without ever paying for or delivering them, and those rows must not be readable. The run itself,
with its status, counts, and logs, is still returned so you can see what happened.




## OpenAPI

````yaml /openapi-specs/2025-11-01/watch.yaml get /watch/{dataset}/{watch_id}/runs/{run_id}/summary
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
  /watch/{dataset}/{watch_id}/runs/{run_id}/summary:
    get:
      tags:
        - Watch APIs
        - Watch Runs
      summary: Get one run with the records it delivered
      description: >
        Returns one run in full: its counts, its per-stage activity log, and
        every delivery attempt with

        the records it carried under `notifications[].payload.notifications[]`.
        That is the same record

        shape your channel receives, so a watch is readable here even when no
        channel is configured.


        A watch whose `config.payload_delivery_type` is `link` serves its
        records from a file instead.

        The response then carries a top-level `payload_delivery` block with a
        fresh link, and each

        `notifications[]` entry keeps its outcome and drops `payload`. Reading a
        run hands you the same

        file the run delivered, so the bytes match what your channel received; a
        watch with no channels

        never pushed one, so the first read writes it.


        Records are returned only for a run whose `status` is `SUCCESS`. A run
        can leave rows behind

        without ever paying for or delivering them, and those rows must not be
        readable. The run itself,

        with its status, counts, and logs, is still returned so you can see what
        happened.
      operationId: getWatchRunSummary
      parameters:
        - $ref: '#/components/parameters/DatasetPath'
        - $ref: '#/components/parameters/WatchId'
        - name: run_id
          in: path
          required: true
          description: The run's id, from `runs[].id` on the run-history endpoint.
          schema:
            type: integer
            example: 54811
        - $ref: '#/components/parameters/ApiVersion'
      responses:
        '200':
          description: The run, its logs, and its deliveries.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WatchRunSummary'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          description: No such watch for this key, or no such run on that watch.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WatcherErrorResponse'
              examples:
                watch:
                  summary: Unknown watch
                  value:
                    error:
                      type: not_found
                      message: Watch not found
                      metadata: []
                run:
                  summary: Unknown run
                  value:
                    error:
                      type: not_found
                      message: Run not found
                      metadata: []
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
    WatchRunSummary:
      type: object
      description: One run in full, with its counts, its activity log, and its deliveries.
      properties:
        id:
          type: integer
          example: 64200
        started_at:
          type: string
          format: date-time
          example: '2026-07-16T03:19:00Z'
        completed_at:
          type: string
          format: date-time
          nullable: true
          example: '2026-07-16T03:20:00Z'
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
          example: 5
        logs:
          type: array
          description: The run's per-stage activity log.
          items:
            $ref: '#/components/schemas/RunLogEntry'
        payload_delivery:
          $ref: '#/components/schemas/PayloadDelivery'
        notifications:
          type: array
          description: >
            Every delivery this run attempted, with the records it carried.
            Empty unless `status` is

            `SUCCESS`: a run can leave rows behind without ever paying for or
            delivering them, and

            those rows are not readable here.


            When `payload_delivery.type` is `link`, each entry keeps its outcome
            (`sent_at`,

            `http_status`) and drops `payload`: the records are in the linked
            file, and repeating

            the link per entry would only be noise.
          items:
            $ref: '#/components/schemas/RunDelivery'
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
    RunLogEntry:
      type: object
      description: >-
        One entry in the run's activity log, recording what a pipeline stage did
        and when.
      properties:
        activity:
          type: string
          description: What happened at this point in the run.
          example: 25 new records
        timestamp:
          type: string
          format: date-time
          example: '2026-08-24T15:23:13.847993+00:00'
    PayloadDelivery:
      type: object
      description: >
        Where the records of this delivery actually travelled. Present on every
        notification and on

        every run summary, so read `type` before reaching for `url`.


        An `inline` delivery carries `{"type": "inline"}` and nothing else, and
        its records sit in the

        body under `results`. A `link` delivery carries the whole block and no
        records: fetch `url`

        with a plain `GET` and no `authorization` header, since the pre-signed
        S3 URL carries its own

        authentication in the query string.


        The file is NDJSON, one complete JSON object per line with no wrapping
        array, so you can stream

        it without holding the run in memory. Each line is the record the inline
        body would have

        carried: the raw dataset record for a discovery watch, without the
        `added` wrapper, and the

        same `{changes, record}` object for an entity watch.


        A watch set to `link` still reports `inline` here when the file could
        not be written. The

        delivery then carries its records in the body as usual, so an outage
        costs the link and not the

        notification.
      required:
        - type
      properties:
        type:
          type: string
          enum:
            - inline
            - link
          description: Where the records of this delivery travelled.
          example: link
        url:
          type: string
          format: uri
          description: >
            Pre-signed S3 URL for the run's file. Present only when `type` is
            `link`. Fetch it when

            the notification arrives rather than storing it: the signature stops
            working at

            `expires_at`.
          example: >-
            https://crustdata-batch-api-data.s3.amazonaws.com/watcher/watch=46849/run=64200/records.ndjson?...&X-Amz-Expires=432000
        format:
          type: string
          enum:
            - ndjson
          description: Format of the linked file. Present only when `type` is `link`.
          example: ndjson
        bytes:
          type: integer
          description: Size of the linked file. Present only when `type` is `link`.
          example: 4823901
        expires_at:
          type: string
          format: date-time
          description: >
            When `url` stops working, five days after it was issued. Present
            only when `type` is

            `link`. Reading the run again from the run-summary endpoint issues a
            fresh link over

            the same records.
          example: '2026-09-01T03:20:00.000000+00:00'
    RunDelivery:
      type: object
      description: One delivery attempt made by this run, with the records it carried.
      properties:
        sent_at:
          type: string
          format: date-time
          nullable: true
          example: '2026-07-16T03:20:00Z'
        http_status:
          type: integer
          nullable: true
          example: 200
        payload:
          type: object
          description: |
            The delivered content, in its stored form. Absent when the run's
            `payload_delivery.type` is `link`.
          properties:
            subscription_id:
              type: integer
              example: 46936
            event_type:
              type: string
              description: The watch's internal event type, `indb:<kind>:<dataset>`.
              example: indb:entity:person
            timestamp:
              type: string
              format: date-time
              nullable: true
              example: '2026-07-16T03:20:00Z'
            notifications:
              type: array
              description: >
                One entry per delivered record, in its stored form. Every entry
                carries a stable

                `uid` and the record itself under `record`. An entity entry adds
                `changes`; a

                discovery entry adds `entity_id` and `updated_at`. The `record`
                is the same

                shape your channel receives, so a watch's results are readable
                here even when no

                channel is configured.
              items:
                type: object
                additionalProperties: true
              example:
                - uid: person_6324687_64200
                  changes:
                    - field: experience.employment_details.current
                      type: added
                      new_elements:
                        - title: Head of Data
                          name: Example Corp
                          start_date: '2026-07-01'
                  record:
                    crustdata_person_id: 6324687
                    basic_profile:
                      name: Sherry Robinson
                      current_title: Head of Data
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

- [Company Entity Watcher](https://docs.crustdata.com/watcher-docs/company/entity.md)
- [Person Entity Watcher](https://docs.crustdata.com/watcher-docs/person/entity.md)
- [Payload delivery: inline or link](https://docs.crustdata.com/watcher-docs/payload-delivery.md)
- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
- [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md)
