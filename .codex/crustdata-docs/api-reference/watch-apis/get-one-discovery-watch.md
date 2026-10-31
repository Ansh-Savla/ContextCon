> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get a discovery watch

> Returns one discovery watch you own, with its definition, status, and all-time usage counters.



## OpenAPI

````yaml /openapi-specs/2025-11-01/watch.yaml get /watch/{dataset}/search/{watch_id}
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
  /watch/{dataset}/search/{watch_id}:
    get:
      tags:
        - Watch APIs
        - Discovery Watches
      summary: Get one discovery watch
      description: >-
        Returns one discovery watch you own, with its definition, status, and
        all-time usage counters.
      operationId: getDiscoveryWatch
      parameters:
        - $ref: '#/components/parameters/DatasetPath'
        - $ref: '#/components/parameters/WatchId'
        - $ref: '#/components/parameters/ApiVersion'
      responses:
        '200':
          description: The watch.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DiscoveryWatch'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/WatchForbidden'
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
    DiscoveryWatch:
      type: object
      description: A discovery watch, as returned by create, get, list, and update.
      properties:
        id:
          type: integer
          description: The watch's id. Use it on every management and run-history path.
          example: 47609
        kind:
          type: string
          enum:
            - discovery
          example: discovery
        dataset:
          type: string
          enum:
            - person
            - company
            - job
          example: job
        api_version:
          type: string
          example: '2025-11-01'
        config_version:
          type: string
          description: Version of the stored config shape.
          example: '2025-11-01'
        status:
          type: string
          enum:
            - active
            - paused
            - suspended
            - expired
            - cancelled
          description: >
            Lifecycle state. `suspended` is set by the system, most often for an
            insufficient

            balance, and blocks status changes until it is resolved.
          example: active
        filters:
          description: >-
            The saved filter, as sent at creation. `null` on a realtime watch,
            which does not take one.
          oneOf:
            - $ref: '#/components/schemas/FilterCondition'
            - $ref: '#/components/schemas/FilterConditionGroup'
        realtime_filters:
          description: >
            The tree the live search is asked for, as sent at creation. `null`
            on an ordinary

            index-tier watch.
          oneOf:
            - $ref: '#/components/schemas/FilterCondition'
            - $ref: '#/components/schemas/FilterConditionGroup'
        narrowing_filters:
          type: object
          nullable: true
          description: >
            The saved narrowing blocks, as sent at creation. `null` on an
            index-tier watch and on

            a realtime watch that narrows on nothing.
          additionalProperties:
            oneOf:
              - $ref: '#/components/schemas/FilterCondition'
              - $ref: '#/components/schemas/FilterConditionGroup'
        'on':
          type: array
          items:
            type: string
          example:
            - added
        sorts:
          type: array
          nullable: true
          items:
            $ref: '#/components/schemas/SortSpec'
        fields:
          type: array
          nullable: true
          items:
            type: string
        config:
          $ref: '#/components/schemas/DiscoveryWatchConfig'
        notifications:
          type: array
          description: The configured channels. A stored channel secret is never returned.
          items:
            $ref: '#/components/schemas/NotificationChannel'
        created_at:
          type: string
          format: date-time
          example: '2026-07-16T03:16:38.351849Z'
        last_run_at:
          type: string
          format: date-time
          nullable: true
          description: When the watch last ran. `null` until the baseline run completes.
          example: '2026-08-04T05:32:47.000000Z'
        notifications_count:
          type: integer
          description: All-time count of records this watch has delivered.
          example: 128
        credits_consumed:
          type: number
          description: All-time credits this watch has spent.
          example: 64
        last_notified_at:
          type: string
          format: date-time
          nullable: true
          description: When this watch last delivered anything.
          example: '2026-08-04T05:32:47.000000Z'
    FilterCondition:
      type: object
      description: >
        One filter leaf. `field` and the operators are exactly those of the
        dataset's own search

        endpoint, so the Person, Company, and Job search references are the full
        catalog.
      required:
        - field
        - type
      properties:
        field:
          type: string
          description: >
            Dot-path of the field to filter on, for example

            `experience.employment_details.current.title` for a person or
            `job_details.title` for a

            job. Field names are unique across datasets, so a leaf naming
            another dataset's field is

            a valid cross-dataset condition rather than a mistake.
          example: experience.employment_details.current.title
        type:
          type: string
          description: >
            The comparison operator. Crustdata writes greater-or-equal as `=>`
            and less-or-equal as

            `=<`, not `>=` / `<=`.


            A cross-dataset leaf may not use a row-level negation operator
            (`!=`, `not_in`, `(!)`,

            `geo_exclude`): it would match subjects with some *other* matching
            row rather than

            subjects with none. List the values you do want instead.
          example: (.)
          enum:
            - '='
            - '!='
            - in
            - not_in
            - '>'
            - <
            - '=>'
            - '=<'
            - (.)
            - (!)
            - '[.]'
            - geo_distance
            - geo_exclude
        value:
          description: >
            The value to compare against. A scalar for `=`, `!=`, `>`, `<`,
            `=>`, `=<`, and the

            substring operators; an array for `in` and `not_in`; an object for
            the geo operators.

            Required for every operator except the null checks.
          example: Machine Learning Engineer
    FilterConditionGroup:
      type: object
      description: >-
        A group that combines conditions with AND or OR. Groups nest, so an
        `and` group can sit inside an `or` group's `conditions`.
      required:
        - op
        - conditions
      properties:
        op:
          type: string
          enum:
            - and
            - or
          description: How to combine `conditions`.
          example: and
        conditions:
          type: array
          minItems: 1
          description: The conditions to combine. Each item is a leaf or another group.
          items:
            oneOf:
              - $ref: '#/components/schemas/FilterCondition'
              - $ref: '#/components/schemas/FilterConditionGroup'
    SortSpec:
      type: object
      description: >-
        One sort key. Only indexed, sortable fields of the dataset may be sorted
        on; anything else returns `400` at create time.
      required:
        - field
        - order
      properties:
        field:
          type: string
          description: Dot-path of the field to sort by.
          example: metadata.date_added
        order:
          type: string
          enum:
            - asc
            - desc
          description: Sort direction.
          example: desc
    DiscoveryWatchConfig:
      type: object
      description: Schedule and per-run caps for a discovery watch.
      required:
        - trigger
      properties:
        trigger:
          $ref: '#/components/schemas/WatchTrigger'
        is_realtime:
          type: boolean
          default: false
          description: >
            Run each search against a live search rather than the Crustdata
            index, so the watch

            finds records as they appear on the web. Requires
            `realtime_filters`, and puts the

            watch on the 1-day SLA.


            Four things change when this is `true`. `filters` is refused, and

            `narrowing_filters` is what narrows the watch instead.
            `trigger.every_hours` must be

            `24` or more, because a live run retrieves from the web and is
            billed per new

            record.

            On `person` and `company`, `realtime_filters` may not match more
            than 10,000

            records, counted on that tree alone: those live searches report a
            total, so a

            broad watch is refused at creation. The `job` and `social_post`
            searches page

            through results instead of counting them, so no total exists to
            check and a broad

            watch is accepted.

            And delivery costs 150 credits per new record on every dataset, the
            1-day SLA rate,

            rather than the 0.5 or 2 a 30-day SLA watch pays.


            Immutable, like `realtime_filters` and `narrowing_filters`: all
            three define the

            watch rather than schedule it, so a `PATCH` carrying any of them is
            refused and you

            create a new watch instead. A create, `GET`, or `PATCH` response
            echoes it back,

            alongside a `refresh_frequency_days` reporting the SLA the watch
            bills at: `1` when

            realtime, `30` otherwise.


            This flag is the only thing that picks how a discovery watch reads.
            Sending

            `config.refresh_frequency_days` on a discovery watch is refused
            whatever its value.
          example: true
        max_results_per_run:
          type: integer
          minimum: 1
          maximum: 10000
          default: 25
          description: >
            Most records to deliver in one run. The first, baseline run is
            always capped at 5

            regardless of this value.


            A value above 1000 requires `config.payload_delivery_type` of
            `link`. Inline delivery

            posts its chunks one after another, so it stops at 1000 records per
            run, while a link

            run is always one request. The rule reads both keys together and
            applies on create and

            on PATCH, so a PATCH is checked against the watch as it will be:
            raising the cap on a

            link watch is accepted, raising it alone on an inline watch is not,
            and switching a

            watch that already carries a cap above 1000 back to inline is
            refused.
          example: 25
        preferred_hour:
          type: integer
          minimum: 0
          maximum: 23
          nullable: true
          description: Hour of day, in UTC, to prefer for the run.
          example: 9
        expires_at:
          type: string
          format: date
          nullable: true
          description: Auto-expire date, `YYYY-MM-DD`. The watch stops running after it.
          example: '2027-01-01'
        payload_delivery_type:
          type: string
          enum:
            - inline
            - link
          default: inline
          description: >
            Where the run's records travel. `inline` puts them in the
            notification body under

            `results`, split across several requests when a run is large. `link`
            leaves the body

            carrying no records at all and adds `metadata.payload_delivery`, a
            pre-signed S3 URL

            for one NDJSON file holding every record of the run.


            `link` is required when `config.max_results_per_run` is above 1000,
            because inline

            delivery stops at 1000 records per run.


            Switch to `link` when a run can exceed what your receiver accepts:
            an AWS Lambda proxy

            integration caps a request at 6 MB and an ALB target at 1 MB, and an
            oversize body is

            refused whole. `inline` is never overridden by size, so a large run
            stays inline and

            is split instead.


            Mutable. Changing it leaves the watch's filters, tracked fields, and
            sort order

            untouched, but a `config` PATCH is validated whole, so send the
            current `trigger`

            alongside it. A create, `GET`, or `PATCH` response echoes the stored
            value under

            `config.payload_delivery_type`, but that is the watch's setting
            rather than what a

            given run did: read `metadata.payload_delivery.type` on a
            notification, or

            `payload_delivery.type` on a run summary, to see which mode a run
            actually used, since

            a `link` watch falls back to `inline` when the file cannot be
            written.
          example: link
    NotificationChannel:
      description: >-
        One delivery channel. Every channel on a watch receives every
        notification.
      oneOf:
        - $ref: '#/components/schemas/WebhookChannel'
        - $ref: '#/components/schemas/SlackChannel'
        - $ref: '#/components/schemas/GoogleChatChannel'
        - $ref: '#/components/schemas/EmailChannel'
      discriminator:
        propertyName: type
        mapping:
          webhook: '#/components/schemas/WebhookChannel'
          slack: '#/components/schemas/SlackChannel'
          google_chat: '#/components/schemas/GoogleChatChannel'
          email: '#/components/schemas/EmailChannel'
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
    WatchTrigger:
      type: object
      description: How often the watch runs. Interval is the only trigger type today.
      required:
        - type
        - every_hours
      properties:
        type:
          type: string
          enum:
            - interval
          description: Trigger type.
          example: interval
        every_hours:
          type: integer
          minimum: 1
          description: Hours between runs, for example `1`, `6`, `24`, or `168`.
          example: 24
    WebhookChannel:
      type: object
      description: >-
        An HTTPS endpoint you control. Deliveries are signed, and a URL that
        resolves to a private, loopback, or link-local address is rejected.
      required:
        - type
        - url
      properties:
        type:
          type: string
          enum:
            - webhook
          example: webhook
        url:
          type: string
          format: uri
          description: Public `http(s)` URL to POST each notification to.
          example: https://your-app.com/webhooks/crustdata
        headers:
          type: object
          additionalProperties:
            type: string
          description: >-
            Extra headers to send with each delivery, for routing or
            authentication on your side.
          example:
            X-Watch-Name: ml-engineers-paris
    SlackChannel:
      type: object
      description: >-
        A Slack incoming webhook. The URL must be a genuine
        `https://hooks.slack.com/services/...` webhook; any other URL fails
        delivery.
      required:
        - type
        - webhook_url
      properties:
        type:
          type: string
          enum:
            - slack
          example: slack
        webhook_url:
          type: string
          format: uri
          example: https://hooks.slack.com/services/T000/B000/XXXX
    GoogleChatChannel:
      type: object
      description: A Google Chat incoming webhook.
      required:
        - type
        - url
      properties:
        type:
          type: string
          enum:
            - google_chat
          example: google_chat
        url:
          type: string
          format: uri
          example: https://chat.googleapis.com/v1/spaces/AAAA/messages?key=...
    EmailChannel:
      type: object
      description: One or more email recipients.
      required:
        - type
        - to
      properties:
        type:
          type: string
          enum:
            - email
          example: email
        to:
          type: array
          minItems: 1
          items:
            type: string
            format: email
          description: Recipient addresses.
          example:
            - you@company.com
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

- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
- [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md)
- [Test a discovery watch](https://docs.crustdata.com/api-reference/watch-apis/send-a-test-notification-from-a-discovery-watch.md)
- [Get a watch run summary](https://docs.crustdata.com/api-reference/watch-apis/get-one-run-with-the-records-it-delivered.md)
- [Update a discovery watch](https://docs.crustdata.com/api-reference/watch-apis/pause-resume-or-reconfigure-a-discovery-watch.md)
