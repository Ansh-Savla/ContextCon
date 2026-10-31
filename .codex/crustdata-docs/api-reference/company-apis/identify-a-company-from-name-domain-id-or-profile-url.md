> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Identify Companies

> Match a company by name, website domain, profile URL, or Crustdata company ID.
Returns one or more matches ranked by confidence score. This endpoint is useful
for entity resolution before enrichment.

The API returns a top-level array with one result per submitted
identifier. Each match currently includes `company_data.crustdata_company_id` and
`company_data.basic_info`.

Exactly one identifier type must be provided per request.

<Note>
    Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
</Note>




## OpenAPI

````yaml /openapi-specs/2025-11-01/company.yaml post /company/identify
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
  /company/identify:
    post:
      tags:
        - Company APIs
        - Identify APIs
      summary: Identify a company from name, domain, ID, or profile URL
      description: >
        Match a company by name, website domain, profile URL, or Crustdata
        company ID.

        Returns one or more matches ranked by confidence score. This endpoint is
        useful

        for entity resolution before enrichment.


        The API returns a top-level array with one result per submitted

        identifier. Each match currently includes
        `company_data.crustdata_company_id` and

        `company_data.basic_info`.


        Exactly one identifier type must be provided per request.


        <Note>
            Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
        </Note>
      operationId: identifyCompanyDataset
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        description: >-
          Company identifier plus optional exact_match for domains. Provide
          exactly one of names, domains, crustdata_company_ids, or
          professional_network_profile_urls.
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CompanyIdentifyRequest'
            examples:
              identify_by_domain:
                summary: Identify by domain
                value:
                  domains:
                    - serverobotics.com
              identify_by_name:
                summary: Identify by company name
                value:
                  names:
                    - Serve Robotics
              identify_by_profile_url:
                summary: Identify by profile URL
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/company/mintlify
              identify_by_company_id:
                summary: Identify by Crustdata company ID
                value:
                  crustdata_company_ids:
                    - 628895
              identify_by_exact_domain:
                summary: Strict domain match
                value:
                  domains:
                    - cashfree.com
                  exact_match: true
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Identified company matches returned as a top-level array
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CompanyIdentifyResponse'
              examples:
                identify_by_domain_response:
                  summary: Single match by domain
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
                              description: null
                              company_type: null
                              year_founded: null
                              employee_count_range: 51-200
                              markets: null
                              industries:
                                - Technology, Information and Internet
                                - Technology, Information and Media
                identify_by_name_response:
                  summary: Multiple matches by name
                  value:
                    - matched_on: Serve Robotics
                      match_type: name
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
                              description: null
                              company_type: null
                              year_founded: null
                              employee_count_range: 51-200
                              markets: null
                              industries:
                                - Technology, Information and Internet
                                - Technology, Information and Media
                        - confidence_score: 1
                          company_data:
                            crustdata_company_id: 5825197
                            basic_info:
                              crustdata_company_id: 5825197
                              name: Site Serve Robotics
                              primary_domain: siteserverobotics.co.uk
                              all_domains:
                                - siteserverobotics.co.uk
                              website: http://www.siteserverobotics.co.uk
                              professional_network_url: >-
                                https://www.linkedin.com/company/site-serve-robotics
                              professional_network_id: '105810402'
                              profile_name: Site Serve Robotics
                              logo_permalink: >-
                                https://crustdata-media.s3.us-east-2.amazonaws.com/company/92e602d86605c4211800c7f028fed5f013207c6cfcda3f3eeaab5def1fc51006.jpg
                              description: null
                              company_type: null
                              year_founded: null
                              employee_count_range: 2-10
                              markets: null
                              industries:
                                - Construction
                        - confidence_score: 1
                          company_data:
                            crustdata_company_id: 25592234
                            basic_info:
                              crustdata_company_id: 25592234
                              name: iServe Robotics
                              primary_domain: iserve.ai
                              all_domains:
                                - iserve.ai
                              website: http://iserve.ai
                              professional_network_url: https://www.linkedin.com/company/iserve-robotics
                              professional_network_id: '104445099'
                              profile_name: iServe Robotics
                              logo_permalink: null
                              description: null
                              company_type: null
                              year_founded: null
                              employee_count_range: 2-10
                              markets: null
                              industries:
                                - Robotics Engineering
                                - Engineering Services
                                - Professional Services
                identify_by_profile_url_response:
                  summary: Single match by profile URL
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
                              description: null
                              company_type: null
                              year_founded: null
                              employee_count_range: 51-200
                              markets: null
                              industries:
                                - Software Development
                                - Technology, Information and Internet
                                - Technology, Information and Media
                exact_domain_multiple_matches:
                  summary: Strict domain match can still return multiple records
                  value:
                    - matched_on: cashfree.com
                      match_type: domain
                      matches:
                        - confidence_score: 1
                          company_data:
                            crustdata_company_id: 622934
                            basic_info:
                              crustdata_company_id: 622934
                              name: Cashfree Payments
                              primary_domain: cashfree.com
                              all_domains:
                                - cashfree.com
                              website: http://www.cashfree.com
                              professional_network_url: https://www.linkedin.com/company/cashfree
                              professional_network_id: '13183020'
                              profile_name: Cashfree Payments
                              logo_permalink: >-
                                https://crustdata-media.s3.us-east-2.amazonaws.com/company/5b5e9c26e60ea456898cbf1a5ae864648e801ee948a6258e495477ae4e205320.jpg
                              description: null
                              company_type: null
                              year_founded: null
                              employee_count_range: 501-1000
                              markets: null
                              industries:
                                - Financial Services
                        - confidence_score: 1
                          company_data:
                            crustdata_company_id: 908846
                            basic_info:
                              crustdata_company_id: 908846
                              name: Cashfree Tech
                              primary_domain: cashfree.com
                              all_domains:
                                - cashfree.com
                              website: http://www.cashfree.com
                              professional_network_url: https://www.linkedin.com/showcase/cashfree-tech/
                              professional_network_id: '91315036'
                              profile_name: Cashfree Tech
                              logo_permalink: >-
                                https://crustdata-media.s3.us-east-2.amazonaws.com/company/b563578d479631bac784d7d1ddb6fd8d2209a2387a4759197784faa23c465233.jpg
                              description: null
                              company_type: null
                              year_founded: null
                              employee_count_range: 501-1000
                              markets: null
                              industries:
                                - Financial Services
                        - confidence_score: 1
                          company_data:
                            crustdata_company_id: 10956299
                            basic_info:
                              crustdata_company_id: 10956299
                              name: WTFraud
                              primary_domain: cashfree.com
                              all_domains:
                                - cashfree.com
                              website: https://www.cashfree.com/wtfraud
                              professional_network_url: >-
                                https://www.linkedin.com/showcase/wtfraud-community/
                              professional_network_id: '106679039'
                              profile_name: WTFraud
                              logo_permalink: >-
                                https://crustdata-media.s3.us-east-2.amazonaws.com/company/fb150a5b286a938e6c56c76c7c17c9e4aa9eca2ab758744fa9a1b61b304bb186.jpg
                              description: null
                              company_type: null
                              year_founded: null
                              employee_count_range: 2-10
                              markets: null
                              industries:
                                - Technology, Information and Internet
                                - Technology, Information and Media
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
              example:
                error:
                  type: invalid_request
                  message: >-
                    Exactly one identifier must be provided:
                    crustdata_company_ids, names, domains, or
                    professional_network_profile_urls
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
        '403':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Identify not allowed for this account, or a requested field is not
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
                      message: You do not have permission to access /company/identify.
                      metadata: []
                fields_denied:
                  summary: A requested field is not enabled on the account
                  value:
                    error:
                      type: permission_error
                      message: >-
                        Access denied to fields: social_profiles. To enable
                        access, please book a call with us at
                        https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request
                      metadata:
                        - denied_fields:
                            - social_profiles
                          permitted_fields:
                            - basic_info
                            - crustdata_company_id
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
    CompanyIdentifyRequest:
      type: object
      description: >-
        Company identifiers plus optional field selection and exact_match.
        Provide exactly one identifier type (names, domains,
        crustdata_company_ids, or professional_network_profile_urls); each may
        contain 1 to 25 values.
      properties:
        names:
          type: array
          items:
            type: string
          maxItems: 25
          nullable: true
        domains:
          type: array
          items:
            type: string
          maxItems: 25
          nullable: true
        crustdata_company_ids:
          type: array
          items:
            type: integer
          maxItems: 25
          nullable: true
        professional_network_profile_urls:
          type: array
          items:
            type: string
          maxItems: 25
          nullable: true
        fields:
          type: array
          items:
            type: string
          description: >
            Field groups to include in `company_data`. Valid field groups:
            `crustdata_company_id`, `basic_info`, `social_profiles`. Identify
            resolves a company to its identity and basic profile only;
            requesting any other group returns `400 Invalid fields`. For
            `headcount`, `funding`, `people`, `hiring`, `revenue` and other
            sections, use `/company/enrich`.
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
          - social_profiles
    CompanyIdentifyResponse:
      type: array
      description: >-
        Top-level array returned by /company/identify with one entry per
        submitted identifier.
      items:
        $ref: '#/components/schemas/IdentifyResult'
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
    IdentifyResult:
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
            $ref: '#/components/schemas/IdentifyMatch'
      description: >-
        One result entry in the identify response — one per submitted
        identifier.
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
    IdentifyMatch:
      type: object
      properties:
        confidence_score:
          type: number
          format: float
          example: 0.95
        company_data:
          $ref: '#/components/schemas/CompanyIdentify'
      description: >-
        A single company match from /company/identify with confidence score and
        core company data.
      example:
        confidence_score: 1
        company_data:
          crustdata_company_id: 810670
          basic_info:
            name: Mintlify
            primary_domain: mintlify.link
    CompanyIdentify:
      type: object
      additionalProperties: false
      properties:
        crustdata_company_id:
          type: integer
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
            industries:
              type: array
              items:
                type: string
              nullable: true
              example:
                - Software Development
                - Technology, Information and Internet
        social_profiles:
          type: object
          properties:
            professional_network:
              type: string
              nullable: true
              description: >
                Profile URL for the company. Same value also surfaced at
                basic_info.professional_network_url.
      description: Basic company fields returned inside identify matches.
      example:
        crustdata_company_id: 810670
        basic_info:
          name: Mintlify
          primary_domain: mintlify.link
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

- [Company Identify API](https://docs.crustdata.com/company-docs/identify/introduction.md)
- [Usage](https://docs.crustdata.com/general/usage.md)
- [Identify People](https://docs.crustdata.com/api-reference/person-apis/identify-people-from-profile-urls-emails-or-google-scholar-profile-urls.md)
- [Person Identify API](https://docs.crustdata.com/person-docs/identify/introduction.md)
- [Batch Identify Person](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-identify-reverse-email-lookup-job.md)
