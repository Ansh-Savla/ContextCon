> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Search Companies

> Search the Crustdata company database using structured filters, a natural-language
query, or both. Ranked search supports hybrid, lexical, and semantic retrieval with
cursor pagination: up to 100 results per page and 1,000 candidate positions per search.
Ranked cursors expire 20 minutes after the initial search. The first 100 candidates
are reranked; later results use retrieval ranking without another reranking pass.
Filter-only search supports complex AND/OR filter logic, cursor-based pagination,
sorting, and field selection.
Only indexed fields are searchable; use /company/enrich for non-indexed fields
like news, people, or web_traffic.

Pricing: 0.03 credits per result, plus a per-result charge for each premium group you filter on or receive (taxonomy 0.1; followers, headcount, funding, hiring, software_reviews and maps 0.2; technographics 1, filter side only). Filtering and receiving bill independently and sorting is free. Premium groups are returned when you name them in `fields` or when your plan includes them at no charge, so a plain request costs the base price. Your account's prices are on /account/endpoints.

<Note>
    Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
</Note>




## OpenAPI

````yaml /openapi-specs/2025-11-01/company.yaml post /company/search
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
  /company/search:
    post:
      tags:
        - Company APIs
        - Search APIs
      summary: Search companies with indexed fields only
      description: >
        Search the Crustdata company database using structured filters, a
        natural-language

        query, or both. Ranked search supports hybrid, lexical, and semantic
        retrieval with

        cursor pagination: up to 100 results per page and 1,000 candidate
        positions per search.

        Ranked cursors expire 20 minutes after the initial search. The first 100
        candidates

        are reranked; later results use retrieval ranking without another
        reranking pass.

        Filter-only search supports complex AND/OR filter logic, cursor-based
        pagination,

        sorting, and field selection.

        Only indexed fields are searchable; use /company/enrich for non-indexed
        fields

        like news, people, or web_traffic.


        Pricing: 0.03 credits per result, plus a per-result charge for each
        premium group you filter on or receive (taxonomy 0.1; followers,
        headcount, funding, hiring, software_reviews and maps 0.2;
        technographics 1, filter side only). Filtering and receiving bill
        independently and sorting is free. Premium groups are returned when you
        name them in `fields` or when your plan includes them at no charge, so a
        plain request costs the base price. Your account's prices are on
        /account/endpoints.


        <Note>
            Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
        </Note>
      operationId: searchCompanyDataset
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        description: >-
          Structured filters, ranked search, pagination, sorting, and field
          selection
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CompanySearchRequest'
            examples:
              ranked_hybrid_first:
                summary: Start a ranked paginated search
                value:
                  search:
                    query: software companies
                    mode: hybrid
                  fields:
                    - crustdata_company_id
                  limit: 2
              ranked_hybrid_next:
                summary: Continue a ranked search
                value:
                  search:
                    query: software companies
                    mode: hybrid
                  fields:
                    - crustdata_company_id
                  limit: 2
                  cursor: PASTE_NEXT_CURSOR_VALUE_HERE
              filter_by_naics_code:
                summary: Filter by primary NAICS code and return the classification
                value:
                  filters:
                    op: and
                    conditions:
                      - field: taxonomy.primary_naics_detail.naics_code
                        type: '='
                        value: '541511'
                      - field: locations.country
                        type: '='
                        value: USA
                  sorts:
                    - field: headcount.total
                      order: desc
                  limit: 2
                  fields:
                    - crustdata_company_id
                    - basic_info.name
                    - basic_info.primary_domain
                    - taxonomy.primary_naics_detail
                    - taxonomy.sic_detail_list
              search_by_domain:
                summary: Search by primary domain
                value:
                  filters:
                    field: basic_info.primary_domain
                    type: '='
                    value: hubspot.com
                  fields:
                    - basic_info
                    - headcount
                    - funding
                  limit: 1
              hybrid_product_search:
                summary: Find companies by product focus within a country
                value:
                  search:
                    query: >-
                      AI infrastructure companies building tools for model
                      deployment and monitoring
                    mode: hybrid
                  filters:
                    field: locations.country
                    type: '='
                    value: USA
                  fields:
                    - basic_info.name
                    - basic_info.primary_domain
                    - basic_info.description
                    - locations.headquarters
                    - headcount.total
                  limit: 10
              recently_funded_us_companies:
                summary: Recently funded US companies (Series A/B)
                value:
                  filters:
                    op: and
                    conditions:
                      - field: funding.last_fundraise_date
                        type: '>'
                        value: '2024-01-01'
                      - field: funding.last_round_type
                        type: in
                        value:
                          - series_a
                          - series_b
                      - field: locations.country
                        type: '='
                        value: USA
                  fields:
                    - basic_info.name
                    - basic_info.primary_domain
                    - funding
                  limit: 2
                  sorts:
                    - field: funding.last_round_amount_usd
                      order: desc
              mid_size_companies_with_growth:
                summary: Mid-size US companies sorted by headcount
                value:
                  filters:
                    op: and
                    conditions:
                      - field: headcount.total
                        type: '>'
                        value: 50
                      - field: headcount.total
                        type: <
                        value: 500
                      - field: locations.country
                        type: '='
                        value: USA
                  fields:
                    - basic_info.name
                    - basic_info.primary_domain
                    - headcount.total
                    - locations.country
                  limit: 3
                  sorts:
                    - field: headcount.total
                      order: desc
              high_growth_mid_size_companies:
                summary: Mid-size companies with >15% 6-month headcount growth
                description: >
                  Filter on the dotted period path `headcount.growth_percent.6m`
                  to find companies whose 6-month headcount growth exceeds a
                  threshold. The same shape applies to `.1m`, `.3m`, `.12m` and
                  to `headcount.growth_absolute.*` for absolute employee deltas.
                  These dotted paths are filterable but not sortable — sort on
                  `headcount.total` instead.
                value:
                  filters:
                    op: and
                    conditions:
                      - field: headcount.growth_percent.6m
                        type: '>'
                        value: 15
                      - field: headcount.total
                        type: '>'
                        value: 200
                      - field: headcount.total
                        type: <
                        value: 2000
                  fields:
                    - basic_info.name
                    - basic_info.primary_domain
                    - headcount.total
                    - headcount.growth_percent
                  limit: 2
                  sorts:
                    - field: headcount.total
                      order: desc
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Companies matching the search criteria
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CompanySearchResponse'
              examples:
                search_by_domain_response:
                  summary: Single company found by domain
                  value:
                    companies:
                      - crustdata_company_id: 662397
                        basic_info:
                          name: HubSpot
                          primary_domain: hubspot.com
                          website: https://hubspot.com
                          professional_network_url: https://www.linkedin.com/company/hubspot
                          professional_network_id: '68529'
                          company_type: Public Company
                          year_founded: 2006
                          employee_count_range: 5001-10000
                          markets:
                            - NYSE
                        taxonomy:
                          professional_network_industry: Software Development
                        headcount:
                          total: 11965
                          growth_percent:
                            1m: 0.67
                            3m: 2.69
                            6m: 5.5
                            12m: 12.63
                          growth_absolute:
                            1m: 81
                            3m: 318
                            6m: 634
                            12m: 1363
                        funding:
                          total_investment_usd: 130000000
                          last_round_amount_usd: 100000000
                          last_fundraise_date: '2021-10-13'
                          last_round_type: ''
                          investors: []
                    next_cursor: H4sIAJj5zGkC_xXMMQ7CMAxA0...
                    total_count: 264
                high_growth_mid_size_response:
                  summary: Mid-size companies with >15% 6-month headcount growth
                  value:
                    companies:
                      - crustdata_company_id: 3117226
                        basic_info:
                          name: IRT
                          primary_domain: irt.uy
                        headcount:
                          total: 1991
                          growth_percent:
                            1m: 3
                            3m: 3
                            6m: 17.26
                            12m: 32.73
                      - crustdata_company_id: 1082282
                        basic_info:
                          name: MS Office
                          primary_domain: msofice.org
                        headcount:
                          total: 1990
                          growth_percent:
                            1m: 29.22
                            3m: 29.22
                            6m: 32.76
                            12m: 47.3
                    next_cursor: H4sIAE5PGGoC_xXMOw7CMAwA0KtEnjvY...
                    total_count: 4685
                recently_funded_response:
                  summary: Recently funded companies
                  value:
                    companies:
                      - crustdata_company_id: 949125
                        basic_info:
                          name: Reflection AI
                          primary_domain: reflection.ai
                        funding:
                          total_investment_usd: 2130000000
                          last_round_amount_usd: 2000000000
                          last_fundraise_date: '2025-10-09'
                          last_round_type: series_b
                          investors:
                            - Sequoia Capital
                            - NVIDIA
                            - Lightspeed Venture Partners
                      - crustdata_company_id: 1193160
                        basic_info:
                          name: Xaira Therapeutics
                          primary_domain: xaira.com
                        funding:
                          total_investment_usd: 1000000000
                          last_round_amount_usd: 1000000000
                          last_fundraise_date: '2024-04-23'
                          last_round_type: series_a
                          investors:
                            - ARCH Venture Partners
                            - Sequoia Capital
                            - Lux Capital
                    next_cursor: H4sIAM_5zGkC_zWMuw7CMAxA...
                    total_count: 2819
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Invalid search request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                malformed_cursor:
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Invalid cursor: expired or malformed; restart without
                        cursor
                      metadata: []
                changed_query:
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Invalid cursor: query, mode, filters and API version
                        must remain unchanged
                      metadata: []
                invalid_field:
                  summary: Unsupported filter field
                  value:
                    error:
                      type: invalid_request
                      message: 'Unsupported columns in conditions: [''invalid_field'']'
                      metadata: []
                missing_sort_field:
                  summary: sorts entry missing the required `field` key
                  value:
                    error:
                      type: invalid_request
                      message: 'Missing required field: ''sorts.0.field''.'
                      metadata:
                        - field: sorts.0.field
                          type: missing
                          message: 'Missing required field: ''sorts.0.field''.'
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
            Forbidden - search access not available for this account, or a
            requested field is not enabled on it
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
                      message: You do not have permission to access /company/search.
                      metadata: []
                fields_denied:
                  summary: A requested field is not enabled on the account
                  value:
                    error:
                      type: permission_error
                      message: >-
                        Access denied to fields: funding. To enable access,
                        please book a call with us at
                        https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request
                      metadata:
                        - denied_fields:
                            - funding
                          permitted_fields:
                            - basic_info
                            - headcount
                            - locations
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
    CompanySearchRequest:
      type: object
      additionalProperties: false
      properties:
        filters:
          description: >-
            Search filters. Required when `search` is omitted. When combined
            with ranked search, filters are hard constraints applied before
            retrieval.
          example:
            field: basic_info.primary_domain
            type: '='
            value: hubspot.com
          oneOf:
            - $ref: '#/components/schemas/SearchCondition'
            - $ref: '#/components/schemas/SearchConditionGroup'
        search:
          $ref: '#/components/schemas/CompanySemanticSearch'
        cursor:
          type: string
          description: >-
            Pagination cursor from the previous response's `next_cursor`. For
            ranked search, keep query, mode, filters and API version unchanged;
            limit and authorized fields may change. Cursors expire 20 minutes
            after the initial ranked search. Restart without cursor if the
            cursor or cached search is no longer valid.
          example: H4sIAJj5zGkC_xXMMQ7CMAxA0...
        limit:
          type: integer
          minimum: 1
          maximum: 1000
          default: 20
          description: >-
            Results per page. The maximum is 1000 for filter-only search and 100
            for ranked search. Ranked search covers at most 1000 candidate
            positions across pages.
        sorts:
          type: array
          description: >-
            Sort directives applied to filter-only results. Not supported with
            ranked search.
          example:
            - field: headcount.total
              order: desc
          items:
            $ref: '#/components/schemas/SearchSort'
        fields:
          type: array
          description: >
            Fields to return in the response. Use dot-notation for nested fields
            (e.g., "basic_info.name", "headcount.total"). Each company always
            includes `crustdata_company_id`, even when you do not request it.
            Every requested field is in the response, and a field with no data
            for the company is `null`. When a requested group has no data, the
            whole group is `null`, even if you asked for one of its sub-fields.
            Valid top-level groups for search: basic_info, revenue, headcount,
            funding, hiring, locations, taxonomy, followers, social_profiles,
            software_reviews, metadata, updated_at, indexed_at,
            crustdata_company_id. Some groups are filter-only and cannot be
            selected here (for example roles, skills, seo, competitors), and
            groups not in the search index (for example news, people,
            web_traffic, employee_reviews) are rejected. Use /company/enrich for
            those.
          example:
            - basic_info
            - headcount
            - funding
          items:
            type: string
      description: >-
        Request body for searching the company database. Supply at least one of
        `filters` or `search`.
      example:
        filters:
          field: basic_info.primary_domain
          type: '='
          value: hubspot.com
        fields:
          - basic_info
          - headcount
          - funding
        limit: 1
    CompanySearchResponse:
      type: object
      properties:
        companies:
          type: array
          items:
            $ref: '#/components/schemas/CompanySearch'
        next_cursor:
          type: string
          nullable: true
          description: >-
            Pass as cursor to continue. A ranked page can be short or empty with
            a non-null cursor; continue until null.
        total_count:
          type: integer
          nullable: true
          description: >-
            Always null for ranked search. Filter-only totals may also be
            unavailable.
        query:
          type: object
          additionalProperties: true
      required:
        - companies
      description: Paginated response from the /company/search endpoint.
      example:
        companies: []
        next_cursor: null
        total_count: 0
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
    SearchCondition:
      type: object
      required:
        - field
        - type
        - value
      properties:
        field:
          type: string
          description: >
            Field name to filter on. Valid fields: crustdata_company_id,
            updated_at, indexed_at, metadata.growth_calculation_date,
            basic_info.company_id, basic_info.name, basic_info.primary_domain,
            basic_info.website, basic_info.professional_network_url,
            basic_info.professional_network_id, basic_info.company_type,
            basic_info.status, basic_info.year_founded,
            basic_info.employee_count_range, basic_info.markets,
            basic_info.industries, revenue.estimated.lower_bound_usd,
            revenue.estimated.upper_bound_usd, revenue.acquisition_status,
            funding.total_investment_usd, funding.last_round_amount_usd,
            funding.last_fundraise_date, funding.last_round_type,
            funding.investors, funding.tracxn_investors, headcount.total,
            headcount.growth_percent.1m, headcount.growth_percent.3m,
            headcount.growth_percent.6m, headcount.growth_percent.12m,
            headcount.growth_absolute.1m, headcount.growth_absolute.3m,
            headcount.growth_absolute.6m, headcount.growth_absolute.12m,
            roles.distribution, roles.distribution.accounting,
            roles.distribution.administrative,
            roles.distribution.arts_and_design,
            roles.distribution.business_development,
            roles.distribution.community_and_social_services,
            roles.distribution.consulting,
            roles.distribution.customer_success_and_support,
            roles.distribution.education, roles.distribution.engineering,
            roles.distribution.entrepreneurship, roles.distribution.finance,
            roles.distribution.healthcare_services,
            roles.distribution.human_resources,
            roles.distribution.information_technology, roles.distribution.legal,
            roles.distribution.marketing,
            roles.distribution.media_and_communication,
            roles.distribution.military_and_protective_services,
            roles.distribution.operations,
            roles.distribution.product_management,
            roles.distribution.program_and_project_management,
            roles.distribution.purchasing, roles.distribution.quality_assurance,
            roles.distribution.real_estate, roles.distribution.research,
            roles.distribution.sales, roles.distribution.support,
            roles.distribution_percent, roles.distribution_percent.accounting,
            roles.distribution_percent.administrative,
            roles.distribution_percent.arts_and_design,
            roles.distribution_percent.business_development,
            roles.distribution_percent.community_and_social_services,
            roles.distribution_percent.consulting,
            roles.distribution_percent.customer_success_and_support,
            roles.distribution_percent.education,
            roles.distribution_percent.engineering,
            roles.distribution_percent.entrepreneurship,
            roles.distribution_percent.finance,
            roles.distribution_percent.healthcare_services,
            roles.distribution_percent.human_resources,
            roles.distribution_percent.information_technology,
            roles.distribution_percent.legal,
            roles.distribution_percent.marketing,
            roles.distribution_percent.media_and_communication,
            roles.distribution_percent.military_and_protective_services,
            roles.distribution_percent.operations,
            roles.distribution_percent.product_management,
            roles.distribution_percent.program_and_project_management,
            roles.distribution_percent.purchasing,
            roles.distribution_percent.quality_assurance,
            roles.distribution_percent.real_estate,
            roles.distribution_percent.research,
            roles.distribution_percent.sales,
            roles.distribution_percent.support, roles.growth_6m,
            roles.growth_6m.accounting, roles.growth_6m.administrative,
            roles.growth_6m.arts_and_design,
            roles.growth_6m.business_development,
            roles.growth_6m.community_and_social_services,
            roles.growth_6m.consulting,
            roles.growth_6m.customer_success_and_support,
            roles.growth_6m.education, roles.growth_6m.engineering,
            roles.growth_6m.entrepreneurship, roles.growth_6m.finance,
            roles.growth_6m.healthcare_services,
            roles.growth_6m.human_resources,
            roles.growth_6m.information_technology, roles.growth_6m.legal,
            roles.growth_6m.marketing, roles.growth_6m.media_and_communication,
            roles.growth_6m.military_and_protective_services,
            roles.growth_6m.operations, roles.growth_6m.product_management,
            roles.growth_6m.program_and_project_management,
            roles.growth_6m.purchasing, roles.growth_6m.quality_assurance,
            roles.growth_6m.real_estate, roles.growth_6m.research,
            roles.growth_6m.sales, roles.growth_6m.support, roles.growth_yoy,
            roles.growth_yoy.accounting, roles.growth_yoy.administrative,
            roles.growth_yoy.arts_and_design,
            roles.growth_yoy.business_development,
            roles.growth_yoy.community_and_social_services,
            roles.growth_yoy.consulting,
            roles.growth_yoy.customer_success_and_support,
            roles.growth_yoy.education, roles.growth_yoy.engineering,
            roles.growth_yoy.entrepreneurship, roles.growth_yoy.finance,
            roles.growth_yoy.healthcare_services,
            roles.growth_yoy.human_resources,
            roles.growth_yoy.information_technology, roles.growth_yoy.legal,
            roles.growth_yoy.marketing,
            roles.growth_yoy.media_and_communication,
            roles.growth_yoy.military_and_protective_services,
            roles.growth_yoy.operations, roles.growth_yoy.product_management,
            roles.growth_yoy.program_and_project_management,
            roles.growth_yoy.purchasing, roles.growth_yoy.quality_assurance,
            roles.growth_yoy.real_estate, roles.growth_yoy.research,
            roles.growth_yoy.sales, roles.growth_yoy.support, locations.country,
            locations.headquarters, locations.street_address,
            locations.all_office_addresses, headcount.largest_headcount_country,
            taxonomy.professional_network_industry,
            taxonomy.professional_network_specialities, taxonomy.categories,
            taxonomy.primary_naics_detail.naics_code,
            taxonomy.primary_naics_detail.sector,
            taxonomy.primary_naics_detail.sub_sector,
            taxonomy.primary_naics_detail.industry_group,
            taxonomy.primary_naics_detail.industry,
            taxonomy.primary_naics_detail.year,
            taxonomy.sic_detail_list.sic_code,
            taxonomy.sic_detail_list.industry, taxonomy.sic_detail_list.year,
            followers.count, followers.mom_percent, followers.qoq_percent,
            followers.six_months_growth_percent, followers.yoy_percent,
            competitors.company_ids, competitors.websites,
            revenue.public_markets.fiscal_year_end,
            revenue.public_markets.ipo_date,
            revenue.public_markets.stock_symbols,
            social_profiles.crunchbase.url, social_profiles.crunchbase.uuid,
            social_profiles.twitter_url, social_profiles.professional_network,
            technographics.total_technologies, technographics.technologies.name,
            technographics.technologies.category,
            technographics.technologies.super_category,
            technographics.top_technologies
          example: basic_info.primary_domain
        type:
          type: string
          description: >
            Filter operator. Use '=' for exact match, '!=' for not equal, '<'
            and '>' for exclusive numeric/date comparisons, '=<' for
            less-than-or-equal, '=>' for greater-than-or-equal, 'in'/'not_in'
            for set membership (value must be an array), 'is_null'/'is_not_null'
            for null checks (value must be a literal null and the `value` key is
            required), '(.)' for fuzzy text search, and '[.]' for exact token
            matching. Use '=<' and '=>' instead of '<=' and '>='. For
            substring-style matching, use '(.)'.
          enum:
            - '='
            - '!='
            - <
            - '=<'
            - '>'
            - '=>'
            - in
            - not_in
            - is_null
            - is_not_null
            - (.)
            - '[.]'
        value:
          oneOf:
            - type: string
              nullable: true
            - type: number
            - type: integer
            - type: boolean
            - type: array
              items:
                oneOf:
                  - type: string
                  - type: number
                  - type: integer
      description: A single filter condition used to match companies in /company/search.
      example:
        field: basic_info.primary_domain
        type: '='
        value: hubspot.com
    SearchConditionGroup:
      type: object
      required:
        - op
        - conditions
      properties:
        op:
          type: string
          enum:
            - and
            - or
        conditions:
          type: array
          minItems: 1
          items:
            oneOf:
              - $ref: '#/components/schemas/SearchCondition'
              - $ref: '#/components/schemas/SearchConditionGroup'
      description: A group of filter conditions combined with an and/or operator.
      example:
        op: and
        conditions:
          - field: headcount.total
            type: '>'
            value: 100
    CompanySemanticSearch:
      type: object
      additionalProperties: false
      required:
        - query
      properties:
        query:
          type: string
          minLength: 1
          maxLength: 131072
          description: Natural-language description of the companies to find.
        mode:
          type: string
          enum:
            - hybrid
            - lexical
            - semantic
          default: hybrid
          description: Retrieval mode for the natural-language query.
    SearchSort:
      type: object
      required:
        - field
        - order
      properties:
        field:
          type: string
          description: >
            Field name to sort on. Valid sortable fields: crustdata_company_id,
            updated_at, indexed_at, metadata.growth_calculation_date,
            basic_info.company_id, basic_info.name, basic_info.primary_domain,
            basic_info.year_founded, basic_info.employee_count_range,
            revenue.estimated.lower_bound_usd,
            revenue.estimated.upper_bound_usd, revenue.public_markets.ipo_date,
            funding.total_investment_usd, funding.last_round_amount_usd,
            funding.last_fundraise_date, headcount.total,
            headcount.largest_headcount_country, followers.count,
            locations.country, technographics.total_technologies
          example: funding.last_round_amount_usd
        order:
          type: string
          description: Sort direction.
          enum:
            - asc
            - desc
          example: desc
      description: Sort directive for /company/search specifying field and order.
      example:
        field: funding.last_round_amount_usd
        order: desc
    CompanySearch:
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
              nullable: true
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
                  nullable: true
                upper_bound_usd:
                  type: integer
                  nullable: true
            public_markets:
              type: object
              properties:
                ipo_date:
                  type: string
                  format: date
                  nullable: true
                stock_symbols:
                  type: array
                  items:
                    type: string
                  nullable: true
                fiscal_year_end:
                  type: string
                  nullable: true
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
            growth_percent:
              type: object
              description: >
                Headcount growth percent by period. Keys are period suffixes
                (`1m`, `3m`, `6m`, `12m`); values are percentage changes over
                the trailing window. Each period is also filterable via
                `headcount.growth_percent.{period}` on `/company/search`.
              additionalProperties:
                type: number
                nullable: true
              example:
                1m: 0.67
                3m: 2.69
                6m: 5.5
                12m: 12.63
            growth_absolute:
              type: object
              description: >
                Headcount absolute change by period. Keys are period suffixes
                (`1m`, `3m`, `6m`, `12m`); values are absolute employee-count
                deltas over the trailing window. Each period is also filterable
                via `headcount.growth_absolute.{period}` on `/company/search`.
              additionalProperties:
                type: integer
                nullable: true
              example:
                1m: 81
                3m: 318
                6m: 634
                12m: 1363
        software_reviews:
          type: object
          properties:
            review_count:
              type: integer
              nullable: true
            average_rating:
              type: number
              nullable: true
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
            investors:
              type: array
              items:
                type: string
              nullable: true
        hiring:
          type: object
          properties:
            openings_count:
              type: integer
            openings_growth_percent:
              type: object
              additionalProperties:
                type: number
                nullable: true
            by_function_qoq_pct:
              type: object
              additionalProperties:
                type: number
                nullable: true
            by_function_6m_pct:
              type: object
              additionalProperties:
                type: number
                nullable: true
        locations:
          type: object
          properties:
            country:
              type: string
              nullable: true
              description: >
                Headquarters country as a full country name. Filter with the
                name or an

                ISO 3166-1 alpha-3 code, such as `USA`. Both forms return the
                same companies.
              example: United States
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
              description: >
                Primary NAICS classification: the six-digit code and the sector,
                sub-sector, and industry-group levels above it. `null` when the
                company has no NAICS code. Every leaf is also a filter path
                under `taxonomy.primary_naics_detail.*`. Returned as part of the
                `taxonomy` group at no extra charge.
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
                  description: >-
                    NAICS edition year the code belongs to. Filterable, not
                    sortable.
            sic_detail_list:
              type: array
              nullable: true
              description: >
                SIC codes assigned to the company, one entry per code. `null`
                when the company has none. Every leaf is also a filter path
                under `taxonomy.sic_detail_list.*`. Two `sic_code` conditions
                under `and` match a company whose list holds both codes.
                Returned as part of the `taxonomy` group at no extra charge.
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
                    description: >-
                      SIC edition year the code belongs to. Filterable, not
                      sortable.
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
      description: >-
        A company profile returned by the /company/search endpoint. Only indexed
        fields are populated.
      example:
        crustdata_company_id: 68529
        basic_info:
          name: HubSpot
          primary_domain: hubspot.com
        headcount:
          total: 11965
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

- [Batch Search Companies](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-company-database-search-job.md)
- [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md)
- [Company Search API](https://docs.crustdata.com/company-docs/search/introduction.md)
- [Company Search reference](https://docs.crustdata.com/company-docs/search/reference.md)
- [Batch Company Search API](https://docs.crustdata.com/company-docs/search/batch-search.md)
