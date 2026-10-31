> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Identify People

> Resolve up to 25 identifiers to the people behind them in one synchronous request. Send exactly one identifier key: `professional_network_profile_urls`, `emails` or `research_profile_urls`. Profile URLs and Scholar profile URLs match exactly. Each match returns the person's `crustdata_person_id`, `basic_profile`, `social_handles` and `updated_at`; for the full profile or contact data, pass the returned profile URL to `/person/enrich` or `/person/contact/enrich`.

`emails` accepts business and personal addresses. An address on file matches exactly. Otherwise Crustdata matches it by the name in the address at the company that owns the domain, when that match is confident enough for the company's size, and then looks it up with a contact vendor inside the same request; a match on a new address can take a few seconds longer than one already on file.

The response is a top-level array with one row per identifier, in request order. `match_status` is `matched`, `not_found` or `redacted`; `redacted` means the person asked Crustdata to remove their data, and that row is never returned and never charged. `business_emails` is not accepted here; use `emails`. For lists larger than 25, use `/batch/person/identify`.

Billing: 1 credit per matched identifier. Unmatched and redacted identifiers are never charged. Identify is enabled per account; without access the request returns `403`.
<Note>
    Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
</Note>




## OpenAPI

````yaml /openapi-specs/2025-11-01/person.yaml post /person/identify
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
  /person/identify:
    post:
      tags:
        - Person APIs
      summary: Identify people from profile URLs, emails or Google Scholar profile URLs
      description: >
        Resolve up to 25 identifiers to the people behind them in one
        synchronous request. Send exactly one identifier key:
        `professional_network_profile_urls`, `emails` or
        `research_profile_urls`. Profile URLs and Scholar profile URLs match
        exactly. Each match returns the person's `crustdata_person_id`,
        `basic_profile`, `social_handles` and `updated_at`; for the full profile
        or contact data, pass the returned profile URL to `/person/enrich` or
        `/person/contact/enrich`.


        `emails` accepts business and personal addresses. An address on file
        matches exactly. Otherwise Crustdata matches it by the name in the
        address at the company that owns the domain, when that match is
        confident enough for the company's size, and then looks it up with a
        contact vendor inside the same request; a match on a new address can
        take a few seconds longer than one already on file.


        The response is a top-level array with one row per identifier, in
        request order. `match_status` is `matched`, `not_found` or `redacted`;
        `redacted` means the person asked Crustdata to remove their data, and
        that row is never returned and never charged. `business_emails` is not
        accepted here; use `emails`. For lists larger than 25, use
        `/batch/person/identify`.


        Billing: 1 credit per matched identifier. Unmatched and redacted
        identifiers are never charged. Identify is enabled per account; without
        access the request returns `403`.

        <Note>
            Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
        </Note>
      operationId: identifyPersonDataset
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: true
        description: Exactly one identifier key with up to 25 values.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PersonIdentifyRequest'
            examples:
              identify_by_profile_url:
                summary: Identify by profile URL
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/in/abhilashchowdhary
              identify_by_email:
                summary: Identify by email, business or personal
                value:
                  emails:
                    - abhilash@crustdata.com
              identify_by_research_profile_url:
                summary: Identify by Google Scholar profile URL
                value:
                  research_profile_urls:
                    - https://scholar.google.com/citations?user=VGjeKSMAAAAJ
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: One row per submitted identifier, in request order.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PersonIdentifyResponse'
              examples:
                identify_by_email_response:
                  summary: One matched email and one unknown address
                  value:
                    - matched_on: abhilash@crustdata.com
                      match_type: email
                      match_status: matched
                      matches:
                        - confidence_score: 1
                          person_data:
                            crustdata_person_id: 1068035
                            basic_profile:
                              name: Abhilash Chowdhary
                              professional_network_name: Abhilash Chowdhary
                              first_name: Abhilash
                              last_name: Chowdhary
                              headline: >-
                                Co-founder at Crustdata (YC F24) | Infra for
                                building AI employees
                              current_title: Co-Founder & CEO
                              normalized_title:
                                matched_title: Co-Founder, CEO, CTO
                                department: Executive Leadership
                                sub_department: Founders and Executives
                                similarity: 0.92
                                confident: true
                              summary: >-
                                Love building things. A software engineer with
                                vast experience in shipping products spanning
                                robotics, web technologies and quantitative
                                finance.
                              languages:
                                - English
                                - Hindi
                              last_updated: '2026-09-30T11:06:14.480375Z'
                              profile_picture_permalink: null
                              location:
                                city: San Francisco
                                state: California
                                country: United States
                                continent: North America
                                raw: San Francisco, California, United States
                                full_location: null
                            social_handles:
                              professional_network_identifier:
                                profile_url: https://www.linkedin.com/in/abhilashchowdhary
                              dev_platform_identifier:
                                profile_url: null
                              twitter_identifier:
                                slug: ''
                            updated_at: '2026-09-30T11:06:14.480375Z'
                    - matched_on: nobody@unknown-domain.com
                      match_type: email
                      match_status: not_found
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
                  summary: No identifier key in the body
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Exactly one identifier must be provided:
                        professional_network_profile_urls, emails,
                        crustdata_person_ids, or research_profile_urls
                      metadata: []
                mixed_identifiers:
                  summary: More than one identifier key
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Only one identifier type can be provided. Found: emails,
                        research_profile_urls
                      metadata: []
                business_emails_rejected:
                  summary: business_emails is not an identify key
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        business_emails is not accepted by /person/identify. Use
                        emails.
                      metadata: []
                invalid_email:
                  summary: An email fails validation
                  value:
                    error:
                      type: invalid_request
                      message: 'Invalid emails: not-an-email, jane@example.com'
                      metadata: []
                invalid_research_profile_url:
                  summary: A research profile URL is not a Google Scholar profile
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Invalid research profile URLs (only Google Scholar
                        profile URLs with a `user` parameter are supported):
                        https://example.com/jane
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
          description: Identify is not enabled on the account
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                error:
                  type: permission_error
                  message: You do not have permission to access /person/identify.
                  metadata: []
        '503':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            The identification service could not answer. Nothing was charged;
            retry shortly.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                error:
                  type: service_unavailable
                  message: >-
                    Person identification is temporarily unavailable; retry
                    shortly.
                  metadata:
                    - retryable: true
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
    PersonIdentifyRequest:
      type: object
      description: >-
        Exactly one identifier key, up to 25 values. `business_emails` is
        rejected; use `emails`.
      properties:
        professional_network_profile_urls:
          type: array
          maxItems: 25
          items:
            type: string
          description: Person profile URLs. 1 credit per match.
          example:
            - https://www.linkedin.com/in/abhilashchowdhary
        emails:
          type: array
          maxItems: 25
          items:
            type: string
            format: email
          description: >-
            Email addresses, business or personal. An address not on file is
            matched by name at the domain's company, then looked up with a
            contact vendor, in the same request. 1 credit per match.
          example:
            - abhilash@crustdata.com
        research_profile_urls:
          type: array
          maxItems: 25
          items:
            type: string
          description: >-
            Google Scholar profile URLs, for example
            `https://scholar.google.com/citations?user=VGjeKSMAAAAJ`. Only
            Google Scholar is supported. 1 credit per match.
          example:
            - https://scholar.google.com/citations?user=VGjeKSMAAAAJ
      oneOf:
        - required:
            - professional_network_profile_urls
        - required:
            - emails
        - required:
            - research_profile_urls
      additionalProperties: false
      example:
        emails:
          - abhilash@crustdata.com
    PersonIdentifyResponse:
      type: array
      description: >-
        Response from /person/identify. A top-level array with one row per
        submitted identifier, in request order.
      items:
        $ref: '#/components/schemas/PersonIdentifyResult'
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
    PersonIdentifyResult:
      type: object
      description: One row per submitted identifier, in request order.
      properties:
        matched_on:
          type: string
          description: The identifier as you sent it.
          example: abhilash@crustdata.com
        match_type:
          type: string
          description: The request key, singular.
          enum:
            - professional_network_profile_url
            - email
            - research_profile_url
        match_status:
          type: string
          enum:
            - matched
            - not_found
            - redacted
          description: >-
            Outcome for this identifier. matched: one match, billed. not_found:
            no person in Crustdata for this identifier; nothing billed.
            redacted: the person asked Crustdata to remove their data and the
            request was approved; the row is empty, never billed, and does not
            change on retry.
        matches:
          type: array
          description: Zero or one match.
          maxItems: 1
          items:
            $ref: '#/components/schemas/PersonIdentifyMatch'
    PersonIdentifyMatch:
      type: object
      properties:
        confidence_score:
          type: number
          format: float
          description: >-
            `1.0` for an exact match. An email matched by name and company
            domain carries the match score, `0.5` to `1.0`; the minimum rises
            with the company's headcount.
          example: 1
        person_data:
          $ref: '#/components/schemas/PersonIdentify'
    PersonIdentify:
      type: object
      description: >-
        The matched person. `basic_profile` has the same shape and source as the
        `basic_profile` section of `/person/enrich`.
      properties:
        crustdata_person_id:
          type: integer
          example: 1068035
        basic_profile:
          type: object
          properties:
            name:
              type: string
              nullable: true
              description: Canonical display name.
            professional_network_name:
              type: string
              nullable: true
              description: Display name on the person's professional-network profile.
            headline:
              type: string
            first_name:
              type: string
            last_name:
              type: string
            current_title:
              type: string
            normalized_title:
              type: object
              nullable: true
              description: >-
                Job Title Normalization (JTN, beta). See
                https://docs.crustdata.com/guides/job-title-normalization.
              properties:
                matched_title:
                  type: string
                  nullable: true
                department:
                  type: string
                  nullable: true
                sub_department:
                  type: string
                  nullable: true
                similarity:
                  type: number
                  format: float
                  nullable: true
                confident:
                  type: boolean
                  nullable: true
            summary:
              type: string
            languages:
              type: array
              items:
                type: string
            last_updated:
              type: string
              format: date-time
              nullable: true
            profile_picture_permalink:
              type: string
              nullable: true
            location:
              type: object
              nullable: true
              description: Geocoded location of the person.
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
                full_location:
                  type: string
                  nullable: true
        social_handles:
          type: object
          properties:
            professional_network_identifier:
              type: object
              properties:
                profile_url:
                  type: string
                  description: >-
                    The person's profile URL. Pass it to `/person/enrich` or
                    `/person/contact/enrich`.
            dev_platform_identifier:
              type: object
              properties:
                profile_url:
                  type: string
                  nullable: true
            twitter_identifier:
              type: object
              properties:
                slug:
                  type: string
        updated_at:
          type: string
          format: date-time
          nullable: true
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

- [Person Identify API](https://docs.crustdata.com/person-docs/identify/introduction.md)
- [Identify Companies](https://docs.crustdata.com/api-reference/company-apis/identify-a-company-from-name-domain-id-or-profile-url.md)
- [Batch Identify Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-identify-reverse-email-lookup-job.md)
- [Company Identify API](https://docs.crustdata.com/company-docs/identify/introduction.md)
- [Crustdata CLI](https://docs.crustdata.com/for-agents/cli.md)
