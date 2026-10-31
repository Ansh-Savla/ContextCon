> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Enrich People

> Enrich person records using the Crustdata cached dataset. Provide profile URLs to retrieve detailed
person data including employment history, education, skills, and developer platform data when available.
Supports batch enrichment of up to 25 profiles at once.
<Note>
    Default `rate-limit` is 15 requests per minute. Contact support to discuss higher limits if needed for your use case.
</Note>




## OpenAPI

````yaml /openapi-specs/2025-11-01/person.yaml post /person/enrich
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
  /person/enrich:
    post:
      tags:
        - Person APIs
        - Enrich APIs
      summary: Enrich person profiles from cached dataset
      description: >
        Enrich person records using the Crustdata cached dataset. Provide
        profile URLs to retrieve detailed

        person data including employment history, education, skills, and
        developer platform data when available.

        Supports batch enrichment of up to 25 profiles at once.

        <Note>
            Default `rate-limit` is 15 requests per minute. Contact support to discuss higher limits if needed for your use case.
        </Note>
      operationId: enrichPersonDataset
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: true
        description: Profile URLs and optional field selection.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PersonEnrichRequest'
            examples:
              default_fields:
                summary: Enrich a profile with the default fields
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/in/dvdhsu/
              selected_fields:
                summary: Enrich a profile with employment and education data
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/in/dvdhsu/
                  fields:
                    - basic_profile
                    - experience
                    - education
              research_profiles:
                summary: >-
                  Enrich a profile with its research profiles (enabled per
                  account)
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/in/yann-lecun/
                  fields:
                    - basic_profile.name
                    - research_profiles
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Enriched person profiles
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PersonEnrichResponse'
              examples:
                default_fields_response:
                  summary: Default enrichment result
                  value:
                    - matched_on: https://www.linkedin.com/in/dvdhsu/
                      match_type: professional_network_profile_url
                      matches:
                        - confidence_score: 1
                          person_data:
                            crustdata_person_id: 14540
                            basic_profile:
                              current_title: Founder, CEO
                              headline: Founder, CEO @ Retool
                              name: David Hsu
                              location:
                                city: ''
                                state: California
                                country: United States
                                continent: North America
                                raw: San Francisco Bay Area
                            social_handles:
                              professional_network_identifier:
                                profile_url: https://www.linkedin.com/in/dvdhsu
                              dev_platform_identifier:
                                profile_url: null
                              twitter_identifier:
                                slug: ''
                research_profiles_response:
                  summary: >-
                    Research profiles for a matched person, trimmed to one
                    article, one co-author, and two timeseries points (paired
                    with `research_profiles` request)
                  value:
                    - matched_on: https://www.linkedin.com/in/yann-lecun/
                      match_type: professional_network_profile_url
                      match_status: matched
                      matches:
                        - confidence_score: 1
                          person_data:
                            crustdata_person_id: 1284112
                            basic_profile:
                              name: Yann LeCun
                            research_profiles:
                              - id: WLN3QrAAAAAJ
                                profile_url: >-
                                  https://scholar.google.com/citations?user=WLN3QrAAAAAJ
                                name: Yann LeCun
                                designation: >-
                                  Executive Chairman AMI Labs & Jacob T Schwarz
                                  Professor, Courant Institute, New York
                                  University
                                affiliated_organisation: New York University
                                verified_email_domain: cs.nyu.edu
                                website: http://yann.lecun.com/
                                research_interests:
                                  - AI
                                  - machine learning
                                  - computer vision
                                  - robotics
                                  - image compression
                                thumbnail: >-
                                  https://scholar.googleusercontent.com/citations?view_op=view_photo&user=WLN3QrAAAAAJ&citpid=2
                                article_count: 799
                                co_author_count: 117
                                citations_count:
                                  all: 495332
                                  recent: 300443
                                  recent_since_year: 2021
                                h_index:
                                  all: 175
                                  recent: 129
                                  recent_since_year: 2021
                                i10_index:
                                  all: 504
                                  recent: 404
                                  recent_since_year: 2021
                                citations_timeseries:
                                  - year: 2008
                                    citations: 1264
                                  - year: 2009
                                    citations: 1456
                                articles:
                                  - title: Deep learning
                                    url: >-
                                      https://scholar.google.com/citations?view_op=view_citation&hl=en&user=WLN3QrAAAAAJ&pagesize=100&citation_for_view=WLN3QrAAAAAJ:lo0OIn9KAZgC
                                    publication_year: '2015'
                                    total_citations: 122610
                                    authors:
                                      - Y LeCun
                                      - Y Bengio
                                      - G Hinton
                                    all_authors: true
                                    publication: nature 521 (7553), 436-444
                                co_authors:
                                  - id: kukA0LcAAAAJ
                                    profile_url: >-
                                      https://scholar.google.com/citations?hl=en&user=kukA0LcAAAAJ
                                    name: Yoshua Bengio
                                    designation: >-
                                      Professor of computer science, University
                                      of Montreal, Mila, IVADO, CIFAR
                                    thumbnail: >-
                                      https://scholar.googleusercontent.com/citations?view_op=view_photo&user=kukA0LcAAAAJ&citpid=3
                                metadata:
                                  last_scraped_source: '2026-09-09T07:39:01.451002Z'
                            social_handles:
                              professional_network_identifier:
                                profile_url: https://www.linkedin.com/in/yann-lecun
                selected_fields_response:
                  summary: Enrichment result with employment and education data
                  value:
                    - matched_on: https://www.linkedin.com/in/dvdhsu/
                      match_type: professional_network_profile_url
                      matches:
                        - confidence_score: 1
                          person_data:
                            crustdata_person_id: 14540
                            basic_profile:
                              name: David Hsu
                              headline: Founder, CEO @ Retool
                              current_title: Founder, CEO
                            experience:
                              employment_details:
                                current:
                                  - name: Retool
                                    title: Founder, CEO
                                    start_date: '2017-01-01T00:00:00+00:00'
                                    seniority_level: CXO
                                    crustdata_company_id: 633593
                                past: []
                            education:
                              schools:
                                - school: University of Oxford
                                  degree: Bachelor of Arts (B.A.)
                                  field_of_study: Philosophy and Computer Science
                                  location:
                                    raw: >-
                                      South Hinksey, Wootton, Kennington,
                                      Oxford, Boars Hill, England, United
                                      Kingdom
                                    city: Boars Hill
                                    state: England
                                    country: United Kingdom
                                    continent: Europe
                            social_handles:
                              professional_network_identifier:
                                profile_url: https://www.linkedin.com/in/dvdhsu
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
                  summary: Missing required identifier
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Exactly one identifier must be provided:
                        professional_network_profile_urls
                      metadata: []
                preview_not_enabled:
                  summary: preview is not enabled on the account
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Preview feature is not available for your account.
                        Please reach out to Crustdata team.
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
            Permission denied or insufficient credits. Also returned when a
            requested field is not enabled on the account
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
                      message: You do not have permission to access /person/enrich.
                      metadata: []
                fields_denied:
                  summary: A requested field is not enabled on the account
                  value:
                    error:
                      type: permission_error
                      message: >-
                        Access denied to fields: contact.business_emails. To
                        enable access, please book a call with us at
                        https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request
                      metadata:
                        - denied_fields:
                            - contact.business_emails
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
    PersonEnrichRequest:
      type: object
      properties:
        professional_network_profile_urls:
          type: array
          items:
            type: string
          description: Array of professional-network profile URLs (max 25).
        fields:
          type: array
          items:
            type: string
          description: >
            Fields to include in the response. Valid field groups for enrich:
            basic_profile, professional_network, skills, social_handles,
            experience, education, certifications, honors,
            dev_platform_profiles, assessment, social_posts, research_profiles.
            Use dot-notation for nested fields (e.g., "basic_profile.name",
            "experience.employment_details"). If omitted, a default set
            (basic_profile, social_handles) is returned. Request additional
            groups explicitly. Some groups (for example certifications, honors,
            and research_profiles) require field-level permission on your API
            key; research_profiles is enabled per account on request and returns
            `403 Access denied to fields: research_profiles` without the grant.
          example:
            - basic_profile
            - experience
        preview:
          type: boolean
          default: false
          description: >-
            Enabled per account on request. Without the grant, the API returns
            `400 invalid_request` with the message `Preview feature is not
            available for your account. Please reach out to Crustdata team.` and
            charges 0 credits. Where enabled, preview mode returns only basic
            profile fields, charges 0 credits, and ignores `fields`. You cannot
            combine it with `enrich_realtime`.
      required:
        - professional_network_profile_urls
      additionalProperties: false
      description: Request body for /person/enrich using professional-network profile URLs.
      example:
        professional_network_profile_urls:
          - https://www.linkedin.com/in/dvdhsu/
        fields:
          - basic_profile
    PersonEnrichResponse:
      type: array
      items:
        $ref: '#/components/schemas/PersonEnrichResult'
      description: >-
        Response from /person/enrich. Returns a top-level array with one entry
        per submitted identifier.
      example:
        - matched_on: https://www.linkedin.com/in/dvdhsu/
          match_type: professional_network_profile_url
          matches: []
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
    PersonEnrichResult:
      type: object
      properties:
        matched_on:
          type: string
          description: The submitted professional-network profile URL.
        match_type:
          type: string
          enum:
            - professional_network_profile_url
        match_status:
          type: string
          enum:
            - matched
            - not_found
            - redacted
          description: >-
            Outcome for this identifier. matched: at least one match. not_found:
            no profile in Crustdata yet; the identifier is queued for
            enrichment, so retry later or use live enrich. redacted: the person
            asked Crustdata to remove their data and the request was approved. A
            redacted entry always has empty matches, is never billed, and does
            not change on retry or with live enrich.
        matches:
          type: array
          items:
            $ref: '#/components/schemas/PersonEnrichMatch'
      description: One result entry in the enrich response — one per submitted identifier.
      example:
        matched_on: https://www.linkedin.com/in/dvdhsu/
        match_type: professional_network_profile_url
        matches:
          - confidence_score: 1
            person_data:
              crustdata_person_id: 14540
              basic_profile:
                name: David Hsu
    PersonEnrichMatch:
      type: object
      properties:
        confidence_score:
          type: number
          format: float
          example: 0.95
        person_data:
          $ref: '#/components/schemas/PersonEnrich'
      description: >-
        A single enriched person match from /person/enrich with confidence score
        and full person data.
      example:
        confidence_score: 1
        person_data:
          crustdata_person_id: 14540
          basic_profile:
            name: David Hsu
    PersonEnrich:
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
            first_name:
              type: string
            last_name:
              type: string
            current_title:
              type: string
            professional_network_name:
              type: string
              nullable: true
              description: Display name on the person's professional-network profile.
              example: David Hsu
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
        professional_network:
          type: object
          properties:
            profile_picture_url:
              type: string
            profile_picture_permalink:
              type: string
            name:
              type: string
            pronoun:
              type: string
            headline:
              type: string
            current_title:
              type: string
            summary:
              type: string
            location:
              type: object
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
            connections:
              type: integer
              nullable: true
            followers:
              type: integer
              nullable: true
            joined_date:
              type: string
              nullable: true
            verifications:
              type: array
              items:
                type: string
            open_to_cards:
              type: array
              description: >
                Open-to signal codes declared on the profile. Filter with the
                `in` operator using one or more of the closed enum values below.
                Human-readable strings like `"open_to_work"` are not indexed and
                return zero results.


                | Code               |
                Meaning                                          |

                | ------------------ |
                ------------------------------------------------ |

                | `CAREER_INTEREST`  | Profile is open to new career
                opportunities      |

                | `HIRING_MANAGER`   | Profile is actively
                hiring                       |

                | `VOLUNTEERING`     | Profile is open to volunteer
                work                |
              items:
                type: string
                enum:
                  - CAREER_INTEREST
                  - HIRING_MANAGER
                  - VOLUNTEERING
              example:
                - CAREER_INTEREST
            metadata:
              type: object
              properties:
                last_scraped_source:
                  type: string
                  format: date-time
                  nullable: true
        skills:
          $ref: '#/components/schemas/PersonSkills'
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
              properties:
                slug:
                  type: string
        dev_platform_profiles:
          type: array
          nullable: true
          items:
            $ref: '#/components/schemas/PersonDevPlatformProfile'
        social_posts:
          type: array
          nullable: true
          items:
            $ref: '#/components/schemas/SocialPost'
          description: >-
            Up to the 10 most recent posts authored by this person, newest
            first. Plain reshares of someone else's post are excluded; quote
            posts are included. Never returned by default: request it explicitly
            in `fields`.
        research_profiles:
          type: array
          nullable: true
          items:
            $ref: '#/components/schemas/PersonResearchProfile'
          description: >-
            Academic author profiles matched to this person, best match first. A
            person can carry more than one. Each profile includes every
            publication and co-author it lists. Never returned by default and
            enabled per account: request it explicitly in `fields`, or request a
            sub-path such as `research_profiles.h_index.all` to keep the payload
            small. Absent when the person has no matched profile.
        assessment:
          $ref: '#/components/schemas/PersonAssessment'
        experience:
          type: object
          properties:
            employment_details:
              type: object
              properties:
                current:
                  type: array
                  items:
                    $ref: '#/components/schemas/PersonEmploymentDetails'
                past:
                  type: array
                  items:
                    $ref: '#/components/schemas/PersonEmploymentDetails'
            years_of_experience:
              type: string
              nullable: true
              description: Total experience across every role, as a band.
              example: More than 10 years
            years_of_experience_raw:
              type: number
              nullable: true
              description: Total years of experience across every role.
              example: 12
        certifications:
          type: array
          items:
            $ref: '#/components/schemas/PersonCertification'
          description: >-
            Certifications on the person profile. Requires field-level
            permission on your API key.
        honors:
          type: array
          items:
            $ref: '#/components/schemas/PersonHonor'
          description: >-
            Honors and awards on the person profile. Requires field-level
            permission on your API key.
        education:
          type: object
          properties:
            schools:
              type: array
              items:
                $ref: '#/components/schemas/PersonEducation'
        updated_at:
          type: string
          format: date-time
          nullable: true
      description: >-
        Enriched person profile with basic profile, skills, social handles,
        experience, education, certifications, and developer platform data.
      example:
        crustdata_person_id: 14540
        basic_profile:
          name: David Hsu
          current_title: Founder, CEO
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
    PersonDevPlatformProfile:
      type: object
      description: One linked dev platform account profile
      properties:
        account_type:
          type: string
          nullable: true
        profile_url:
          type: string
          nullable: true
        name:
          type: string
          nullable: true
        email:
          type: string
          nullable: true
        location:
          type: object
          nullable: true
          properties:
            raw:
              type: string
              nullable: true
        company_text:
          type: string
          nullable: true
        bio:
          type: string
          nullable: true
        website_url:
          type: string
          nullable: true
        profile_picture_url:
          type: string
          nullable: true
        is_hireable:
          type: boolean
          nullable: true
        is_site_admin:
          type: boolean
          nullable: true
        confidence_score:
          type: number
          format: double
          nullable: true
        public_repo_count:
          type: integer
          format: int64
          nullable: true
        followers:
          type: integer
          format: int64
          nullable: true
        following:
          type: integer
          format: int64
          nullable: true
        repos:
          type: array
          description: The account's top 25 most recently pushed owned repositories.
          nullable: true
          items:
            type: object
            properties:
              full_name:
                type: string
                nullable: true
              owner:
                type: string
                nullable: true
              is_fork:
                type: boolean
                nullable: true
              description:
                type: string
                nullable: true
              homepage:
                type: string
                nullable: true
              primary_language:
                type: string
                nullable: true
              topics:
                type: array
                nullable: true
                items:
                  type: string
              license_key:
                type: string
                nullable: true
              license_name:
                type: string
                nullable: true
              archived:
                type: boolean
                nullable: true
              disabled:
                type: boolean
                nullable: true
              is_template:
                type: boolean
                nullable: true
              has_issues:
                type: boolean
                nullable: true
              has_projects:
                type: boolean
                nullable: true
              has_wiki:
                type: boolean
                nullable: true
              stars:
                type: integer
                format: int64
                nullable: true
              forks_count:
                type: integer
                format: int64
                nullable: true
              open_issues_count:
                type: integer
                format: int64
                nullable: true
              size:
                type: integer
                format: int64
                nullable: true
              github_created_at:
                type: string
                format: date-time
                nullable: true
              github_updated_at:
                type: string
                format: date-time
                nullable: true
              github_pushed_at:
                type: string
                format: date-time
                nullable: true
              metrics_timeseries:
                type: array
                nullable: true
                items:
                  type: object
                  properties:
                    as_of_date:
                      type: string
                      format: date
                    stargazers_count:
                      type: integer
                      format: int64
                      nullable: true
                    forks_count:
                      type: integer
                      format: int64
                      nullable: true
                    open_issues_count:
                      type: integer
                      format: int64
                      nullable: true
                    size:
                      type: integer
                      format: int64
                      nullable: true
        total_repos:
          type: integer
          format: int64
          description: Number of owned repositories tracked for the account.
          nullable: true
        total_stars:
          type: integer
          format: int64
          description: Total stars across all owned repositories.
          nullable: true
        max_stars:
          type: integer
          format: int64
          description: Stars on the most-starred owned repository.
          nullable: true
        median_stars:
          type: integer
          format: int64
          description: Median stars across owned repositories.
          nullable: true
        all_languages:
          type: array
          description: Primary languages across all owned repositories.
          nullable: true
          items:
            type: string
        all_topics:
          type: array
          description: Topic tags across all owned repositories.
          nullable: true
          items:
            type: string
        metrics_timeseries:
          type: array
          description: Historical account-level metric snapshots.
          nullable: true
          items:
            type: object
            properties:
              as_of_date:
                type: string
                format: date
              followers_count:
                type: integer
                format: int64
                nullable: true
              following_count:
                type: integer
                format: int64
                nullable: true
              public_repo_count:
                type: integer
                format: int64
                nullable: true
        declared_handles:
          type: array
          nullable: true
          items:
            type: object
            properties:
              provider:
                type: string
                nullable: true
              url:
                type: string
                nullable: true
              created_at:
                type: string
                format: date-time
                nullable: true
              last_updated:
                type: string
                format: date-time
                nullable: true
        org_memberships:
          type: array
          nullable: true
          items:
            type: object
            properties:
              organization_id:
                type: integer
                format: int64
                nullable: true
              organization_github_id:
                type: integer
                format: int64
                nullable: true
              organization_login:
                type: string
                nullable: true
              created_at:
                type: string
                format: date-time
                nullable: true
              last_updated:
                type: string
                format: date-time
                nullable: true
        metadata:
          type: object
          nullable: true
          properties:
            created_at:
              type: string
              format: date-time
              nullable: true
            last_scraped_source:
              type: string
              format: date-time
              nullable: true
            last_updated:
              type: string
              format: date-time
              nullable: true
      example:
        account_type: github
        profile_url: https://github.com/dvdhsu
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
      description: A single post authored by the enriched person or company.
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
    PersonResearchProfile:
      type: object
      description: >-
        One academic author profile matched to the person. Returned by
        /person/enrich with the full article and co-author lists. Enabled per
        account.
      properties:
        id:
          type: string
          nullable: true
          description: Profile identifier, the `user` parameter of `profile_url`.
          example: WLN3QrAAAAAJ
        profile_url:
          type: string
          nullable: true
          example: https://scholar.google.com/citations?user=WLN3QrAAAAAJ
        name:
          type: string
          nullable: true
          description: Name displayed on the profile.
          example: Yann LeCun
        designation:
          type: string
          nullable: true
          description: Free-text affiliation as displayed on the profile.
        affiliated_organisation:
          type: string
          nullable: true
          description: Organisation extracted from the affiliation.
          example: New York University
        verified_email_domain:
          type: string
          nullable: true
          description: Institution domain verified for this profile.
          example: cs.nyu.edu
        website:
          type: string
          nullable: true
          description: Homepage supplied on the profile.
        research_interests:
          type: array
          nullable: true
          items:
            type: string
          example:
            - AI
            - machine learning
        thumbnail:
          type: string
          nullable: true
          description: Profile picture URL.
        article_count:
          type: integer
          nullable: true
          description: Number of publications on the profile.
          example: 799
        co_author_count:
          type: integer
          nullable: true
          example: 117
        citations_count:
          $ref: '#/components/schemas/PersonResearchProfileMetrics'
        h_index:
          $ref: '#/components/schemas/PersonResearchProfileMetrics'
        i10_index:
          $ref: '#/components/schemas/PersonResearchProfileMetrics'
        citations_timeseries:
          type: array
          nullable: true
          description: Citations per year, oldest first. Not returned by /person/search.
          items:
            $ref: '#/components/schemas/PersonResearchProfileCitationYear'
        articles:
          type: array
          nullable: true
          description: Every publication on the profile.
          items:
            $ref: '#/components/schemas/PersonResearchProfileArticle'
        co_authors:
          type: array
          nullable: true
          description: Every co-author linked from the profile.
          items:
            $ref: '#/components/schemas/PersonResearchProfileCoAuthor'
        metadata:
          type: object
          nullable: true
          properties:
            last_scraped_source:
              type: string
              format: date-time
              nullable: true
              description: When the profile was last refreshed from the web.
              example: '2026-09-09T07:39:01.451002Z'
    PersonAssessment:
      type: object
      nullable: true
      properties:
        authenticity:
          type: object
          nullable: true
          properties:
            verdict:
              type: string
              nullable: true
              enum:
                - clearly_genuine
                - probably_genuine
                - cannot_verify
                - probably_fabricated
                - clearly_fabricated
              description: >-
                Authenticity label for the profile. `cannot_verify` means thin
                evidence rather than fraud, and `probably_fabricated` is a
                review flag, not a trigger for automated action.
            tier:
              type: integer
              nullable: true
              minimum: 0
              maximum: 9
              description: >-
                Authenticity tier, 0 (most trusted) to 9 (least trusted).
                Sortable on /person/search, where ascending puts the most
                trusted first.
          description: Authenticity assessment of the profile.
      description: >-
        Computed profile assessment. Returned only by /person/enrich, never by
        default, and not a billed add-on. `verdict` and `tier` are populated
        independently, so a profile may carry a tier with a null verdict.
        Filterable and sortable on /person/search, but not returnable there:
        naming an assessment path in that endpoint's `fields` returns 400
        Invalid fields.
      example:
        authenticity:
          verdict: probably_genuine
          tier: 2
    PersonEmploymentDetails:
      allOf:
        - $ref: '#/components/schemas/PersonSearchEmploymentDetails'
        - type: object
          properties:
            company_website_domain:
              type: string
              nullable: true
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
    PersonEducation:
      allOf:
        - $ref: '#/components/schemas/PersonSearchEducation'
        - type: object
          properties:
            activities_and_societies:
              type: string
              nullable: true
              description: Activities and societies the person participated in.
              example: Debating Society
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
    PersonResearchProfileCitationYear:
      type: object
      description: Citations received in one calendar year.
      properties:
        year:
          type: integer
          nullable: true
          example: 2015
        citations:
          type: integer
          nullable: true
          example: 13241
    PersonResearchProfileArticle:
      type: object
      description: One publication listed on the research profile.
      properties:
        title:
          type: string
          nullable: true
          example: Deep learning
        url:
          type: string
          nullable: true
          description: Citation page of the publication.
        publication_year:
          type: string
          nullable: true
          description: Year of publication, as a string.
          example: '2015'
        total_citations:
          type: integer
          nullable: true
          example: 122610
        authors:
          type: array
          nullable: true
          items:
            type: string
          description: Author names as listed on the publication.
        all_authors:
          type: boolean
          nullable: true
          description: False when the author list was truncated at the source.
        publication:
          type: string
          nullable: true
          description: Venue as displayed, for example journal, volume, and pages.
          example: nature 521 (7553), 436-444
    PersonResearchProfileCoAuthor:
      type: object
      description: A co-author with a research profile linked from this profile.
      properties:
        id:
          type: string
          nullable: true
          description: Research profile identifier of the co-author.
          example: kukA0LcAAAAJ
        profile_url:
          type: string
          nullable: true
        name:
          type: string
          nullable: true
          example: Yoshua Bengio
        designation:
          type: string
          nullable: true
        thumbnail:
          type: string
          nullable: true
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

- [Batch Person Enrichment API](https://docs.crustdata.com/person-docs/enrichment/batch-enrich.md)
- [Batch Company Enrichment API](https://docs.crustdata.com/company-docs/enrichment/batch.md)
- [Identify People](https://docs.crustdata.com/api-reference/person-apis/identify-people-from-profile-urls-emails-or-google-scholar-profile-urls.md)
- [Batch People Search API](https://docs.crustdata.com/person-docs/search/batch-search.md)
- [People Search API](https://docs.crustdata.com/person-docs/search/introduction.md)
