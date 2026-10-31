> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Autocomplete

> Return ranked field-value suggestions for any supported person
search field. Use this endpoint to discover the exact indexed values that
`/person/search` filters expect — feed the suggestion `value` back into a search filter
verbatim to retrieve the matching profiles.

Pass a partial `query` string for type-ahead behaviour, or pass an empty `query` to
retrieve the most common values for the field by frequency. Suggestions always come from
the whole dataset. There is no `filters` scope; a `filters` key is ignored.

The top-level `field` must be one of the supported autocomplete fields — an allowlisted
subset of the field names used by `/person/search`, not every field exposed in its
request and response schemas. Sending an unsupported field returns a 400 whose error
message lists every accepted field.

<Note>
    Default `rate-limit` is 45 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
</Note>




## OpenAPI

````yaml /openapi-specs/2025-11-01/person.yaml post /person/search/autocomplete
openapi: 3.0.3
info:
  title: Person Dataset API
  version: '2025-11-01'
  description: >
    The Person Dataset API provides a comprehensive suite of endpoints for
    discovering, enriching, and managing person data at scale.


    - **Search**: Query the person database using flexible filters, sorting, and
    pagination to find people matching specific criteria such as job title,
    company, location, and more.

    - **Enrich**: Enrich person records from the cached dataset using profile
    URLs, returning detailed professional information.

    - **Live Enrich**: Fetch fresh profile data from the web when a profile is
    not yet in the cache or when the latest data is needed.

    - **Autocomplete**: Get type-ahead suggestions for person search fields,
    useful for building search UIs with field value previews.

    - **Realtime Search**: Search people in real time using live person search
    filters, supporting both synchronous and asynchronous (background job)
    modes.
servers:
  - url: https://api.crustdata.com
    description: Production API server
security:
  - bearerAuth: []
tags:
  - name: Person APIs
    description: Core person data operations
  - name: Search APIs
    description: Endpoints for searching and discovering people
  - name: Enrich APIs
    description: Endpoints for enriching person records
  - name: Autocomplete APIs
    description: Endpoints for field value autocomplete suggestions
paths:
  /person/search/autocomplete:
    post:
      tags:
        - Person APIs
        - Autocomplete APIs
      summary: Get autocomplete suggestions for person search fields
      description: >
        Return ranked field-value suggestions for any supported person

        search field. Use this endpoint to discover the exact indexed values
        that

        `/person/search` filters expect — feed the suggestion `value` back into
        a search filter

        verbatim to retrieve the matching profiles.


        Pass a partial `query` string for type-ahead behaviour, or pass an empty
        `query` to

        retrieve the most common values for the field by frequency. Suggestions
        always come from

        the whole dataset. There is no `filters` scope; a `filters` key is
        ignored.


        The top-level `field` must be one of the supported autocomplete fields —
        an allowlisted

        subset of the field names used by `/person/search`, not every field
        exposed in its

        request and response schemas. Sending an unsupported field returns a 400
        whose error

        message lists every accepted field.


        <Note>
            Default `rate-limit` is 45 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
        </Note>
      operationId: autocompletePersonDataset
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: true
        description: >
          Specify the dataset field to autocomplete, the partial `query` text to
          match against, an optional `limit` (1-100, default 20), and an
          optional `filters` scope that narrows the population the suggestions
          are computed against.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PersonAutocompleteRequest'
            examples:
              title_query:
                summary: Autocomplete current job titles starting with "VP"
                description: >
                  Type-ahead lookup of current job titles. Pass the user's
                  partial input as `query` and use `limit` to cap the dropdown
                  size.
                value:
                  field: experience.employment_details.current.title
                  query: VP
                  limit: 5
              top_titles_empty_query:
                summary: Top current job titles by frequency (empty query)
                description: >
                  Pass an empty `query` to retrieve the most common values for
                  the field, useful for seeding popular options in a dropdown.
                value:
                  field: experience.employment_details.current.title
                  query: ''
                  limit: 5
              city_query:
                summary: Autocomplete city names starting with "San"
                description: >
                  Discover the exact city values indexed in
                  `basic_profile.location.city` so you can use them in person
                  search location filters.
                value:
                  field: basic_profile.location.city
                  query: San
                  limit: 5
              company_name_query:
                summary: Autocomplete current employer names starting with "Goog"
                description: >
                  Discover canonical employer names so you can build a company
                  filter that matches the exact indexed string.
                value:
                  field: experience.employment_details.current.name
                  query: Goog
                  limit: 5
              country_query:
                summary: Autocomplete countries starting with "United"
                description: >
                  Discover the indexed country labels (note that `United States`
                  and `United States of America` are stored as distinct values).
                value:
                  field: basic_profile.location.country
                  query: United
                  limit: 5
              school_query:
                summary: Autocomplete schools matching "Stanford"
                description: >
                  Discover the indexed school names so you can filter people by
                  educational institution.
                value:
                  field: education.schools.school
                  query: Stanford
                  limit: 5
              skills_query:
                summary: Autocomplete skills matching "Python"
                description: >
                  Discover indexed skill labels — note that the same skill can
                  appear in multiple language variants and casings.
                value:
                  field: skills.professional_network_skills
                  query: Python
                  limit: 5
              top_seniority_levels:
                summary: Top seniority level buckets by frequency
                description: >
                  Empty-query autocomplete on `seniority_level` returns the most
                  common buckets used by the dataset, useful for building a
                  seniority filter.
                value:
                  field: experience.employment_details.current.seniority_level
                  query: ''
                  limit: 5
              function_category_query:
                summary: Autocomplete function categories starting with "Eng"
                description: >
                  Discover indexed function category labels for current roles
                  (for example, `Engineering`, `Engineering Operations`).
                value:
                  field: experience.employment_details.current.function_category
                  query: Eng
                  limit: 5
              open_to_cards_values:
                summary: All open-to-card values
                description: >
                  Empty-query autocomplete on `open_to_cards` returns the closed
                  set of card values the field can take. Feed any value back
                  into a `professional_network.open_to_cards` filter on
                  `/person/search`.
                value:
                  field: open_to_cards
                  query: ''
                  limit: 10
              employment_type_top:
                summary: Top employment-type values by frequency
                description: >
                  Discover canonical `employment_type` labels (for example,
                  `Full-time`, `Part-time`, `Internship`) for use as exact-match
                  values in employment-type filters.
                value:
                  field: employment_type
                  query: ''
                  limit: 10
              research_interests_query:
                summary: Autocomplete research interests matching "machine"
                description: >
                  Discover the stored research interest labels on matched
                  academic author profiles. Feed a returned `value` into a
                  `research_profiles.research_interests` filter on
                  `/person/search`. The search filter needs the
                  `research_profiles` grant; this lookup does not.
                value:
                  field: research_profiles.research_interests
                  query: machine
                  limit: 5
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Ranked autocomplete suggestions for the requested person search
            field.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PersonAutocompleteResponse'
              examples:
                title_query:
                  summary: Title autocomplete results for query "VP"
                  value:
                    suggestions:
                      - value: VP
                      - value: VP of Sales
                      - value: vp
                      - value: VP Sales
                      - value: VP Operations
                top_titles_empty_query:
                  summary: Top current job titles (empty query)
                  value:
                    suggestions:
                      - value: Owner
                      - value: Manager
                      - value: Project Manager
                      - value: Intern
                      - value: Software Engineer
                city_query:
                  summary: City autocomplete results for query "San"
                  value:
                    suggestions:
                      - value: San Francisco
                      - value: Santiago
                      - value: San Diego
                      - value: San Antonio
                      - value: San Jose
                company_name_query:
                  summary: Company name autocomplete results for query "Goog"
                  value:
                    suggestions:
                      - value: Google
                      - value: Google DeepMind
                      - value: Google Operations Center
                      - value: google
                      - value: Google Developers Group
                country_query:
                  summary: Country autocomplete results for query "United"
                  value:
                    suggestions:
                      - value: United States
                      - value: United Kingdom
                      - value: United States of America
                      - value: United Arab Emirates
                school_query:
                  summary: School autocomplete results for query "Stanford"
                  value:
                    suggestions:
                      - value: Stanford University
                      - value: Stanford University Graduate School of Business
                      - value: Stanford University School of Medicine
                      - value: Stanford Law School
                      - value: Stanford Continuing Studies
                skills_query:
                  summary: Skills autocomplete results for query "Python"
                  value:
                    suggestions:
                      - value: Python (Programming Language)
                      - value: Python
                      - value: Python (langage de programmation)
                      - value: python
                      - value: Python (Programmiersprache)
                top_seniority_levels:
                  summary: Top seniority level buckets (empty query)
                  value:
                    suggestions:
                      - value: Entry Level
                      - value: Entry Level Manager
                      - value: Senior
                      - value: Director
                      - value: Owner / Partner
                function_category_query:
                  summary: Function category autocomplete results for query "Eng"
                  value:
                    suggestions:
                      - value: Engineering
                open_to_cards_values:
                  summary: Closed set of open-to-card values
                  value:
                    suggestions:
                      - value: CAREER_INTEREST
                      - value: HIRING_MANAGER
                      - value: VOLUNTEERING
                employment_type_top:
                  summary: Top employment-type values (empty query)
                  value:
                    suggestions:
                      - value: Full-time
                      - value: Part-time
                      - value: Internship
                filtered_titles_at_company:
                  summary: Top "VP" titles among current Google employees
                  value:
                    suggestions:
                      - value: VP
                      - value: VP of Engineering
                      - value: VP Engineering
                      - value: VP Sales
                      - value: vp
                filtered_engineers_at_google_in_us:
                  summary: Top "engineer" titles at Google in the United States
                  value:
                    suggestions:
                      - value: Software Engineer
                      - value: Senior Software Engineer
                      - value: Staff Software Engineer
                      - value: Senior Staff Software Engineer
                      - value: Engineering Manager
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >
            Invalid request — usually because the `field` is not one of the
            supported autocomplete fields, or because the request body is
            malformed. The error `message` lists every accepted field.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                invalid_field:
                  summary: Unsupported autocomplete field
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Field 'current_title' is not supported on scope
                        'person'. Valid fields: affiliated_organisation,
                        basic_info.location, basic_info.location.city,
                        basic_info.location.continent,
                        basic_info.location.country,
                        basic_info.location.full_location,
                        basic_info.location.state, basic_profile.city,
                        basic_profile.continent, basic_profile.country,
                        basic_profile.country_code, basic_profile.first_name,
                        basic_profile.headline, basic_profile.languages,
                        basic_profile.last_name, basic_profile.location,
                        basic_profile.location.city,
                        basic_profile.location.continent,
                        basic_profile.location.country,
                        basic_profile.location.full_location,
                        basic_profile.location.raw,
                        basic_profile.location.state, basic_profile.name,
                        basic_profile.normalized_title,
                        basic_profile.normalized_title.department,
                        basic_profile.normalized_title.matched_title,
                        basic_profile.normalized_title.sub_department,
                        basic_profile.normalized_title.subdepartment,
                        basic_profile.professional_network_name,
                        basic_profile.state, certification,
                        certification_issuer, certifications.issuer,
                        certifications.issuing_organization,
                        certifications.name, city, company_status, continent,
                        country, country_code, degree, district,
                        education.schools.degree, education.schools.degree_name,
                        education.schools.field_of_study,
                        education.schools.institute_name,
                        education.schools.school, employee_count_range,
                        employment_type,
                        experience.employment_details.company_headcount_range,
                        experience.employment_details.company_headquarters_country,
                        experience.employment_details.company_hq_location,
                        experience.employment_details.company_industries,
                        experience.employment_details.company_linkedin_industry,
                        experience.employment_details.company_name,
                        experience.employment_details.company_professional_network_industry,
                        experience.employment_details.company_status,
                        experience.employment_details.company_type,
                        experience.employment_details.company_website,
                        experience.employment_details.company_website_domain,
                        experience.employment_details.current.company_headcount_range,
                        experience.employment_details.current.company_headquarters_country,
                        experience.employment_details.current.company_hq_location,
                        experience.employment_details.current.company_industries,
                        experience.employment_details.current.company_linkedin_industry,
                        experience.employment_details.current.company_name,
                        experience.employment_details.current.company_professional_network_industry,
                        experience.employment_details.current.company_status,
                        experience.employment_details.current.company_type,
                        experience.employment_details.current.company_website_domain,
                        experience.employment_details.current.employee_count_range,
                        experience.employment_details.current.employment_type,
                        experience.employment_details.current.function_category,
                        experience.employment_details.current.industries,
                        experience.employment_details.current.name,
                        experience.employment_details.current.seniority_level,
                        experience.employment_details.current.title,
                        experience.employment_details.employment_type,
                        experience.employment_details.function_category,
                        experience.employment_details.last_company.name,
                        experience.employment_details.location,
                        experience.employment_details.name,
                        experience.employment_details.past.company_headcount_range,
                        experience.employment_details.past.company_headquarters_country,
                        experience.employment_details.past.company_hq_location,
                        experience.employment_details.past.company_industries,
                        experience.employment_details.past.company_linkedin_industry,
                        experience.employment_details.past.company_name,
                        experience.employment_details.past.company_professional_network_industry,
                        experience.employment_details.past.company_status,
                        experience.employment_details.past.company_type,
                        experience.employment_details.past.company_website_domain,
                        experience.employment_details.past.employment_type,
                        experience.employment_details.past.function_category,
                        experience.employment_details.past.name,
                        experience.employment_details.past.seniority_level,
                        experience.employment_details.past.title,
                        experience.employment_details.seniority_level,
                        experience.employment_details.title, field_of_study,
                        function_category, honor_title, honors.title, languages,
                        languages.languages, linkedin_industries, location,
                        normalized_department, normalized_sub_department,
                        normalized_title, open_to_cards, person_first_name,
                        person_last_name, person_name, person_title,
                        professional_network.location,
                        professional_network.location.city,
                        professional_network.location.continent,
                        professional_network.location.country,
                        professional_network.location.raw,
                        professional_network.location.state,
                        professional_network.open_to_cards,
                        professional_network_name, research_interests,
                        research_profiles.affiliated_organisation,
                        research_profiles.research_interests, school,
                        seniority_level, skills,
                        skills.professional_network_skills, state
                      metadata: []
        '401':
          description: >-
            Unauthorized — the `Authorization` header is missing, malformed, or
            contains an invalid API key.
          content:
            application/json:
              schema:
                type: object
                description: Error envelope returned when authentication fails.
                properties:
                  message:
                    type: string
                    description: Human-readable error message describing the auth failure.
                    example: Invalid API key in request
              examples:
                invalid_api_key:
                  summary: Invalid or missing API key
                  value:
                    message: Invalid API key in request
        '500':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Internal server error — retry the request after a short delay.
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
    PersonAutocompleteRequest:
      type: object
      required:
        - field
        - query
      properties:
        field:
          type: string
          description: >
            The dataset API field name to get suggestions for. Valid fields
            include: basic_profile.name, basic_profile.first_name,
            basic_profile.last_name, basic_profile.headline,
            basic_profile.languages, basic_profile.location,
            basic_profile.location.raw, basic_profile.location.full_location,
            basic_profile.location.city, basic_profile.location.state,
            basic_profile.location.country, basic_profile.location.continent,
            professional_network.location, professional_network.location.raw,
            professional_network.location.city,
            professional_network.location.state,
            professional_network.location.country,
            professional_network.location.continent,
            professional_network.open_to_cards,
            skills.professional_network_skills,
            experience.employment_details.current.name,
            experience.employment_details.current.title,
            experience.employment_details.current.seniority_level,
            experience.employment_details.current.function_category,
            experience.employment_details.current.company_industries,
            experience.employment_details.current.company_type,
            experience.employment_details.current.company_hq_location,
            experience.employment_details.current.company_website_domain,
            experience.employment_details.current.employment_type,
            experience.employment_details.past.name,
            experience.employment_details.past.title,
            experience.employment_details.past.seniority_level,
            experience.employment_details.past.function_category,
            experience.employment_details.past.company_type,
            experience.employment_details.past.company_hq_location,
            experience.employment_details.past.company_website_domain,
            experience.employment_details.past.employment_type,
            experience.employment_details.employment_type,
            education.schools.school, education.schools.degree,
            education.schools.field_of_study, certifications.name,
            certifications.issuing_organization, honors.title,
            research_profiles.research_interests,
            research_profiles.affiliated_organisation, open_to_cards,
            employment_type. The two research_profiles paths also accept the
            flat names research_interests and affiliated_organisation.
          example: basic_profile.location.city
        query:
          type: string
          description: The search query text (can be empty to get top values by frequency)
          example: VP
        limit:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
          description: Maximum number of suggestions to return
      additionalProperties: false
      description: Request body for autocomplete suggestions on person search fields.
      example:
        field: basic_profile.headline
        query: Founder
        limit: 5
    PersonAutocompleteResponse:
      type: object
      properties:
        suggestions:
          type: array
          items:
            $ref: '#/components/schemas/PersonAutocompleteSuggestion'
      required:
        - suggestions
      description: Response with autocomplete suggestions for a person search field.
      example:
        suggestions:
          - value: Founder, CEO
    ErrorResponse:
      type: object
      description: >-
        Standard error response returned by all Person API endpoints when a
        request fails.
      required:
        - error
      properties:
        error:
          type: object
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
                - service_unavailable
                - internal_error
              description: Category of the error
              example: invalid_request
            message:
              type: string
              description: Human-readable error message
              example: 'Unsupported filter field: ''current_title'''
            metadata:
              type: array
              items:
                type: object
                additionalProperties: true
              default: []
              description: >-
                Additional structured context (e.g., available_fields,
                sortable_fields)
    PersonAutocompleteSuggestion:
      type: object
      properties:
        value:
          type: string
          description: The suggested field value
          example: VP of Sales
      required:
        - value
      description: A single autocomplete suggestion for a person search field value.
      example:
        value: Founder, CEO
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
