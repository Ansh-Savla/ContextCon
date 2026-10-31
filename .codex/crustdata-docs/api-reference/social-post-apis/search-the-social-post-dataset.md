> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Social Post Search

> Search the indexed Crustdata social post dataset with structured filter conditions.
Each result is a post with its author (person or company page) enriched with a
Crustdata id, headline, current title, employer, industry, and structured location,
plus engagement counts, every reactor and commenter, resolved mentions, hyperlinks,
and document, article, and poll attachments.

<Note>
    **Enabled on request.** The endpoint is off by default and returns `403` until it is
    enabled on your account. [Contact us](https://crustdata.com/demo) to turn it on.
</Note>

<Note>
    Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
</Note>

Billed at **0.5 credits per post returned**. `limit: 0` returns `total_count` alone
and costs nothing. Supports `and`/`or`/`all_of` filter groups, cursor-based
pagination, sorting, field selection, geographic radius filtering on
`actor.location`, and same-element matching on the nested `reactors` and `comments`
arrays. Only indexed fields are filterable and sortable; see the `field` descriptions
on `SocialPostDbSearchCondition` and `SocialPostDbSearchSort`.

The index is rebuilt periodically. For the freshest posts by one person or company,
use `/social_post/professional_network/enrich/live`.




## OpenAPI

````yaml /openapi-specs/2025-11-01/social_post.yaml post /social_post/search
openapi: 3.0.3
info:
  title: Social Post Dataset API
  version: '2025-11-01'
  description: >
    The Social Post Dataset API surfaces public social posts from professional
    networks for enrichment and discovery workflows.


    - **Enrich**: Fetch recent posts for a person profile URL, a single post
    URL, or a company identifier (name, domain, Crustdata company ID, or company
    professional network URL). Includes per-post engagement, hyperlinks, and
    optional reactor and comment detail.

    - **Live search**: Search posts by keyword and filters such as author
    industry, author title, mentioning company, or member profile. Supports
    recency windows, content type, and exact-keyword matching.

    - **Search**: Query the indexed social post dataset with structured filters
    on text, author, engagement, reactors, commenters, mentions, and
    attachments, with cursor pagination, sorting, and field selection.


    The two live endpoints return the same post object. Enrich wraps posts in a
    `posts` array; live search returns a top-level array of posts.
    `/social_post/search` returns `{ posts, next_cursor, total_count }` with a
    richer post object that carries the author's Crustdata id, current role, and
    structured location.


    Live data is retrieved from the web in real time and may take 30-60 seconds
    for requests with large reactor or comment counts. `/social_post/search`
    queries a periodically rebuilt index.
servers:
  - url: https://api.crustdata.com
    description: Production API server
security:
  - bearerAuth: []
tags:
  - name: Social Post APIs
    description: Core social post data operations
  - name: Enrich APIs
    description: Endpoints for enriching social posts for a person, post, or company
  - name: Search APIs
    description: >-
      Endpoints for searching social posts, live by keyword or across the
      indexed dataset
paths:
  /social_post/search:
    post:
      tags:
        - Social Post APIs
        - Search APIs
      summary: Search the social post dataset
      description: >
        Search the indexed Crustdata social post dataset with structured filter
        conditions.

        Each result is a post with its author (person or company page) enriched
        with a

        Crustdata id, headline, current title, employer, industry, and
        structured location,

        plus engagement counts, every reactor and commenter, resolved mentions,
        hyperlinks,

        and document, article, and poll attachments.


        <Note>
            **Enabled on request.** The endpoint is off by default and returns `403` until it is
            enabled on your account. [Contact us](https://crustdata.com/demo) to turn it on.
        </Note>


        <Note>
            Default `rate-limit` is 30 requests per minute. Send an email to [gtm@crustdata.co](mailto:gtm@crustdata.co) to discuss higher limits if needed for your use case.
        </Note>


        Billed at **0.5 credits per post returned**. `limit: 0` returns
        `total_count` alone

        and costs nothing. Supports `and`/`or`/`all_of` filter groups,
        cursor-based

        pagination, sorting, field selection, geographic radius filtering on

        `actor.location`, and same-element matching on the nested `reactors` and
        `comments`

        arrays. Only indexed fields are filterable and sortable; see the `field`
        descriptions

        on `SocialPostDbSearchCondition` and `SocialPostDbSearchSort`.


        The index is rebuilt periodically. For the freshest posts by one person
        or company,

        use `/social_post/professional_network/enrich/live`.
      operationId: searchSocialPostDataset
      parameters:
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        description: Search filters, pagination, sorting, and field selection
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SocialPostDbSearchRequest'
            examples:
              keyword_from_authors_in_city:
                summary: Posts mentioning a keyword from people in one city
                value:
                  filters:
                    op: and
                    conditions:
                      - field: text
                        type: '[.]'
                        value: rust
                      - field: actor.actor_type
                        type: '='
                        value: person
                      - field: actor.location.city
                        type: '='
                        value: Kolkata
                  sorts:
                    - field: date_posted
                      order: desc
                  fields:
                    - share_urn
                    - share_url
                    - text
                    - post_type
                    - actor
                    - date_posted
                    - engagement
                  limit: 2
              company_page_posts:
                summary: Everything a company page has posted, newest first
                value:
                  filters:
                    field: actor.crustdata_entity_id
                    type: '='
                    value: 631394
                  sorts:
                    - field: date_posted
                      order: desc
                  fields:
                    - share_url
                    - date_posted
                    - actor.name
                    - actor.actor_type
                    - engagement.total_reactions
                  limit: 2
              founders_announcing_a_raise:
                summary: Founders announcing a raise, ranked by reactions
                value:
                  filters:
                    op: and
                    conditions:
                      - field: text
                        type: '[.]'
                        value: we raised
                      - field: actor.title
                        type: (.)
                        value: founder
                      - field: date_posted
                        type: '=>'
                        value: '2026-08-01'
                  sorts:
                    - field: engagement.total_reactions
                      order: desc
                  fields:
                    - share_url
                    - date_posted
                    - actor.name
                    - actor.title
                    - actor.company_name
                    - engagement.total_reactions
                    - engagement.total_comments
                  limit: 2
              posts_mentioning_a_company:
                summary: Posts that mention a company, by Crustdata company id
                value:
                  filters:
                    field: mentions.company_id
                    type: '='
                    value: 631394
                  sorts:
                    - field: date_posted
                      order: desc
                  fields:
                    - share_url
                    - date_posted
                    - actor.name
                    - mentions
                  limit: 2
              founder_praised_engineer_commented:
                summary: >-
                  Posts a founder praised where an engineer commented
                  (same-element nested match)
                value:
                  filters:
                    op: and
                    conditions:
                      - field: reactors.title
                        type: (.)
                        value: founder
                      - field: reactors.reaction_type
                        type: '='
                        value: PRAISE
                      - field: comments.title
                        type: (.)
                        value: engineer
                  sorts:
                    - field: engagement.total_reactions
                      order: desc
                  fields:
                    - share_urn
                    - actor.name
                    - engagement.total_reactions
                    - reactors
                    - comments
                  limit: 1
              document_attachments:
                summary: Posts with a document attachment from one company's employees
                value:
                  filters:
                    op: and
                    conditions:
                      - field: content_type
                        type: '='
                        value: document
                      - field: actor.company_name
                        type: '='
                        value: Stripe
                  sorts:
                    - field: date_posted
                      order: desc
                  fields:
                    - share_url
                    - date_posted
                    - document.title
                    - document.page_count
                    - actor.name
                    - actor.company_name
                  limit: 2
              authors_within_radius:
                summary: >-
                  Hiring hashtags from authors within 25 km of a city
                  (geo_distance)
                value:
                  filters:
                    op: and
                    conditions:
                      - field: actor.location
                        type: geo_distance
                        value:
                          location: Bengaluru
                          distance: 25
                          unit: km
                      - field: hashtags
                        type: '='
                        value: hiring
                  fields:
                    - share_url
                    - actor.name
                    - actor.location
                    - hashtags
                  limit: 2
              count_only:
                summary: Count matching posts without returning rows
                value:
                  filters:
                    field: post_type
                    type: in
                    value:
                      - repost_quote
                      - repost_without_thoughts
                  limit: 0
              paginate_next_page:
                summary: Fetch the next page using a cursor from a previous response
                value:
                  filters:
                    op: and
                    conditions:
                      - field: actor.company_name
                        type: '='
                        value: Stripe
                      - field: actor.actor_type
                        type: '='
                        value: person
                  sorts:
                    - field: date_posted
                      order: desc
                  fields:
                    - share_urn
                    - date_posted
                    - actor.name
                  limit: 2
                  cursor: H4sIALUQqGoC_xWMQQrDIBBFrxJc...
      responses:
        '200':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Posts matching the search criteria with a pagination cursor and
            total count
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SocialPostDbSearchResponse'
              examples:
                company_page_posts_response:
                  summary: Everything a company page has posted
                  value:
                    posts:
                      - actor:
                          actor_type: company
                          name: Stripe
                        date_posted: '2026-08-29T07:17:40Z'
                        engagement:
                          total_reactions: 139
                        share_url: >-
                          https://www.linkedin.com/posts/stripe_give-your-grok-bot-a-card-withlink-bots-activity-7499191937820889089-_uIY
                      - actor:
                          actor_type: company
                          name: Stripe
                        date_posted: '2026-08-26T02:01:22Z'
                        engagement:
                          total_reactions: 253
                        share_url: >-
                          https://www.linkedin.com/posts/stripe_john-collison-sits-down-with-canva-cofounder-ugcPost-7497853964009230337-P79J
                    next_cursor: H4sIAOIQqGoC_xXMTQrDIBBA4asE...
                    total_count: 720
                founders_announcing_a_raise_response:
                  summary: Founders announcing a raise, ranked by reactions
                  value:
                    posts:
                      - actor:
                          company_name: MrBeast
                          name: Jimmy Donaldson
                          title: Founder
                        date_posted: '2026-08-05T01:22:04Z'
                        engagement:
                          total_comments: 477
                          total_reactions: 9273
                        share_url: >-
                          https://www.linkedin.com/posts/mr-beast_a-year-ago-we-raised-40-million-to-give-ugcPost-7490124665907212288-PdzW
                      - actor:
                          company_name: Databricks
                          name: Ali Ghodsi
                          title: CEO and Co-founder
                        date_posted: '2026-08-19T22:30:41Z'
                        engagement:
                          total_comments: 164
                          total_reactions: 5282
                        share_url: >-
                          https://www.linkedin.com/posts/alighodsi_databricks-hits-190-billion-valuation-as-activity-7493675875033403392-HJI6
                    next_cursor: H4sIALEQqGoC_xWMQQrDIBBFrxJc...
                    total_count: 123
                posts_mentioning_a_company_response:
                  summary: Posts that mention a company
                  value:
                    posts:
                      - actor:
                          name: Khushali GUPTA
                        date_posted: '2026-08-30T03:40:01Z'
                        mentions:
                          company_ids:
                            - 631394
                          person_ids: []
                        share_url: >-
                          https://www.linkedin.com/posts/khushali-gupta-4823463a7_stripe-stripehiring-softwareengineerintern-activity-7499669796561522688-PkWR
                    next_cursor: H4sIAOYQqGoC_xWNQQrDIBAAvxI8...
                    total_count: 47259
                count_only_response:
                  summary: Count-only query returns no rows, just a total
                  value:
                    posts: []
                    next_cursor: null
                    total_count: 225197543
        '400':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Invalid search request. The body failed validation, or a filter,
            sort, or `fields` entry names a field the index does not support.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                unsupported_filter_field:
                  summary: Filter references a field that is not indexed
                  value:
                    error:
                      type: invalid_request
                      message: 'Unsupported columns in conditions: [''actor.company'']'
                      metadata: []
                empty_condition_group:
                  summary: A group with no conditions
                  value:
                    error:
                      type: invalid_request
                      message: filter group 'conditions' cannot be empty
                      metadata:
                        - field: filters.conditions
                          type: missing
                          message: filter group 'conditions' cannot be empty
                limit_out_of_range:
                  summary: limit exceeds maximum (1000)
                  value:
                    error:
                      type: invalid_request
                      message: '''limit'' must be at most 1000. Got 5000.'
                      metadata:
                        - field: limit
                          type: less_than_equal
                          message: '''limit'' must be at most 1000. Got 5000.'
                invalid_cursor:
                  summary: Cursor is not one this endpoint issued for this body
                  value:
                    error:
                      type: invalid_request
                      message: Invalid cursor
                      metadata: []
                unrecognized_parameter:
                  summary: Body carries a key the endpoint does not accept
                  value:
                    error:
                      type: invalid_request
                      message: 'page: This field is not allowed.'
                      metadata: []
                unsupported_content_type:
                  summary: content_type value outside the supported set
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Unsupported content_type value: 'gif'. Supported: video,
                        image, document, article, poll
                      metadata: []
                geo_filter_missing_distance:
                  summary: geo_distance value is missing the required distance key
                  value:
                    error:
                      type: invalid_request
                      message: geo_distance filter requires 'distance' field
                      metadata: []
                geo_filter_unsupported_field:
                  summary: geo_distance applied to a field without a geo point
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Column 'actor.name' does not support geo_distance
                        queries
                      metadata: []
                unknown_field_in_fields:
                  summary: A fields entry names a path that does not exist
                  value:
                    error:
                      type: invalid_request
                      message: 'Invalid fields: nope'
                      metadata:
                        - available_fields:
                            - actor
                            - actor.actor_type
                            - ...
        '401':
          description: >-
            Unauthorized. The API key is missing or invalid. This response comes
            from the gateway and carries a flat `message` rather than the
            `error` envelope.
          content:
            application/json:
              schema:
                type: object
                required:
                  - message
                properties:
                  message:
                    type: string
              example:
                message: Invalid API key in request
        '403':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Forbidden. The endpoint is not enabled on your account, or a
            requested field is not enabled on your key.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                endpoint_not_enabled:
                  summary: The endpoint is not enabled on the account
                  value:
                    error:
                      type: permission_error
                      message: >-
                        You do not have permission to access
                        /social_post/search.
                      metadata: []
                fields_denied:
                  summary: A requested field is not enabled on the key
                  value:
                    error:
                      type: permission_error
                      message: >-
                        Access denied to fields: reactors. To enable access,
                        please book a call with us at
                        https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request
                      metadata:
                        - denied_fields:
                            - reactors
                          permitted_fields:
                            - share_urn
                            - share_url
                            - text
                            - actor
                            - engagement
        '500':
          headers:
            X-Credits-Used:
              $ref: '#/components/headers/XCreditsUsed'
          description: >-
            Internal server error. The query could not be executed; retry after
            a short delay.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              example:
                error:
                  type: internal_error
                  message: An unexpected error occurred while processing the request.
                  metadata: []
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
    SocialPostDbSearchRequest:
      type: object
      additionalProperties: false
      description: >-
        Request body for the indexed social post search. Every key is optional;
        `{}` matches the whole dataset.
      properties:
        filters:
          description: >-
            A single `SocialPostDbSearchCondition` or a nested
            `SocialPostDbSearchConditionGroup`. Omit to match every indexed
            post.
          oneOf:
            - $ref: '#/components/schemas/SocialPostDbSearchCondition'
            - $ref: '#/components/schemas/SocialPostDbSearchConditionGroup'
        cursor:
          type: string
          description: >-
            Opaque cursor from a prior response's `next_cursor`. Send the same
            `filters`, `sorts`, and `fields` with it; a cursor issued for a
            different body is rejected with `Invalid cursor`.
        limit:
          type: integer
          minimum: 0
          maximum: 1000
          default: 20
          description: Posts per page. `0` returns `total_count` alone and costs nothing.
        sorts:
          type: array
          description: >-
            Ordering rules applied in array order. Defaults to `date_posted`
            descending.
          items:
            $ref: '#/components/schemas/SocialPostDbSearchSort'
        fields:
          type: array
          description: >-
            Dot-paths to include in each returned post, for example `actor.name`
            or a whole group such as `engagement`. Omit to return everything.
            `actor.location` and `reposter.location` are selected whole; their
            sub-keys are filterable but not selectable. `reactors` and
            `comments` are returned in full and can be long, so leave them out
            unless you need them. Filter-only fields (`content_type`,
            `materialized_at`) are rejected here.
          items:
            type: string
          example:
            - share_url
            - date_posted
            - text
            - actor.name
            - actor.company_name
            - engagement.total_reactions
    SocialPostDbSearchResponse:
      type: object
      required:
        - posts
        - next_cursor
        - total_count
      properties:
        posts:
          type: array
          description: >-
            Matching posts for the current page. Empty when `limit` is 0 or
            nothing matches.
          items:
            $ref: '#/components/schemas/SocialPostDb'
        next_cursor:
          type: string
          nullable: true
          description: >-
            Opaque cursor for the next page. `null` on the last page and on
            `limit: 0` queries.
        total_count:
          type: integer
          description: Total number of posts matching the filter across all pages.
    ErrorResponse:
      type: object
      description: >-
        Standard error envelope returned by Crustdata APIs (used for 400, 401,
        and 500 responses).
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
              description: Machine-readable error category.
              enum:
                - invalid_request
                - unauthorized
                - authentication_error
                - insufficient_credits
                - permission_error
                - rate_limit_error
                - internal_error
              example: invalid_request
            message:
              type: string
              description: Human-readable error message.
              example: >-
                One of 'professional_network_profile_url', 'social_post_url', or
                a company identifier is required.
            metadata:
              type: array
              description: Optional structured metadata about the error.
              items:
                type: object
                additionalProperties: true
              default: []
              example: []
    SocialPostDbSearchCondition:
      type: object
      required:
        - field
        - type
        - value
      properties:
        field:
          type: string
          description: >-
            Filterable field. Post: share_urn, backend_urn, entity_urn,
            parent_post_urn, share_url, text, hashtags, post_type, date_posted,
            is_edited, has_video. Author: actor.actor_type,
            actor.crustdata_entity_id, actor.linkedin_id,
            actor.professional_network_urn, actor.professional_network_url,
            actor.name, actor.headline, actor.title, actor.company_name,
            actor.industry, actor.location (geo target), actor.location.raw,
            actor.location.city, actor.location.state, actor.location.country,
            actor.location.continent. Reposter: reposter.actor_type,
            reposter.linkedin_id, reposter.professional_network_urn,
            reposter.professional_network_url, reposter.name, reposter.headline.
            Engagement: engagement.total_reactions, engagement.total_comments,
            engagement.num_shares,
            engagement.reactions_by_type.{LIKE,PRAISE,EMPATHY,INTEREST,APPRECIATION,ENTERTAINMENT}.
            Reactors (nested): reactors.reaction_type, reactors.actor_type,
            reactors.crustdata_entity_id, reactors.linkedin_id, reactors.name,
            reactors.headline, reactors.location, reactors.title,
            reactors.company, reactors.industry,
            reactors.professional_network_url. Comments (nested): comments.text,
            comments.created_at, comments.actor_type,
            comments.crustdata_entity_id, comments.linkedin_id, comments.name,
            comments.headline, comments.location, comments.title,
            comments.company, comments.industry,
            comments.professional_network_url,
            comments.comment_reactions.{LIKE,PRAISE,EMPATHY,INTEREST,APPRECIATION,ENTERTAINMENT}.
            Mentions and attachments: mentions.person_id, mentions.company_id,
            mentions.person_url, mentions.company_url, document.title,
            document.page_count, article.title, poll.question, poll.closed,
            poll.multi_select. Filter-only: content_type (video, image,
            document, article, poll), materialized_at. Any other path returns
            400.
          example: actor.crustdata_entity_id
        type:
          type: string
          description: >-
            Filter operator. `=` exact match (case-insensitive on strings),
            `(.)` all-words match with typo tolerance, `[.]` exact-phrase match,
            `in`/`not_in` set membership (value must be an array),
            `is_null`/`is_not_null` presence checks (send `"value": null`),
            `geo_distance` and `geo_exclude` radius filters on `actor.location`
            only, and `has_all` for nested arrays (every value matched by some
            reactor or commenter).
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
            - geo_distance
            - geo_exclude
            - has_all
          example: '='
        value:
          description: >-
            Filter value. Scalar for `=`, `!=`, `<`, `=<`, `>`, `=>`, `(.)`, and
            `[.]`. Array of scalars for `in`, `not_in`, and `has_all`. `null`
            for `is_null` and `is_not_null`. For `geo_distance` and
            `geo_exclude`: an object with `location` (string) or `lat_lng`
            ([lat, lng]), plus `distance` (number) and optional `unit` (km, mi,
            miles, m, meters, ft, feet).
          example: 631394
    SocialPostDbSearchConditionGroup:
      type: object
      required:
        - op
        - conditions
      properties:
        op:
          type: string
          description: >-
            `and` and `or` combine conditions at the post level; over one nested
            array they bind to the same element. `all_of` is cross-element: each
            condition must be satisfied by some element of the nested array,
            evaluated independently. `all_of` accepts only positive predicates
            and only the nested `reactors` and `comments` fields.
          enum:
            - and
            - or
            - all_of
        conditions:
          type: array
          minItems: 1
          description: One or more conditions or nested groups. An empty array returns 400.
          items:
            oneOf:
              - $ref: '#/components/schemas/SocialPostDbSearchCondition'
              - $ref: '#/components/schemas/SocialPostDbSearchConditionGroup'
    SocialPostDbSearchSort:
      type: object
      required:
        - field
        - order
      properties:
        field:
          type: string
          description: >-
            Sortable field: date_posted (default, desc), post_type,
            actor.actor_type, engagement.total_reactions,
            engagement.total_comments, engagement.num_shares,
            engagement.reactions_by_type.{LIKE,PRAISE,EMPATHY,INTEREST,APPRECIATION,ENTERTAINMENT},
            is_edited, has_video, poll.closed, poll.multi_select,
            document.page_count. Any other field returns 400.
          example: engagement.total_reactions
        order:
          type: string
          enum:
            - asc
            - desc
          example: desc
    SocialPostDb:
      type: object
      description: One indexed post. Every group is present unless narrowed with `fields`.
      required:
        - share_urn
      properties:
        share_urn:
          type: string
          description: Post URN, the stable post id.
        backend_urn:
          type: string
          nullable: true
        entity_urn:
          type: string
          nullable: true
        parent_post_urn:
          type: string
          nullable: true
          description: URN of the original post on reposts. Empty string on original posts.
        share_url:
          type: string
          nullable: true
          description: Public URL of the post.
        text:
          type: string
          nullable: true
        post_type:
          type: string
          enum:
            - original
            - repost_without_thoughts
            - repost_quote
        is_edited:
          type: boolean
          nullable: true
        has_video:
          type: boolean
          nullable: true
        date_posted:
          type: string
          nullable: true
          description: ISO-8601 UTC timestamp.
          example: '2026-08-30T09:26:04Z'
        hashtags:
          type: array
          nullable: true
          items:
            type: string
        content_types:
          type: array
          description: >-
            Attachment classes present on the post (video, image, document,
            article, poll).
          items:
            type: string
        actor:
          $ref: '#/components/schemas/SocialPostDbAuthor'
        reposter:
          $ref: '#/components/schemas/SocialPostDbAuthor'
        engagement:
          type: object
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
              $ref: '#/components/schemas/SocialPostDbReactionsByType'
        hyperlinks:
          type: object
          properties:
            company_professional_network_urls:
              type: array
              nullable: true
              items:
                type: string
            person_professional_network_urls:
              type: array
              nullable: true
              items:
                type: string
            other_urls:
              type: array
              nullable: true
              items:
                type: string
            media_urls:
              type: array
              nullable: true
              items:
                type: string
        mentions:
          type: object
          description: >-
            Crustdata ids resolved from the profile and company links in the
            post.
          properties:
            person_ids:
              type: array
              nullable: true
              items:
                type: integer
            company_ids:
              type: array
              nullable: true
              items:
                type: integer
        document:
          type: object
          nullable: true
          properties:
            title:
              type: string
              nullable: true
            url:
              type: string
              nullable: true
            page_count:
              type: integer
              nullable: true
        article:
          type: object
          nullable: true
          properties:
            title:
              type: string
              nullable: true
            url:
              type: string
              nullable: true
        poll:
          type: object
          nullable: true
          properties:
            question:
              type: string
              nullable: true
            multi_select:
              type: boolean
              nullable: true
            total_voters:
              type: integer
              nullable: true
            closed:
              type: boolean
              nullable: true
            options:
              type: array
              nullable: true
              items:
                type: string
        reactors:
          type: array
          nullable: true
          description: Every reaction on the post, returned in full.
          items:
            type: object
            properties:
              reaction_type:
                type: string
                nullable: true
              reactor:
                $ref: '#/components/schemas/SocialPostDbActor'
        comments:
          type: array
          nullable: true
          description: Every comment on the post, returned in full.
          items:
            type: object
            properties:
              comment_urn:
                type: string
                nullable: true
              comment_text:
                type: string
                nullable: true
              permalink:
                type: string
                nullable: true
              created_at:
                type: string
                nullable: true
                description: ISO-8601 UTC timestamp.
              commenter:
                $ref: '#/components/schemas/SocialPostDbActor'
              comment_reactions:
                $ref: '#/components/schemas/SocialPostDbReactionsByType'
        metadata:
          type: object
          properties:
            data_updated_at:
              type: string
              nullable: true
              description: ISO-8601 UTC timestamp of the last update to the post record.
    SocialPostDbAuthor:
      type: object
      description: >-
        The post author (`actor`) or the resharing account (`reposter`). Keys
        the source record lacks are omitted rather than returned as null.
      properties:
        actor_type:
          type: string
          enum:
            - person
            - company
        crustdata_entity_id:
          type: integer
          description: Crustdata person id or company id, per `actor_type`.
        linkedin_id:
          type: string
          description: Numeric professional network id, when known.
        professional_network_urn:
          type: string
          description: Profile URN in URL form.
        professional_network_url:
          type: string
          description: Public profile URL.
        name:
          type: string
        headline:
          type: string
        title:
          type: string
          description: Current job title. People only.
        company_name:
          type: string
          description: Current employer name. People only.
        industry:
          type: string
        location:
          type: object
          properties:
            raw:
              type: string
            city:
              type: string
            state:
              type: string
            country:
              type: string
            continent:
              type: string
        profile_picture_url:
          type: string
    SocialPostDbReactionsByType:
      type: object
      description: Reaction counts by type. Every key is present.
      properties:
        LIKE:
          type: integer
        PRAISE:
          type: integer
        EMPATHY:
          type: integer
        INTEREST:
          type: integer
        APPRECIATION:
          type: integer
        ENTERTAINMENT:
          type: integer
    SocialPostDbActor:
      type: object
      description: >-
        A reacting or commenting person or company, nested under
        `reactors[].reactor` and `comments[].commenter`.
      properties:
        actor_type:
          type: string
          enum:
            - person
            - company
        crustdata_entity_id:
          type: integer
          description: Crustdata person id or company id, per `actor_type`.
        linkedin_id:
          type: string
        professional_network_urn:
          type: string
        professional_network_url:
          type: string
        name:
          type: string
        headline:
          type: string
        location:
          type: string
          description: Free-text location.
        title:
          type: string
        company:
          type: string
        industry:
          type: string
        profile_picture_url:
          type: string
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

- [Social Post Watcher](https://docs.crustdata.com/watcher-docs/social-post/discovery.md)
- [Social Post Search API](https://docs.crustdata.com/social-post-docs/indexed-search/introduction.md)
- [Social Post Search reference](https://docs.crustdata.com/social-post-docs/indexed-search/reference.md)
- [API Introduction](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction.md)
- [Pricing](https://docs.crustdata.com/general/pricing.md)
