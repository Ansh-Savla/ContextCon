> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Search People

> Search the Crustdata person database using flexible filter conditions, sorting, and cursor-based pagination.
Supports filtering on hundreds of fields including job title, company, location, seniority, industry, education, and more.
Use compound conditions with AND/OR logic to build complex queries. Results can be sorted and paginated using cursors.

Pricing: 0.03 credits per result, plus a per-result charge for each premium group you filter on or receive (experience, education and skills 0.1; certifications, honors, professional network signals, languages and summary 0.2; dev platform profile filters 0.8 or 2.5, filter side only). Filtering and receiving bill independently and sorting is free. A request with no `fields` returns experience and education, which costs 0.23 per result on the standard plan. Your account's prices are on /account/endpoints.

<Note>
    Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
</Note>




## OpenAPI

````yaml /openapi-specs/2025-11-01/person.yaml post /person/search
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
  /person/search:
    post:
      tags:
        - Person APIs
        - Search APIs
      summary: Search people using filters and sorting
      description: >
        Search the Crustdata person database using flexible filter conditions,
        sorting, and cursor-based pagination.

        Supports filtering on hundreds of fields including job title, company,
        location, seniority, industry, education, and more.

        Use compound conditions with AND/OR logic to build complex queries.
        Results can be sorted and paginated using cursors.


        Pricing: 0.03 credits per result, plus a per-result charge for each
        premium group you filter on or receive (experience, education and skills
        0.1; certifications, honors, professional network signals, languages and
        summary 0.2; dev platform profile filters 0.8 or 2.5, filter side only).
        Filtering and receiving bill independently and sorting is free. A
        request with no `fields` returns experience and education, which costs
        0.23 per result on the standard plan. Your account's prices are on
        /account/endpoints.


        <Note>
            Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
        </Note>
      operationId: searchPersonDataset
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: true
        description: Search filters, sorting, pagination, and field selection options.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PersonSearchRequest'
            examples:
              search_by_title:
                summary: Search by current job title
                value:
                  filters:
                    field: experience.employment_details.current.title
                    type: '='
                    value: CEO
                  limit: 1
              search_cto_midsize:
                summary: Search CTOs at mid-size companies
                value:
                  filters:
                    op: and
                    conditions:
                      - field: experience.employment_details.current.title
                        type: '='
                        value: CTO
                      - field: >-
                          experience.employment_details.current.company_headcount_range
                        type: in
                        value:
                          - 51-200
                          - 201-500
                  limit: 2
              search_by_person_id:
                summary: >-
                  Look up a person by Crustdata ID — shows normalized_title and
                  education location/logo
                value:
                  filters:
                    field: crustdata_person_id
                    type: '='
                    value: 14540
                  fields:
                    - basic_profile
                    - education
                  limit: 1
              search_by_research_citations:
                summary: >-
                  Researchers with an h-index above 100, most cited first
                  (`research_profiles` is enabled per account)
                value:
                  filters:
                    field: research_profiles.h_index.all
                    type: '>'
                    value: 100
                  sorts:
                    - field: research_profiles.citations_count.all
                      order: desc
                  fields:
                    - basic_profile.name
                    - research_profiles.name
                    - research_profiles.citations_count.all
                  limit: 2
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: People matching the search criteria
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PersonSearchResponse'
              examples:
                search_by_title_response:
                  summary: >-
                    Search results for CEO title (paired with `search_by_title`
                    request)
                  value:
                    profiles:
                      - crustdata_person_id: 963
                        basic_profile:
                          name: Nithin Kamath
                        experience:
                          employment_details:
                            current:
                              - title: CEO
                              - title: Founder & CEO
                    next_cursor: H4sIACIdzWkC...
                    total_count: 1105055
                search_cto_midsize_response:
                  summary: >-
                    CTOs at mid-size companies (paired with `search_cto_midsize`
                    request)
                  value:
                    profiles:
                      - crustdata_person_id: 985
                        basic_profile:
                          name: Vikram Shah
                        experience:
                          employment_details:
                            current:
                              - title: CTO
                              - title: Co-founder
                      - crustdata_person_id: 1171
                        basic_profile:
                          name: Jagdeep Singh
                        experience:
                          employment_details:
                            current:
                              - title: Director Of Technical Operations
                              - title: CTO
                    next_cursor: H4sIAAA-3mkC...
                    total_count: 9176
                search_by_person_id_response:
                  summary: >-
                    Profile for crustdata_person_id 14540 (paired with
                    `search_by_person_id` request)
                  value:
                    profiles:
                      - crustdata_person_id: 14540
                        basic_profile:
                          name: David Hsu
                          current_title: Founder, CEO
                          normalized_title:
                            matched_title: Co-Founder, CEO, CTO
                            department: Executive Leadership
                            sub_department: Founder & Entrepreneurship Leadership
                            similarity: 0.6012
                            confident: true
                        education:
                          schools:
                            - school: University of Oxford
                              degree: Bachelor of Arts (B.A.)
                              location:
                                raw: Oxford, England
                                city: Oxford
                                state: England
                                country: United Kingdom
                                continent: null
                              institute_logo_permalink: >-
                                https://crustdata-media.s3.us-east-2.amazonaws.com/company/3d2093a16f7cf7b459a0d30d4e795d0be5a41a3396f21dee899e43e8a8b6de8d.jpg
                    next_cursor: H4sIACIdzWkC...
                    total_count: 1
                search_by_research_citations_response:
                  summary: >-
                    Most-cited researchers with an h-index above 100 (paired
                    with `search_by_research_citations` request)
                  value:
                    profiles:
                      - crustdata_person_id: 4550955
                        basic_profile:
                          name: Yoshua Bengio
                        research_profiles:
                          - name: Yoshua Bengio
                            citations_count:
                              all: 1153498
                      - crustdata_person_id: 282824395
                        basic_profile:
                          name: Ahmedin Jemal
                        research_profiles:
                          - name: Ahmedin Jemal
                            citations_count:
                              all: 1010816
                    next_cursor: H4sIAG67x2oC...
                    total_count: 7860
                    total_count_relation: null
                    remarks: []
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
                invalid_field:
                  summary: Unsupported filter field
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Unsupported filter field: 'current_title'. Supported
                        fields: ['basic_profile.name', 'basic_profile.headline',
                        ...]
                      metadata: []
                count_limit_conflict:
                  summary: Both count and limit supplied
                  value:
                    error:
                      type: invalid_request
                      message: Only one of 'count' or 'limit' can be provided, not both
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
                      message: You do not have permission to access /person/search.
                      metadata: []
                fields_denied:
                  summary: A requested field is not enabled on the account
                  value:
                    error:
                      type: permission_error
                      message: >-
                        Access denied to fields: contact. To enable access,
                        please book a call with us at
                        https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request
                      metadata:
                        - denied_fields:
                            - contact
                          permitted_fields:
                            - basic_profile
                            - education
                            - experience
                research_profiles_denied:
                  summary: research_profiles is not enabled on the account
                  value:
                    error:
                      type: permission_error
                      message: >-
                        Access denied to fields: research_profiles. To enable
                        access, please book a call with us at
                        https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request
                      metadata:
                        - denied_fields:
                            - research_profiles
                          permitted_fields:
                            - basic_profile
                            - education
                            - experience
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
    PersonSearchRequest:
      type: object
      additionalProperties: false
      required:
        - filters
      properties:
        filters:
          description: >-
            Filter criteria — a single `PersonSearchCondition` or a
            `PersonSearchConditionGroup` combining conditions with `and`, `or`,
            or `all_of` (cross-element matching on nested-array fields).
          example:
            field: experience.employment_details.current.title
            type: '='
            value: CEO
          oneOf:
            - $ref: '#/components/schemas/PersonSearchCondition'
            - $ref: '#/components/schemas/PersonSearchConditionGroup'
        sorts:
          type: array
          description: Sort directives applied to matched people in order.
          example:
            - field: crustdata_person_id
              order: asc
          items:
            $ref: '#/components/schemas/Sort'
          default: []
        limit:
          type: integer
          minimum: 1
          maximum: 1000
          default: 20
        count:
          type: integer
          minimum: 1
          maximum: 1000
          description: Alias for limit.
          example: 20
        cursor:
          type: string
          nullable: true
          description: >-
            Pagination cursor from a previous response's `next_cursor`. Omit on
            the first page.
          example: H4sIACIdzWkC...
        post_processing:
          $ref: '#/components/schemas/PostProcessing'
        return_query:
          type: boolean
          default: false
          description: Debug flag - include search query in response
        preview:
          type: boolean
          default: false
          description: Preview mode - return only basic fields for faster response
        explain:
          type: boolean
          default: false
          description: >-
            Explain an empty result. When true and a filters-only request
            returns `total_count` 0, `remarks` names the condition whose removal
            recovers profiles. Not the `search.explain` flag on semantic search,
            which returns per-hit scoring.
          example: true
        fields:
          type: array
          description: >
            Optional list of field paths to include in each returned profile.
            When omitted, a default

            set of profile fields is returned. Use dot notation for a nested
            field (for example

            `experience.employment_details.current.title`) or a top-level family
            name (for example

            `basic_profile`) to include the whole family. Each profile always
            includes

            `crustdata_person_id`, even when you do not request it. A requested
            field with no data for

            the profile is `null`. An unsupported value returns a `400` whose

            `metadata.available_fields` lists every selectable field.
            `research_profiles` and its

            sub-paths are enabled per account; without the grant they return
            `403 Access denied to

            fields: research_profiles`. `skills` is also enabled per account and
            returns

            `403 Access denied to fields: skills` without access.
            `certifications`, `honors`,

            `years_of_experience`, `years_of_experience_raw`, and
            `experience.recently_changed_jobs`

            are enabled per account too, and return `403` with each denied path
            without access.

            `dev_platform_profiles` is filter-only and returns `400 Invalid
            fields: dev_platform_profiles`.
          items:
            type: string
          example:
            - basic_profile.name
            - experience.employment_details.current.title
      description: >-
        Request body for /person/search. Use filters (optionally grouped with
        and/or), sorts, limit, and cursor pagination.
      example:
        filters:
          field: experience.employment_details.current.title
          type: '='
          value: CEO
        limit: 1
    PersonSearchResponse:
      type: object
      description: >-
        Paginated response from the person search endpoint containing matched
        profiles and pagination metadata.
      properties:
        profiles:
          type: array
          description: Array of person profiles matching the search criteria
          example: []
          items:
            $ref: '#/components/schemas/PersonSearch'
          x-availability:
            - search
          x-cdp-source: spark/models/cpci.py::test
        next_cursor:
          type: string
          nullable: true
          description: >-
            Opaque cursor string for fetching the next page of results. Pass
            this value as the cursor parameter in subsequent requests. Null when
            no more results are available.
          example: H4sIACIdzWkC_xWMMQ7DIAwAv...
          x-availability:
            - search
          x-cdp-source: spark/models/cpci.py::test
        total_count:
          type: integer
          nullable: true
          description: >-
            Total number of profiles matching the search criteria across all
            pages
          example: 1105055
          x-availability:
            - search
          x-cdp-source: spark/models/cpci.py::test
        total_count_relation:
          type: string
          nullable: true
          description: >-
            Qualifier for `total_count`, indicating whether it is exact or a
            lower bound (for example `eq` for an exact count or `gte` when the
            true total is at least `total_count`). Currently returned as `null`.
          example: null
        remarks:
          type: array
          description: >-
            Machine-readable notes on this result. Always present, `[]` when
            there is nothing to say. Explain remarks appear only when the
            request set `explain` and the result is empty.
          items:
            $ref: '#/components/schemas/PersonSearchRemark'
          example: []
      required:
        - profiles
        - remarks
      x-cdp-source: spark/models/cpci.py::test
      example:
        profiles: []
        next_cursor: null
        total_count: 0
        total_count_relation: null
        remarks: []
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
    PersonSearchCondition:
      type: object
      required:
        - field
        - type
        - value
      properties:
        field:
          type: string
          description: >
            Field name to filter on. Valid fields include: crustdata_person_id,
            basic_profile.name, basic_profile.headline, basic_profile.summary,
            basic_profile.languages, basic_profile.last_updated,
            basic_profile.location, basic_profile.location.full_location,
            basic_profile.location.city, basic_profile.location.state,
            basic_profile.location.country, basic_profile.location.continent,
            basic_profile.normalized_title.matched_title,
            basic_profile.normalized_title.department,
            basic_profile.normalized_title.sub_department,
            professional_network.connections, professional_network.followers,
            professional_network.open_to_cards, professional_network.location,
            professional_network.location.raw,
            skills.professional_network_skills,
            experience.employment_details.company_name,
            experience.employment_details.company_id,
            experience.employment_details.professional_network_id,
            experience.employment_details.title,
            experience.employment_details.description,
            experience.employment_details.location,
            experience.employment_details.start_date,
            experience.employment_details.end_date,
            experience.employment_details.seniority_level,
            experience.employment_details.function_category,
            experience.employment_details.company_website_domain,
            experience.employment_details.company_headcount_latest,
            experience.employment_details.company_headcount_range,
            experience.employment_details.company_industries,
            experience.employment_details.company_professional_network_industry,
            experience.employment_details.company_type,
            experience.employment_details.company_status,
            experience.employment_details.company_headquarters_country,
            experience.employment_details.company_hq_location,
            experience.employment_details.years_at_company_raw,
            experience.employment_details.current.name,
            experience.employment_details.current.company_name,
            experience.employment_details.current.title,
            experience.employment_details.current.description,
            experience.employment_details.current.company_id,
            experience.employment_details.current.professional_network_id,
            experience.employment_details.current.is_default,
            experience.employment_details.current.position_id,
            experience.employment_details.current.seniority_level,
            experience.employment_details.current.start_date,
            experience.employment_details.current.company_website_domain,
            experience.employment_details.current.company_professional_network_industry,
            experience.employment_details.current.company_linkedin_profile_url,
            experience.employment_details.current.company_headcount_range,
            experience.employment_details.current.company_headcount_latest,
            experience.employment_details.current.company_industries,
            experience.employment_details.current.company_type,
            experience.employment_details.current.company_status,
            experience.employment_details.current.company_headquarters_country,
            experience.employment_details.current.company_hq_location,
            experience.employment_details.current.function_category,
            experience.employment_details.current.years_at_company_raw,
            experience.employment_details.past.name,
            experience.employment_details.past.company_name,
            experience.employment_details.past.title,
            experience.employment_details.past.description,
            experience.employment_details.past.company_id,
            experience.employment_details.past.professional_network_id,
            experience.employment_details.past.is_default,
            experience.employment_details.past.position_id,
            experience.employment_details.past.seniority_level,
            experience.employment_details.past.start_date,
            experience.employment_details.past.company_website_domain,
            experience.employment_details.past.company_professional_network_industry,
            experience.employment_details.past.company_linkedin_profile_url,
            experience.employment_details.past.company_headcount_range,
            experience.employment_details.past.company_headcount_latest,
            experience.employment_details.past.company_industries,
            experience.employment_details.past.company_type,
            experience.employment_details.past.company_status,
            experience.employment_details.past.company_headquarters_country,
            experience.employment_details.past.company_hq_location,
            experience.employment_details.past.function_category,
            experience.employment_details.past.years_at_company_raw,
            education.schools.school, education.schools.degree,
            education.schools.field_of_study,
            education.schools.activities_and_societies,
            education.schools.location, education.schools.location.city,
            education.schools.location.state,
            education.schools.location.country,
            education.schools.location.continent,
            education.schools.location.full_location,
            education.schools.location.raw, certifications.name,
            certifications.issue_date, certifications.expiration_date,
            certifications.credential_url, certifications.issuing_organization,
            certifications.credential_id, honors.title,
            social_handles.twitter_handle, basic_profile.first_name,
            basic_profile.last_name, recently_changed_jobs,
            years_of_experience_raw,
            experience.employment_details.current.business_email_verified,
            experience.employment_details.past.business_email_verified,
            experience.employment_details.business_email_verified,
            contact.has_business_email, metadata.last_scraped_source,
            metadata.updated_at, professional_network.location.city,
            professional_network.location.state,
            professional_network.location.country,
            professional_network.location.continent,
            professional_network.metadata.last_scraped_source,
            experience.employment_details.employment_type,
            experience.employment_details.is_default,
            experience.employment_details.company_website,
            experience.employment_details.current.company_professional_network_profile_url,
            experience.employment_details.current.employment_type,
            experience.employment_details.past.company_professional_network_profile_url,
            experience.employment_details.past.employment_type,
            years_of_experience, dev_platform_profiles.name,
            dev_platform_profiles.bio, dev_platform_profiles.location,
            dev_platform_profiles.location.raw,
            dev_platform_profiles.website_url,
            dev_platform_profiles.company_text,
            dev_platform_profiles.is_hireable, dev_platform_profiles.followers,
            dev_platform_profiles.following,
            dev_platform_profiles.public_repo_count,
            dev_platform_profiles.metadata.created_at,
            dev_platform_profiles.total_repos,
            dev_platform_profiles.total_stars, dev_platform_profiles.max_stars,
            dev_platform_profiles.median_stars,
            dev_platform_profiles.all_languages,
            dev_platform_profiles.all_topics,
            dev_platform_profiles.repos.full_name,
            dev_platform_profiles.repos.owner,
            dev_platform_profiles.repos.is_fork,
            dev_platform_profiles.repos.description,
            dev_platform_profiles.repos.primary_language,
            dev_platform_profiles.repos.topics,
            dev_platform_profiles.repos.license_key,
            dev_platform_profiles.repos.archived,
            dev_platform_profiles.repos.disabled,
            dev_platform_profiles.repos.is_template,
            dev_platform_profiles.repos.has_issues,
            dev_platform_profiles.repos.has_projects,
            dev_platform_profiles.repos.has_wiki,
            dev_platform_profiles.repos.stars,
            dev_platform_profiles.repos.forks_count,
            dev_platform_profiles.repos.open_issues_count,
            dev_platform_profiles.repos.size,
            dev_platform_profiles.repos.github_created_at,
            dev_platform_profiles.repos.github_updated_at,
            dev_platform_profiles.repos.github_pushed_at,
            assessment.authenticity.tier, assessment.authenticity.verdict,
            research_profiles.name, research_profiles.designation,
            research_profiles.affiliated_organisation,
            research_profiles.verified_email_domain, research_profiles.website,
            research_profiles.research_interests,
            research_profiles.article_count, research_profiles.co_author_count,
            research_profiles.citations_count.all,
            research_profiles.citations_count.recent,
            research_profiles.h_index.all, research_profiles.h_index.recent,
            research_profiles.i10_index.all, research_profiles.i10_index.recent,
            research_profiles.metadata.last_scraped_source,
            research_profiles.articles.title, research_profiles.articles.url,
            research_profiles.articles.publication_year,
            research_profiles.co_authors.id, research_profiles.co_authors.name
          example: experience.employment_details.current.title
        type:
          type: string
          description: >
            Filter operator. Use '=' for exact match, '!=' for not equal, '<'
            and '>' for exclusive numeric/date comparisons, '=<' for
            less-than-or-equal, '=>' for greater-than-or-equal, 'in'/'not_in'
            for set membership (value must be an array), 'is_null'/'is_not_null'
            for null checks (value must be a literal null and the `value` key is
            required; on nested-array fields, 'is_null' matches profiles where
            no element carries the field and 'is_not_null' matches profiles
            where at least one element has a non-null value), 'has_all' for
            cross-element matching on a nested-array field (value must be a
            non-empty array; each listed value must be matched by some array
            element, possibly different elements — shorthand for an `all_of`
            group of one equality condition per value), '(.)' for
            case-insensitive all-words match (every query word must appear, in
            any order; a piped value is split into separate words that must ALL
            match (AND), not OR; on some fields it also matches close
            misspellings, so use '=' or 'in' for known values and '[.]' for
            exact words), '(!)' for case-insensitive fuzzy negation (excludes
            substring matches of `value`), '[.]' for case-insensitive
            exact-phrase match (words must be contiguous and in order),
            'geo_distance' for geographic radius inclusion, and 'geo_exclude'
            for geographic radius exclusion ('geo_distance' keeps profiles
            inside the radius, 'geo_exclude' removes them; both take an object
            with `location` or `lat_lng`, plus `distance` and optional `unit`).
            Use '=<' and '=>' instead of '<=' and '>='. For cross-element logic
            beyond a single value list, use an `all_of` group (see
            PersonSearchConditionGroup).
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
            - has_all
            - (.)
            - (!)
            - '[.]'
            - geo_distance
            - geo_exclude
        value:
          description: >
            Filter value. Type depends on operator: For '=', '!=', '<', '>',
            '=<', '=>': string or number. For 'in', 'not_in': array of strings
            or numbers. For 'is_null', 'is_not_null': a literal null — the
            `value` key is still required. For 'has_all': non-empty array of
            strings or numbers (nested-array fields only). For '(.)': string. A
            '|' in the value is a word separator, not OR: "VP|Director" matches
            the same profiles as "VP Director". To match any one of several
            values, put one '(.)' condition for each value in an `or` group. For
            '(!)': string; rows whose value contains this substring
            (case-insensitive) are excluded. Unlike '(.)' / '[.]', multi-word
            values are matched as a literal phrase (not word-split): `(!) "New
            York"` excludes only rows that literally contain "New York", not
            "New Yorker"; send separate `(!)` conditions inside an `and` group
            to exclude on each word independently. For '[.]': string substring
            to match. For 'geo_distance'/'geo_exclude': object with one of
            {location: string} or {lat_lng: [lat, lng]}, plus {distance: number,
            unit: "km"|"mi"|"miles"|"m"|"ft"}. When both `location` and
            `lat_lng` are supplied, `lat_lng` is used and geocoding is skipped.
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
            - type: object
              description: >-
                Object value used by `geo_distance` and `geo_exclude`. Supply
                either `location` (geocoded server-side) or `lat_lng` (explicit
                `[lat, lng]`; bypasses geocoding). If both are provided,
                `lat_lng` wins.
              required:
                - distance
              properties:
                location:
                  type: string
                  description: >-
                    Reference location (e.g., "San Francisco, CA"). Ignored when
                    `lat_lng` is also provided.
                lat_lng:
                  type: array
                  description: >-
                    Explicit coordinates as `[lat, lng]`. Latitude must be
                    between -90 and 90; longitude must be between -180 and 180.
                    When provided, geocoding is skipped.
                  minItems: 2
                  maxItems: 2
                  items:
                    type: number
                  example:
                    - 37.7749
                    - -122.4194
                distance:
                  type: number
                  description: Radius around the reference point.
                unit:
                  type: string
                  description: Distance unit. Defaults to `km`.
                  enum:
                    - km
                    - mi
                    - miles
                    - m
                    - meters
                    - ft
                    - feet
      description: A single filter condition used to match people in /person/search.
      example:
        field: experience.employment_details.current.title
        type: '='
        value: CEO
    PersonSearchConditionGroup:
      type: object
      required:
        - op
        - conditions
      properties:
        op:
          type: string
          description: >
            'and'/'or' combine conditions at the document level. 'all_of' is
            cross-element AND over a nested-array field: each condition must be
            matched by at least one array element, each evaluated independently
            (possibly different elements). A condition inside 'all_of' may
            itself be an 'and'/'or' group, which is then matched within a single
            element. The operator is case-sensitive: send exactly 'all_of'.
          enum:
            - and
            - or
            - all_of
        conditions:
          type: array
          minItems: 1
          items:
            oneOf:
              - $ref: '#/components/schemas/PersonSearchCondition'
              - $ref: '#/components/schemas/PersonSearchConditionGroup'
      description: A group of filter conditions combined with an and/or/all_of operator.
      example:
        op: and
        conditions:
          - field: experience.employment_details.current.title
            type: '='
            value: CEO
    Sort:
      type: object
      required:
        - field
        - order
      properties:
        field:
          type: string
          description: >
            Field name to sort on. Valid sortable fields: crustdata_person_id,
            basic_profile.name, basic_profile.location,
            basic_profile.location.full_location, basic_profile.location.city,
            basic_profile.location.state, basic_profile.location.country,
            professional_network.connections, professional_network.followers,
            experience.employment_details.start_date,
            experience.employment_details.company_id, metadata.updated_at,
            dev_platform_profiles.followers, dev_platform_profiles.following,
            dev_platform_profiles.metadata.created_at,
            dev_platform_profiles.public_repo_count,
            dev_platform_profiles.total_repos,
            dev_platform_profiles.total_stars, dev_platform_profiles.max_stars,
            dev_platform_profiles.median_stars, assessment.authenticity.tier,
            research_profiles.article_count, research_profiles.co_author_count,
            research_profiles.citations_count.all,
            research_profiles.citations_count.recent,
            research_profiles.h_index.all, research_profiles.h_index.recent,
            research_profiles.i10_index.all, research_profiles.i10_index.recent,
            research_profiles.metadata.last_scraped_source
        order:
          type: string
          enum:
            - asc
            - desc
      description: Sort directive for /person/search specifying the field name and order.
      example:
        field: crustdata_person_id
        order: asc
    PostProcessing:
      type: object
      properties:
        exclude_profiles:
          type: array
          items:
            type: string
          maxItems: 50000
          description: Professional-network profile URLs to exclude from results
        exclude_names:
          type: array
          items:
            type: string
          description: Names to exclude from results
      description: Post-processing options applied to search results (e.g., exclusions).
      example:
        exclude_profiles:
          - https://www.linkedin.com/in/jane-doe
        exclude_names:
          - Jane Doe
    PersonSearch:
      type: object
      properties:
        crustdata_person_id:
          type: integer
        basic_profile:
          type: object
          properties:
            name:
              type: string
            headline:
              type: string
            current_title:
              type: string
            professional_network_name:
              type: string
              nullable: true
              description: Display name on the person's professional-network profile.
              example: David Hsu
            profile_picture_permalink:
              type: string
              nullable: true
            location:
              type: object
              nullable: true
              properties:
                city:
                  type: string
                  nullable: true
                state:
                  type: string
                  nullable: true
                country:
                  type: string
                  nullable: true
                continent:
                  type: string
                  nullable: true
                raw:
                  type: string
                  nullable: true
            normalized_title:
              type: object
              nullable: true
              description: >-
                Job Title Normalization (JTN, beta) — structured representation
                of the person's current title mapped to Crustdata's proprietary
                taxonomy (20 departments, 226 sub-departments). See
                https://docs.crustdata.com/guides/job-title-normalization.
              properties:
                matched_title:
                  type: string
                  nullable: true
                  description: >-
                    Canonical normalized title matched to the person's current
                    title.
                  example: Co-Founder, CEO, CTO
                department:
                  type: string
                  nullable: true
                  description: High-level department the normalized title maps to.
                  example: Executive Leadership
                sub_department:
                  type: string
                  nullable: true
                  description: More granular classification within the department.
                  example: Founder & Entrepreneurship Leadership
                similarity:
                  type: number
                  nullable: true
                  description: >-
                    Similarity score between the raw title and the matched
                    normalized title, from 0 to 1.
                  example: 0.6012
                confident:
                  type: boolean
                  nullable: true
                  description: Whether the normalized-title match is considered confident.
                  example: true
        contact:
          $ref: '#/components/schemas/PersonSearchContact'
        social_handles:
          type: object
          properties:
            professional_network_identifier:
              type: object
              properties:
                profile_url:
                  type: string
            dev_platform_identifier:
              type: object
              properties:
                profile_url:
                  type: string
                  nullable: true
            twitter_identifier:
              type: object
              nullable: true
              description: The person's handle on X (formerly Twitter), when available.
              properties:
                slug:
                  type: string
                  nullable: true
                  description: >-
                    The X/Twitter handle slug (the portion after the profile URL
                    host). May be an empty string when no handle is on file.
                  example: janedoe
        skills:
          allOf:
            - $ref: '#/components/schemas/PersonSkills'
          description: >-
            Listed skills. Enabled per account: without access the default
            response leaves it out, and naming `skills` in `fields` returns `403
            Access denied to fields: skills`.
        experience:
          type: object
          properties:
            employment_details:
              type: object
              properties:
                current:
                  type: array
                  items:
                    $ref: '#/components/schemas/PersonSearchEmploymentDetails'
                past:
                  type: array
                  items:
                    $ref: '#/components/schemas/PersonSearchEmploymentDetails'
            recently_changed_jobs:
              type: boolean
              nullable: true
              description: >-
                True when a past role ended within 90 days of the last index
                rebuild. Enabled per account: without access, naming it in
                `fields` returns `403`. Filter and sort on the top-level
                `recently_changed_jobs` path instead.
        education:
          type: object
          properties:
            schools:
              type: array
              items:
                $ref: '#/components/schemas/PersonSearchEducation'
        certifications:
          type: array
          nullable: true
          items:
            $ref: '#/components/schemas/PersonCertification'
          description: >-
            Certifications on the person profile. Enabled per account: without
            access the default response leaves it out, and naming a
            `certifications` path in `fields` returns `403 Access denied to
            fields: <path>`.
        honors:
          type: array
          nullable: true
          items:
            $ref: '#/components/schemas/PersonHonor'
          description: >-
            Honors and awards on the person profile. Enabled per account:
            without access the default response leaves it out, and naming an
            `honors` path in `fields` returns `403 Access denied to fields:
            <path>`.
        years_of_experience:
          type: string
          nullable: true
          description: Total experience across every role, as a band. Enabled per account.
          example: More than 10 years
        years_of_experience_raw:
          type: integer
          nullable: true
          description: Total years of experience across every role. Enabled per account.
          example: 20
        research_profiles:
          type: array
          nullable: true
          items:
            $ref: '#/components/schemas/PersonSearchResearchProfile'
          description: >-
            Academic author profiles matched to this person, best match first.
            Enabled per account and never returned by default: name
            `research_profiles` or a sub-path in `fields`. `null` when the
            person has no matched profile.
        metadata:
          type: object
          description: Profile-level metadata for this person record.
          properties:
            updated_at:
              type: string
              format: date-time
              nullable: true
              description: When this person's profile data was last updated.
              example: '2026-07-01T12:39:38+00:00'
      description: >-
        A person profile returned by /person/search with fields from the indexed
        dataset.
      example:
        crustdata_person_id: 14540
        basic_profile:
          name: David Hsu
          current_title: Founder, CEO
    PersonSearchRemark:
      type: object
      description: >-
        One note on a search result. `code`, `path`, `matches_without` and the
        `resolution` fields `field`, `value` and `matches_with` are stable.
        `message`, `hint` and `resolution.companies[].name` are free text and
        may change without notice.
      additionalProperties: true
      required:
        - code
        - message
      properties:
        code:
          type: string
          enum:
            - condition_eliminates_all
            - no_single_culprit
          description: >-
            `condition_eliminates_all`: the condition at `path` removes every
            result. `no_single_culprit`: no probed condition explains the empty
            result on its own. Later features extend this list with the codes
            they emit.
          example: condition_eliminates_all
        path:
          type: string
          description: >-
            Where in the request as sent the remark applies: `filters` when the
            whole filter is one condition, `filters.conditions[i]` for the i-th
            condition of the top-level `and`. Absent on `no_single_culprit`.
          example: filters.conditions[2]
        message:
          type: string
          example: >-
            experience.employment_details.current.title in [9 values] removes
            every result (22 match without it).
        matches_without:
          type: integer
          description: Profiles the search returns with the condition at `path` removed.
          example: 22
        hint:
          type: string
          description: A next step, when one is known.
          example: >-
            'in' on title matches the whole stored string, not words inside it.
            Replace it with an or group of [.] leaves, one value each, for a
            phrase match; or remove it (and the group holding it, if it holds
            nothing else) and rank the remaining scope by meaning: add "search":
            {"query": "Geschäftsführer"} and top-level "mode": "exact" (drop
            "sorts").
        resolution:
          type: object
          description: >-
            On `condition_eliminates_all` for a company name or website domain
            condition, when the value resolves to company records that recover
            profiles: the `company_id` filter to send instead. The result you
            received is unchanged.
          required:
            - field
            - value
            - companies
            - matches_with
          properties:
            field:
              type: string
              description: The `company_id` filter path for the condition's scope.
              example: experience.employment_details.current.company_id
            value:
              type: array
              items:
                type: integer
              description: The company ids that are the same company as the value you sent.
              example:
                - 631360
            companies:
              type: array
              items:
                type: object
                required:
                  - company_id
                  - name
                properties:
                  company_id:
                    type: integer
                    example: 631360
                  name:
                    type: string
                    example: Rubrik
            matches_with:
              type: integer
              description: >-
                Profiles the search returns with `field in value` OR-ed onto the
                condition at `path`, the rest of the request unchanged.
              example: 4804
    PersonSearchContact:
      type: object
      properties:
        has_business_email:
          type: boolean
          description: >-
            True when a business email for this person is on file. Contact
            Enrich can still find one when this is false. Filterable with = or
            != and true or false.
      description: >-
        Contact-availability flag for a person. Indicates whether a business
        email is on file.
      example:
        has_business_email: false
    PersonSkills:
      type: object
      properties:
        professional_network_skills:
          type: array
          items:
            type: string
      description: Skill signals from a person profile.
      example:
        professional_network_skills:
          - Python
          - Ruby
    PersonSearchEmploymentDetails:
      type: object
      properties:
        name:
          type: string
          nullable: true
        professional_network_id:
          type: string
          nullable: true
        title:
          type: string
          nullable: true
        description:
          type: string
          nullable: true
        location:
          type: object
          nullable: true
          properties:
            raw:
              type: string
              nullable: true
        employment_type:
          type: string
          nullable: true
        start_date:
          type: string
          nullable: true
        end_date:
          type: string
          nullable: true
        is_default:
          type: boolean
          nullable: true
        crustdata_company_id:
          type: integer
          nullable: true
        company_profile_picture_permalink:
          type: string
          nullable: true
          description: >-
            Stable Crustdata-hosted permalink to the company logo, suitable for
            rendering in your own interface.
          example: >-
            https://crustdata-media.s3.us-east-2.amazonaws.com/company/72f60d0ccad488216922fb784abc89890b49eeed8ab1eca1a0a12c72a68a0620.jpg
        company_professional_network_profile_url:
          type: string
          nullable: true
        seniority_level:
          type: string
          nullable: true
        function_category:
          type: string
          nullable: true
        years_at_company:
          type: string
          nullable: true
          description: >-
            Categorical tenure band for this position, counted from the
            position's start date.
          example: 3 to 5 years
        years_at_company_raw:
          type: number
          nullable: true
          description: >-
            Whole years in this position, floored, counted from the position's
            start date.
          example: 1
        company_headcount_latest:
          type: integer
          nullable: true
        company_headcount_range:
          type: string
          nullable: true
        company_industries:
          type: array
          nullable: true
          items:
            type: string
        company_professional_network_industry:
          type: string
          nullable: true
        company_type:
          type: string
          nullable: true
        company_status:
          type: string
          nullable: true
          description: >-
            Lifecycle of this employer's company record in Crustdata's entity
            graph. `active` is a live company record; `deleted` is one Crustdata
            has retired; null means the employer was not resolved to a company
            record, so only the free-text company name on the role is available.
            Company Search returns the same value as `basic_info.status`.
          example: active
        company_website:
          type: string
          nullable: true
        company_headquarters_country:
          type: string
          nullable: true
        company_hq_location:
          type: string
          nullable: true
        company_hq_location_address_components:
          type: array
          nullable: true
          items:
            type: string
        position_id:
          type: integer
          nullable: true
        business_email_verified:
          type: boolean
          nullable: true
      description: >-
        Employment entry in a person profile — includes title, company, dates,
        and function.
      example:
        name: Retool
        title: Founder, CEO
        start_date: '2017-01-01'
    PersonSearchEducation:
      type: object
      properties:
        school:
          type: string
          description: Name of the educational institution.
          example: University of Oxford
        degree:
          type: string
          nullable: true
          description: Degree earned at the institution.
          example: Bachelor of Arts (B.A.)
        field_of_study:
          type: string
          nullable: true
          description: Primary field of study.
          example: Philosophy, Politics and Economics
        description:
          type: string
          nullable: true
          description: >-
            Free-text description of the education entry as it appears on the
            profile. May be an empty string when no description is provided.
          example: ''
        location:
          type: object
          nullable: true
          description: >-
            Geographic location of the institution, resolved into structured
            components.
          properties:
            raw:
              type: string
              nullable: true
              description: Location string as it appears on the profile.
              example: Oxford, England
            city:
              type: string
              nullable: true
              description: City component of the institution location.
              example: Oxford
            state:
              type: string
              nullable: true
              description: State or region component of the institution location.
              example: England
            country:
              type: string
              nullable: true
              description: Country component of the institution location.
              example: United Kingdom
            continent:
              type: string
              nullable: true
              description: Continent component of the institution location.
              example: Europe
        start_year:
          type: integer
          nullable: true
          description: Year the person started at the institution.
          example: 2005
        end_year:
          type: integer
          nullable: true
          description: Year the person finished at the institution.
          example: 2009
        institute_logo_permalink:
          type: string
          nullable: true
          description: >-
            Stable Crustdata-hosted permalink to the institution logo, suitable
            for rendering in your own interface.
          example: >-
            https://crustdata-media.s3.us-east-2.amazonaws.com/company/3d2093a16f7cf7b459a0d30d4e795d0be5a41a3396f21dee899e43e8a8b6de8d.jpg
        institute_logo_url:
          type: string
          nullable: true
          description: Source URL of the institution logo, when available.
          example: https://media.example.com/logos/oxford.png
        professional_network_id:
          type: string
          nullable: true
          description: Identifier of the institution on the professional network.
          example: '4477'
      description: >-
        Education entry in a person profile — school, degree, field of study,
        location, and institution logo.
      example:
        school: University of Oxford
        degree: Bachelor of Arts (B.A.)
        location:
          raw: Oxford, England
          city: Oxford
          state: England
          country: United Kingdom
          continent: Europe
        institute_logo_permalink: >-
          https://crustdata-media.s3.us-east-2.amazonaws.com/company/3d2093a16f7cf7b459a0d30d4e795d0be5a41a3396f21dee899e43e8a8b6de8d.jpg
        professional_network_id: '4477'
    PersonCertification:
      type: object
      properties:
        name:
          type: string
        issuing_organization:
          type: string
        issue_date:
          type: string
          nullable: true
        expiration_date:
          type: string
          nullable: true
        credential_id:
          type: string
          nullable: true
        credential_url:
          type: string
          nullable: true
        source:
          type: string
      description: Certification entry for a person profile.
      example:
        name: AWS Certified Solutions Architect
        issuing_organization: Amazon Web Services
    PersonHonor:
      type: object
      properties:
        title:
          type: string
          nullable: true
        issued_date:
          type: string
          nullable: true
        description:
          type: string
          nullable: true
        issuer:
          type: string
          nullable: true
        media_urls:
          type: array
          nullable: true
          items:
            type: string
        associated_organization:
          type: string
          nullable: true
        associated_organization_professional_network_id:
          type: string
          nullable: true
      description: Honor or award entry on a person profile.
      example:
        title: Dean's List
        issuer: University of California, Berkeley
    PersonSearchResearchProfile:
      type: object
      description: >-
        One academic author profile matched to the person, as returned by
        /person/search. The same profile-level fields as PersonResearchProfile,
        with `articles` reduced to title, url, and publication_year,
        `co_authors` reduced to id and name, and no `citations_timeseries`.
        Enabled per account.
      properties:
        id:
          type: string
          nullable: true
        profile_url:
          type: string
          nullable: true
        name:
          type: string
          nullable: true
        designation:
          type: string
          nullable: true
        affiliated_organisation:
          type: string
          nullable: true
        verified_email_domain:
          type: string
          nullable: true
        website:
          type: string
          nullable: true
        research_interests:
          type: array
          nullable: true
          items:
            type: string
        thumbnail:
          type: string
          nullable: true
        article_count:
          type: integer
          nullable: true
        co_author_count:
          type: integer
          nullable: true
        citations_count:
          $ref: '#/components/schemas/PersonResearchProfileMetrics'
        h_index:
          $ref: '#/components/schemas/PersonResearchProfileMetrics'
        i10_index:
          $ref: '#/components/schemas/PersonResearchProfileMetrics'
        articles:
          type: array
          nullable: true
          items:
            type: object
            properties:
              title:
                type: string
                nullable: true
              url:
                type: string
                nullable: true
              publication_year:
                type: string
                nullable: true
        co_authors:
          type: array
          nullable: true
          items:
            type: object
            properties:
              id:
                type: string
                nullable: true
              name:
                type: string
                nullable: true
        metadata:
          type: object
          nullable: true
          properties:
            last_scraped_source:
              type: string
              format: date-time
              nullable: true
    PersonResearchProfileMetrics:
      type: object
      nullable: true
      description: Lifetime and recent values of one citation metric.
      properties:
        all:
          type: integer
          nullable: true
          description: Value over the whole career.
          example: 175
        recent:
          type: integer
          nullable: true
          description: Value counted from `recent_since_year` onwards.
          example: 129
        recent_since_year:
          type: integer
          nullable: true
          description: First year the `recent` window counts.
          example: 2021
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

- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [API Introduction](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction.md)
- [MCP Server](https://docs.crustdata.com/for-agents/mcp.md)
- [Batch Company Search API](https://docs.crustdata.com/company-docs/search/batch-search.md)
- [Batch Job Postings Search API](https://docs.crustdata.com/job-docs/search/batch-search.md)
