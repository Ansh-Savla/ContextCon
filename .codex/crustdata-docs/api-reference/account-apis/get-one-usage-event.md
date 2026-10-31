> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Usage event

> Looks up one request by the `X-Request-Id` header its response
carried. Returns every field of an event in `GET /account/usage/events`
plus what was sent:

- `request`: the body, query parameters and path parameters.
- `headers`: the request headers, with `authorization` and `apikey`
  shown as `<redacted>`.
- `response`: the error body a failed request got back, redacted. It
  is JSON when the body was JSON, and a string when it was not or was
  cut at 32 KB. It is `null` on a success and on a `429`.

A request id that belongs to another team returns `404`, the same as
one that never existed.

This endpoint is free: the response carries no `X-Credits-Used`
header. It shares a limit of 60 requests per minute with the other
`/account/usage/*` endpoints.




## OpenAPI

````yaml /openapi-specs/2025-11-01/account.yaml get /account/usage/events/{request_id}
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
  /account/usage/events/{request_id}:
    get:
      tags:
        - Account APIs
      summary: Get one usage event
      description: |
        Looks up one request by the `X-Request-Id` header its response
        carried. Returns every field of an event in `GET /account/usage/events`
        plus what was sent:

        - `request`: the body, query parameters and path parameters.
        - `headers`: the request headers, with `authorization` and `apikey`
          shown as `<redacted>`.
        - `response`: the error body a failed request got back, redacted. It
          is JSON when the body was JSON, and a string when it was not or was
          cut at 32 KB. It is `null` on a success and on a `429`.

        A request id that belongs to another team returns `404`, the same as
        one that never existed.

        This endpoint is free: the response carries no `X-Credits-Used`
        header. It shares a limit of 60 requests per minute with the other
        `/account/usage/*` endpoints.
      operationId: getAccountUsageEvent
      parameters:
        - $ref: '#/components/parameters/ApiVersionHeader'
        - name: request_id
          in: path
          required: true
          description: >-
            The `X-Request-Id` response header of the request, also returned as
            `event_id` by `GET /account/usage/events`.
          schema:
            type: string
            maxLength: 256
          example: 678a3646-371d-4f81-b5c3-488fdda81e21
      responses:
        '200':
          description: The event, with the stored request.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsageEventDetail'
              examples:
                person_enrich:
                  summary: A person enrich that returned a business email
                  description: >-
                    `GET
                    /account/usage/events/678a3646-371d-4f81-b5c3-488fdda81e21`.
                    `client_ip` replaced with a documentation address.
                  value:
                    event_id: 678a3646-371d-4f81-b5c3-488fdda81e21
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
                    request:
                      body:
                        fields:
                          - basic_profile
                          - contact.business_emails
                        professional_network_profile_urls:
                          - https://www.linkedin.com/in/vinod-keshav-seetharamu/
                      path_params: {}
                      query_params: {}
                    headers:
                      accept: '*/*'
                      apikey: <redacted>
                      authorization: <redacted>
                      content-length: '151'
                      content-type: application/json
                      user-agent: curl/8.7.1
                      x-api-version: '2025-11-01'
                    response: null
        '401':
          $ref: '#/components/responses/UsageUnauthorized'
        '404':
          description: No request with that id belongs to your team.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StructuredErrorResponse'
              example:
                error:
                  type: not_found
                  message: No usage event with that request id.
                  metadata: []
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
  schemas:
    UsageEventDetail:
      description: An event plus the request that was stored for it.
      allOf:
        - $ref: '#/components/schemas/UsageEvent'
        - type: object
          required:
            - request
            - headers
            - response
          properties:
            request:
              type: object
              nullable: true
              description: >-
                What was sent. `null` when the stored copy is no longer
                available.
              properties:
                body:
                  type: object
                  description: The request body.
                query_params:
                  type: object
                  description: The query parameters.
                path_params:
                  type: object
                  description: >-
                    The path parameters, for endpoints whose `endpoint` is a
                    route template.
            headers:
              type: object
              nullable: true
              description: >-
                The request headers, with `authorization` and `apikey` shown as
                `<redacted>`.
              additionalProperties:
                type: string
            response:
              nullable: true
              description: >-
                The error body a failed request got back, redacted. JSON when it
                was JSON, a string when it was not or was cut at 32 KB. `null`
                on a success and on a `429`.
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

- [Usage events](https://docs.crustdata.com/api-reference/account-apis/list-usage-events.md)
- [Usage](https://docs.crustdata.com/general/usage.md)
- [Usage errors](https://docs.crustdata.com/api-reference/account-apis/list-usage-errors.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
- [Rate limits](https://docs.crustdata.com/general/rate-limits.md)
