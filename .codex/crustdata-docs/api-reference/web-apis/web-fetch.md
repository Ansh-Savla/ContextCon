> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Fetch

> Fetch the HTML content of webpages given their URLs. Retrieves the page
title and full HTML content for up to 10 URLs in a single request. Use
this for content extraction, web content retrieval, data collection, content
monitoring, and SEO analysis.

<Note>
    Default `rate-limit` is 10 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
</Note>




## OpenAPI

````yaml /openapi-specs/2025-11-01/web.yaml post /web/enrich/live
openapi: 3.0.3
info:
  title: Web API - All Endpoints
  version: '2025-11-01'
  description: >-
    API for performing web searches and fetching webpage content. Includes
    endpoints for searching the web across multiple sources (news, web,
    academic, deep research, social) and fetching HTML content from URLs.
servers:
  - url: https://api.crustdata.com
security:
  - bearerAuth: []
tags:
  - name: Web APIs
    description: Endpoints for web search and webpage content fetching.
paths:
  /web/enrich/live:
    post:
      tags:
        - Web APIs
      summary: Web Fetch
      description: >
        Fetch the HTML content of webpages given their URLs. Retrieves the page

        title and full HTML content for up to 10 URLs in a single request. Use

        this for content extraction, web content retrieval, data collection,
        content

        monitoring, and SEO analysis.


        <Note>
            Default `rate-limit` is 10 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
        </Note>
      operationId: datasetWebFetch
      parameters:
        - $ref: '#/components/parameters/ApiVersionHeader'
      requestBody:
        required: true
        description: List of URLs to fetch and optional settings.
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WebFetchRequest'
            examples:
              single_url:
                summary: Fetch a single URL
                description: Fetch content from a single webpage.
                value:
                  urls:
                    - https://example.com
              multiple_urls:
                summary: Fetch multiple URLs
                description: Fetch content from multiple webpages in a single request.
                value:
                  urls:
                    - https://example.com
                    - https://www.crustdata.com
                    - https://docs.crustdata.com
              with_cloudflare_bypass:
                summary: Fetch with Cloudflare bypass
                description: >-
                  Attempt to bypass Cloudflare protection when fetching pages
                  behind Cloudflare.
                value:
                  urls:
                    - https://example.com
                  human_mode: true
              max_batch:
                summary: Maximum batch fetch (10 URLs)
                description: Fetch the maximum allowed number of URLs in a single request.
                value:
                  urls:
                    - https://example.com
                    - https://example.org
                    - https://example.net
                    - https://www.crustdata.com
                    - https://docs.crustdata.com
                    - https://github.com
                    - https://stackoverflow.com
                    - https://news.ycombinator.com
                    - https://www.producthunt.com
                    - https://techcrunch.com
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Array of fetch results, one per URL. Each result includes a success
            flag. Failed URLs have null fields.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebFetchResponse'
              examples:
                single_url_success:
                  summary: Single URL fetched successfully
                  description: Response when fetching a single URL that succeeds.
                  value:
                    - success: true
                      url: https://example.com
                      timestamp: 1775193366
                      title: Example Domain
                      content: >-
                        <html lang="en"><head><title>Example Domain</title><meta
                        name="viewport" content="width=device-width,
                        initial-scale=1"><style>body{background:#eee;width:60vw;margin:15vh
                        auto;font-family:system-ui,sans-serif}h1{font-size:1.5em}div{opacity:0.8}a:link,a:visited{color:#348}</style></head><body><div><h1>Example
                        Domain</h1><p>This domain is for use in documentation
                        examples without needing permission. Avoid use in
                        operations.</p><p><a
                        href="https://iana.org/domains/example">Learn
                        more</a></p></div>

                        </body></html>
                multiple_urls_success:
                  summary: Multiple URLs fetched successfully
                  description: Response when fetching multiple URLs that all succeed.
                  value:
                    - success: true
                      url: https://example.org
                      timestamp: 1775193386
                      title: Example Domain
                      content: >-
                        <html lang="en"><head><title>Example
                        Domain</title></head><body>...</body></html>
                    - success: true
                      url: https://example.com
                      timestamp: 1775193386
                      title: Example Domain
                      content: >-
                        <html lang="en"><head><title>Example
                        Domain</title></head><body>...</body></html>
                partial_failure:
                  summary: Partial failure — some URLs fail
                  description: >-
                    When some URLs succeed and others fail, all results are
                    returned. Failed URLs have success=false and null fields.
                  value:
                    - success: true
                      url: https://example.com
                      timestamp: 1775193366
                      title: Example Domain
                      content: >-
                        <html lang="en"><head><title>Example
                        Domain</title></head><body>...</body></html>
                    - success: false
                      url: null
                      timestamp: null
                      title: null
                      content: null
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: Invalid request — missing or invalid parameters.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidationErrorResponse'
              examples:
                missing_urls:
                  summary: Missing required urls field
                  description: >-
                    Returned when the urls field is not provided in the request
                    body.
                  value:
                    error:
                      type: invalid_request
                      message: 'urls: This field is required.'
                      metadata: []
                empty_urls_array:
                  summary: Empty urls array
                  description: Returned when the urls array is empty.
                  value:
                    error:
                      type: invalid_request
                      message: 'urls: This list may not be empty.'
                      metadata: []
        '401':
          description: Missing or invalid API key.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthErrorResponse'
              examples:
                missing_api_key:
                  summary: Missing API key
                  description: Returned when the Authorization header is not provided.
                  value:
                    message: Missing API key in request
                invalid_api_key:
                  summary: Invalid API key
                  description: Returned when the provided API key is not valid.
                  value:
                    message: Invalid API key in request
components:
  parameters:
    ApiVersionHeader:
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
    WebFetchRequest:
      type: object
      description: Request body for fetching webpage content.
      properties:
        urls:
          type: array
          description: >-
            List of URLs to fetch web content for. Each URL must include the
            protocol prefix (http:// or https://). Maximum of 10 URLs per
            request.
          items:
            type: string
            maxLength: 2000
            description: A fully-qualified URL to fetch.
          minItems: 1
          maxItems: 10
          example:
            - https://example.com
        human_mode:
          type: boolean
          description: >-
            Whether to use a browser-like retrieval path when standard access is
            blocked.
          default: false
          example: false
      required:
        - urls
      additionalProperties: false
    WebFetchResponse:
      type: array
      description: Array of fetch results, one per URL in the request.
      items:
        $ref: '#/components/schemas/WebFetchResult'
    ValidationErrorResponse:
      type: object
      description: Error response returned for validation failures and invalid requests.
      properties:
        error:
          type: object
          description: Error details object.
          properties:
            type:
              type: string
              description: The error type identifier.
              example: invalid_request
            message:
              type: string
              description: Human-readable error message describing what went wrong.
              example: 'query: This field is required.'
            metadata:
              type: array
              description: Additional metadata about the error (typically empty).
              items:
                type: string
              example: []
          required:
            - type
            - message
            - metadata
      required:
        - error
    AuthErrorResponse:
      type: object
      description: Error response returned for authentication failures (401).
      properties:
        message:
          type: string
          description: Human-readable message describing the authentication error.
          example: Invalid API key in request
      required:
        - message
    WebFetchResult:
      type: object
      description: >-
        Result for a single URL fetch. When the fetch fails, success is false
        and url, timestamp, title, and content are null.
      properties:
        success:
          type: boolean
          description: Whether the content was fetched successfully for this URL.
          example: true
          nullable: true
        url:
          type: string
          description: The URL that was fetched. Null if the fetch failed.
          example: https://example.com
          nullable: true
        timestamp:
          type: integer
          description: >-
            Unix timestamp (seconds) of when the content was fetched. Null if
            the fetch failed.
          example: 1775193366
          nullable: true
        title:
          type: string
          description: >-
            The title of the fetched webpage from the HTML title tag. Null if
            the fetch failed.
          example: Example Domain
          nullable: true
        content:
          type: string
          description: >-
            The full HTML content of the fetched webpage. Null if the fetch
            failed.
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
      description: >-
        Bearer token authentication. Pass your API key as `Authorization: Bearer
        <your_api_key>`.

````

## Related topics

- [Web Fetch API](https://docs.crustdata.com/web-docs/fetch/introduction.md)
- [Web Search API](https://docs.crustdata.com/web-docs/search/introduction.md)
- [Company Search API](https://docs.crustdata.com/company-docs/search/introduction.md)
- [API Introduction](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction.md)
- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
