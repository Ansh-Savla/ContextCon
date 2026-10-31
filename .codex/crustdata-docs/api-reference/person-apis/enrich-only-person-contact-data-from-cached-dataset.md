> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Contact Enrich

> Enrich only the contact data for a person — business emails, personal emails, and phone numbers — using the Crustdata cached dataset.
Provide either a profile URL or a business email. Exactly one identifier type must be provided per request. Supports batch enrichment of up to 25 identifiers at once.

This endpoint mirrors `/person/enrich` but is scoped to contact fields: the enrichable fields are `contact.business_emails`, `contact.personal_emails`, `contact.phone_numbers`, `contact.phone_numbers_info`, and `contact.websites`. `contact.phone_numbers_info` belongs to the phone tier: either phone field bills the tier once. `contact.phone_numbers` returns both phone lists. `contact.phone_numbers_info`, or one of its sub-fields, returns only `phone_numbers_info`, with all four keys in each record. Requesting any non-contact field returns a `400` error listing the contact fields your key can request. Current platform behavior: email records hold only `email` and `status`: `crustdata_company_id` and `last_updated` are not returned, even when requested. When `fields` is omitted, the three contact tiers (business emails, personal emails, and phone numbers) are enriched; `contact.websites` is returned only when requested explicitly. Each submitted identifier returns one result entry; an identifier with no contact match returns an empty `matches` array.

Set `verified: true` to return only business emails that pass a deliverability check at request time. Cached addresses marked `deliverable` or `unknown` are re-checked before they are served, and the response holds only `deliverable` and `catch_all` business emails. When no address survives, `contact.business_emails` is empty and `contact.business_emails_message` is `no verified emails found`. The flag only affects `contact.business_emails` and adds **0.5** credits per matched person who receives at least one verified business email.
<Note>
    Default `rate-limit` is 15 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
</Note>




## OpenAPI

````yaml /openapi-specs/2025-11-01/person.yaml post /person/contact/enrich
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
  /person/contact/enrich:
    post:
      tags:
        - Person APIs
        - Enrich APIs
      summary: Enrich only person contact data from cached dataset
      description: >
        Enrich only the contact data for a person — business emails, personal
        emails, and phone numbers — using the Crustdata cached dataset.

        Provide either a profile URL or a business email. Exactly one identifier
        type must be provided per request. Supports batch enrichment of up to 25
        identifiers at once.


        This endpoint mirrors `/person/enrich` but is scoped to contact fields:
        the enrichable fields are `contact.business_emails`,
        `contact.personal_emails`, `contact.phone_numbers`,
        `contact.phone_numbers_info`, and `contact.websites`.
        `contact.phone_numbers_info` belongs to the phone tier: either phone
        field bills the tier once. `contact.phone_numbers` returns both phone
        lists. `contact.phone_numbers_info`, or one of its sub-fields, returns
        only `phone_numbers_info`, with all four keys in each record. Requesting
        any non-contact field returns a `400` error listing the contact fields
        your key can request. Current platform behavior: email records hold only
        `email` and `status`: `crustdata_company_id` and `last_updated` are not
        returned, even when requested. When `fields` is omitted, the three
        contact tiers (business emails, personal emails, and phone numbers) are
        enriched; `contact.websites` is returned only when requested explicitly.
        Each submitted identifier returns one result entry; an identifier with
        no contact match returns an empty `matches` array.


        Set `verified: true` to return only business emails that pass a
        deliverability check at request time. Cached addresses marked
        `deliverable` or `unknown` are re-checked before they are served, and
        the response holds only `deliverable` and `catch_all` business emails.
        When no address survives, `contact.business_emails` is empty and
        `contact.business_emails_message` is `no verified emails found`. The
        flag only affects `contact.business_emails` and adds **0.5** credits per
        matched person who receives at least one verified business email.

        <Note>
            Default `rate-limit` is 15 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
        </Note>
      operationId: enrichPersonContactDataset
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: true
        description: >-
          Person identifier (profile URL or business email) and optional
          contact-field selection.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PersonContactEnrichRequest'
            examples:
              enrich_by_profile_url:
                summary: Enrich contact data by profile URL
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/in/dvdhsu/
              enrich_by_email:
                summary: Enrich contact data by business email
                value:
                  business_emails:
                    - david@example.com
              enrich_specific_tiers:
                summary: Request only business emails and phone numbers
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/in/dvdhsu/
                  fields:
                    - contact.business_emails
                    - contact.phone_numbers
              enrich_verified_business_emails:
                summary: Return only business emails that pass a deliverability check
                value:
                  professional_network_profile_urls:
                    - https://www.linkedin.com/in/dvdhsu/
                  fields:
                    - contact.business_emails
                  verified: true
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Enriched person contact data. Returns a top-level array with one
            entry per submitted identifier; unmatched identifiers return an
            empty `matches` array.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PersonContactEnrichResponse'
              examples:
                enrich_by_profile_url_response:
                  summary: Contact enrichment result for a profile URL
                  value:
                    - matched_on: https://www.linkedin.com/in/dvdhsu/
                      match_type: professional_network_profile_url
                      matches:
                        - confidence_score: 1
                          person_data:
                            crustdata_person_id: 14540
                            contact:
                              business_emails:
                                - email: david@example.com
                                  status: deliverable
                                - email: d.hsu@example.com
                                  status: unknown
                              personal_emails:
                                - email: david.personal@example.com
                                  status: deliverable
                              phone_numbers:
                                - '+15555550123'
                              phone_numbers_info:
                                - country_code: '+1'
                                  country: US
                                  phone_number: '5555550123'
                                  type: mobile
                enrich_by_email_response:
                  summary: Contact enrichment result for a business email
                  value:
                    - matched_on: david@example.com
                      match_type: business_email
                      matches:
                        - confidence_score: 1
                          person_data:
                            crustdata_person_id: 14540
                            contact:
                              business_emails:
                                - email: david@example.com
                                  status: deliverable
                              personal_emails: []
                              phone_numbers: []
                              phone_numbers_info: []
                no_match_response:
                  summary: Identifier with no contact match
                  value:
                    - matched_on: https://www.linkedin.com/in/no-such-profile/
                      match_type: professional_network_profile_url
                      matches: []
                verified_response:
                  summary: Verified business emails only
                  value:
                    - matched_on: https://www.linkedin.com/in/dvdhsu/
                      match_type: professional_network_profile_url
                      matches:
                        - confidence_score: 1
                          person_data:
                            crustdata_person_id: 14540
                            contact:
                              business_emails:
                                - email: david@example.com
                                  status: deliverable
                verified_no_email_response:
                  summary: Verified request where no business email survived the check
                  value:
                    - matched_on: https://www.linkedin.com/in/dvdhsu/
                      match_type: professional_network_profile_url
                      matches:
                        - confidence_score: 1
                          person_data:
                            crustdata_person_id: 14540
                            contact:
                              business_emails: []
                              business_emails_message: no verified emails found
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
                both_identifiers:
                  summary: Both identifier types supplied
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Only one identifier type can be provided. Found:
                        professional_network_profile_urls, business_emails
                      metadata: []
                invalid_field:
                  summary: Non-contact field requested
                  value:
                    error:
                      type: invalid_request
                      message: 'Invalid fields: basic_profile'
                      metadata:
                        - available_fields:
                            - contact
                            - contact.business_emails
                            - contact.business_emails.crustdata_company_id
                            - contact.business_emails.email
                            - contact.business_emails.last_updated
                            - contact.business_emails.status
                            - contact.business_emails_message
                            - contact.personal_emails
                            - contact.personal_emails.email
                            - contact.personal_emails.last_updated
                            - contact.personal_emails.status
                            - contact.phone_numbers
                            - contact.phone_numbers_info
                            - contact.phone_numbers_info.country
                            - contact.phone_numbers_info.country_code
                            - contact.phone_numbers_info.phone_number
                            - contact.phone_numbers_info.type
                            - contact.websites
                            - crustdata_person_id
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
                      message: >-
                        You do not have permission to access
                        /person/contact/enrich.
                      metadata: []
                fields_denied:
                  summary: A requested field is not enabled on the account
                  value:
                    error:
                      type: permission_error
                      message: >-
                        Access denied to fields: contact.phone_numbers. To
                        enable access, please book a call with us at
                        https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request
                      metadata:
                        - denied_fields:
                            - contact.phone_numbers
                          permitted_fields:
                            - contact.business_emails
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
    PersonContactEnrichRequest:
      type: object
      description: >-
        Request body for /person/contact/enrich. Submit exactly one identifier
        type per request — professional_network_profile_urls or business_emails
        — and optionally restrict which contact tiers are enriched.
      properties:
        professional_network_profile_urls:
          type: array
          items:
            type: string
          description: Array of professional-network profile URLs to enrich (max 25).
          example:
            - https://www.linkedin.com/in/dvdhsu/
        business_emails:
          type: array
          items:
            type: string
            format: email
          description: Array of business emails to look up (max 25).
          example:
            - david@example.com
        fields:
          type: array
          items:
            type: string
          description: >
            Contact tiers to enrich. Only contact fields are accepted:
            `contact.business_emails`, `contact.personal_emails`,
            `contact.phone_numbers`, `contact.phone_numbers_info`, and
            `contact.websites`. `contact.phone_numbers_info` belongs to the
            phone tier, so either phone field bills the tier once.
            `contact.phone_numbers` returns both phone lists.
            `contact.phone_numbers_info`, or one of its sub-fields, returns only
            `phone_numbers_info`. When omitted, the three contact tiers
            (business emails, personal emails, phone numbers) are enriched;
            `contact.websites` must be requested explicitly. Requesting any
            non-contact field returns a `400` error.
          example:
            - contact.business_emails
            - contact.phone_numbers
        verified:
          type: boolean
          default: false
          description: >
            Return only business emails that pass a deliverability check at
            request time. Cached addresses marked `deliverable` or `unknown` are
            re-checked before they are served, and only `deliverable` and
            `catch_all` entries are returned. When no address survives,
            `contact.business_emails` is empty and
            `contact.business_emails_message` is set. Only affects
            `contact.business_emails`. Adds 0.5 credits per matched person who
            receives at least one verified business email.
          example: true
      oneOf:
        - required:
            - professional_network_profile_urls
        - required:
            - business_emails
      additionalProperties: false
      example:
        professional_network_profile_urls:
          - https://www.linkedin.com/in/dvdhsu/
    PersonContactEnrichResponse:
      type: array
      items:
        $ref: '#/components/schemas/PersonContactEnrichResult'
      description: >-
        Response from /person/contact/enrich. Returns a top-level array with one
        entry per submitted identifier.
      example:
        - matched_on: https://www.linkedin.com/in/dvdhsu/
          match_type: professional_network_profile_url
          matches:
            - confidence_score: 1
              person_data:
                crustdata_person_id: 14540
                contact:
                  business_emails:
                    - email: david@example.com
                      status: deliverable
                  personal_emails: []
                  phone_numbers: []
                  phone_numbers_info: []
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
    PersonContactEnrichResult:
      type: object
      description: >-
        One result entry in the contact-enrich response — one per submitted
        identifier.
      properties:
        matched_on:
          type: string
          description: >-
            The specific input value this entry corresponds to (a profile URL or
            a business email).
          example: https://www.linkedin.com/in/dvdhsu/
        match_type:
          type: string
          description: Which identifier type the input was matched on.
          enum:
            - professional_network_profile_url
            - business_email
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
          description: >-
            Matching contact records. Empty when no contact data was found for
            the identifier.
          items:
            $ref: '#/components/schemas/PersonContactEnrichMatch'
      example:
        matched_on: https://www.linkedin.com/in/dvdhsu/
        match_type: professional_network_profile_url
        matches:
          - confidence_score: 1
            person_data:
              crustdata_person_id: 14540
              contact:
                business_emails:
                  - email: david@example.com
                    status: deliverable
                personal_emails: []
                phone_numbers: []
                phone_numbers_info: []
    PersonContactEnrichMatch:
      type: object
      description: >-
        A single contact-enrichment match with a confidence score and the
        contact-only person record.
      properties:
        confidence_score:
          type: number
          format: float
          description: >-
            Confidence that this record matches the submitted identifier, from 0
            to 1.
          example: 1
        person_data:
          $ref: '#/components/schemas/PersonContactEnrichPerson'
      example:
        confidence_score: 1
        person_data:
          crustdata_person_id: 14540
          contact:
            business_emails:
              - email: david@example.com
                status: deliverable
            personal_emails: []
            phone_numbers: []
            phone_numbers_info: []
    PersonContactEnrichPerson:
      type: object
      description: Contact-only person record returned by /person/contact/enrich.
      properties:
        crustdata_person_id:
          type: integer
          description: Crustdata's stable internal identifier for the person.
          example: 14540
        contact:
          $ref: '#/components/schemas/PersonContactEnrichContact'
      example:
        crustdata_person_id: 14540
        contact:
          business_emails:
            - email: david@example.com
              status: deliverable
          personal_emails: []
          phone_numbers: []
          phone_numbers_info: []
    PersonContactEnrichContact:
      type: object
      description: >-
        Contact data returned by /person/contact/enrich — business emails,
        personal emails, phone numbers, and (when requested) websites.
      properties:
        business_emails:
          type: array
          description: Business email addresses with their deliverability status.
          items:
            type: object
            properties:
              email:
                type: string
                description: The business email address.
                example: david@example.com
              status:
                type: string
                description: >
                  Deliverability status of the email:

                  - `deliverable`: mailbox confirmed to exist and accept mail at
                  this exact address (lowest bounce risk).

                  - `catch_all`: the domain accepts mail for any address, so
                  this specific mailbox can't be confirmed.

                  - `invalid`: mailbox confirmed not to exist or otherwise
                  undeliverable (sending will bounce).

                  - `unknown`: deliverability couldn't be determined, or no
                  status info is available.
                enum:
                  - deliverable
                  - catch_all
                  - invalid
                  - unknown
                example: deliverable
              last_updated:
                type: string
                format: date-time
                description: >-
                  When this email record last changed. May be absent. Current
                  platform behavior is that `/person/contact/enrich` does not
                  return it, even when requested.
              crustdata_company_id:
                type: integer
                description: >-
                  Crustdata company ID the business email is associated with.
                  May be absent. Current platform behavior is that
                  `/person/contact/enrich` does not return it, even when
                  requested.
          example:
            - email: david@example.com
              status: deliverable
        business_emails_message:
          type: string
          nullable: true
          description: >-
            Set to `no verified emails found` when the request had `verified:
            true` and no business email survived the deliverability check.
            Absent otherwise.
          example: no verified emails found
        personal_emails:
          type: array
          description: Personal email addresses with their deliverability status.
          items:
            type: object
            properties:
              email:
                type: string
                description: The personal email address.
                example: david.personal@example.com
              status:
                type: string
                description: >
                  Deliverability status of the email:

                  - `deliverable`: mailbox confirmed to exist and accept mail at
                  this exact address (lowest bounce risk).

                  - `catch_all`: the domain accepts mail for any address, so
                  this specific mailbox can't be confirmed.

                  - `invalid`: mailbox confirmed not to exist or otherwise
                  undeliverable (sending will bounce).

                  - `unknown`: deliverability couldn't be determined, or no
                  status info is available.
                enum:
                  - deliverable
                  - catch_all
                  - invalid
                  - unknown
                example: deliverable
              last_updated:
                type: string
                format: date-time
                description: >-
                  When this email record last changed. May be absent. Current
                  platform behavior is that `/person/contact/enrich` does not
                  return it, even when requested.
          example:
            - email: david.personal@example.com
              status: deliverable
        phone_numbers:
          type: array
          description: Phone numbers as held, usually in E.164 format.
          items:
            type: string
          example:
            - '+15555550123'
        phone_numbers_info:
          type: array
          description: >-
            The numbers in `phone_numbers`, in the same order, split for dialing
            and storage. Returned whenever `contact.phone_numbers` or
            `contact.phone_numbers_info` is requested.
          items:
            type: object
            properties:
              country_code:
                type: string
                nullable: true
                description: >-
                  Calling code with a leading plus, for example `+33`. `null`
                  when the number carries no calling code.
                example: '+1'
              country:
                type: string
                nullable: true
                description: >-
                  ISO 3166-1 alpha-2 region, for example `FR`. `null` when it
                  cannot be determined from the number.
                example: US
              phone_number:
                type: string
                description: National number, digits only.
                example: '5555550123'
              type:
                type: string
                description: >
                  Kind of line:

                  - `mobile`: a mobile number.

                  - `home`: a home number.

                  - `work`: a work number.

                  - `other`: a landline, a VoIP line, or a number with no known
                  type.
                enum:
                  - mobile
                  - home
                  - work
                  - other
                example: mobile
          example:
            - country_code: '+1'
              country: US
              phone_number: '5555550123'
              type: mobile
        websites:
          type: array
          description: >-
            Personal or professional website URLs. Returned only when
            `contact.websites` is requested explicitly via `fields`.
          items:
            type: string
        last_updated:
          type: string
          format: date-time
          description: >-
            Freshness of this person's contact data (latest email validation).
            May be absent. Current platform behavior is that
            `/person/contact/enrich` does not return it, even when requested.
      example:
        business_emails:
          - email: david@example.com
            status: deliverable
        personal_emails:
          - email: david.personal@example.com
            status: deliverable
        phone_numbers:
          - '+15555550123'
        phone_numbers_info:
          - country_code: '+1'
            country: US
            phone_number: '5555550123'
            type: mobile
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

- [Batch Contact Enrich](https://docs.crustdata.com/api-reference/batch-apis/submit-a-batch-person-contact-enrichment-job.md)
- [Contact Enrichment API](https://docs.crustdata.com/person-docs/contact/enrich.md)
- [Batch Contact Enrichment API](https://docs.crustdata.com/person-docs/contact/batch.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
- [Person Identify API](https://docs.crustdata.com/person-docs/identify/introduction.md)
