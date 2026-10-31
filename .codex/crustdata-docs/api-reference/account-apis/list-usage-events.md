> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Usage events

> Returns your team's API requests one by one, newest first, with what
each one was charged. Each event's `cost_components` lines add up to
its `credits_used`, which is the same number the original response
returned in its `X-Credits-Used` header.

Results are paginated with a cursor. While `has_more` is `true`, pass
`next_cursor` back as `cursor` to get the next page, keeping the
other parameters the same.

A request usually shows up here within about 10 seconds of its
response. Every row is scoped to your team.

This endpoint is free: the response carries no `X-Credits-Used`
header. It shares a limit of 60 requests per minute with the other
`/account/usage/*` endpoints.




## OpenAPI

````yaml /openapi-specs/2025-11-01/account.yaml get /account/usage/events
openapi: 3.0.3
info:
  title: Account API
  version: '2025-11-01'
  description: >
    The Account API provides free, API-key-authenticated introspection endpoints
    for your Crustdata account.


    - **Endpoints**: List every Crustdata API endpoint with your account's
    access status, enabled and disabled response fields, and effective rate
    limits.

    - **Credits**: Check your remaining credit balance and recurring credit
    grant details.

    - **Usage**: See what your team spent credits on, request by request or
    summed by day, product, endpoint, or charge component, and which requests
    failed.


    Every endpoint here is a plain `GET` request that consumes **no credits**.
    The Bearer API key identifies the account, so no account or user ID is
    passed in the path. Send the `x-api-version: 2025-11-01` header;
    `/account/endpoints` and `/account/credits` return `400` without it.


    One thing to know before you call `/account/endpoints`: unfiltered it
    returns every endpoint with every field permission, which is around 89 KB of
    JSON on a single line. Pass `?path=/web/enrich/live` first to see the
    response shape in five lines, then widen with `category` or `status`.
servers:
  - url: https://api.crustdata.com
    description: Production API server
security:
  - bearerAuth: []
tags:
  - name: Account APIs
    description: >-
      Account-level introspection: endpoint permissions, rate limits, credit
      balance, and usage
paths:
  /account/usage/events:
    get:
      tags:
        - Account APIs
      summary: List usage events
      description: |
        Returns your team's API requests one by one, newest first, with what
        each one was charged. Each event's `cost_components` lines add up to
        its `credits_used`, which is the same number the original response
        returned in its `X-Credits-Used` header.

        Results are paginated with a cursor. While `has_more` is `true`, pass
        `next_cursor` back as `cursor` to get the next page, keeping the
        other parameters the same.

        A request usually shows up here within about 10 seconds of its
        response. Every row is scoped to your team.

        This endpoint is free: the response carries no `X-Credits-Used`
        header. It shares a limit of 60 requests per minute with the other
        `/account/usage/*` endpoints.
      operationId: listAccountUsageEvents
      parameters:
        - $ref: '#/components/parameters/ApiVersionHeader'
        - name: limit
          in: query
          required: false
          description: Events per page.
          schema:
            type: integer
            minimum: 1
            maximum: 500
            default: 100
        - name: cursor
          in: query
          required: false
          description: >-
            The `next_cursor` from the previous page. Omit it for the first
            page.
          schema:
            type: string
        - $ref: '#/components/parameters/UsageStart'
        - $ref: '#/components/parameters/UsageEnd'
        - $ref: '#/components/parameters/UsageApiKeyIds'
        - $ref: '#/components/parameters/UsageEndpoints'
        - $ref: '#/components/parameters/UsageProducts'
        - $ref: '#/components/parameters/UsageStatus'
        - $ref: '#/components/parameters/UsageStatusClass'
        - $ref: '#/components/parameters/UsageClientSurface'
        - $ref: '#/components/parameters/UsageErrorType'
        - name: error_key
          in: query
          required: false
          description: >-
            Keep only the requests in one error group. Pass a group's
            `error_key` from `GET /account/usage/errors` exactly as returned.
          schema:
            type: string
            maxLength: 300
        - name: hide_free
          in: query
          required: false
          description: >
            Pass `true` to hide successful, 0-credit calls to endpoints that
            never bill: `/batch/...` submits, `/watcher/...`, any endpoint
            ending in `/autocomplete`, `/company/identify`, and
            `/screener/identify`.


            Errors on those endpoints still show. So do searches that matched
            nothing, and a batch job's completion row, even when the job billed
            0 credits. The flag applies even when you filter by `endpoints`.
          schema:
            type: boolean
            default: false
          example: true
      responses:
        '200':
          description: One page of events.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsageEventsResponse'
              examples:
                first_page:
                  summary: Successful person enrich calls
                  description: >-
                    `GET
                    /account/usage/events?limit=2&endpoints=/person/enrich&status_class=2xx&start=2026-09-21&end=2026-09-25`.
                    `client_ip` values replaced with documentation addresses.
                  value:
                    events:
                      - event_id: 678a3646-371d-4f81-b5c3-488fdda81e21
                        ts: '2026-09-24T03:24:40.229000+00:00'
                        team_id: 1318
                        user_id: 1318
                        api_key_id: 170
                        client_surface: api
                        client_platform: curl
                        user_agent: curl/8.7.1
                        client_ip: 203.0.113.10
                        product: person_enrich
                        endpoint: /person/enrich
                        method: POST
                        api_version: '2025-11-01'
                        http_status: 200
                        status_class: 2xx
                        error_type: ''
                        error_key: ''
                        result_count: 1
                        latency_ms: 413.3949890136719
                        credits_used: 2
                        cost_components:
                          - component: person.profile
                            label: Person enrich (base)
                            quantity: 1
                            unit_price: 1
                            credits: 1
                          - component: person.business_email
                            label: Business email
                            quantity: 1
                            unit_price: 1
                            credits: 1
                        linked_ids: {}
                      - event_id: f56c23d3-c872-4066-8063-3a0196f09448
                        ts: '2026-09-23T15:07:51.316000+00:00'
                        team_id: 1318
                        user_id: 1318
                        api_key_id: 170
                        client_surface: mcp
                        client_platform: claude-code
                        user_agent: cd_mcp/2.0 build/master-0569e61 (claude-code)
                        client_ip: 203.0.113.20
                        product: person_enrich
                        endpoint: /person/enrich
                        method: POST
                        api_version: '2025-11-01'
                        http_status: 200
                        status_class: 2xx
                        error_type: ''
                        error_key: ''
                        result_count: 1
                        latency_ms: 190.9239959716797
                        credits_used: 1
                        cost_components:
                          - component: person.profile
                            label: Person enrich (base)
                            quantity: 1
                            unit_price: 1
                            credits: 1
                        linked_ids: {}
                    has_more: true
                    next_cursor: >-
                      MjAyNi0wOS0yM1QxNTowNzo1MS4zMTYwMDArMDA6MDAsZjU2YzIzZDMtYzg3Mi00MDY2LTgwNjMtM2EwMTk2ZjA5NDQ4
        '400':
          description: A parameter is invalid.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StructuredErrorResponse'
              examples:
                invalid_cursor:
                  summary: A cursor that does not decode
                  value:
                    error:
                      type: invalid_request
                      message: invalid cursor
                      metadata: []
                limit_too_high:
                  summary: limit above 500
                  value:
                    error:
                      type: invalid_request
                      message: 'limit: Ensure this value is less than or equal to 500.'
                      metadata: []
                start_after_end:
                  summary: start on or after end
                  value:
                    error:
                      type: invalid_request
                      message: 'start: start must be before end.'
                      metadata: []
                start_too_old:
                  summary: start more than 12 months back
                  value:
                    error:
                      type: invalid_request
                      message: 'start: start cannot be more than 12 months ago.'
                      metadata: []
                unknown_status_class:
                  summary: status_class outside 2xx to 5xx
                  value:
                    error:
                      type: invalid_request
                      message: 'status_class: "6xx" is not a valid choice.'
                      metadata: []
                hide_free_not_boolean:
                  summary: hide_free is not true or false
                  value:
                    error:
                      type: invalid_request
                      message: 'hide_free: Must be a valid boolean.'
                      metadata: []
        '401':
          $ref: '#/components/responses/UsageUnauthorized'
        '429':
          $ref: '#/components/responses/UsageRateLimited'
components:
  parameters:
    ApiVersionHeader:
      name: x-api-version
      in: header
      required: true
      description: >-
        API version to use. This endpoint currently requires `2025-11-01`.
        Requests without the header, or with any other value, return `400`.
      schema:
        type: string
        enum:
          - '2025-11-01'
        default: '2025-11-01'
        example: '2025-11-01'
    UsageStart:
      name: start
      in: query
      required: false
      description: |
        Start of the window, inclusive. An ISO 8601 timestamp such as
        `2026-09-23T14:00:00Z`, or a date such as `2026-09-21`, which reads as
        midnight UTC. Defaults to 7 days before `end`. Cannot be more than 12
        months ago.
      schema:
        type: string
      example: '2026-09-21'
    UsageEnd:
      name: end
      in: query
      required: false
      description: >-
        End of the window, exclusive. Same formats as `start`. Defaults to the
        coming midnight UTC, so the default window is the last 7 whole days
        including today.
      schema:
        type: string
      example: '2026-09-24'
    UsageApiKeyIds:
      name: api_key_ids
      in: query
      required: false
      description: >-
        Keep only requests made with these API key ids (`api_key_id` on an
        event). Repeat the parameter or send a comma-separated list, up to 50.
      style: form
      explode: false
      schema:
        type: array
        maxItems: 50
        items:
          type: integer
          minimum: 1
      example:
        - 170
    UsageEndpoints:
      name: endpoints
      in: query
      required: false
      description: >-
        Keep only these endpoints, as they appear in `endpoint`, for example
        `/person/search`. Repeat the parameter or send a comma-separated list,
        up to 50.
      style: form
      explode: false
      schema:
        type: array
        maxItems: 50
        items:
          type: string
      example:
        - /person/search
    UsageProducts:
      name: products
      in: query
      required: false
      description: >-
        Keep only these products, as they appear in `product`, for example
        `person_search`. Repeat the parameter or send a comma-separated list, up
        to 50.
      style: form
      explode: false
      schema:
        type: array
        maxItems: 50
        items:
          type: string
      example:
        - person_search
    UsageStatus:
      name: status
      in: query
      required: false
      description: >-
        Keep only these HTTP status codes, for example `status=400,404`. Up to
        20. On `GET /account/usage/summary` it needs `bucket=1h`, or a window
        that is not whole days.
      style: form
      explode: false
      schema:
        type: array
        maxItems: 20
        items:
          type: integer
          minimum: 100
          maximum: 599
      example:
        - 400
        - 404
    UsageStatusClass:
      name: status_class
      in: query
      required: false
      description: Keep only one status class.
      schema:
        type: string
        enum:
          - 2xx
          - 3xx
          - 4xx
          - 5xx
      example: 4xx
    UsageClientSurface:
      name: client_surface
      in: query
      required: false
      description: >-
        Keep only requests from these surfaces, as they appear in
        `client_surface`, for example `api` or `mcp`. Repeat the parameter or
        send a comma-separated list, up to 10.
      style: form
      explode: false
      schema:
        type: array
        maxItems: 10
        items:
          type: string
      example:
        - mcp
    UsageErrorType:
      name: error_type
      in: query
      required: false
      description: >-
        Keep only requests that failed with this `error_type`, for example
        `invalid_request`. On `GET /account/usage/summary` it needs `bucket=1h`,
        or a window that is not whole days.
      schema:
        type: string
      example: invalid_request
  schemas:
    UsageEventsResponse:
      type: object
      description: One page of usage events, newest first.
      required:
        - events
        - has_more
        - next_cursor
      properties:
        events:
          type: array
          description: The events on this page, newest first.
          example: []
          items:
            $ref: '#/components/schemas/UsageEvent'
        has_more:
          type: boolean
          description: '`true` when another page exists.'
          example: true
        next_cursor:
          type: string
          nullable: true
          description: Pass as `cursor` to get the next page. `null` on the last page.
          example: >-
            MjAyNi0wOS0yM1QxNTowNzo1MS4zMTYwMDArMDA6MDAsZjU2YzIzZDMtYzg3Mi00MDY2LTgwNjMtM2EwMTk2ZjA5NDQ4
    StructuredErrorResponse:
      type: object
      description: >
        Structured error payload. `/account/endpoints` and `/account/credits`
        use it

        for a missing or unsupported `x-api-version` header, and the

        `/account/usage/*` endpoints use it for every error. The `status` filter

        error on `/account/endpoints` uses the flatter `SimpleErrorResponse`
        shape

        instead, so parse defensively.
      required:
        - error
      example:
        error:
          type: invalid_request
          message: >-
            Missing required header: x-api-version. Please set x-api-version
            header appropriately.
          metadata: []
      properties:
        error:
          type: object
          description: Error details.
          required:
            - type
            - message
          properties:
            type:
              type: string
              description: Machine-readable error type identifier.
              example: invalid_request
            message:
              type: string
              description: Human-readable description of what went wrong.
              example: >-
                Missing required header: x-api-version. Please set x-api-version
                header appropriately.
            metadata:
              type: array
              description: >-
                Additional structured context for the error. Empty for
                header-validation failures.
              items:
                type: object
                description: Context entry for the error.
              example: []
    UsageEvent:
      type: object
      description: One API request your team made.
      required:
        - event_id
        - ts
        - team_id
        - user_id
        - api_key_id
        - client_surface
        - client_platform
        - user_agent
        - client_ip
        - product
        - endpoint
        - method
        - api_version
        - http_status
        - status_class
        - error_type
        - error_key
        - result_count
        - latency_ms
        - credits_used
        - cost_components
        - linked_ids
      properties:
        event_id:
          type: string
          description: >-
            The request id, the same value as the `X-Request-Id` header on the
            original response.
          example: 678a3646-371d-4f81-b5c3-488fdda81e21
        ts:
          type: string
          description: When the request was made, ISO 8601 in UTC with a `+00:00` offset.
          example: '2026-09-24T03:24:40.229000+00:00'
        team_id:
          type: integer
          description: Your team's id.
          example: 1318
        user_id:
          type: integer
          description: The user on your team who made the request.
          example: 1318
        api_key_id:
          type: integer
          nullable: true
          description: >-
            The API key that made the request. `null` when the request is not
            tied to a key, such as a watch run or a request refused with a
            `429`.
          example: 170
        client_surface:
          type: string
          description: >-
            Where the request came from. Values seen today are `api`, `mcp`,
            `cli`, `dashboard`, `batch`, `watcher`, `export`, and `gateway` for
            a request refused before it reached the API, such as a `429`.
          example: api
        client_platform:
          type: string
          description: >-
            The client detected from the request, for example `python`, `node`,
            `curl` or `claude-code`. It comes from the MCP client tag, the CLI's
            user agent, or a category based on your `User-Agent` header. New
            values can appear at any time. Empty for batch jobs, watches and
            exports, and usually for requests refused with a `429`.
          example: curl
        user_agent:
          type: string
          description: The `User-Agent` header you sent.
          example: curl/8.7.1
        client_ip:
          type: string
          description: The IP address the request came from.
          example: 203.0.113.10
        product:
          type: string
          description: The product the request belongs to, for example `person_enrich`.
          example: person_enrich
        endpoint:
          type: string
          description: >-
            The endpoint, as a route template when it has path parameters, for
            example `/watch/person/:watch_id/runs`. The actual values are in
            `request.path_params` on the single-event endpoint.
          example: /person/enrich
        method:
          type: string
          description: The HTTP method.
          example: POST
        api_version:
          type: string
          description: The `x-api-version` header you sent.
          example: '2025-11-01'
        http_status:
          type: integer
          description: The status code returned.
          example: 200
        status_class:
          type: string
          description: '`2xx`, `3xx`, `4xx` or `5xx`.'
          example: 2xx
        error_type:
          type: string
          description: >-
            The `error.type` returned on a failure, for example
            `invalid_request`. Empty on a success.
          example: ''
        error_key:
          type: string
          description: >-
            The error group the request belongs to in `GET
            /account/usage/errors`. Empty on a success and on a `429`.
          example: ''
        result_count:
          type: integer
          nullable: true
          description: Results the request returned.
          example: 1
        latency_ms:
          type: number
          description: Time the request took on the server, in milliseconds.
          example: 413.39
        credits_used:
          type: number
          description: >-
            Credits charged, the same number the original response returned in
            `X-Credits-Used`.
          example: 2
        cost_components:
          type: array
          description: >-
            The charge lines. Their `credits` add up to `credits_used`, and
            lines charged at 0 credits are kept. Empty when nothing was charged.
          items:
            $ref: '#/components/schemas/UsageCostComponent'
        linked_ids:
          type: object
          description: >-
            Ids of the job that made the request, when there is one, such as
            `batch_job_id`, `watch_id`, `export_id` and `export_run_id`. Empty
            for a direct API call.
          additionalProperties:
            type: string
          example: {}
    UsageCostComponent:
      type: object
      description: One charge line on a request.
      required:
        - component
        - label
        - quantity
        - unit_price
        - credits
      properties:
        component:
          type: string
          description: |
            Stable id of what was charged, for example `person.business_email`
            or `person.search_field.experience`. This id does not change, so
            key reports and alerts on it.
          example: person.business_email
        label:
          type: string
          description: >-
            Display name for the component. It can be reworded at any time, so
            do not key on it.
          example: Business email
        quantity:
          type: number
          description: Units charged.
          example: 1
        unit_price:
          type: number
          nullable: true
          description: Credits per unit.
          example: 1
        credits:
          type: number
          description: Credits charged for this line.
          example: 1
  responses:
    UsageUnauthorized:
      description: The API key is missing or not valid.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/StructuredErrorResponse'
          example:
            error:
              type: unauthorized
              message: Invalid API key in request.
              metadata: []
    UsageRateLimited:
      description: >-
        More than 60 requests in a minute across the `/account/usage/*`
        endpoints. `x-ratelimit-reset` says how many seconds until the window
        resets.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/StructuredErrorResponse'
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

- [Usage event](https://docs.crustdata.com/api-reference/account-apis/get-one-usage-event.md)
- [Usage](https://docs.crustdata.com/general/usage.md)
- [Usage errors](https://docs.crustdata.com/api-reference/account-apis/list-usage-errors.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
- [Rate limits](https://docs.crustdata.com/general/rate-limits.md)
