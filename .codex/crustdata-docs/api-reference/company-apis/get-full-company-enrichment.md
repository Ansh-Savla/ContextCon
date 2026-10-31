> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Enrich Companies

> Get comprehensive company data including firmographics, headcount, funding,
web traffic, employee reviews, people (founders, CXOs, decision makers), news,
and more. Identify the company by domain, name, profile URL, or Crustdata company ID.
Use the fields parameter to select specific data groups and reduce response size.

The API returns a top-level array with one result per submitted
identifier. The same endpoint supports multiple identifiers of one type in a single
request. No-match responses currently return `200` with an empty `matches` array.

<Note>
    Default `rate-limit` is 15 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
</Note>




## OpenAPI

````yaml /openapi-specs/2025-11-01/company.yaml post /company/enrich
openapi: 3.0.3
info:
  title: Company API Uber Schema
  version: '2025-11-01'
  description: >
    The Crustdata Company API provides access to comprehensive company data
    including

    firmographics, headcount, funding, web traffic, employee reviews, and more.

    Use Search to find companies by filters, Identify to match a company from
    partial info,

    Enrich to get full company profiles, and Autocomplete to discover valid
    filter values.


    All requests require a valid API key passed via the Authorization header and
    an

    x-api-version header set to the API version (e.g., "2025-11-01").
servers:
  - url: https://api.crustdata.com
    description: Production API server
security:
  - bearerAuth: []
tags:
  - name: Company APIs
    description: Core company data endpoints for search, identification, and enrichment
  - name: Search APIs
    description: Endpoints for searching the company database
  - name: Identify APIs
    description: Endpoints for identifying companies from partial information
  - name: Enrich APIs
    description: Endpoints for enriching company data with comprehensive profiles
  - name: Autocomplete APIs
    description: Endpoints for autocompleting field values in search queries
paths:
  /company/enrich:
    post:
      tags:
        - Company APIs
        - Enrich APIs
      summary: Get full company enrichment
      description: >
        Get comprehensive company data including firmographics, headcount,
        funding,

        web traffic, employee reviews, people (founders, CXOs, decision makers),
        news,

        and more. Identify the company by domain, name, profile URL, or
        Crustdata company ID.

        Use the fields parameter to select specific data groups and reduce
        response size.


        The API returns a top-level array with one result per submitted

        identifier. The same endpoint supports multiple identifiers of one type
        in a single

        request. No-match responses currently return `200` with an empty
        `matches` array.


        <Note>
            Default `rate-limit` is 15 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
        </Note>
      operationId: enrichCompanyDataset
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        description: >-
          Company identifier plus optional field selection and exact_match.
          Submit one identifier type per request.
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CompanyEnrichRequest'
            examples:
              enrich_by_domain:
                summary: Enrich by domain with selected fields
                value:
                  domains:
                    - serverobotics.com
                  fields:
                    - basic_info
                    - headcount
                    - funding
              enrich_by_company_name:
                summary: Enrich by company name
                value:
                  names:
                    - Serve Robotics
                  fields:
                    - basic_info
              enrich_by_profile_url:
                summary: Enrich by profile URL
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/company/mintlify
                  fields:
                    - basic_info
                    - revenue
              enrich_multiple_company_ids:
                summary: Enrich multiple companies by company ID
                value:
                  crustdata_company_ids:
                    - 628895
                    - 810670
                  fields:
                    - basic_info
              enrich_exact_domain_match:
                summary: Strict domain match
                value:
                  domains:
                    - cashfree.com
                  fields:
                    - basic_info
                  exact_match: true
              enrich_default_fields:
                summary: Enrich by domain (default fields only)
                value:
                  domains:
                    - hubspot.com
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Enriched company matches returned as a top-level array
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CompanyEnrichResponse'
              examples:
                enrich_by_domain_response:
                  summary: Single enriched company by domain with selected fields
                  value:
                    - matched_on: serverobotics.com
                      match_type: domain
                      matches:
                        - confidence_score: 1
                          company_data:
                            crustdata_company_id: 628895
                            basic_info:
                              crustdata_company_id: 628895
                              name: Serve Robotics
                              primary_domain: serverobotics.com
                              all_domains:
                                - serverobotics.com
                              website: https://www.serverobotics.com/
                              professional_network_url: https://www.linkedin.com/company/serverobotics
                              professional_network_id: '72049930'
                              profile_name: Serve Robotics
                              logo_permalink: >-
                                https://crustdata-media.s3.us-east-2.amazonaws.com/company/9f84e252d0f9e35c95843303b33eda9313148adb54404d06947be750e9187db5.jpg
                              description: >-
                                Serve Robotics (NASDAQ:SERV) develops advanced,
                                AI-powered, low-emissions sidewalk delivery
                                robots that endeavor to make delivery
                                sustainable and economical. Spun off from Uber
                                in 2021 as an independent company, Serve has
                                completed tens of thousands of deliveries for
                                enterprise partners such as Uber Eats and
                                7-Eleven. The company has scalable multi-year
                                contracts, including a signed agreement to
                                deploy up to 2,000 delivery robots on the Uber
                                Eats platform across multiple U.S. markets. Come
                                join us, we are hiring!
                              company_type: Public Company
                              year_founded: 2021
                              employee_count_range: 51-200
                              markets:
                                - PRIVATE
                                - NASDAQ
                            headcount:
                              total: 381
                              growth_percent:
                                mom: 3.81
                                qoq: 8.24
                                six_months: 24.92
                                yoy: 94.39
                                two_years: 269.9
                              growth_absolute:
                                mom: 14
                                qoq: 29
                                six_months: 76
                                yoy: 185
                                two_years: 278
                            funding:
                              total_investment_usd: 394000000
                              last_round_amount_usd: 100000000
                              last_fundraise_date: '2025-10-10'
                              last_round_type: post_ipo_equity
                enrich_by_name_response:
                  summary: Multiple company matches by name
                  value:
                    - matched_on: Serve Robotics
                      match_type: name
                      matches:
                        - confidence_score: 11
                          company_data:
                            crustdata_company_id: 628895
                            basic_info:
                              name: Serve Robotics
                              primary_domain: serverobotics.com
                              employee_count_range: 51-200
                        - confidence_score: 4
                          company_data:
                            crustdata_company_id: 5825197
                            basic_info:
                              name: Site Serve Robotics
                              primary_domain: siteserverobotics.co.uk
                              employee_count_range: 2-10
                        - confidence_score: 4
                          company_data:
                            crustdata_company_id: 25592234
                            basic_info:
                              name: iServe Robotics
                              primary_domain: iserve.ai
                              employee_count_range: 2-10
                enrich_by_profile_url_response:
                  summary: Enriched Mintlify by profile URL
                  value:
                    - matched_on: https://www.linkedin.com/company/mintlify
                      match_type: professional_network_profile_url
                      matches:
                        - confidence_score: 1
                          company_data:
                            crustdata_company_id: 810670
                            basic_info:
                              crustdata_company_id: 810670
                              name: Mintlify
                              primary_domain: mintlify.link
                              all_domains:
                                - mintlify.com
                                - mintlify.link
                              website: https://mintlify.link/li
                              professional_network_url: https://www.linkedin.com/company/mintlify
                              professional_network_id: '79912175'
                              profile_name: Mintlify
                              logo_permalink: >-
                                https://crustdata-media.s3.us-east-2.amazonaws.com/company/2b03488e03204545951cd5d493e149bc0a2edc8b2a0986d6460bb63119295382.jpg
                              description: >-
                                On a mission to empower millions of
                                developers.Mintlify's platform reaches 100M+
                                developers every year and power the
                                documentation of 20,000+ companies.Would you
                                like to join us? http://mintlify.com/careers
                              company_type: Privately Held
                              year_founded: 2022
                              employee_count_range: 51-200
                              markets:
                                - PRIVATE
                            revenue:
                              acquisition_status: ''
                              estimated:
                                lower_bound_usd: 2500000
                                upper_bound_usd: 5000000
                enrich_multiple_company_ids_response:
                  summary: Multiple enriched companies in one request
                  value:
                    - matched_on: '628895'
                      match_type: crustdata_company_id
                      matches:
                        - confidence_score: 1
                          company_data:
                            crustdata_company_id: 628895
                            basic_info:
                              name: Serve Robotics
                              primary_domain: serverobotics.com
                    - matched_on: '810670'
                      match_type: crustdata_company_id
                      matches:
                        - confidence_score: 1
                          company_data:
                            crustdata_company_id: 810670
                            basic_info:
                              name: Mintlify
                              primary_domain: mintlify.link
                exact_domain_multiple_matches:
                  summary: Exact domain match can still return multiple company records
                  value:
                    - matched_on: cashfree.com
                      match_type: domain
                      matches:
                        - confidence_score: 15
                          company_data:
                            crustdata_company_id: 622934
                            basic_info:
                              name: Cashfree Payments
                              primary_domain: cashfree.com
                        - confidence_score: 4
                          company_data:
                            crustdata_company_id: 908846
                            basic_info:
                              name: Cashfree Tech
                              primary_domain: cashfree.com
                        - confidence_score: 2
                          company_data:
                            crustdata_company_id: 10956299
                            basic_info:
                              name: WTFraud
                              primary_domain: cashfree.com
                no_match_found:
                  summary: No matches for domain
                  value:
                    - matched_on: thisdomaindoesnotexist12345xyz.com
                      match_type: domain
                      matches: []
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Invalid request parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                missing_identifier:
                  summary: No identifier provided
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Exactly one identifier must be provided:
                        crustdata_company_ids, names, domains, or
                        professional_network_profile_urls
                      metadata: []
                invalid_fields:
                  summary: Invalid field name
                  value:
                    error:
                      type: invalid_request
                      message: 'Invalid fields: invalid_field'
                      metadata:
                        - available_fields:
                            - basic_info
                            - headcount
                            - funding
                            - revenue
                            - hiring
                            - web_traffic
                            - seo
                            - competitors
                            - employee_reviews
                            - people
                            - locations
                            - taxonomy
                            - followers
                            - news
                            - software_reviews
                            - social_profiles
                            - reviews
                            - public_launches
                            - market_intel
                            - technographics
        '401':
          description: Unauthorized - invalid or missing API key
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                error:
                  type: unauthorized
                  message: Invalid API key in request.
                  metadata: []
        '403':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Enrich not allowed for this account, or a requested field is not
            enabled on it
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                endpoint_not_enabled:
                  summary: The account is not entitled to this endpoint
                  value:
                    error:
                      type: permission_error
                      message: You do not have permission to access /company/enrich.
                      metadata: []
                fields_denied:
                  summary: A requested field is not enabled on the account
                  value:
                    error:
                      type: permission_error
                      message: >-
                        Access denied to fields: hiring.recent_openings. To
                        enable access, please book a call with us at
                        https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request
                      metadata:
                        - denied_fields:
                            - hiring.recent_openings
                          permitted_fields:
                            - basic_info
                            - funding
                            - headcount
        '404':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: No data found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
components:
  parameters:
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
      description: API version to use. This endpoint currently requires `2025-11-01`.
  schemas:
    CompanyEnrichRequest:
      type: object
      description: >-
        Company identifiers plus optional field selection and exact_match.
        Provide exactly one identifier type (names, domains,
        crustdata_company_ids, or professional_network_profile_urls); each may
        contain one or more values.
      properties:
        names:
          type: array
          items:
            type: string
          nullable: true
        domains:
          type: array
          items:
            type: string
          nullable: true
        crustdata_company_ids:
          type: array
          items:
            type: integer
          nullable: true
        professional_network_profile_urls:
          type: array
          items:
            type: string
          nullable: true
        fields:
          type: array
          items:
            type: string
          description: >
            Field groups to include in `company_data`. When `fields` is omitted,
            only `crustdata_company_id` and `basic_info` are returned — sections
            such as `headcount`, `funding`, `people`, and `hiring` must be
            listed explicitly. Valid field groups for enrich: basic_info,
            revenue, headcount, funding, hiring, web_traffic, seo, competitors,
            employee_reviews, people, locations, taxonomy, followers, news,
            software_reviews, social_profiles, reviews, public_launches,
            market_intel, metadata, crustdata_company_id, updated_at,
            indexed_at. Also available: social_posts, which is never returned by
            default and must be requested explicitly. Not valid for enrich:
            roles, skills (search-only fields).
        exact_match:
          type: boolean
          nullable: true
          description: Whether to use exact matching (null means auto-detect)
      oneOf:
        - required:
            - names
        - required:
            - domains
        - required:
            - crustdata_company_ids
        - required:
            - professional_network_profile_urls
      example:
        domains:
          - serverobotics.com
        fields:
          - basic_info
          - headcount
          - funding
    CompanyEnrichResponse:
      type: array
      description: >-
        Top-level array returned by /company/enrich with one entry per submitted
        identifier.
      items:
        $ref: '#/components/schemas/EnrichResult'
      example:
        - matched_on: mintlify.com
          match_type: domain
          matches: []
    ErrorResponse:
      type: object
      description: >-
        Standard error response returned by all endpoints for 4xx and 5xx
        errors.
      required:
        - error
      properties:
        error:
          type: object
          description: Error details
          required:
            - type
            - message
          properties:
            type:
              type: string
              enum:
                - invalid_request
                - authentication_error
                - unauthorized
                - insufficient_credits
                - permission_error
                - rate_limit_error
                - internal_error
              description: Category of the error
              example: invalid_request
            message:
              type: string
              description: Human-readable error message
              example: >-
                Exactly one identifier must be provided: crustdata_company_ids,
                names, domains, or professional_network_profile_urls
            metadata:
              type: array
              items:
                type: object
                additionalProperties: true
              default: []
              description: Additional structured context (e.g., list of available fields)
    EnrichResult:
      type: object
      properties:
        matched_on:
          type: string
          description: The specific input value (e.g., 'google.com')
        match_type:
          type: string
          enum:
            - name
            - domain
            - crustdata_company_id
            - professional_network_profile_url
        matches:
          type: array
          items:
            $ref: '#/components/schemas/EnrichMatch'
      description: One result entry in the enrich response — one per submitted identifier.
      example:
        matched_on: mintlify.com
        match_type: domain
        matches:
          - confidence_score: 1
            company_data:
              crustdata_company_id: 810670
              basic_info:
                name: Mintlify
                primary_domain: mintlify.link
    EnrichMatch:
      type: object
      properties:
        confidence_score:
          type: number
          format: float
          example: 0.95
        company_data:
          $ref: '#/components/schemas/CompanyEnrich'
      description: >-
        A single enriched company match from /company/enrich with confidence
        score and full company data.
      example:
        confidence_score: 1
        company_data:
          crustdata_company_id: 810670
          basic_info:
            name: Mintlify
            primary_domain: mintlify.link
    CompanyEnrich:
      type: object
      additionalProperties: false
      properties:
        crustdata_company_id:
          type: integer
        updated_at:
          type: string
          format: date-time
          nullable: true
        indexed_at:
          type: string
          format: date-time
          nullable: true
        metadata:
          type: object
          properties:
            growth_calculation_date:
              type: string
              nullable: true
        basic_info:
          type: object
          properties:
            crustdata_company_id:
              type: integer
              example: 810670
            name:
              type: string
              nullable: true
              example: Mintlify
            primary_domain:
              type: string
              nullable: true
              example: mintlify.link
            all_domains:
              type: array
              items:
                type: string
              nullable: true
              example:
                - mintlify.com
                - mintlify.link
            website:
              type: string
              nullable: true
              example: https://mintlify.link/li
            professional_network_url:
              type: string
              nullable: true
              example: https://www.linkedin.com/company/mintlify
            professional_network_id:
              type: string
              nullable: true
              example: '79912175'
            profile_name:
              type: string
              nullable: true
              example: Mintlify
            logo_permalink:
              type: string
              nullable: true
              example: >-
                https://crustdata-media.s3.us-east-2.amazonaws.com/company/abc.jpg
            description:
              type: string
              nullable: true
              example: On a mission to empower millions of developers.
            company_type:
              type: string
              nullable: true
              example: Privately Held
            status:
              type: string
              nullable: true
              description: >-
                Company lifecycle in Crustdata's entity graph. `active` is a
                live company record; `deleted` is one Crustdata has retired. The
                person APIs return the same value as `company_status` on an
                employment record.
              example: active
            year_founded:
              type: integer
              nullable: true
              example: 2022
            employee_count_range:
              type: string
              nullable: true
              example: 51-200
            markets:
              type: array
              items:
                type: string
              nullable: true
              example:
                - PRIVATE
        revenue:
          type: object
          properties:
            estimated:
              type: object
              properties:
                lower_bound_usd:
                  type: integer
                upper_bound_usd:
                  type: integer
                timeseries:
                  type: array
                  items:
                    type: object
            public_markets:
              type: object
              properties:
                ipo_date:
                  type: string
                  format: date
                stock_symbols:
                  type: array
                  items:
                    type: string
                fiscal_year_end:
                  type: string
            acquisition_status:
              type: string
              nullable: true
        headcount:
          type: object
          description: Employee footprint
          properties:
            total:
              type: integer
              nullable: true
            largest_headcount_country:
              type: string
              nullable: true
            timeseries:
              type: array
              items:
                type: object
                properties:
                  date:
                    type: string
                  employee_count:
                    type: integer
              nullable: true
            growth_percent:
              type: object
              description: >
                Headcount growth percent by period. Keys are period aliases:
                `mom` (month-over-month), `qoq` (quarter-over-quarter),
                `six_months`, `yoy` (year-over-year), `two_years`. Values are
                percentage changes over the trailing window.


                <Note>
                    `/company/search` returns the same growth data under different period keys (`1m`, `3m`, `6m`, `12m`) and exposes per-period filtering via `headcount.growth_percent.{1m,3m,6m,12m}` paths.
                </Note>
              additionalProperties:
                type: number
                nullable: true
              example:
                mom: 0.67
                qoq: 2.69
                six_months: 5.5
                yoy: 12.63
                two_years: 32.5
            growth_absolute:
              type: object
              description: >
                Headcount absolute change by period. Keys are period aliases:
                `mom`, `qoq`, `six_months`, `yoy`, `two_years`. Values are
                absolute employee-count deltas over the trailing window.
              additionalProperties:
                type: integer
                nullable: true
              example:
                mom: 81
                qoq: 318
                six_months: 634
                yoy: 1363
                two_years: 2982
            by_role_absolute:
              type: object
              additionalProperties:
                type: integer
                nullable: true
            by_role_percent:
              type: object
              additionalProperties:
                type: number
                nullable: true
            by_region_absolute:
              type: object
              additionalProperties:
                type: integer
                nullable: true
            by_region_percent:
              type: object
              additionalProperties:
                type: number
                nullable: true
            by_skill_absolute:
              type: object
              additionalProperties:
                type: integer
                nullable: true
            by_skill_percent:
              type: object
              additionalProperties:
                type: number
                nullable: true
            by_function_timeseries:
              type: object
              description: >
                Timeseries headcount broken down by function or geo region.
                Top-level keys are CURRENT_FUNCTION and GEO_REGION; each value
                is a map of name (e.g. "Engineering" or "United States") to a
                list of {date, employee_count} points.
              properties:
                CURRENT_FUNCTION:
                  type: object
                  additionalProperties:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          nullable: true
                        employee_count:
                          type: integer
                          nullable: true
                  nullable: true
                GEO_REGION:
                  type: object
                  additionalProperties:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          nullable: true
                        employee_count:
                          type: integer
                          nullable: true
                  nullable: true
        software_reviews:
          type: object
          properties:
            review_count:
              type: integer
            average_rating:
              type: number
            review_count_mom_pct:
              type: number
              nullable: true
            review_count_qoq_pct:
              type: number
              nullable: true
            review_count_yoy_pct:
              type: number
              nullable: true
        funding:
          type: object
          properties:
            total_investment_usd:
              type: number
              nullable: true
            last_round_amount_usd:
              type: number
              nullable: true
            last_fundraise_date:
              type: string
              format: date
              nullable: true
            last_round_type:
              type: string
              nullable: true
              example: series_a
            milestones:
              type: array
              items:
                type: object
                properties:
                  date:
                    type: string
                    format: date
                    nullable: true
                  funding_date:
                    type: string
                    format: date
                    nullable: true
                  amount_usd:
                    type: number
                    nullable: true
                  round_type:
                    type: string
                    nullable: true
                    description: Funding round type (e.g. seed, series_a, series_c).
                  investors:
                    type: string
                    nullable: true
                  lead_investors:
                    type: string
                    nullable: true
              nullable: true
            investors:
              type: array
              items:
                type: string
              nullable: true
            investors_detailed:
              type: array
              items:
                type: object
                properties:
                  name:
                    type: string
                    nullable: true
                  uuid:
                    type: string
                    nullable: true
                  type:
                    type: string
                    nullable: true
                  categories:
                    type: array
                    items:
                      type: string
                    nullable: true
                  permalink:
                    type: string
                    nullable: true
                    description: Crunchbase permalink slug for the investor.
                  crunchbase_profile_url:
                    type: string
                    nullable: true
                    description: Full Crunchbase profile URL for the investor.
              nullable: true
            acquisitions:
              type: array
              items:
                type: object
                properties:
                  acquiree_company_id:
                    type: integer
                    nullable: true
                  acquiree_company_name:
                    type: string
                    nullable: true
                  acquiree_crunchbase_url:
                    type: string
                    nullable: true
                  acquirer_company_id:
                    type: integer
                    nullable: true
                  acquirer_company_name:
                    type: string
                    nullable: true
                  acquirer_crunchbase_url:
                    type: string
                    nullable: true
                  announced_on_date:
                    type: string
                    format: date
                    nullable: true
                  transaction_text:
                    type: string
                    nullable: true
              nullable: true
            acquired_by:
              type: array
              items:
                type: object
                properties:
                  name:
                    type: string
                    nullable: true
                  crustdata_company_id:
                    type: integer
                    nullable: true
                  date:
                    type: string
                    format: date
                    nullable: true
                  amount_usd:
                    type: number
                    nullable: true
              nullable: true
        hiring:
          type: object
          properties:
            recent_titles_csv:
              type: string
            openings_count:
              type: integer
            openings_growth_percent:
              type: object
              description: >
                Open-jobs growth by period. Keys are period aliases: `mom`
                (month-over-month), `qoq` (quarter-over-quarter), `yoy`
                (year-over-year). Values are fractions, so `0.3` is 30% growth.
              additionalProperties:
                type: number
                nullable: true
              example:
                mom: -0.11
                qoq: 0.3
                yoy: 0.75
            by_function_qoq_pct:
              type: object
              description: >
                Quarter-over-quarter open-jobs growth per job function. Keys are
                function names: `Accounting`, `Art and Design`, `Business
                Development`, `Engineering`, `Finance`, `Human Resource`,
                `Information Technology`, `Marketing`, `Media and
                Communication`, `Operations`, `Research`, `Sales`, `Product
                Management`. Values are fractions, so `0.3` is 30% growth; null
                when the function has no openings.
              additionalProperties:
                type: number
                nullable: true
              example:
                Engineering: -0.46
                Sales: -0.36
                Research: null
            by_function_6m_pct:
              type: object
              description: >
                Six-month open-jobs growth per job function. Keys are function
                names: `Accounting`, `Art and Design`, `Business Development`,
                `Engineering`, `Finance`, `Human Resource`, `Information
                Technology`, `Marketing`, `Media and Communication`,
                `Operations`, `Research`, `Sales`, `Product Management`. Values
                are fractions, so `0.3` is 30% growth; null when the function
                has no openings.
              additionalProperties:
                type: number
                nullable: true
              example:
                Engineering: 0.86
                Sales: 0.75
                Research: null
            open_jobs_timeseries:
              type: array
              items:
                type: object
                properties:
                  date:
                    type: string
                  open_jobs:
                    type: integer
                    nullable: true
            recent_openings:
              type: array
              items:
                type: object
                properties:
                  title:
                    type: string
                    nullable: true
                  url:
                    type: string
                    nullable: true
                    description: Job posting URL.
                  number_of_openings:
                    type: integer
                    nullable: true
                  category:
                    type: string
                    nullable: true
                    description: Job category / function (e.g. Sales, Engineering).
                  description:
                    type: string
                    nullable: true
                  date_added:
                    type: string
                    format: date-time
                    nullable: true
                  date_updated:
                    type: string
                    format: date-time
                    nullable: true
                  location_text:
                    type: string
                    nullable: true
                    description: Free-form location string from the job posting.
        web_traffic:
          type: object
          description: Per-domain traffic metrics keyed by domain name.
          properties:
            domain_traffic:
              type: object
              description: >-
                Dict keyed by domain name, each value is a traffic metrics
                object.
              additionalProperties:
                type: object
                properties:
                  domain:
                    type: string
                    description: Domain name these metrics correspond to.
                  monthly_visitors:
                    type: number
                  mom_pct:
                    type: number
                  qoq_pct:
                    type: number
                  source_search_pct:
                    type: number
                  source_direct_pct:
                    type: number
                  source_social_pct:
                    type: number
                  source_paid_referral_pct:
                    type: number
                  source_referral_pct:
                    type: number
                  monthly_visitors_timeseries:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          nullable: true
                        monthly_visitors:
                          type: integer
                          nullable: true
                  source_search_pct_timeseries:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          nullable: true
                        traffic_source_search_pct:
                          type: number
                          nullable: true
                  source_direct_pct_timeseries:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          nullable: true
                        traffic_source_direct_pct:
                          type: number
                          nullable: true
                  source_social_pct_timeseries:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          nullable: true
                        traffic_source_social_pct:
                          type: number
                          nullable: true
                  source_paid_referral_pct_timeseries:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          nullable: true
                        traffic_source_paid_referral_pct:
                          type: number
                          nullable: true
                  source_referral_pct_timeseries:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          nullable: true
                        traffic_source_referral_pct:
                          type: number
                          nullable: true
        seo:
          type: object
          description: SEO and paid-search traffic metrics
          properties:
            total_organic_results:
              type: integer
              nullable: true
            average_seo_organic_rank:
              type: number
              nullable: true
            monthly_google_ads_budget:
              type: number
              nullable: true
            monthly_paid_clicks:
              type: integer
              nullable: true
            monthly_organic_clicks:
              type: integer
              nullable: true
            monthly_organic_value:
              type: number
              nullable: true
            average_ad_rank:
              type: number
              nullable: true
            total_ads_purchased:
              type: integer
              nullable: true
            lost_ranked_seo_keywords:
              type: integer
              nullable: true
            gained_ranked_seo_keywords:
              type: integer
              nullable: true
            newly_ranked_seo_keywords:
              type: integer
              nullable: true
        competitors:
          type: object
          description: >-
            Competitor domains aggregated from SEO and market intelligence
            signals
          properties:
            all_domains:
              type: array
              description: All competitor domains from companies_competitors table
              items:
                type: string
              nullable: true
            paid_seo:
              type: array
              description: Paid-search competitors from data_lab_spyfu_web_traffic
              items:
                type: string
              nullable: true
            organic_seo:
              type: array
              description: Organic SEO competitors from data_lab_spyfu_web_traffic
              items:
                type: string
              nullable: true
        reviews:
          type: object
          description: Other (non-employee) reviews bucket. May be null when not populated.
          nullable: true
          properties:
            other:
              type: array
              nullable: true
              items:
                type: object
                properties:
                  source:
                    type: string
                    nullable: true
                  rating:
                    type: number
                    nullable: true
                  body:
                    type: string
                    nullable: true
                  reviewer_name:
                    type: string
                    nullable: true
                  url:
                    type: string
                    nullable: true
                  created_at:
                    type: string
                    nullable: true
        employee_reviews:
          type: object
          description: Employee review and rating metrics.
          properties:
            overall_rating:
              type: object
              nullable: true
              description: Overall company rating with star distribution
              properties:
                rating:
                  type: number
                  nullable: true
                total_count:
                  type: integer
                  nullable: true
                rating_1_count:
                  type: integer
                  nullable: true
                rating_2_count:
                  type: integer
                  nullable: true
                rating_3_count:
                  type: integer
                  nullable: true
                rating_4_count:
                  type: integer
                  nullable: true
                rating_5_count:
                  type: integer
                  nullable: true
            company_ceo:
              type: object
              nullable: true
              description: CEO information including approval rating
              properties:
                ceo_rating:
                  type: number
                  nullable: true
                  description: CEO approval rating percentage
            primary_industry:
              type: object
              nullable: true
              description: Primary industry classification
              properties:
                name:
                  type: string
                  nullable: true
                sector_name:
                  type: string
                  nullable: true
            culture_and_values_rating:
              type: number
              nullable: true
            diversity_and_inclusion_rating:
              type: number
              nullable: true
            work_life_balance_rating:
              type: number
              nullable: true
            senior_management_rating:
              type: number
              nullable: true
            compensation_and_benefits_rating:
              type: number
              nullable: true
            career_opportunities_rating:
              type: number
              nullable: true
            recommend_to_friend_rating:
              type: number
              nullable: true
            business_outlook_rating:
              type: number
              nullable: true
              description: Business outlook rating
            office_locations:
              type: array
              nullable: true
              items:
                type: object
                properties:
                  city_name:
                    type: string
                    nullable: true
                  city_long_name:
                    type: string
                    nullable: true
                  state:
                    type: string
                    nullable: true
                  country:
                    type: string
                    nullable: true
                  continent_name:
                    type: string
                    nullable: true
                  address_line1:
                    type: string
                    nullable: true
                  address_line2:
                    type: string
                    nullable: true
                  zip_code:
                    type: string
                    nullable: true
                  latitude:
                    type: number
                    nullable: true
                  longitude:
                    type: number
                    nullable: true
            awards:
              type: array
              nullable: true
              items:
                type: object
                properties:
                  name:
                    type: string
                    nullable: true
                  source:
                    type: string
                    nullable: true
                  year:
                    type: string
                    nullable: true
            metadata:
              type: object
              nullable: true
              properties:
                last_scraped_at:
                  type: string
                  nullable: true
                rating_as_of_date:
                  type: string
                  nullable: true
        people:
          type: object
          properties:
            decision_makers:
              type: array
              items:
                $ref: '#/components/schemas/PersonProfile'
            founders:
              type: array
              items:
                $ref: '#/components/schemas/PersonProfile'
            cxos:
              type: array
              items:
                $ref: '#/components/schemas/PersonProfile'
        locations:
          type: object
          properties:
            country:
              type: string
              nullable: true
            headquarters:
              type: string
              nullable: true
            street_address:
              type: string
              nullable: true
              description: HQ street address (e.g. "510 Townsend St.")
            state:
              type: string
              nullable: true
            all_office_addresses:
              type: array
              items:
                type: string
              nullable: true
        social_profiles:
          type: object
          properties:
            crunchbase:
              type: object
              properties:
                url:
                  type: string
                  nullable: true
                uuid:
                  type: string
                  nullable: true
            twitter_url:
              type: string
              nullable: true
            professional_network:
              type: string
              nullable: true
              description: >
                Profile URL for the company. Same value also surfaced at
                basic_info.professional_network_url.
        taxonomy:
          type: object
          properties:
            professional_network_specialities:
              type: array
              items:
                type: string
              nullable: true
            professional_network_industry:
              type: string
              nullable: true
            professional_network_industries:
              type: array
              items:
                type: string
              nullable: true
            categories:
              type: array
              items:
                type: string
              nullable: true
            primary_naics_detail:
              type: object
              nullable: true
              description: >-
                Primary NAICS classification. Same shape as the
                `/company/search` field of the same name.
              properties:
                naics_code:
                  type: string
                  nullable: true
                  description: Six-digit NAICS code, for example "541511".
                sector:
                  type: string
                  nullable: true
                  description: NAICS sector, the two-digit level.
                sub_sector:
                  type: string
                  nullable: true
                  description: NAICS sub-sector, the three-digit level.
                industry_group:
                  type: string
                  nullable: true
                  description: NAICS industry group, the four-digit level.
                industry:
                  type: string
                  nullable: true
                  description: NAICS industry title, the six-digit level.
                year:
                  type: integer
                  nullable: true
                  description: NAICS edition year the code belongs to.
            sic_detail_list:
              type: array
              nullable: true
              description: >-
                SIC codes assigned to the company, one entry per code. Same
                shape as the `/company/search` field of the same name.
              items:
                type: object
                properties:
                  sic_code:
                    type: string
                    nullable: true
                    description: Four-digit SIC code, for example "7372".
                  industry:
                    type: string
                    nullable: true
                    description: SIC industry title for the code.
                  year:
                    type: integer
                    nullable: true
                    description: SIC edition year the code belongs to.
        news:
          type: array
          nullable: true
          items:
            type: object
            properties:
              source:
                type: string
                nullable: true
                description: Source of the article (crunchbase or google_news)
              article_url:
                type: string
                nullable: true
                description: URL of the news article
              article_title:
                type: string
                nullable: true
                description: Title of the news article
              article_publisher_name:
                type: string
                nullable: true
                description: Name of the publisher
              article_publish_date:
                type: string
                format: date
                nullable: true
                description: Date the article was published
              publisher_domain:
                type: string
                nullable: true
                description: >-
                  Domain of the publisher (only available for google_news
                  source)
              confidence_score:
                type: number
                nullable: true
                description: >-
                  Confidence score for the article-company relationship (only
                  available for google_news source, minimum 0.79)
        followers:
          type: object
          properties:
            count:
              type: integer
              default: 0
              nullable: true
            mom_percent:
              type: number
              default: 0
              nullable: true
            qoq_percent:
              type: number
              default: 0
              nullable: true
            six_months_growth_percent:
              type: number
              default: 0
              nullable: true
            yoy_percent:
              type: number
              default: 0
              nullable: true
            timeseries:
              type: array
              items:
                type: object
                properties:
                  date:
                    type: string
                  follower_count:
                    type: integer
        public_launches:
          type: object
          nullable: true
          description: Product-launch data including launches, makers, and reviews.
          properties:
            slug:
              type: string
              nullable: true
            company_name:
              type: string
              nullable: true
            company_website_url:
              type: string
              nullable: true
            angel_list_url:
              type: string
              nullable: true
            facebook_url:
              type: string
              nullable: true
            instagram_url:
              type: string
              nullable: true
            github_url:
              type: string
              nullable: true
            twitter_url:
              type: string
              nullable: true
            threads_url:
              type: string
              nullable: true
            linkedin_url:
              type: string
              nullable: true
            producthunt_url:
              type: string
              nullable: true
            description:
              type: string
              nullable: true
            rating:
              type: number
              nullable: true
            num_upvotes:
              type: integer
              nullable: true
            num_reviews:
              type: integer
              nullable: true
            num_followers:
              type: integer
              nullable: true
            last_updated:
              type: string
              nullable: true
            categories:
              type: array
              nullable: true
              description: ProductHunt category labels (plain strings).
              items:
                type: string
            makers:
              type: array
              nullable: true
              items:
                type: object
                properties:
                  username:
                    type: string
                    nullable: true
                  name:
                    type: string
                    nullable: true
                  headline:
                    type: string
                    nullable: true
                  about:
                    type: string
                    nullable: true
                  num_badges:
                    type: integer
                    nullable: true
                  num_votes:
                    type: integer
                    nullable: true
                  website_urls:
                    type: array
                    items:
                      type: string
                    nullable: true
                  last_updated:
                    type: integer
                    nullable: true
                    description: Unix epoch seconds
            reviews:
              type: array
              nullable: true
              items:
                type: object
                properties:
                  review_id:
                    type: integer
                    nullable: true
                  user:
                    type: object
                    nullable: true
                    properties:
                      username:
                        type: string
                        nullable: true
                      name:
                        type: string
                        nullable: true
                      headline:
                        type: string
                        nullable: true
                      about:
                        type: string
                        nullable: true
                      num_badges:
                        type: integer
                        nullable: true
                      num_votes:
                        type: integer
                        nullable: true
                      website_urls:
                        type: array
                        items:
                          type: string
                        nullable: true
                      last_updated:
                        type: integer
                        nullable: true
                  content:
                    type: string
                    nullable: true
                  posted_at:
                    type: integer
                    nullable: true
                    description: Unix epoch seconds
                  num_upvotes:
                    type: integer
                    nullable: true
                  num_replies:
                    type: integer
                    nullable: true
                  last_updated:
                    type: integer
                    nullable: true
                    description: Unix epoch seconds
            launches:
              type: array
              nullable: true
              items:
                type: object
                properties:
                  launch_id:
                    type: integer
                    nullable: true
                  slug:
                    type: string
                    nullable: true
                  name:
                    type: string
                    nullable: true
                  tagline:
                    type: string
                    nullable: true
                  description:
                    type: string
                    nullable: true
                  launched_at:
                    type: integer
                    nullable: true
                    description: Unix epoch seconds
                  num_upvotes:
                    type: integer
                    nullable: true
                  num_comments:
                    type: integer
                    nullable: true
                  day_rank:
                    type: integer
                    nullable: true
                  week_rank:
                    type: integer
                    nullable: true
                  month_rank:
                    type: integer
                    nullable: true
                  year_rank:
                    type: integer
                    nullable: true
                  golden_kitty_award:
                    type: integer
                    nullable: true
                  last_updated:
                    type: integer
                    nullable: true
                    description: Unix epoch seconds
        market_intel:
          type: object
          nullable: true
          description: Market-intelligence data including products and reviews.
          properties:
            slug:
              type: string
              nullable: true
            company_name:
              type: string
              nullable: true
            company_website_url:
              type: string
              nullable: true
            description:
              type: string
              nullable: true
            year_founded:
              type: integer
              nullable: true
              description: Year the company was founded.
            head_office_city:
              type: string
              nullable: true
            head_office_country:
              type: string
              nullable: true
            num_employees_min:
              type: integer
              nullable: true
            num_employees_max:
              type: integer
              nullable: true
            products:
              type: array
              nullable: true
              items:
                type: object
                properties:
                  slug:
                    type: string
                    nullable: true
                  name:
                    type: string
                    nullable: true
                  category:
                    type: string
                    nullable: true
                  competitors:
                    type: array
                    items:
                      type: string
                    nullable: true
                  last_updated:
                    type: integer
                    nullable: true
                    description: Unix epoch seconds
            reviews:
              type: array
              nullable: true
              items:
                type: object
                properties:
                  review_id:
                    type: integer
                    nullable: true
                  headline:
                    type: string
                    nullable: true
                  summary:
                    type: string
                    nullable: true
                  overall_rating:
                    type: integer
                    nullable: true
                  num_upvotes:
                    type: integer
                    nullable: true
                  num_downvotes:
                    type: integer
                    nullable: true
                  liked_summary:
                    type: string
                    nullable: true
                  disliked_summary:
                    type: string
                    nullable: true
                  purchase_reasons:
                    type: string
                    nullable: true
                    description: Stringified list of purchase reasons.
                  key_decision_factors:
                    type: string
                    nullable: true
                    description: Stringified list of key decision factors.
                  competitors_considered:
                    type: string
                    nullable: true
                    description: Stringified list of competitors considered.
                  evaluation_and_contracting_rating:
                    type: integer
                    nullable: true
                  integration_and_deployment_rating:
                    type: integer
                    nullable: true
                  service_and_support_rating:
                    type: integer
                    nullable: true
                  product_capabilities_rating:
                    type: integer
                    nullable: true
                  deployment_architecture:
                    type: string
                    nullable: true
                  deployment_countries:
                    type: string
                    nullable: true
                  reviewer_title:
                    type: string
                    nullable: true
                  reviewer_function:
                    type: string
                    nullable: true
                  reviewer_industry:
                    type: string
                    nullable: true
                  reviewer_company_size:
                    type: string
                    nullable: true
                  submitted_at:
                    type: integer
                    nullable: true
                    description: Unix epoch seconds
                  last_updated:
                    type: integer
                    nullable: true
                    description: Unix epoch seconds
        technographics:
          type: object
          description: >-
            Technology stack detected for the company. Returned only when
            explicitly requested via `fields`; billed as an add-on per company
            returned with data.
          properties:
            total_technologies:
              type: integer
              nullable: true
              description: >-
                True count of detected technologies (technologies[] is capped,
                total_technologies is not)
              example: 635
            top_technologies:
              type: array
              items:
                type: string
              nullable: true
              description: Up to 25 technology names, ordered by detection confidence
              example:
                - SQL
                - Python
                - React
            technologies:
              type: array
              nullable: true
              description: >-
                Detected technologies ordered by detection confidence, capped at
                500 entries
              items:
                type: object
                properties:
                  name:
                    type: string
                    nullable: true
                    example: Python
                  sources:
                    type: array
                    items:
                      type: string
                    nullable: true
                    description: >-
                      Detection sources for this technology (web signals, job
                      posting)
                    example:
                      - web signals
                      - job posting
                  posting_count:
                    type: integer
                    nullable: true
                    description: >-
                      Number of the company's job postings the technology was
                      detected in; null when there is no job-posting evidence
                    example: 3
                  categories:
                    type: array
                    nullable: true
                    description: Catalog categories for the technology, strongest first
                    items:
                      type: object
                      properties:
                        category_slug:
                          type: string
                          nullable: true
                          example: language
                        super_slug:
                          type: string
                          nullable: true
                          example: engineering
                        score:
                          type: number
                          nullable: true
                          example: 0.9
                  description:
                    type: string
                    nullable: true
                    description: Catalog description of the technology
                    example: General-purpose programming language.
                  evidence:
                    type: array
                    nullable: true
                    description: >-
                      Detection evidence entries; url/title/posted_at are
                      populated for job-posting evidence only
                    items:
                      type: object
                      properties:
                        source:
                          type: string
                          nullable: true
                          example: job posting
                        posting_id:
                          type: string
                          nullable: true
                        confidence:
                          type: number
                          nullable: true
                          example: 0.9
                        url:
                          type: string
                          nullable: true
                        title:
                          type: string
                          nullable: true
                        posted_at:
                          type: string
                          format: date-time
                          nullable: true
            updated_at:
              type: string
              format: date-time
              nullable: true
              description: Timestamp of the last technographics refresh for the company.
              example: '2026-07-21T05:18:56Z'
        social_posts:
          type: array
          nullable: true
          items:
            $ref: '#/components/schemas/SocialPost'
          description: >-
            Up to the 10 most recent posts authored by this company, newest
            first. Plain reshares of someone else's post are excluded; quote
            posts are included. Never returned by default: request it explicitly
            in `fields`.
      description: >-
        Fully-enriched company profile with firmographics, headcount, funding,
        web traffic, employee reviews, people, news, and more.
      example:
        crustdata_company_id: 810670
        basic_info:
          name: Mintlify
          primary_domain: mintlify.link
        headcount:
          total: 54
    PersonProfile:
      type: object
      description: >-
        Person profile in new nested dataset format (matching person enrich
        schema)
      properties:
        crustdata_person_id:
          type: integer
          nullable: true
        basic_profile:
          type: object
          nullable: true
          properties:
            name:
              type: string
              nullable: true
            headline:
              type: string
              nullable: true
            current_title:
              type: string
              nullable: true
            summary:
              type: string
              nullable: true
            languages:
              type: array
              items:
                type: string
              nullable: true
            last_updated:
              type: string
              nullable: true
            profile_picture_permalink:
              type: string
              nullable: true
            location:
              type: object
              nullable: true
              properties:
                raw:
                  type: string
                  nullable: true
        professional_network:
          type: object
          nullable: true
          properties:
            profile_picture_url:
              type: string
              nullable: true
            profile_picture_permalink:
              type: string
              nullable: true
            name:
              type: string
              nullable: true
            headline:
              type: string
              nullable: true
            current_title:
              type: string
              nullable: true
            summary:
              type: string
              nullable: true
            location:
              type: object
              nullable: true
              properties:
                raw:
                  type: string
                  nullable: true
            connections:
              type: integer
              nullable: true
        skills:
          type: object
          nullable: true
          properties:
            professional_network_skills:
              type: array
              items:
                type: string
              nullable: true
        social_handles:
          type: object
          nullable: true
          properties:
            professional_network_identifier:
              type: object
              nullable: true
              properties:
                profile_url:
                  type: string
                  nullable: true
            twitter_identifier:
              type: object
              nullable: true
              properties:
                slug:
                  type: string
                  nullable: true
        experience:
          type: object
          nullable: true
          properties:
            employment_details:
              type: object
              nullable: true
              properties:
                current:
                  type: array
                  items:
                    $ref: '#/components/schemas/PersonProfileEmployer'
                  nullable: true
                past:
                  type: array
                  items:
                    $ref: '#/components/schemas/PersonProfileEmployer'
                  nullable: true
        education:
          type: object
          nullable: true
          properties:
            schools:
              type: array
              items:
                $ref: '#/components/schemas/PersonProfileSchool'
              nullable: true
        updated_at:
          type: string
          nullable: true
      example:
        crustdata_person_id: 14540
        basic_profile:
          name: David Hsu
          current_title: Founder & CEO
    SocialPost:
      type: object
      properties:
        share_url:
          type: string
          nullable: true
          description: Public URL of the post.
        text:
          type: string
          nullable: true
          description: Post text content.
        date_posted:
          type: string
          nullable: true
          description: When the post was published.
        post_type:
          type: string
          nullable: true
          enum:
            - original
            - repost_without_thoughts
            - repost_quote
          description: Post type. Quote posts are returned as `repost_quote`.
        has_video:
          type: boolean
          nullable: true
          description: True when the post contains a video.
        hyperlinks:
          $ref: '#/components/schemas/SocialPostHyperlinks'
        hashtags:
          type: array
          nullable: true
          items:
            type: string
          description: Hashtags used in the post.
        engagement:
          $ref: '#/components/schemas/SocialPostEngagement'
      description: A single post authored by the enriched company.
      example:
        share_url: >-
          https://www.linkedin.com/feed/update/urn:li:activity:7269000000000000000
        text: We just shipped batch enrichment.
        date_posted: '2026-07-14T09:12:00Z'
        post_type: original
        has_video: false
        engagement:
          total_reactions: 142
          total_comments: 9
    PersonProfileEmployer:
      type: object
      description: Employer entry under PersonProfile (legacy keys, not the dataset format)
      properties:
        employer_name:
          type: string
          nullable: true
        employer_linkedin_id:
          type: string
          nullable: true
        employer_logo_url:
          type: string
          nullable: true
        employer_linkedin_description:
          type: string
          nullable: true
        employer_company_id:
          type: array
          items:
            type: string
            nullable: true
          nullable: true
        employer_website:
          type: array
          items:
            type: string
            nullable: true
          nullable: true
        employee_position_id:
          type: string
          nullable: true
        employee_title:
          type: string
          nullable: true
        employee_description:
          type: string
          nullable: true
        employee_location:
          type: string
          nullable: true
        employee_start_date:
          type: string
          nullable: true
        employee_end_date:
          type: string
          nullable: true
      example:
        employer_name: Crustdata
        employee_title: Software Engineer
        employee_start_date: '2023-01-01'
    PersonProfileSchool:
      type: object
      description: Education entry under PersonProfile
      properties:
        school:
          type: string
          nullable: true
        degree:
          type: string
          nullable: true
        field_of_study:
          type: string
          nullable: true
        activities:
          type: string
          nullable: true
      example:
        school: MIT
        degree: BSc
        field_of_study: Computer Science
    SocialPostHyperlinks:
      type: object
      nullable: true
      properties:
        company_professional_network_urls:
          type: array
          nullable: true
          items:
            type: string
          description: Company page URLs mentioned in the post.
        person_professional_network_urls:
          type: array
          nullable: true
          items:
            type: string
          description: Person profile URLs mentioned in the post.
        other_urls:
          type: array
          nullable: true
          items:
            type: string
          description: Other URLs mentioned in the post.
        media_urls:
          type: array
          nullable: true
          items:
            type: string
          description: Image and video attachment URLs.
      description: URLs extracted from the post body.
    SocialPostEngagement:
      type: object
      nullable: true
      properties:
        total_reactions:
          type: integer
          nullable: true
        total_comments:
          type: integer
          nullable: true
        num_shares:
          type: integer
          nullable: true
        reactions_by_type:
          $ref: '#/components/schemas/SocialPostReactionsByType'
      description: Post-level engagement counts.
      example:
        total_reactions: 142
        total_comments: 9
        num_shares: 3
    SocialPostReactionsByType:
      type: object
      nullable: true
      properties:
        LIKE:
          type: integer
          nullable: true
        PRAISE:
          type: integer
          nullable: true
        EMPATHY:
          type: integer
          nullable: true
        INTEREST:
          type: integer
          nullable: true
        APPRECIATION:
          type: integer
          nullable: true
        ENTERTAINMENT:
          type: integer
          nullable: true
      description: >-
        Reaction counts broken down by type. Only reaction types present on the
        post are returned.
      example:
        LIKE: 128
        PRAISE: 14
  headers:
    XCreditsUsed:
      description: >-
        Exact credits this request deducted, as a decimal string (for example
        `3` or `0.03`). Present on success and error responses alike; `0` when
        the request deducted nothing (free endpoints, error responses, and
        asynchronous job submissions billed when the job runs). Responses
        generated before a request reaches the API, such as rate-limit `429`s,
        do not carry it.
      schema:
        type: string
        example: '0.03'
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: API key passed as a Bearer token in the Authorization header.

````

## Related topics

- [Company Enrich reference](https://docs.crustdata.com/company-docs/enrichment/reference.md)
- [Batch Enrich Companies](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-company-enrichment-job.md)
- [Company Enrichment API](https://docs.crustdata.com/company-docs/enrichment/introduction.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
- [Batch Person Enrichment API](https://docs.crustdata.com/person-docs/enrichment/batch-enrich.md)
