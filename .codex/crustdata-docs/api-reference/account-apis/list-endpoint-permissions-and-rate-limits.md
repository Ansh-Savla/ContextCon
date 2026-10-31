> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Permissions and rate limits

> Returns one entry per Crustdata API endpoint with your account's access
status (`enabled` or `disabled`), the response fields enabled and
disabled for your account, and the effective per-endpoint rate limit in
requests per minute.

**Filter, or the response is hard to read.** Unfiltered, the response
carries one entry for every product endpoint (34 on the `2025-11-01`
version) and each entry lists every response field the account can and
cannot receive, as a dot-path string. That comes to 2,295 field strings,
of which `/company/enrich` alone contributes 531 enabled and 162 disabled.
As compact JSON on a single line the whole payload is around 89 KB, so
pass `path`, `category`, or `status` to get back something you can
inspect. Start with `?path=/web/enrich/live`, whose entry is five fields
long, to see the shape before you request more.

Filters combine with AND. An unknown `path` or `category` returns an
empty `endpoints` array, since both act as filters rather than lookups.
An unrecognized `status` returns `400`.

This endpoint is free and consumes no credits. It is rate limited to
300 requests per minute. It requires the `x-api-version: 2025-11-01`
header, and requests without it return `400`.




## OpenAPI

````yaml /openapi-specs/2025-11-01/account.yaml get /account/endpoints
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
  /account/endpoints:
    get:
      tags:
        - Account APIs
      summary: List endpoint permissions and rate limits
      description: >
        Returns one entry per Crustdata API endpoint with your account's access

        status (`enabled` or `disabled`), the response fields enabled and

        disabled for your account, and the effective per-endpoint rate limit in

        requests per minute.


        **Filter, or the response is hard to read.** Unfiltered, the response

        carries one entry for every product endpoint (34 on the `2025-11-01`

        version) and each entry lists every response field the account can and

        cannot receive, as a dot-path string. That comes to 2,295 field strings,

        of which `/company/enrich` alone contributes 531 enabled and 162
        disabled.

        As compact JSON on a single line the whole payload is around 89 KB, so

        pass `path`, `category`, or `status` to get back something you can

        inspect. Start with `?path=/web/enrich/live`, whose entry is five fields

        long, to see the shape before you request more.


        Filters combine with AND. An unknown `path` or `category` returns an

        empty `endpoints` array, since both act as filters rather than lookups.

        An unrecognized `status` returns `400`.


        This endpoint is free and consumes no credits. It is rate limited to

        300 requests per minute. It requires the `x-api-version: 2025-11-01`

        header, and requests without it return `400`.
      operationId: getAccountEndpoints
      parameters:
        - $ref: '#/components/parameters/ApiVersionHeader'
        - name: path
          in: query
          required: false
          description: |
            Return only the endpoint at this exact path, for example
            `/company/enrich`. The match is exact and case-sensitive: the
            leading slash is required, a trailing slash does not match, and a
            prefix such as `/company` matches nothing. Any path that does not
            match returns an empty `endpoints` array rather than `404`.
          schema:
            type: string
            example: /company/enrich
          examples:
            smallest_response:
              summary: '?path=/web/enrich/live: one entry, 5 field paths'
              description: |
                The smallest useful call and the best place to start. One
                entry with five enabled field paths, so you can read the
                whole response shape before widening the query.
              value: /web/enrich/live
            largest_single_entry:
              summary: '?path=/company/enrich: one entry, 693 field paths'
              description: |
                Also one entry, but the largest one: 531 enabled and 162
                disabled field paths. Narrowing to a single path does not
                guarantee a small response.
              value: /company/enrich
            prefix_matches_nothing:
              summary: '?path=/company: a prefix, so no match'
              description: |
                Matching is exact. A prefix returns `200` with an empty
                `endpoints` array rather than `404`, as does a path with a
                trailing slash or different casing.
              value: /company
        - name: category
          in: query
          required: false
          description: |
            Return only endpoints in this product category. Matching is
            case-insensitive, so `Company`, `company`, and `COMPANY` all
            return the same 8 entries. On the `2025-11-01` version the
            categories are `Company`, `Person`, `Jobs`, `Web`,
            `Social`, and `Other`. An unknown category returns an
            empty `endpoints` array.
          schema:
            type: string
            example: Company
          examples:
            company:
              summary: '?category=Company: 8 entries'
              description: |
                The eight company endpoints, enrichment and search alike.
                Case does not matter, so `company` and `COMPANY` return
                the same eight.
              value: Company
            person:
              summary: '?category=Person: 13 entries'
              description: >-
                The largest category, covering person enrich, search, identify,
                and contact endpoints.
              value: Person
            social:
              summary: '?category=Social: 5 entries'
              description: |
                Social-network content endpoints: posts by person,
                company, or keyword, and their engagement lookups.
              value: Social
        - name: status
          in: query
          required: false
          description: |
            Return only endpoints with this access status. The value is
            case-sensitive and must be lowercase. Any other value, including
            `Enabled`, returns `400`.
          schema:
            type: string
            enum:
              - enabled
              - disabled
            example: enabled
          examples:
            enabled:
              summary: '?status=enabled: everything the account can call'
              description: |
                On the account behind these examples this returns
                11 of the 34 entries. On an account with full access it
                returns all 34, the same as the unfiltered call, so pair
                it with `category` to keep the response readable.
              value: enabled
            disabled:
              summary: '?status=disabled: the access gaps'
              description: |
                The fastest way to see what a plan does not cover. The
                account behind these examples gets 23 entries back. An
                account with every endpoint enabled gets an empty
                `endpoints` array.
              value: disabled
      responses:
        '200':
          description: |
            Endpoint permission overview for the account, narrowed by whichever
            filters you passed.

            Each example below names the query string that produced it. The
            examples whose summary says **truncated** have had entries or field
            lists shortened so the shape stays readable; the rest are complete
            responses exactly as returned. Entry counts and field counts quoted
            in the summaries are the real ones.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AccountEndpointsResponse'
              examples:
                single_endpoint:
                  summary: '?path=/web/enrich/live: one endpoint, complete response'
                  description: |
                    The smallest useful call, and the best way to learn the
                    response shape. One entry, five enabled field paths,
                    nothing truncated. `base_credits` is what this account
                    pays per result; endpoints that price individual fields
                    or request flags carry `premium_filters`,
                    `premium_fields`, or `premium_modes` alongside it.
                  value:
                    api_version: '2025-11-01'
                    token_limit_rpm: null
                    endpoints:
                      - path: /web/enrich/live
                        category: Web
                        status: enabled
                        effective_rate_limit_rpm: 10
                        fields:
                          enabled:
                            - content
                            - success
                            - timestamp
                            - title
                            - url
                          disabled: []
                        base_credits: 1
                single_endpoint_large:
                  summary: '?path=/company/enrich: one endpoint, truncated field lists'
                  description: |
                    Filtering to a single path does not always make the
                    response small. `/company/enrich` returns 531 enabled
                    and 162 disabled field paths in one entry; the lists
                    below are cut to four of each.
                  value:
                    api_version: '2025-11-01'
                    token_limit_rpm: null
                    endpoints:
                      - path: /company/enrich
                        category: Company
                        status: enabled
                        effective_rate_limit_rpm: 15
                        fields:
                          enabled:
                            - basic_info
                            - basic_info.all_domains
                            - basic_info.company_type
                            - basic_info.contact_email
                          disabled:
                            - hiring.recent_openings
                            - social_posts
                            - social_posts.backend_urn
                            - social_posts.comments
                        base_credits: 2
                        premium_fields:
                          - field: technographics
                            credits: 2
                          - field: social_posts
                            credits: 5
                single_endpoint_search:
                  summary: '?path=/person/search: premium filter and field prices'
                  description: |
                    Search endpoints carry both premium sides. Each `field`
                    is a path prefix priced per result: filtering on it is
                    one charge, receiving it is the other. GitHub units are
                    filter-only, so they appear under `premium_filters`
                    alone; the field lists are cut here.
                  value:
                    api_version: '2025-11-01'
                    token_limit_rpm: null
                    endpoints:
                      - path: /person/search
                        category: Person
                        status: enabled
                        effective_rate_limit_rpm: 30
                        fields:
                          enabled:
                            - basic_profile
                            - experience
                          disabled:
                            - skills
                        base_credits: 0.03
                        premium_filters:
                          - field: experience
                            credits: 0.1
                          - field: education
                            credits: 0.1
                          - field: skills
                            credits: 0.1
                          - field: honors
                            credits: 0.2
                          - field: certifications
                            credits: 0.2
                          - field: professional_network.connections
                            credits: 0.2
                          - field: professional_network.followers
                            credits: 0.2
                          - field: professional_network.open_to_cards
                            credits: 0.2
                          - field: professional_network.languages
                            credits: 0.2
                          - field: dev_platform_profiles
                            credits: 0.8
                          - field: dev_platform_profiles.repos
                            credits: 2.5
                        premium_fields:
                          - field: experience
                            credits: 0.1
                          - field: education
                            credits: 0.1
                          - field: skills
                            credits: 0.1
                          - field: honors
                            credits: 0.2
                          - field: certifications
                            credits: 0.2
                          - field: professional_network.connections
                            credits: 0.2
                          - field: professional_network.followers
                            credits: 0.2
                          - field: professional_network.open_to_cards
                            credits: 0.2
                          - field: professional_network.languages
                            credits: 0.2
                          - field: professional_network.summary
                            credits: 0.2
                all_endpoints:
                  summary: 'No filters: every endpoint, truncated'
                  description: |
                    The unfiltered response holds all 34 endpoints on the
                    `2025-11-01` version, spread across the categories
                    `Company` (8), `Person` (13), `Jobs` (4),
                    `Social` (5), `Web` (2), and `Other` (2).
                    Three entries are shown here and the long field lists
                    are cut.
                  value:
                    api_version: '2025-11-01'
                    token_limit_rpm: null
                    endpoints:
                      - path: /batch/company/enrich
                        category: Company
                        status: disabled
                        effective_rate_limit_rpm: null
                        fields:
                          enabled: []
                          disabled:
                            - action
                            - batch_id
                            - entities_requested
                            - entity
                            - identifier_count
                            - status
                            - status_url
                      - path: /company/search/autocomplete
                        category: Company
                        status: enabled
                        effective_rate_limit_rpm: 300
                        fields:
                          enabled:
                            - suggestions
                            - suggestions.document_count
                            - suggestions.value
                          disabled: []
                      - path: /company/search
                        category: Company
                        status: enabled
                        effective_rate_limit_rpm: 30
                        fields:
                          enabled:
                            - basic_info
                            - basic_info.all_domains
                            - basic_info.company_type
                          disabled:
                            - social_profiles.crunchbase
                filtered_by_category:
                  summary: '?category=Company: 8 entries, truncated'
                  description: |
                    Category matching is case-insensitive, so `Company`,
                    `company`, and `COMPANY` all return these same 8
                    entries. Two are shown and field lists are cut.
                  value:
                    api_version: '2025-11-01'
                    token_limit_rpm: null
                    endpoints:
                      - path: /batch/company/search
                        category: Company
                        status: disabled
                        effective_rate_limit_rpm: null
                        fields:
                          enabled: []
                          disabled:
                            - action
                            - batch_id
                            - entities_requested
                            - entity
                            - identifier_count
                            - status
                            - status_url
                      - path: /company/identify
                        category: Company
                        status: enabled
                        effective_rate_limit_rpm: 30
                        fields:
                          enabled:
                            - basic_info
                            - basic_info.all_domains
                            - basic_info.company_type
                            - basic_info.crustdata_company_id
                          disabled: []
                filtered_by_status_enabled:
                  summary: '?status=enabled: everything this account can call, truncated'
                  description: |
                    On the account that produced these examples, 11 of the 34
                    endpoints are enabled, so this filter returns 11
                    entries. One entry is shown.
                  value:
                    api_version: '2025-11-01'
                    token_limit_rpm: null
                    endpoints:
                      - path: /person/search/autocomplete
                        category: Person
                        status: enabled
                        effective_rate_limit_rpm: 300
                        fields:
                          enabled:
                            - suggestions
                            - suggestions.document_count
                            - suggestions.value
                          disabled: []
                combined_filters:
                  summary: >-
                    ?category=Company&status=enabled: filters combine with AND,
                    truncated
                  description: |
                    Passing both narrows to the intersection:
                    the 4 Company endpoints that are also enabled.
                    One entry is shown.
                  value:
                    api_version: '2025-11-01'
                    token_limit_rpm: null
                    endpoints:
                      - path: /company/search
                        category: Company
                        status: enabled
                        effective_rate_limit_rpm: 30
                        fields:
                          enabled:
                            - basic_info
                            - basic_info.company_type
                            - basic_info.description
                          disabled:
                            - social_profiles.crunchbase
                no_matches:
                  summary: 'A filter that matches nothing: empty array, still 200'
                  description: |
                    An unknown `path` (`?path=/does/not/exist`), an unknown
                    `category` (`?category=Nope`), and a status no endpoint
                    currently has (`?status=disabled` on an account with
                    everything enabled) all return this. There is no `404`
                    for a missing endpoint.
                  value:
                    api_version: '2025-11-01'
                    token_limit_rpm: null
                    endpoints: []
        '400':
          description: >-
            Invalid request — missing or unsupported `x-api-version` header, or
            an unrecognized `status` filter value.
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/StructuredErrorResponse'
                  - $ref: '#/components/schemas/SimpleErrorResponse'
              examples:
                missing_api_version_header:
                  summary: No x-api-version header
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Missing required header: x-api-version. Please set
                        x-api-version header appropriately.
                      metadata: []
                unsupported_api_version:
                  summary: Unsupported x-api-version value
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Account endpoints requires API version 2025-11-01.
                        Current version: 2024-01-01. Please set x-api-version
                        header appropriately.
                      metadata: []
                invalid_status_filter:
                  summary: Unrecognized status filter value
                  description: |
                    Returned for any `status` outside `enabled` and
                    `disabled`. The check is case-sensitive, so
                    `?status=Enabled` fails the same way. Note the
                    envelope: this one is a flat `error` string, not the
                    structured object the header errors use.
                  value:
                    error: >-
                      Invalid status 'bogus'; expected one of ['enabled',
                      'disabled']
        '401':
          description: >-
            Unauthorized. The API key is missing from the request or is not
            valid.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthErrorResponse'
              examples:
                invalid_api_key:
                  summary: Bearer token present but not a valid key
                  value:
                    message: Invalid API key in request
                missing_api_key:
                  summary: No Authorization header at all
                  value:
                    message: Missing API key in request
        '500':
          description: Internal server error while assembling the permission overview.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimpleErrorResponse'
              example:
                error: Failed to fetch endpoints
      x-codeSamples:
        - lang: bash
          label: One endpoint (start here)
          source: >
            curl -sS
            'https://api.crustdata.com/account/endpoints?path=/web/enrich/live'
            \
              -H "authorization: Bearer $CRUSTDATA_API_KEY" \
              -H 'x-api-version: 2025-11-01'
            # 1 entry, 5 enabled field paths
        - lang: bash
          label: One product category
          source: >
            curl -sS
            'https://api.crustdata.com/account/endpoints?category=Company' \
              -H "authorization: Bearer $CRUSTDATA_API_KEY" \
              -H 'x-api-version: 2025-11-01'
            # 8 entries
        - lang: bash
          label: Category and status together (AND)
          source: >
            curl -sS
            'https://api.crustdata.com/account/endpoints?category=Person&status=enabled'
            \
              -H "authorization: Bearer $CRUSTDATA_API_KEY" \
              -H 'x-api-version: 2025-11-01'
            # 3 entries here: the intersection, not the union.

            # A fully enabled account gets all 13 Person endpoints.
        - lang: bash
          label: One category
          source: >
            # Case does not matter: social, Social, and SOCIAL all match.

            curl -sS
            'https://api.crustdata.com/account/endpoints?category=Social' \
              -H "authorization: Bearer $CRUSTDATA_API_KEY" \
              -H 'x-api-version: 2025-11-01'
            # 5 entries
        - lang: bash
          label: What this account cannot call
          source: >
            curl -sS
            'https://api.crustdata.com/account/endpoints?status=disabled' \
              -H "authorization: Bearer $CRUSTDATA_API_KEY" \
              -H 'x-api-version: 2025-11-01'
            # 23 entries on the account behind these examples.

            # An account with every endpoint enabled gets an empty endpoints
            array.
        - lang: bash
          label: Everything, unfiltered (large)
          source: |
            # 34 entries and about 89 KB on one line. Pipe it through jq.
            curl -sS 'https://api.crustdata.com/account/endpoints' \
              -H "authorization: Bearer $CRUSTDATA_API_KEY" \
              -H 'x-api-version: 2025-11-01' \
              | jq '.endpoints[] | {path, status, effective_rate_limit_rpm}'
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
    AccountEndpointsResponse:
      type: object
      description: >
        Endpoint permission overview for the account. Holds one entry per
        product

        endpoint unless a `path`, `category`, or `status` filter narrowed it.
      required:
        - api_version
        - token_limit_rpm
        - endpoints
      example:
        api_version: '2025-11-01'
        token_limit_rpm: null
        endpoints:
          - path: /web/enrich/live
            category: Web
            status: enabled
            effective_rate_limit_rpm: 10
            fields:
              enabled:
                - content
                - success
                - timestamp
                - title
                - url
              disabled: []
            base_credits: 1
      properties:
        api_version:
          type: string
          description: >-
            API version the field permissions were resolved against. Echoes the
            `x-api-version` request header.
          example: '2025-11-01'
        token_limit_rpm:
          type: integer
          nullable: true
          description: |
            Account-level rate limit in requests per minute across all
            endpoints. `null` when no account-level limit is configured, which
            is the usual case and what the examples on this endpoint show. The
            per-endpoint limit in `effective_rate_limit_rpm` is what applies to
            a given call.
          example: 200
        endpoints:
          type: array
          description: |
            One entry per Crustdata API endpoint, sorted by `path` and narrowed
            by any `path`, `category`, or `status` filters. Empty when the
            filters match nothing.
          items:
            $ref: '#/components/schemas/EndpointPermission'
          example:
            - path: /company/search/autocomplete
              category: Company
              status: enabled
              effective_rate_limit_rpm: 300
              fields:
                enabled:
                  - suggestions
                  - suggestions.document_count
                  - suggestions.value
                disabled: []
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
    SimpleErrorResponse:
      type: object
      description: >-
        Error payload with a single human-readable message. Used for the
        `status` filter error and for the `404` and `500` responses.
      required:
        - error
      example:
        error: Invalid status 'bogus'; expected one of ['enabled', 'disabled']
      properties:
        error:
          type: string
          description: Human-readable description of what went wrong.
          example: Invalid status 'bogus'; expected one of ['enabled', 'disabled']
    AuthErrorResponse:
      type: object
      description: >
        Authentication error payload. The message distinguishes the two
        failures:

        `Missing API key in request` when no `Authorization` header was sent,
        and

        `Invalid API key in request` when the Bearer token is not a valid key.
      required:
        - message
      example:
        message: Invalid API key in request
      properties:
        message:
          type: string
          description: Human-readable authentication error message.
          example: Invalid API key in request
    EndpointPermission:
      type: object
      description: >-
        Access status, field permissions, and effective rate limit for a single
        API endpoint.
      required:
        - path
        - category
        - status
        - effective_rate_limit_rpm
        - fields
      properties:
        path:
          type: string
          description: >-
            The endpoint's URL path, with the leading slash. This is the value
            the `path` query parameter matches on.
          example: /company/enrich
        category:
          type: string
          description: |
            Product category the endpoint belongs to. On the `2025-11-01`
            version the values are `Company`, `Person`, `Jobs`, `Web`,
            `Social`, and `Other`. This is the value the `category`
            query parameter matches on, case-insensitively.
          example: Company
        status:
          type: string
          description: |
            Whether the endpoint is enabled for this account. An endpoint marked
            `disabled` is not callable on the current plan; see that endpoint's
            own reference page for the permission error it returns.
          enum:
            - enabled
            - disabled
          example: enabled
        effective_rate_limit_rpm:
          type: integer
          nullable: true
          description: |
            Effective rate limit for this endpoint in requests per minute: the
            endpoint-specific limit when one is configured, otherwise the
            account default. Values observed on the `2025-11-01` version are
            5, 10, 15, 30, 45, and 300. It is `null` when no limit applies,
            currently only on `/batch/person/identify`.
          example: 15
        fields:
          $ref: '#/components/schemas/EndpointFields'
        base_credits:
          type: number
          description: >
            Credits this account is charged per result the endpoint returns.

            Absent on endpoints that carry no per-result charge. Every price on

            this endpoint is the account's own effective price, so a contract or

            grandfathered rate shows here as the rate that account actually
            pays.
          example: 0.03
        premium_modes:
          type: array
          description: >
            Request flags that change what the call costs, such as `preview` on

            live search or `verified` on contact enrich. Absent when the
            endpoint

            has none. See the endpoint's own page for what each flag does.
          items:
            $ref: '#/components/schemas/ModePrice'
          example:
            - mode: verified
              credits: 0.5
        premium_filters:
          type: array
          description: |
            Fields that cost extra to filter on, charged per result returned.
            Sorting on a premium field is free. Absent on endpoints without
            premium filtering, which is every endpoint except search.
          items:
            $ref: '#/components/schemas/FieldPrice'
          example:
            - field: experience
              credits: 0.1
            - field: dev_platform_profiles.repos
              credits: 2.5
        premium_fields:
          type: array
          description: |
            Fields that cost extra to receive, charged per result that comes
            back carrying them. Absent when the endpoint prices no field this
            way. A field priced to filter on but never returned appears only in
            `premium_filters`.
          items:
            $ref: '#/components/schemas/FieldPrice'
          example:
            - field: contact.business_emails
              credits: 1
            - field: social_posts
              credits: 5
    EndpointFields:
      type: object
      description: >
        `fields.enabled` and `fields.disabled` list response-field paths in the
        form

        the endpoint's `fields` request parameter accepts, so a path copied from

        either list works in a request as it is. Five endpoints store their
        catalog

        rows under a response envelope: `/company/search` and

        `/company/professional_network/search/live` under `companies`,

        `/person/professional_network/search/live` under `profiles`,

        `/job/professional_network/search/live` under `job_listings`, and

        `/social_post/professional_network/enrich/live` under `posts`. For
        these,

        each listed path has the envelope prefix removed, and rows outside the

        envelope are not listed: the envelope key itself, the pagination keys

        (`next_cursor`, `query`, `total_count`, `has_more`,
        `total_display_count`)

        and any un-prefixed duplicate of an envelope row. An endpoint with no

        `fields` request parameter lists its response keys instead. Each path

        appears in exactly one of the two lists. Both lists are sorted and
        always

        present. Only catalog rows of the requested `x-api-version` are
        considered.

        A restricted field the account does not hold is in neither list.
      required:
        - enabled
        - disabled
      properties:
        enabled:
          type: array
          description: >-
            Dot-path response fields the account can receive from this endpoint.
            Empty for endpoints that return no field-gated payload, such as
            `/batch/person/identify`.
          items:
            type: string
            description: Dot-path response field name.
            example: basic_info.name
          example:
            - basic_info
            - basic_info.all_domains
            - basic_info.company_type
            - basic_info.name
        disabled:
          type: array
          description: >-
            Dot-path response fields not enabled for the account on this
            endpoint. Empty on most endpoints; a field listed here is omitted
            from responses until the account is upgraded.
          items:
            type: string
            description: Dot-path response field name.
            example: hiring.recent_openings
          example:
            - hiring.recent_openings
            - social_posts
            - social_posts.backend_urn
    ModePrice:
      type: object
      description: What one request flag costs this account.
      required:
        - mode
        - credits
      properties:
        mode:
          type: string
          description: Name of the request flag, as sent in the request body.
          example: preview
        credits:
          type: number
          description: |
            Credits for this account when the flag is set. On `preview` this
            replaces the per-result charge; on `verified` it adds to it.
          example: 5
    FieldPrice:
      type: object
      description: >
        What one field costs this account on one side of a request. `field` is a

        path prefix: a root such as `experience` covers every path beneath it,
        and

        the longest matching prefix wins, so `dev_platform_profiles.repos` is
        priced

        by its own entry rather than by `dev_platform_profiles`.
      required:
        - field
        - credits
      properties:
        field:
          type: string
          description: Dot-path prefix the price applies to.
          example: basic_profile.summary
        credits:
          type: number
          description: Credits per result, for this account.
          example: 0.1
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: API key passed as a Bearer token in the Authorization header.

````

## Related topics

- [Rate limits](https://docs.crustdata.com/general/rate-limits.md)
- [Company Autocomplete API](https://docs.crustdata.com/company-docs/autocomplete/introduction.md)
- [Batch Person Verification API](https://docs.crustdata.com/person-docs/verification/batch.md)
- [Job Watcher](https://docs.crustdata.com/watcher-docs/job/watch.md)
- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
