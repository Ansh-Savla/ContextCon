> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Autocomplete

> Return type-ahead suggestions for the values of a single `/job/search` field.
Pass the `field` you intend to filter on (for example `title` or `category`) and a
partial `query`, and the endpoint returns matching values drawn from the indexed job
dataset. Use it to power autocomplete inputs or to discover the exact values a filter
will accept before issuing a `POST /job/search` request.

This endpoint does not consume credits.

<Note>
    Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
</Note>




## OpenAPI

````yaml /openapi-specs/2025-11-01/job.yaml post /job/search/autocomplete
openapi: 3.0.3
info:
  title: Job API
  version: '2025-11-01'
  description: >
    The Crustdata Job API provides access to job listings from the web, enriched
    with the hiring

    company's firmographics (headcount, funding, revenue, industries) and the
    job's location.


    Use `/job/search` to query the indexed job dataset with filters,
    cursor-based pagination,

    sorting, field selection, and aggregations. Use `/job/search/autocomplete`
    to get

    type-ahead suggestions for a filter field's values before searching. Use

    `/job/professional_network/search/live` to fetch job listings in real time
    for a given

    company when you need the freshest view of what a single company is hiring
    for.


    All requests require a valid API key passed via the `Authorization` header
    as a Bearer token

    and an `x-api-version` header set to the API version (e.g., "2025-11-01").
servers:
  - url: https://api.crustdata.com
    description: Production API server
security:
  - bearerAuth: []
tags:
  - name: Job APIs
    description: Core job data endpoints for indexed search and real-time fetch
  - name: Search APIs
    description: Endpoints for searching the indexed job dataset
  - name: Live APIs
    description: Endpoints that fetch data in real time from the web
paths:
  /job/search/autocomplete:
    post:
      tags:
        - Job APIs
        - Search APIs
      summary: Autocomplete values for a job search field
      description: >
        Return type-ahead suggestions for the values of a single `/job/search`
        field.

        Pass the `field` you intend to filter on (for example `title` or
        `category`) and a

        partial `query`, and the endpoint returns matching values drawn from the
        indexed job

        dataset. Use it to power autocomplete inputs or to discover the exact
        values a filter

        will accept before issuing a `POST /job/search` request.


        This endpoint does not consume credits.


        <Note>
            Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
        </Note>
      operationId: autocompleteJobSearch
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        description: >-
          The field to autocomplete, the partial query to match, and an optional
          result limit.
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/JobAutocompleteRequest'
            examples:
              title_autocomplete:
                summary: Autocomplete job titles starting with "Software"
                value:
                  field: title
                  query: Software
                  limit: 50
              category_autocomplete:
                summary: Autocomplete job categories matching "Eng"
                value:
                  field: category
                  query: Eng
                  limit: 10
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Matching suggestions for the requested field and query.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobAutocompleteResponse'
              examples:
                title_suggestions:
                  summary: Suggestions for job titles starting with "Software"
                  value:
                    suggestions:
                      - value: Software Engineer
                      - value: Software Engineering Manager
                      - value: Software Engineer II - Data Engineer
                      - value: Software Engineer in Test
                category_suggestions:
                  summary: Suggestions for job categories matching "Eng"
                  value:
                    suggestions:
                      - value: Engineering
                      - value: Engineering and Information Technology
                      - value: Engineering & Technology
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Invalid request - missing or unsupported `field`, missing `query`,
            or `limit` out of range.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                unsupported_field:
                  summary: field is not supported on the job scope
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Field 'not_a_field' is not supported on scope 'job'.
                        Valid fields: category, city,
                        company.basic_info.industries, company.basic_info.name,
                        company.basic_info.primary_domain,
                        company.funding.investors,
                        company.funding.last_round_type,
                        company.headcount.largest_country,
                        company.headcount.range, company.industries,
                        company.locations.city, company.locations.country,
                        company.locations.state, company.name,
                        company.revenue.acquisition_status,
                        company.revenue.public_markets.fiscal_year_end,
                        company.revenue.public_markets.stock_symbols, continent,
                        country, country_code, district, fiscal_year_end,
                        job_category, job_details.category, job_details.title,
                        job_details.workplace_type, job_title, location,
                        location.city, location.country, location.district,
                        location.raw, location.state, locations.city,
                        locations.country, locations.district,
                        locations.location, locations.state, state,
                        technographics.technologies.category,
                        technographics.technologies.name, technology,
                        technology_category, title, workplace_type
                      metadata: []
                missing_query:
                  summary: query is required
                  value:
                    error:
                      type: invalid_request
                      message: query is required
                      metadata: []
                limit_out_of_range:
                  summary: limit must be between 1 and 100
                  value:
                    error:
                      type: invalid_request
                      message: limit must be between 1 and 100
                      metadata: []
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
    JobAutocompleteRequest:
      type: object
      description: >-
        Request body for autocompleting the values of a single `/job/search`
        field.
      additionalProperties: false
      required:
        - field
        - query
      properties:
        field:
          type: string
          description: >
            The `/job/search` field whose values to autocomplete. Accepts the
            same

            names used in `/job/search` filters, plus their short aliases.


            Common values: `title`, `category`, `company.name`,
            `company.industries`,

            `location.country`, `location.city`, `location.state`.


            Full set of supported fields: `category`, `city`,

            `company.basic_info.industries`, `company.basic_info.name`,

            `company.basic_info.primary_domain`, `company.funding.investors`,

            `company.funding.last_round_type`,
            `company.headcount.largest_country`,

            `company.headcount.range`, `company.industries`,
            `company.locations.city`,

            `company.locations.country`, `company.locations.state`,
            `company.name`,

            `company.revenue.acquisition_status`,

            `company.revenue.public_markets.fiscal_year_end`,

            `company.revenue.public_markets.stock_symbols`, `continent`,
            `country`,

            `country_code`, `district`, `fiscal_year_end`, `job_category`,

            `job_details.category`, `job_details.title`,
            `job_details.workplace_type`,

            `job_title`, `location`, `location.city`, `location.country`,

            `location.district`, `location.raw`, `location.state`,
            `locations.city`,

            `locations.country`, `locations.district`, `locations.location`,

            `locations.state`, `state`, `technographics.technologies.category`,

            `technographics.technologies.name`, `technology`,
            `technology_category`,

            `title`, `workplace_type`.
          example: title
        query:
          type: string
          description: >-
            Partial text to match against the field's values. May be an empty
            string to return top values.
          example: Software
        limit:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
          description: Maximum number of suggestions to return. Must be between 1 and 100.
          example: 50
    JobAutocompleteResponse:
      type: object
      description: Autocomplete suggestions for the requested field and query.
      required:
        - suggestions
      properties:
        suggestions:
          type: array
          description: >-
            Matching values for the requested field, ordered by relevance. Empty
            when nothing matches.
          example:
            - value: Software Engineer
            - value: Software Engineering Manager
          items:
            $ref: '#/components/schemas/JobAutocompleteSuggestion'
    ErrorResponse:
      type: object
      description: >-
        Standard error response returned by job endpoints for all 4xx and 5xx
        errors, including authentication failures (`type: unauthorized`).
      required:
        - error
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
              description: Category of the error.
              enum:
                - invalid_request
                - unauthorized
                - permission_error
                - not_found
                - insufficient_credits
                - rate_limit_error
                - internal_error
              example: invalid_request
            message:
              type: string
              description: Human-readable error message.
              example: Company with id=999999999 not found.
            metadata:
              type: array
              description: >-
                Additional structured context (e.g., list of available fields).
                Often empty.
              default: []
              items:
                type: object
                additionalProperties: true
    JobAutocompleteSuggestion:
      type: object
      description: A single autocomplete suggestion.
      required:
        - value
      properties:
        value:
          type: string
          description: A suggested value for the requested field.
          example: Software Engineer
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

- [Autocomplete](https://docs.crustdata.com/api-reference/person-apis/get-autocomplete-suggestions-for-person-search-fields.md)
- [Person Autocomplete API](https://docs.crustdata.com/person-docs/autocomplete/introduction.md)
- [Job Autocomplete API](https://docs.crustdata.com/job-docs/autocomplete/introduction.md)
- [Company Autocomplete API](https://docs.crustdata.com/company-docs/autocomplete/introduction.md)
