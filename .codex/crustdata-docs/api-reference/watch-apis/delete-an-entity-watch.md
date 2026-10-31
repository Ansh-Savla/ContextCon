> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Delete an entity watch

> Cancels the watch and deletes its schedule. Returns `204` with no body, and `204` again if the
watch was already cancelled. Deletion is terminal: the watch cannot be resumed.




## OpenAPI

````yaml /openapi-specs/2025-11-01/watch.yaml delete /watch/{dataset}/{watch_id}
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
    delete:
      tags:
        - Watch APIs
        - Entity Watches
      summary: Delete an entity watch
      description: >
        Cancels the watch and deletes its schedule. Returns `204` with no body,
        and `204` again if the

        watch was already cancelled. Deletion is terminal: the watch cannot be
        resumed.
      operationId: cancelEntityWatch
      parameters:
        - $ref: '#/components/parameters/EntityDatasetPath'
        - $ref: '#/components/parameters/WatchId'
        - $ref: '#/components/parameters/ApiVersion'
      responses:
        '204':
          description: The watch is deleted. No body is returned.
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
  schemas:
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
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: API key passed as a Bearer token in the Authorization header.

````

## Related topics

- [Person Entity Watcher](https://docs.crustdata.com/watcher-docs/person/entity.md)
- [Company Entity Watcher](https://docs.crustdata.com/watcher-docs/company/entity.md)
- [List entity watches](https://docs.crustdata.com/api-reference/watch-apis/list-your-entity-watches.md)
- [Get an entity watch](https://docs.crustdata.com/api-reference/watch-apis/get-one-entity-watch.md)
- [Update an entity watch](https://docs.crustdata.com/api-reference/watch-apis/edit-the-watched-list-pause-or-reconfigure-an-entity-watch.md)
