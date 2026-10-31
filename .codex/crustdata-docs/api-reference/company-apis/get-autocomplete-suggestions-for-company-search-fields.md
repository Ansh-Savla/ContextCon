> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Autocomplete

> Returns field value suggestions with document counts for company search fields.
Useful for discovering valid filter values before building search queries.
Accepts field names from the /company/search response schema using dot notation.

<Note>
    Default `rate-limit` is 45 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
</Note>




## OpenAPI

````yaml /openapi-specs/2025-11-01/company.yaml post /company/search/autocomplete
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
  /company/search/autocomplete:
    post:
      tags:
        - Company APIs
        - Autocomplete APIs
      summary: Get autocomplete suggestions for company search fields
      description: >
        Returns field value suggestions with document counts for company search
        fields.

        Useful for discovering valid filter values before building search
        queries.

        Accepts field names from the /company/search response schema using dot
        notation.


        <Note>
            Default `rate-limit` is 45 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
        </Note>
      operationId: autocompleteCompanyDataset
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        description: Field name, query text, and optional limit for autocomplete
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CompanyAutocompleteRequest'
            examples:
              autocomplete_industries:
                summary: Autocomplete industry values
                value:
                  field: basic_info.industries
                  query: tech
                  limit: 5
              autocomplete_company_names:
                summary: Autocomplete company names
                value:
                  field: basic_info.name
                  query: hub
                  limit: 5
              autocomplete_hq_country:
                summary: Autocomplete HQ countries
                value:
                  field: locations.country
                  query: ''
                  limit: 10
              autocomplete_fiscal_year_end:
                summary: Autocomplete fiscal year end month
                value:
                  field: revenue.public_markets.fiscal_year_end
                  query: ''
                  limit: 12
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Autocomplete suggestions with document counts
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CompanyAutocompleteResponse'
              examples:
                industry_suggestions:
                  summary: Industry autocomplete results
                  value:
                    suggestions:
                      - value: Technology, Information and Media
                      - value: Technology, Information and Internet
                      - value: Information Technology & Services
                      - value: Biotechnology Research
                      - value: Technical and Vocational Training
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Invalid request (e.g., unsupported field)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                error:
                  type: invalid_request
                  message: >-
                    Field 'invalid_field' is not supported on scope 'company'.
                    Valid fields: basic_info.company_type,
                    basic_info.employee_count_range, basic_info.industries,
                    basic_info.markets, basic_info.name,
                    basic_info.primary_domain, ...
                  metadata: []
        '401':
          description: Unauthorized - invalid or missing API key
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    description: Error message
                    example: Invalid API key in request
              example:
                message: Invalid API key in request
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
    CompanyAutocompleteRequest:
      type: object
      required:
        - field
        - query
      properties:
        field:
          type: string
          description: >
            The dataset API field name to get suggestions for. Valid fields
            include: basic_info.name, basic_info.primary_domain,
            basic_info.website, basic_info.professional_network_url,
            basic_info.professional_network_id, basic_info.company_type,
            basic_info.year_founded, basic_info.employee_count_range,
            basic_info.markets, basic_info.industries,
            revenue.estimated.lower_bound_usd,
            revenue.estimated.upper_bound_usd, revenue.acquisition_status,
            funding.total_investment_usd, funding.last_round_type,
            funding.last_fundraise_date, funding.investors,
            funding.tracxn_investors, headcount.latest_count,
            headcount.largest_headcount_country, locations.country,
            taxonomy.professional_network_industry,
            taxonomy.professional_network_specialities, taxonomy.categories,
            technographics.technologies.name,
            technographics.technologies.category,
            technographics.top_technologies, followers.latest_count,
            social_profiles.crunchbase.url, social_profiles.twitter_url,
            revenue.public_markets.stock_symbols,
            revenue.public_markets.fiscal_year_end.

            The dedicated field names technology (technology names) and
            technology_category

            (category slugs) are equivalent shorthands for the technographics
            paths.
          example: taxonomy.professional_network_industry
        query:
          type: string
          description: The search query text (can be empty to get top values by frequency)
          example: tech
        limit:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
          description: Maximum number of suggestions to return
      additionalProperties: false
      description: Request body for autocomplete suggestions on company search fields.
      example:
        field: basic_info.industries
        query: tech
        limit: 5
    CompanyAutocompleteResponse:
      type: object
      properties:
        suggestions:
          type: array
          items:
            $ref: '#/components/schemas/CompanyAutocompleteSuggestion'
      required:
        - suggestions
      description: Response with autocomplete suggestions for a company search field.
      example:
        suggestions:
          - value: Technology, Information and Media
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
    CompanyAutocompleteSuggestion:
      type: object
      properties:
        value:
          type: string
          description: The suggested field value
          example: Technology
      required:
        - value
      description: A single autocomplete suggestion for a company search field value.
      example:
        value: Technology
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

- [Autocomplete](https://docs.crustdata.com/api-reference/job-apis/autocomplete-values-for-a-job-search-field.md)
- [Person Autocomplete API](https://docs.crustdata.com/person-docs/autocomplete/introduction.md)
- [Job Autocomplete API](https://docs.crustdata.com/job-docs/autocomplete/introduction.md)
- [Company Autocomplete API](https://docs.crustdata.com/company-docs/autocomplete/introduction.md)
