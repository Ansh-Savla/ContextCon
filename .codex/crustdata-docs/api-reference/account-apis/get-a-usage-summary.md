> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Usage summary

> Adds up your team's API usage over a time window: requests, credits,
errors and results. Pass `group_by` to split the totals by day,
product, endpoint, charge component, API key, client surface, client
platform or status class. Leave it out to get one total row.

Every row is scoped to your team. No parameter reads another team's
usage.

With the default `bucket=1d` and a window made of whole UTC days, the
summary is read from daily totals. Those know the day, product,
endpoint, API key, client surface and status class, so some shapes
are rejected with a `400` that tells you to retry with `bucket=1h`:

- `group_by=component` combines only with `day` and `product`, and
  filters only by `products`.
- The `status` and `error_type` filters need `bucket=1h`.

A window that starts or ends mid-day, `bucket=1h`, or any grouping that
includes `client_platform` accepts every combination.

This endpoint is free: the response carries no `X-Credits-Used`
header. It shares a limit of 60 requests per minute with the other
`/account/usage/*` endpoints.




## OpenAPI

````yaml /openapi-specs/2025-11-01/account.yaml get /account/usage/summary
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
  /account/usage/summary:
    get:
      tags:
        - Account APIs
      summary: Get a usage summary
      description: |
        Adds up your team's API usage over a time window: requests, credits,
        errors and results. Pass `group_by` to split the totals by day,
        product, endpoint, charge component, API key, client surface, client
        platform or status class. Leave it out to get one total row.

        Every row is scoped to your team. No parameter reads another team's
        usage.

        With the default `bucket=1d` and a window made of whole UTC days, the
        summary is read from daily totals. Those know the day, product,
        endpoint, API key, client surface and status class, so some shapes
        are rejected with a `400` that tells you to retry with `bucket=1h`:

        - `group_by=component` combines only with `day` and `product`, and
          filters only by `products`.
        - The `status` and `error_type` filters need `bucket=1h`.

        A window that starts or ends mid-day, `bucket=1h`, or any grouping that
        includes `client_platform` accepts every combination.

        This endpoint is free: the response carries no `X-Credits-Used`
        header. It shares a limit of 60 requests per minute with the other
        `/account/usage/*` endpoints.
      operationId: getAccountUsageSummary
      parameters:
        - $ref: '#/components/parameters/ApiVersionHeader'
        - name: group_by
          in: query
          required: false
          description: |
            Dimensions to split the totals by. Repeat the parameter or send a
            comma-separated list, for example `group_by=day,component`. A
            dimension can appear once. Omit it for a single total row.

            Grouping by `day` returns the time column as `bucket_start`.
            Grouping by `component` returns `component` and `label`, and
            swaps `errors` and `results` for `quantity`.

            `client_platform` is the tool or runtime that made the call, such
            as `claude-code`, `python` or `curl`. New values can appear at any
            time, so do not hard-code the list. It works with any `bucket`.
          style: form
          explode: false
          schema:
            type: array
            items:
              type: string
              enum:
                - day
                - product
                - endpoint
                - component
                - api_key_id
                - client_surface
                - client_platform
                - status_class
          example:
            - day
            - component
        - name: bucket
          in: query
          required: false
          description: >-
            Size of each time bucket when you group by `day`. `1d` returns a
            date in `bucket_start`, `1h` an ISO 8601 timestamp.
          schema:
            type: string
            enum:
              - 1d
              - 1h
            default: 1d
        - $ref: '#/components/parameters/UsageStart'
        - $ref: '#/components/parameters/UsageEnd'
        - $ref: '#/components/parameters/UsageApiKeyIds'
        - $ref: '#/components/parameters/UsageEndpoints'
        - $ref: '#/components/parameters/UsageProducts'
        - $ref: '#/components/parameters/UsageStatus'
        - $ref: '#/components/parameters/UsageStatusClass'
        - $ref: '#/components/parameters/UsageClientSurface'
        - $ref: '#/components/parameters/UsageErrorType'
      responses:
        '200':
          description: >-
            One row per combination of the grouped dimensions. Rows are sorted
            by `bucket_start` when you group by `day`, then by `credits`,
            highest first.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsageSummaryResponse'
              examples:
                total:
                  summary: One total row
                  description: '`GET /account/usage/summary?start=2026-09-21&end=2026-09-24`'
                  value:
                    buckets:
                      - requests: 423
                        credits: 1590.79
                        errors: 37
                        results: 9599
                by_day:
                  summary: One row per day
                  description: >-
                    `GET
                    /account/usage/summary?group_by=day&start=2026-09-21&end=2026-09-24`
                  value:
                    buckets:
                      - bucket_start: '2026-09-21'
                        requests: 60
                        credits: 27.8
                        errors: 5
                        results: 128
                      - bucket_start: '2026-09-22'
                        requests: 136
                        credits: 683.52
                        errors: 7
                        results: 9014
                      - bucket_start: '2026-09-23'
                        requests: 227
                        credits: 879.47
                        errors: 25
                        results: 457
                by_component:
                  summary: What the credits were spent on
                  description: >-
                    `GET
                    /account/usage/summary?group_by=component&start=2026-09-21&end=2026-09-24`,
                    trimmed to the first four rows.
                  value:
                    buckets:
                      - component: person.search_field.experience
                        label: 'Premium field: Experience'
                        requests: 24
                        quantity: 8451
                        credits: 670
                      - component: person.search_filter.experience
                        label: 'Premium filter: Experience'
                        requests: 45
                        quantity: 8487
                        credits: 365
                      - component: person.search_result
                        label: Person search results
                        requests: 46
                        quantity: 8512
                        credits: 255.36
                      - component: company.profile
                        label: Company enrich (base)
                        requests: 33
                        quantity: 46
                        credits: 92
                by_hour_and_product:
                  summary: Hourly buckets per product
                  description: >-
                    `GET
                    /account/usage/summary?group_by=day,product&bucket=1h&start=2026-09-23T14:00:00Z&end=2026-09-23T16:00:00Z`,
                    trimmed to three rows.
                  value:
                    buckets:
                      - bucket_start: '2026-09-23T14:00:00+00:00'
                        product: person_search
                        requests: 15
                        credits: 531.14
                        errors: 4
                        results: 38
                      - bucket_start: '2026-09-23T14:00:00+00:00'
                        product: person_enrich
                        requests: 11
                        credits: 13
                        errors: 4
                        results: 13
                      - bucket_start: '2026-09-23T15:00:00+00:00'
                        product: person_search
                        requests: 3
                        credits: 5.78
                        errors: 1
                        results: 26
                by_platform_and_surface:
                  summary: Which tools made the calls
                  description: >-
                    `GET
                    /account/usage/summary?group_by=client_platform,client_surface&start=2026-09-21&end=2026-09-24`,
                    trimmed to the first four rows. The row with an empty
                    `client_platform` is a Data Export run.
                  value:
                    buckets:
                      - client_platform: claude-code
                        client_surface: mcp
                        requests: 260
                        credits: 703.42
                        errors: 15
                        results: 927
                      - client_platform: http_tool
                        client_surface: api
                        requests: 26
                        credits: 480.74
                        errors: 4
                        results: 61
                      - client_platform: ''
                        client_surface: export
                        requests: 1
                        credits: 248.76
                        errors: 0
                        results: 8292
                      - client_platform: python
                        client_surface: api
                        requests: 47
                        credits: 90
                        errors: 0
                        results: 45
        '400':
          description: A parameter is invalid, or the shape needs `bucket=1h`.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StructuredErrorResponse'
              examples:
                needs_hourly_group_by:
                  summary: A grouping the daily totals cannot answer
                  description: '`group_by=component,endpoint` over whole days'
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        group_by 'endpoint' is not available with these
                        parameters; retry with bucket=1h
                      metadata: []
                needs_hourly_filter:
                  summary: A filter the daily totals cannot answer
                  description: '`status=500` over whole days'
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        filter 'statuses' is not available with these
                        parameters; retry with bucket=1h
                      metadata: []
                unknown_dimension:
                  summary: Unknown group_by value
                  value:
                    error:
                      type: invalid_request
                      message: 'group_by: "foo" is not a valid choice.'
                      metadata: []
                repeated_dimension:
                  summary: The same dimension twice
                  value:
                    error:
                      type: invalid_request
                      message: 'group_by: group_by must not repeat a dimension.'
                      metadata: []
                unknown_bucket:
                  summary: Unsupported bucket size
                  value:
                    error:
                      type: invalid_request
                      message: 'bucket: "5m" is not a valid choice.'
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
    UsageSummaryResponse:
      type: object
      description: Usage totals, one row per combination of the grouped dimensions.
      required:
        - buckets
      properties:
        buckets:
          type: array
          description: The rows. A single row when `group_by` is omitted.
          example:
            - requests: 423
              credits: 1590.79
              errors: 37
              results: 9599
          items:
            $ref: '#/components/schemas/UsageSummaryRow'
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
    UsageSummaryRow:
      type: object
      description: |
        One row of a usage summary. It carries a key for each dimension you
        grouped by, then the totals. Rows grouped by `component` carry
        `label` and `quantity` in place of `errors` and `results`.
      required:
        - requests
        - credits
      properties:
        bucket_start:
          type: string
          description: >-
            Present when grouped by `day`. The instant the bucket opens, a date
            such as `2026-09-21` on `bucket=1d` and a timestamp such as
            `2026-09-23T14:00:00+00:00` on `bucket=1h`.
          example: '2026-09-21'
        product:
          type: string
          description: Present when grouped by `product`.
          example: person_search
        endpoint:
          type: string
          description: Present when grouped by `endpoint`.
          example: /person/search
        component:
          type: string
          description: >-
            Present when grouped by `component`. The stable charge component id,
            the same one an event's `cost_components` carry.
          example: person.business_email
        label:
          type: string
          description: >-
            Present when grouped by `component`. Display name for the component.
            It can be reworded, so key on `component`.
          example: Business email
        api_key_id:
          type: integer
          description: >-
            Present when grouped by `api_key_id`. `0` for usage not tied to an
            API key, such as data exports, watch runs, and requests refused with
            a `429`.
          example: 170
        client_surface:
          type: string
          description: Present when grouped by `client_surface`.
          example: api
        client_platform:
          type: string
          description: >-
            Present when grouped by `client_platform`. The tool or runtime that
            made the call, the same value an event's `client_platform` carries.
            Empty for batch jobs, watches and exports, and usually for requests
            refused with a `429`.
          example: claude-code
        status_class:
          type: string
          description: Present when grouped by `status_class`.
          example: 2xx
        requests:
          type: integer
          description: >-
            Requests in the row. On a `component` row, the requests that carried
            that component.
          example: 136
        credits:
          type: number
          description: >-
            Credits charged. On a `component` row, the credits charged for that
            component alone.
          example: 683.52
        errors:
          type: integer
          description: >-
            Requests that returned a status of `400` or higher. Absent on
            `component` rows.
          example: 7
        results:
          type: integer
          description: Results returned across the requests. Absent on `component` rows.
          example: 9014
        quantity:
          type: number
          description: Units of the component charged. Present only on `component` rows.
          example: 8451
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
- [Usage events](https://docs.crustdata.com/api-reference/account-apis/list-usage-events.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
- [Rate limits](https://docs.crustdata.com/general/rate-limits.md)
- [Usage errors](https://docs.crustdata.com/api-reference/account-apis/list-usage-errors.md)
