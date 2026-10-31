> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Update an entity watch

> Updates an entity watch in place. `status`, `entities`, `config`, and `notifications` are
mutable, so the watched list is yours to edit without recreating the watch. `track` and
`fields` are fixed at creation and sending either returns `400`. A `config` PATCH is validated
as a whole block, so repeat the watch's current `trigger` alongside whatever you are changing
or the request comes back `400`. The keys you do send are merged into the stored config rather
than replacing it, so an omitted key such as `refresh_frequency_days` keeps its current value.

People or companies added by a `PATCH` are baselined silently on the next run: they establish
their own starting snapshot first, so adding a subject never fires a spurious notification.

A cancelled watch cannot be modified or reactivated.




## OpenAPI

````yaml /openapi-specs/2025-11-01/watch.yaml patch /watch/{dataset}/{watch_id}
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
  /watch/{dataset}/{watch_id}:
    patch:
      tags:
        - Watch APIs
        - Entity Watches
      summary: Edit the watched list, pause, or reconfigure an entity watch
      description: >
        Updates an entity watch in place. `status`, `entities`, `config`, and
        `notifications` are

        mutable, so the watched list is yours to edit without recreating the
        watch. `track` and

        `fields` are fixed at creation and sending either returns `400`. A
        `config` PATCH is validated

        as a whole block, so repeat the watch's current `trigger` alongside
        whatever you are changing

        or the request comes back `400`. The keys you do send are merged into
        the stored config rather

        than replacing it, so an omitted key such as `refresh_frequency_days`
        keeps its current value.


        People or companies added by a `PATCH` are baselined silently on the
        next run: they establish

        their own starting snapshot first, so adding a subject never fires a
        spurious notification.


        A cancelled watch cannot be modified or reactivated.
      operationId: updateEntityWatch
      parameters:
        - $ref: '#/components/parameters/EntityDatasetPath'
        - $ref: '#/components/parameters/WatchId'
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EntityWatchUpdateRequest'
            examples:
              add_subjects:
                summary: Replace the watched list with a longer one
                value:
                  entities:
                    professional_network_profile_urls:
                      - https://www.linkedin.com/in/sherryrobinson
                      - https://www.linkedin.com/in/williamhgates
              pause:
                summary: Pause the watch
                value:
                  status: paused
              fresher_data:
                summary: Move to a fresher, more expensive tier
                value:
                  config:
                    trigger:
                      type: interval
                      every_hours: 24
                    refresh_frequency_days: 3
              switch_to_link_delivery:
                summary: Stop sending records in the body and link to them instead
                value:
                  config:
                    trigger:
                      type: interval
                      every_hours: 24
                    payload_delivery_type: link
      responses:
        '200':
          description: The updated watch.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EntityWatch'
        '400':
          description: >-
            An immutable field was sent, the body failed validation, or the
            watch is cancelled.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WatcherErrorResponse'
              examples:
                immutable_track:
                  summary: Tried to change what the watch fires on
                  value:
                    error:
                      type: invalid_request
                      message: '''track'' cannot be changed after creation.'
                      metadata:
                        - field: track
                          type: extra_forbidden
                          message: '''track'' cannot be changed after creation.'
                cancelled:
                  summary: The watch was already cancelled
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        This watch is cancelled and can no longer be modified.
                        Create a new watch instead.
                      metadata: []
                bad_payload_delivery_type:
                  summary: An unknown config.payload_delivery_type
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        config.payload_delivery_type must be one of ['inline',
                        'link'].
                      metadata:
                        - field: config.payload_delivery_type
                          type: enum
                          message: >-
                            config.payload_delivery_type must be one of
                            ['inline', 'link'].
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
    EntityDatasetPath:
      name: dataset
      in: path
      required: true
      description: >
        The dataset the watch is built on. Entity watches support `person` and
        `company`; there is no

        job entity watch, and `job` returns `404` here. Use `/watch/job/search`
        for jobs.
      schema:
        type: string
        enum:
          - person
          - company
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
    EntityWatchUpdateRequest:
      type: object
      description: >
        Body for updating an entity watch. Only these four keys are accepted.
        Sending `track`, `fields`,

        `dataset`, `kind`, `api_version`, `filters`, `sorts`, or `on` returns
        `400`.
      properties:
        status:
          type: string
          enum:
            - active
            - paused
            - cancelled
          example: paused
        entities:
          $ref: '#/components/schemas/EntitySubjects'
        config:
          $ref: '#/components/schemas/EntityWatchConfig'
        notifications:
          type: array
          items:
            $ref: '#/components/schemas/NotificationChannel'
    EntityWatch:
      type: object
      description: An entity watch, as returned by create, get, list, and update.
      properties:
        id:
          type: integer
          example: 46936
        kind:
          type: string
          enum:
            - entity
          example: entity
        dataset:
          type: string
          enum:
            - person
            - company
          example: person
        api_version:
          type: string
          example: '2025-11-01'
        config_version:
          type: string
          example: '2025-11-01'
        status:
          type: string
          enum:
            - active
            - paused
            - suspended
            - expired
            - cancelled
          example: active
        entities:
          $ref: '#/components/schemas/EntitySubjects'
        track:
          description: The saved track tree.
          oneOf:
            - $ref: '#/components/schemas/TrackCondition'
            - $ref: '#/components/schemas/TrackConditionGroup'
        fields:
          type: array
          nullable: true
          items:
            type: string
        config:
          $ref: '#/components/schemas/EntityWatchConfig'
        notifications:
          type: array
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
          example: '2026-07-16T13:39:18.598964Z'
        notifications_count:
          type: integer
          example: 12
        credits_consumed:
          type: number
          example: 60
        last_notified_at:
          type: string
          format: date-time
          nullable: true
          example: '2026-07-16T13:39:18.598964Z'
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
    EntitySubjects:
      type: object
      description: >
        The records to watch, as a map of identifier type to values. The
        accepted keys are exactly the

        ones the dataset's enrich endpoint accepts, and they are resolved to
        canonical ids when the

        watch runs. One watch holds up to 10,000 subjects across all keys.


        People accept `professional_network_profile_urls` and `business_emails`.
        Companies accept

        `domains`, `names`, `professional_network_profile_urls`, and
        `crustdata_company_ids`. Company

        ids must be positive integers; every other identifier is a non-empty
        string.
      minProperties: 1
      properties:
        professional_network_profile_urls:
          type: array
          minItems: 1
          items:
            type: string
          description: Profile URLs. Valid for both `person` and `company`.
          example:
            - https://www.linkedin.com/in/sherryrobinson
        business_emails:
          type: array
          minItems: 1
          items:
            type: string
          description: Work email addresses. `person` only.
          example:
            - jane@example.com
        domains:
          type: array
          minItems: 1
          items:
            type: string
          description: Company domains. `company` only.
          example:
            - netflix.com
            - stripe.com
        names:
          type: array
          minItems: 1
          items:
            type: string
          description: Company names. `company` only.
          example:
            - Netflix
        crustdata_company_ids:
          type: array
          minItems: 1
          items:
            type: integer
          description: Crustdata company ids, the exact identifier. `company` only.
          example:
            - 631394
      additionalProperties: false
    EntityWatchConfig:
      type: object
      description: Schedule, per-run caps, and data freshness for an entity watch.
      required:
        - trigger
      properties:
        trigger:
          $ref: '#/components/schemas/WatchTrigger'
        max_results_per_run:
          type: integer
          minimum: 1
          maximum: 10000
          default: 25
          description: >
            Most notifications to deliver in one run.


            A value above 1000 requires `config.payload_delivery_type` of
            `link`, on create and on

            PATCH. Inline delivery stops at 1000 records per run.
          example: 100
        refresh_frequency_days:
          type: integer
          minimum: 1
          maximum: 30
          default: 30
          nullable: true
          description: >
            How fresh the tracked data is kept, in days. This is independent of

            `trigger.every_hours`: `every_hours` is how often the watch checks
            and notifies, while

            this is how up to date the data it checks against is, which is what
            decides how quickly

            a real change is detected.


            Fresher data costs more per notification: 5 credits at 30 days (the
            default), 10 at 14,

            20 at 7, 50 at 3, 150 at 1. A value between two tiers is billed at
            the fresher tier.

            Only fields backed by a refresh asset can be kept fresh this way, so
            a tracked field

            with no backing asset makes the create fail. Company watches have a
            higher minimum than

            person watches.
          example: 7
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
          description: Auto-expire date, `YYYY-MM-DD`.
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
    TrackCondition:
      type: object
      description: >
        One `track` leaf: the change on one field that fires a notification. The
        operator must match the

        field's shape, so `changed` needs a scalar path and `added` needs an
        array path. Mixing them

        returns `400`. An `added` leaf may carry `keys` to say which fields
        identify an element of the

        array.
      required:
        - field
        - type
      properties:
        field:
          type: string
          description: >
            Dot-path into the record, addressing the same structure the
            dataset's enrich endpoint

            returns: the fields of `POST /person/enrich` or `POST
            /company/enrich` are the fields a

            watch can track, and there is no separate list. An array path takes
            `added`; a field

            inside an array's items, or any single value, takes `changed`,
            `increased`/`decreased`

            or a comparison. A field that identifies an array item cannot take
            `changed`, since a

            new value there is a new item, and arrays can be tracked at most two
            levels deep.
          example: experience.employment_details.current
        type:
          type: string
          enum:
            - changed
            - added
            - increased
            - decreased
            - '='
            - '!='
            - '>'
            - <
            - '=>'
            - '=<'
          description: >
            `changed` fires when a scalar becomes different from the last
            snapshot. `added` fires

            when a new element appears in an array. `increased` and `decreased`
            fire when a number

            moves up or down from the last snapshot, for example
            `headcount.total` growing; they take

            no `value` and are refused on a field that is not a number. The
            comparison operators fire

            when the comparison flips from false to true, for example
            `professional_network.connections`

            crossing 500.
          example: added
        keys:
          type: array
          minItems: 1
          items:
            oneOf:
              - type: string
              - type: array
                items:
                  type: string
          description: >
            Which fields identify an element of the array, in place of the
            identity the dataset gives

            it. Valid only with `added`: on any other operator the create
            returns `400` with

            `track: 'keys' is only valid with 'added', not '<type>'`. A string
            entry is one field; a

            nested entry is a composite of several fields. Entries are matched
            as a union, so an

            element is already known when any one entry matches, and the loosest
            entry therefore

            wins: give a fallback entry the same fields as the entry it backs
            up. An entry cannot

            identify an element when any field in that entry is null. The fields
            must belong to the

            array's own elements and your key must be entitled to each one, so
            `keys` on an array of

            plain strings returns `400`. A watch remembers every identity it has
            seen on the array,

            so an element that leaves and returns does not fire again. An empty
            list or a bare

            string returns `400` with

            `track: '<path>': 'keys' must be a non-empty list of fields or field
            groups`.
          example:
            - crustdata_company_id
            - name
        value:
          description: >-
            The threshold to compare against. Required for the comparison
            operators, omitted for `changed`, `added`, `increased` and
            `decreased`.
          example: 500
    TrackConditionGroup:
      type: object
      description: >
        A group of track conditions. An `or` group fires if any child fires. An
        `and` group fires only

        when all conditions hold and at least one just became true. Groups nest.
      required:
        - op
        - conditions
      properties:
        op:
          type: string
          enum:
            - and
            - or
          example: or
        conditions:
          type: array
          minItems: 1
          items:
            oneOf:
              - $ref: '#/components/schemas/TrackCondition'
              - $ref: '#/components/schemas/TrackConditionGroup'
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

- [Update a discovery watch](https://docs.crustdata.com/api-reference/watch-apis/pause-resume-or-reconfigure-a-discovery-watch.md)
- [Delete an entity watch](https://docs.crustdata.com/api-reference/watch-apis/delete-an-entity-watch.md)
- [List entity watches](https://docs.crustdata.com/api-reference/watch-apis/list-your-entity-watches.md)
- [Get an entity watch](https://docs.crustdata.com/api-reference/watch-apis/get-one-entity-watch.md)
- [Test an entity watch](https://docs.crustdata.com/api-reference/watch-apis/send-a-test-notification-from-an-entity-watch.md)
