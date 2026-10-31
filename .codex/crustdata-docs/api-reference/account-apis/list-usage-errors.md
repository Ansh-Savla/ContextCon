> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Usage errors

> Groups your team's failed requests, most frequent first. A group is
one endpoint plus one `error_key`: the error message with your own
values masked, for example `<v> must be at least <n>. Got <n>.`

`kind` says what to do about a group:

- `request`: change the call.
- `account`: credits or field access. Groups with a `402` or `403`.
- `server`: it failed on our side. Retry.
- `no_results`: the request was valid and nothing matched.

Successes and `429` responses never appear here. To see the requests
in a group, pass its `error_key` to `GET /account/usage/events`, or
open `example_event_id` with `GET /account/usage/events/{request_id}`.

At most 1000 groups come back. `truncated` is `true` when the list
was cut, and `total_errors` and `by_kind` count only the groups
returned.

This endpoint is free: the response carries no `X-Credits-Used`
header. It shares a limit of 60 requests per minute with the other
`/account/usage/*` endpoints.




## OpenAPI

````yaml /openapi-specs/2025-11-01/account.yaml get /account/usage/errors
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
  /account/usage/errors:
    get:
      tags:
        - Account APIs
      summary: List usage errors
      description: |
        Groups your team's failed requests, most frequent first. A group is
        one endpoint plus one `error_key`: the error message with your own
        values masked, for example `<v> must be at least <n>. Got <n>.`

        `kind` says what to do about a group:

        - `request`: change the call.
        - `account`: credits or field access. Groups with a `402` or `403`.
        - `server`: it failed on our side. Retry.
        - `no_results`: the request was valid and nothing matched.

        Successes and `429` responses never appear here. To see the requests
        in a group, pass its `error_key` to `GET /account/usage/events`, or
        open `example_event_id` with `GET /account/usage/events/{request_id}`.

        At most 1000 groups come back. `truncated` is `true` when the list
        was cut, and `total_errors` and `by_kind` count only the groups
        returned.

        This endpoint is free: the response carries no `X-Credits-Used`
        header. It shares a limit of 60 requests per minute with the other
        `/account/usage/*` endpoints.
      operationId: getAccountUsageErrors
      parameters:
        - $ref: '#/components/parameters/ApiVersionHeader'
        - $ref: '#/components/parameters/UsageStart'
        - $ref: '#/components/parameters/UsageEnd'
        - $ref: '#/components/parameters/UsageApiKeyIds'
        - $ref: '#/components/parameters/UsageEndpoints'
      responses:
        '200':
          description: Error groups for the window.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsageErrorsResponse'
              examples:
                three_days:
                  summary: Three days of errors
                  description: >-
                    `GET /account/usage/errors?start=2026-09-21&end=2026-09-24`,
                    trimmed to three groups.
                  value:
                    total_errors: 20
                    by_kind:
                      request: 19
                      account: 0
                      server: 0
                      no_results: 1
                    groups:
                      - endpoint: /person/search
                        error_key: <v> must be at least <n>. Got <n>.
                        kind: request
                        http_status: 400
                        error_type: invalid_request
                        count: 4
                        last_seen: '2026-09-23T23:42:53.250000+00:00'
                        example_event_id: 279ad996-cd3e-4856-b230-a95d77a0b715
                      - endpoint: /job/search
                        error_key: 'Unsupported columns in conditions: [<values>]'
                        kind: request
                        http_status: 400
                        error_type: invalid_request
                        count: 2
                        last_seen: '2026-09-23T23:50:58.158000+00:00'
                        example_event_id: 1f695ab5-920f-485c-8014-342e3b3af61a
                      - endpoint: /screener/person/search
                        error_key: >-
                          No profiles match your search criteria. Please try
                          different search parameters.
                        kind: no_results
                        http_status: 400
                        error_type: invalid_request
                        count: 1
                        last_seen: '2026-09-23T14:52:45.789000+00:00'
                        example_event_id: 8f9aff61-35dd-432e-917a-c607ff820c71
                    truncated: false
        '400':
          description: The window is invalid.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StructuredErrorResponse'
              example:
                error:
                  type: invalid_request
                  message: 'start: start cannot be more than 12 months ago.'
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
  schemas:
    UsageErrorsResponse:
      type: object
      description: Your team's failed requests, grouped.
      required:
        - total_errors
        - by_kind
        - groups
        - truncated
      properties:
        total_errors:
          type: integer
          description: Failed requests across the groups returned.
          example: 20
        by_kind:
          type: object
          description: >-
            Failed requests per `kind` across the groups returned. Every kind is
            present, at `0` when it has none.
          required:
            - request
            - account
            - server
            - no_results
          example:
            request: 19
            account: 0
            server: 0
            no_results: 1
          properties:
            request:
              type: integer
            account:
              type: integer
            server:
              type: integer
            no_results:
              type: integer
        groups:
          type: array
          description: Error groups, most frequent first. At most 1000.
          example: []
          items:
            $ref: '#/components/schemas/UsageErrorGroup'
        truncated:
          type: boolean
          description: '`true` when more than 1000 groups matched and the list was cut.'
          example: false
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
    UsageErrorGroup:
      type: object
      description: Failed requests to one endpoint that got back the same error.
      required:
        - endpoint
        - error_key
        - kind
        - http_status
        - error_type
        - count
        - last_seen
        - example_event_id
      properties:
        endpoint:
          type: string
          example: /person/search
        error_key:
          type: string
          description: >-
            The error message with your values masked as `<v>`, `<n>`,
            `<values>` or `<list>`. Pass it to `GET /account/usage/events` as
            `error_key` to list the requests.
          example: <v> must be at least <n>. Got <n>.
        kind:
          type: string
          enum:
            - request
            - account
            - server
            - no_results
          description: >-
            `request`: change the call. `account`: credits or field access.
            `server`: failed on our side, retry. `no_results`: the request was
            valid and nothing matched.
          example: request
        http_status:
          type: integer
          description: The status the group's requests got back most often.
          example: 400
        error_type:
          type: string
          description: The `error.type` the group's requests got back most often.
          example: invalid_request
        count:
          type: integer
          description: Failed requests in the group.
          example: 4
        last_seen:
          type: string
          description: >-
            When the latest request in the group was made, ISO 8601 in UTC with
            a `+00:00` offset.
          example: '2026-09-23T23:42:53.250000+00:00'
        example_event_id:
          type: string
          description: >-
            One request in the group. Open it with `GET
            /account/usage/events/{request_id}`.
          example: 279ad996-cd3e-4856-b230-a95d77a0b715
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

- [Usage](https://docs.crustdata.com/general/usage.md)
- [Usage event](https://docs.crustdata.com/api-reference/account-apis/get-one-usage-event.md)
- [Usage events](https://docs.crustdata.com/api-reference/account-apis/list-usage-events.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
- [Rate limits](https://docs.crustdata.com/general/rate-limits.md)
