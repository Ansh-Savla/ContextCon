> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Test a discovery watch

> Delivers a sample notification so you can verify a receiver end to end before waiting for a real
run.

The sample is built from **real current matches** of the watch's own filter, ignoring the
watermark and the already-seen set, and shaped through the same processor a real run uses, so
the payload is identical to production apart from `metadata.test: true`. Nothing is recorded:
no run, no seen-set advance, no credit, no persistence.

Every body field is optional. Send `deliver: false` to get the envelope back without any
outbound request. If the watch's filter currently matches nothing there is nothing to sample,
and the call returns `400` with the envelope still attached.




## OpenAPI

````yaml /openapi-specs/2025-11-01/watch.yaml post /watch/{dataset}/search/{watch_id}/test
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
  /watch/{dataset}/search/{watch_id}/test:
    post:
      tags:
        - Watch APIs
        - Discovery Watches
      summary: Send a test notification from a discovery watch
      description: >
        Delivers a sample notification so you can verify a receiver end to end
        before waiting for a real

        run.


        The sample is built from **real current matches** of the watch's own
        filter, ignoring the

        watermark and the already-seen set, and shaped through the same
        processor a real run uses, so

        the payload is identical to production apart from `metadata.test: true`.
        Nothing is recorded:

        no run, no seen-set advance, no credit, no persistence.


        Every body field is optional. Send `deliver: false` to get the envelope
        back without any

        outbound request. If the watch's filter currently matches nothing there
        is nothing to sample,

        and the call returns `400` with the envelope still attached.
      operationId: testDiscoveryWatch
      parameters:
        - $ref: '#/components/parameters/DatasetPath'
        - $ref: '#/components/parameters/WatchId'
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: false
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DiscoveryTestRequest'
            examples:
              configured_channels:
                summary: Deliver one sample to the watch's own channels
                value: {}
              override_endpoint:
                summary: Deliver to a request-inspection URL instead
                value:
                  notification_endpoint: https://your-server.example.com/webhook
                  count: 3
              envelope_only:
                summary: Return the envelope without sending anything
                value:
                  deliver: false
      responses:
        '200':
          description: >-
            A delivery was attempted. Read `delivered[].http_status` for each
            channel's outcome.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TestSendResponse'
        '400':
          description: >
            A body field failed validation, the endpoint override is not a safe
            public URL, the

            watch has no channel configured, or the filter currently matches
            nothing.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WatcherErrorResponse'
              examples:
                no_matches:
                  summary: The filter matches nothing right now
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        This watch's filter currently matches 0 records -
                        nothing to sample. Broaden the filter or try again
                        later.
                      metadata:
                        - delivered: []
                no_channel:
                  summary: No channel configured and no override given
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        No delivery channel configured. Pass a
                        'notification_endpoint' to test.
                      metadata:
                        - delivered: []
                bad_count:
                  summary: count out of range
                  value:
                    error:
                      type: invalid_request
                      message: count must be an integer in [1, 25].
                      metadata: []
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/WatchForbidden'
        '404':
          $ref: '#/components/responses/WatchNotFound'
        '429':
          $ref: '#/components/responses/RateLimited'
        '500':
          description: The test notification could not be sent.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WatcherErrorResponse'
              example:
                error:
                  type: internal_error
                  message: Failed to send test notification.
                  metadata: []
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
    DiscoveryTestRequest:
      type: object
      description: >-
        Options for a discovery watch's test send. Every field is optional, so
        an empty object is a valid body.
      properties:
        notification_endpoint:
          type: string
          format: uri
          description: >
            Deliver this one test to a URL you control instead of the watch's
            configured channels,

            which pairs well with a request-inspection service. Must be a public
            `http(s)` URL:

            endpoints resolving to private, loopback, or link-local addresses
            are rejected.
          example: https://your-server.example.com/webhook
        count:
          type: integer
          minimum: 1
          maximum: 25
          default: 1
          description: >-
            How many real current matches to include in the one envelope, so you
            can exercise multi-record handling.
          example: 3
        deliver:
          type: boolean
          default: true
          description: >-
            Set `false` to build and return the envelope without sending
            anything.
          example: true
    TestSendResponse:
      type: object
      description: >-
        The result of a test send, carrying what each channel answered and the
        exact envelope that was delivered.
      properties:
        delivered:
          type: array
          description: >-
            One entry per channel the test was sent to. Empty when `deliver` was
            `false`.
          items:
            $ref: '#/components/schemas/DeliveryAttempt'
        envelope:
          $ref: '#/components/schemas/NotificationEnvelope'
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
    DeliveryAttempt:
      type: object
      description: The outcome of one channel's delivery attempt.
      properties:
        type:
          type: string
          description: The channel type the attempt used.
          example: webhook
        endpoint:
          type: string
          description: Where it was delivered.
          example: https://your-server.example.com/webhook
        http_status:
          type: integer
          nullable: true
          description: >-
            Status your receiver answered with. `null` if the request never
            completed.
          example: 200
        ok:
          type: boolean
          description: True when `http_status` was 2xx.
          example: true
        response:
          type: string
          description: Your receiver's response body, truncated to 500 characters.
          example: '{"received": true}'
    NotificationEnvelope:
      type: object
      description: >
        The body POSTed to each webhook channel, and the same body a test send
        returns under `envelope`.


        The two watch kinds shape `results` differently. A discovery watch keys
        results by membership

        polarity, so records arrive under `results.added`, each one the raw
        dataset record. An entity

        watch delivers a flat list, one object per fired subject, each with its
        own `changes` and

        `record`.


        A watch whose `config.payload_delivery_type` is `link` omits `results`
        entirely and carries the

        records' location in `metadata.payload_delivery` instead. Branch on

        `metadata.payload_delivery.type` rather than on the presence of
        `results`: the field is present

        on every delivery, and a `link` watch falls back to an inline body when
        the file cannot be

        written.
      properties:
        metadata:
          type: object
          properties:
            watch_id:
              type: integer
              example: 46936
            kind:
              type: string
              enum:
                - discovery
                - entity
              example: entity
            dataset:
              type: string
              enum:
                - person
                - company
                - job
              example: person
            api_version:
              type: string
              example: '2025-11-01'
            run_id:
              type: integer
              example: 64200
            notification_id:
              type: string
              description: >-
                Unique id for this delivery, echoed in the
                `x-crustdata-event-id` header. Key your receiver's deduplication
                on it.
              example: ntf_64200
            delivered_at:
              type: string
              format: date-time
              example: '2026-07-16T03:20:00.351849+00:00'
            test:
              type: boolean
              description: >-
                Present and `true` only on a test send. Absent on a real
                delivery.
              example: true
            summary:
              type: object
              description: >
                The run's counts. `records_matched` ships only on an entity
                watch and `records_stale` only

                on a discovery watch, so read `metadata.kind` before you read
                either one. A key that does

                not apply to the watch kind is left out rather than sent as
                `null`.
              properties:
                delivered:
                  type: integer
                  description: Records in this envelope.
                  example: 1
                total_count:
                  type: integer
                  description: >
                    New records the run found, before the cap. On a discovery
                    watch, the new matches.

                    On an entity watch, the entities that changed, and on its
                    first run every subject

                    Crustdata resolved. It exceeds `delivered` when the cap cut
                    the run short.
                  example: 1
                records_searched:
                  type: integer
                  description: >
                    What the run started from. On a discovery watch, everything
                    the query returned

                    before the new-record check and the cap. On an entity watch,
                    the identifiers you

                    listed in `entities`.
                  example: 2
                max_results_per_run:
                  type: integer
                  example: 100
                truncated:
                  type: boolean
                  description: True when `total_count` exceeded `delivered`.
                  example: false
                records_matched:
                  type: integer
                  description: >
                    Entity watches only. Identifiers that resolved to a record
                    Crustdata holds. A gap

                    between this and `records_searched` is the part of your list
                    that matches nothing,

                    which a run would otherwise pass over in silence. Left out
                    on a discovery watch.
                  example: 1
                records_stale:
                  type: integer
                  description: >
                    Discovery watches only. Matches an earlier run already
                    handled, so

                    `records_searched` minus `records_stale` is `total_count`.
                    On a job or post watch

                    it counts the records posted before the last run. Left out
                    on an entity watch.
                  example: 150
            payload_delivery:
              $ref: '#/components/schemas/PayloadDelivery'
            chunk:
              type: object
              description: >
                Present only when an inline run was too large for one request
                and was split.

                Each request then carries its own `notification_id` of
                `ntf_{run_id}_{index}`.

                Absent on a single-request run and on every `link` delivery.
              properties:
                index:
                  type: integer
                  description: Zero-based position of this request in the run's sequence.
                  example: 0
        results:
          description: >
            The payload. An object keyed by polarity for a discovery watch, a
            flat array for an

            entity watch. Absent entirely when `metadata.payload_delivery.type`
            is `link`.
          oneOf:
            - $ref: '#/components/schemas/DiscoveryResults'
            - $ref: '#/components/schemas/EntityResults'
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
    DiscoveryResults:
      type: object
      description: >-
        Discovery payload. Records that newly matched the filter arrive under
        `added`.
      properties:
        added:
          type: array
          description: >
            The newly matching records, each in the dataset's own record shape
            projected to the

            watch's `fields`. A person or company record is the enrich shape; a
            job record carries

            `job_details`, `company`, `location`, and `metadata`.
          items:
            type: object
            additionalProperties: true
          example:
            - job_details:
                title: Backend Engineer, Vehicle Software
                url: https://www.example-jobs.com/postings/4448814407
                category: Engineering
                workplace_type: On-site
                number_of_openings: 1
              company:
                basic_info:
                  name: Tesla
                  primary_domain: tesla.com
              location:
                raw: Palo Alto, California, United States
                country: United States
              metadata:
                date_added: '2026-08-04T05:32:47'
    EntityResults:
      type: array
      description: Entity payload. One object per subject that fired on this run.
      items:
        type: object
        properties:
          changes:
            type: array
            description: >-
              Exactly what moved. Reported whatever `fields` says, so a change
              is always legible even with the default projection.
            items:
              $ref: '#/components/schemas/RecordChange'
          record:
            type: object
            additionalProperties: true
            description: >
              The subject's current data, projected to the watch's `fields`, in
              the same shape the

              dataset's enrich endpoint returns. The subject's identity travels
              inside the record

              as `crustdata_person_id` or `crustdata_company_id`.
    RecordChange:
      type: object
      description: >
        One field-level change. A `changed` scalar reports `from` and `to`. An
        `added` array reports

        `new_elements`. On a comparison operator, `value` carries the threshold
        that was crossed.
      properties:
        field:
          type: string
          example: experience.employment_details.current
        type:
          type: string
          enum:
            - changed
            - added
          example: added
        from:
          nullable: true
          description: Previous value, on a `changed` scalar.
        to:
          nullable: true
          description: New value, on a `changed` scalar.
        value:
          nullable: true
          description: >-
            The threshold target for a comparison operator, `null` for a plain
            `changed`.
        new_elements:
          type: array
          description: The elements that appeared, on an `added` array.
          items:
            type: object
            additionalProperties: true
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
    WatchForbidden:
      description: >
        The key is not entitled to this dataset, or to a field group the request
        names. The watch

        surface itself is open to any authenticated API customer.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/WatcherErrorResponse'
          example:
            error:
              type: permission_error
              message: >-
                You do not have access to the person dataset. Contact
                info@crustdata.com to request access.
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

- [Test an entity watch](https://docs.crustdata.com/api-reference/watch-apis/send-a-test-notification-from-an-entity-watch.md)
- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
- [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md)
- [Get a discovery watch](https://docs.crustdata.com/api-reference/watch-apis/get-one-discovery-watch.md)
- [List discovery watches](https://docs.crustdata.com/api-reference/watch-apis/list-your-discovery-watches.md)
