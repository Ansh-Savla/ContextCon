> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Create a discovery watch

> Creates a discovery watch: a saved search filter that re-runs on an interval and delivers the
records that newly match it.

The filter uses the same syntax and the same field names as the dataset's own search endpoint,
so there is no second filter language. A leaf is `{ "field", "type", "value" }` and groups
combine leaves with `{ "op": "and" | "or", "conditions": [...] }`. Groups nest.

The first run starts within seconds and is a free baseline capped at 5 records, so you can
confirm the delivery path and the payload shape before any credit is spent. Later runs deliver
up to `config.max_results_per_run` records each and are charged per record delivered.

A watch whose filter matches more than 500,000 records is rejected at creation: narrow the
filter. That bound is on the baseline, the set the free first run enumerates and records as
delivered, not on how many records the watch may deliver over its lifetime; later runs are
capped by `config.max_results_per_run`. A filter that names a field from another dataset is a
valid cross-dataset condition
rather than a typo, but row-level negation (`!=`, `not_in`, `(!)`, `geo_exclude`) is rejected
there because it matches subjects with *some other* matching row rather than subjects with
none.




## OpenAPI

````yaml /openapi-specs/2025-11-01/watch.yaml post /watch/{dataset}/search
openapi: 3.0.3
info:
  title: Watch API
  version: '2025-11-01'
  description: >
    The Watch API turns a Crustdata query into a recurring feed. A watch runs on
    your schedule and

    delivers only what is new or what changed since its previous run, to a
    webhook, Slack, Google Chat,

    or email.


    There are two kinds of watch, and the kind decides the URL:


    - **Discovery watches** (`/watch/{dataset}/search`) re-run a *search filter*
    and deliver records that
      newly match it. Use one to find people, companies, jobs, or social posts you do not know yet.
      Available for `person`, `company`, `job`, and `social_post`.
    - **Entity watches** (`/watch/{dataset}`) monitor a *list you supply* and
    deliver a notification when
      a tracked field on one of those records changes. Use one to follow a known set. Available for
      `person` and `company`.

    Both kinds share the same `config`, `notifications`, and run-history
    surfaces, and both start with a

    free baseline run: a discovery watch delivers a sample of up to 5 current
    matches, an entity watch

    records each subject's starting values and never fires. Every request needs
    an `Authorization` Bearer

    API key and the `x-api-version: 2025-11-01` header.


    **Credits.** Every watch is priced by its SLA, how fresh the data behind a
    notification is kept,

    written as `config.refresh_frequency_days`. At the 30-day default a
    discovery watch is charged per

    new record delivered: 0.5 for a person, 2 for a company, 0.5 for a job, 2
    for a social post. At a

    1-day SLA it is charged 150 per new record on every dataset, because each
    run searches live rather

    than reading the index; a discovery watch asks for that SLA with
    `config.is_realtime: true` and the

    create response echoes `config.refresh_frequency_days: 1`. An entity watch
    is charged per

    notification at the same SLA scale: 5 credits at the 30-day default, 10 at
    14 days, 20 at 7 days,

    50 at 3 days, 150 at 1 day. A run that finds nothing costs nothing, and the
    baseline run is free

    for both kinds.


    **Rate limit.** Watch-management requests are limited to 10 requests per
    minute, counted per

    endpoint: exhausting `/watch/company/search` leaves `/watch/company`,
    `/watch/person/search`,

    and `/watch/job/search` with a full allowance. Every response carries
    `X-RateLimit-Limit`,

    `X-RateLimit-Remaining`, and `X-RateLimit-Reset`, the seconds until the
    window rolls over.


    **Access.** Creating a watch is open to any authenticated API customer, and
    the 10-requests-per-minute

    limit is what bounds abuse. What is gated is the data underneath: a create
    is rejected with `403` when

    the key is not entitled to the dataset, or when `fields` or `track` name
    field groups the key may not

    receive. Contact info@crustdata.com to request access.
servers:
  - url: https://api.crustdata.com
    description: Production API server
security:
  - bearerAuth: []
tags:
  - name: Watch APIs
    description: Recurring feeds over the Crustdata datasets
  - name: Discovery Watches
    description: Watches that re-run a search filter and deliver newly matching records
  - name: Entity Watches
    description: >-
      Watches that monitor a supplied list of people or companies for field
      changes
  - name: Watch Runs
    description: Run history and per-run delivery detail, shared by both watch kinds
paths:
  /watch/{dataset}/search:
    post:
      tags:
        - Watch APIs
        - Discovery Watches
      summary: Create a discovery watch
      description: >
        Creates a discovery watch: a saved search filter that re-runs on an
        interval and delivers the

        records that newly match it.


        The filter uses the same syntax and the same field names as the
        dataset's own search endpoint,

        so there is no second filter language. A leaf is `{ "field", "type",
        "value" }` and groups

        combine leaves with `{ "op": "and" | "or", "conditions": [...] }`.
        Groups nest.


        The first run starts within seconds and is a free baseline capped at 5
        records, so you can

        confirm the delivery path and the payload shape before any credit is
        spent. Later runs deliver

        up to `config.max_results_per_run` records each and are charged per
        record delivered.


        A watch whose filter matches more than 500,000 records is rejected at
        creation: narrow the

        filter. That bound is on the baseline, the set the free first run
        enumerates and records as

        delivered, not on how many records the watch may deliver over its
        lifetime; later runs are

        capped by `config.max_results_per_run`. A filter that names a field from
        another dataset is a

        valid cross-dataset condition

        rather than a typo, but row-level negation (`!=`, `not_in`, `(!)`,
        `geo_exclude`) is rejected

        there because it matches subjects with *some other* matching row rather
        than subjects with

        none.
      operationId: createDiscoveryWatch
      parameters:
        - $ref: '#/components/parameters/DatasetPath'
        - $ref: '#/components/parameters/ApiVersion'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DiscoveryWatchCreateRequest'
            examples:
              person_persona_and_location:
                summary: 'person: new ML engineers in Paris, checked daily'
                value:
                  filters:
                    op: and
                    conditions:
                      - field: experience.employment_details.current.title
                        type: (.)
                        value: Machine Learning Engineer
                      - field: professional_network.location.raw
                        type: (.)
                        value: Paris
                  config:
                    trigger:
                      type: interval
                      every_hours: 24
                    max_results_per_run: 25
                  notifications:
                    - type: webhook
                      url: https://your-app.com/webhooks/crustdata
              person_high_volume_link:
                summary: 'person: 10,000 records per run, delivered as one link'
                value:
                  filters:
                    op: and
                    conditions:
                      - field: experience.employment_details.current.title
                        type: (.)
                        value: Machine Learning Engineer
                  config:
                    trigger:
                      type: interval
                      every_hours: 24
                    max_results_per_run: 10000
                    payload_delivery_type: link
                  notifications:
                    - type: webhook
                      url: https://your-app.com/webhooks/crustdata
              company_growth_band:
                summary: 'company: new accounts entering an ICP, checked weekly'
                value:
                  filters:
                    op: and
                    conditions:
                      - field: headcount.total
                        type: '=>'
                        value: 51
                      - field: headcount.total
                        type: '=<'
                        value: 500
                  config:
                    trigger:
                      type: interval
                      every_hours: 168
                  notifications:
                    - type: slack
                      webhook_url: https://hooks.slack.com/services/T000/B000/XXXX
              job_recent_postings:
                summary: 'job: new engineering roles, newest first'
                value:
                  filters:
                    op: and
                    conditions:
                      - field: job_details.title
                        type: (.)
                        value: software engineer
                      - field: location.country
                        type: '='
                        value: United States
                      - field: metadata.date_added
                        type: '=>'
                        value: '2026-07-05'
                  sorts:
                    - field: metadata.date_added
                      order: desc
                  config:
                    trigger:
                      type: interval
                      every_hours: 24
                  notifications:
                    - type: webhook
                      url: https://your-app.com/webhooks/crustdata
              company_cross_dataset:
                summary: >-
                  company: cross-dataset, companies on Snowflake hiring a data
                  engineer
                value:
                  filters:
                    op: and
                    conditions:
                      - field: technographics.technologies.name
                        type: '='
                        value: Snowflake
                      - field: job_details.title
                        type: (.)
                        value: data engineer
                  config:
                    trigger:
                      type: interval
                      every_hours: 24
                  notifications:
                    - type: webhook
                      url: https://your-app.com/webhooks/crustdata
              person_realtime_split:
                summary: 'person: search live on the title, narrow on employer size'
                value:
                  realtime_filters:
                    op: and
                    conditions:
                      - field: experience.employment_details.current.title
                        type: (.)
                        value: Head of Revenue Operations
                      - field: basic_profile.location.city
                        type: in
                        value:
                          - San Francisco
                      - field: basic_profile.location.state
                        type: in
                        value:
                          - California
                      - field: basic_profile.location.country
                        type: in
                        value:
                          - United States
                  narrowing_filters:
                    company:
                      op: and
                      conditions:
                        - field: basic_info.employee_count_range
                          type: in
                          value:
                            - 51-200
                            - 201-500
                  config:
                    is_realtime: true
                    trigger:
                      type: interval
                      every_hours: 24
                  notifications:
                    - type: webhook
                      url: https://your-app.com/webhooks/crustdata
              company_realtime_year_founded:
                summary: 'company: search live on firmographics, narrow on founding year'
                value:
                  realtime_filters:
                    op: and
                    conditions:
                      - field: taxonomy.professional_network_industry
                        type: in
                        value:
                          - Software Development
                      - field: locations.headquarters
                        type: in
                        value:
                          - Austin, Texas, United States
                      - field: headcount.total
                        type: '=>'
                        value: 51
                      - field: headcount.total
                        type: '=<'
                        value: 200
                  narrowing_filters:
                    company:
                      op: and
                      conditions:
                        - field: basic_info.year_founded
                          type: '=>'
                          value: 2015
                  config:
                    is_realtime: true
                    trigger:
                      type: interval
                      every_hours: 24
                  notifications: []
              job_realtime_workplace_type:
                summary: 'job: on-site and hybrid full-time roles in one city'
                value:
                  realtime_filters:
                    op: and
                    conditions:
                      - field: job_details.title
                        type: (.)
                        value: Account Executive
                      - field: location.city
                        type: in
                        value:
                          - Austin
                      - field: job_details.workplace_type
                        type: in
                        value:
                          - On-site
                          - Hybrid
                      - field: job_details.employment_type
                        type: '='
                        value: full_time
                  config:
                    is_realtime: true
                    trigger:
                      type: interval
                      every_hours: 24
                  notifications: []
              job_realtime_employer:
                summary: 'job: every full-time opening at named employers'
                value:
                  realtime_filters:
                    op: and
                    conditions:
                      - field: company.basic_info.name
                        type: in
                        value:
                          - Stripe
                          - Figma
                      - field: job_details.employment_type
                        type: '='
                        value: full_time
                  config:
                    is_realtime: true
                    trigger:
                      type: interval
                      every_hours: 24
                  notifications: []
              pull_only:
                summary: 'no channel: read results from the runs endpoints instead'
                value:
                  filters:
                    field: job_details.category
                    type: '='
                    value: Engineering
                  config:
                    trigger:
                      type: interval
                      every_hours: 24
                  notifications: []
      responses:
        '200':
          description: >
            The preview, when the body carried `preview: true`. Nothing was
            created and nothing was

            charged.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DiscoveryWatchPreview'
        '201':
          description: The watch was created and its baseline run was scheduled.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DiscoveryWatch'
        '400':
          description: >
            The body failed validation, or `x-api-version` is missing or
            unsupported. The message

            names the offending path, for example `filters.conditions[1] is
            missing 'value'.`


            On a realtime watch, `error.metadata[].field` is what tells a
            `realtime_filters`

            problem from a `narrowing_filters` one, and names the block: the
            keys are judged

            against different vocabularies, and a field the live search cannot
            express is

            reported with the block it can go in, or with the fact that it has
            nowhere to go at

            this tier.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WatcherErrorResponse'
              examples:
                missing_api_version:
                  summary: No x-api-version header
                  value:
                    error:
                      type: invalid_request
                      message: 'Missing required header: x-api-version'
                      metadata: []
                unknown_filter_field:
                  summary: A filter names a field no dataset defines
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Unknown filter field at filters.conditions[0]:
                        'current_title'.
                      metadata:
                        - field: filters.conditions[0].field
                          type: unknown_field
                          message: >-
                            Unknown filter field at filters.conditions[0]:
                            'current_title'.
                too_broad:
                  summary: The filter matches more records than a watch may track
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        This watch would follow 1,204,338 records, more than the
                        500,000 a single watch can track. Please narrow your
                        filters.
                      metadata: []
                cross_dataset_negation:
                  summary: A negating operator on a filter from another dataset
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        filters.conditions[1]: '(!)' on a job filter matches any
                        company with some *other* matching job record, not those
                        with none. List the values you do want instead.
                      metadata:
                        - field: filters.conditions[1].type
                          type: unsupported
                          message: >-
                            filters.conditions[1]: '(!)' on a job filter matches
                            any company with some *other* matching job record,
                            not those with none. List the values you do want
                            instead.
                cross_dataset_too_broad:
                  summary: A filter from another dataset covers too many companies
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Your company filters cover more than 1,000,000
                        companies. Add another company filter — a location, a
                        date, a more specific title — so this watch follows a
                        smaller set of companies.
                      metadata: []
                cross_dataset_unavailable:
                  summary: The other dataset could not be reached at creation time
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        We could not check your job filters just now. Please try
                        again in a few minutes.
                      metadata: []
                discovery_refresh_frequency_days:
                  summary: config.refresh_frequency_days on a discovery watch
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        config.refresh_frequency_days is not accepted on a
                        discovery watch. Use config.is_realtime: true for the
                        live tier, and leave it out for the index tier.
                      metadata:
                        - field: config.refresh_frequency_days
                          type: extra_forbidden
                          message: >-
                            config.refresh_frequency_days is not accepted on a
                            discovery watch. Use config.is_realtime: true for
                            the live tier, and leave it out for the index tier.
                realtime_cross_dataset:
                  summary: >-
                    The denormalized company spelling in realtime_filters on a
                    job watch
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        realtime_filters: 'company.headcount.range' is not
                        something the live search can be asked for. There is
                        nowhere else to put it: a job watch narrows only on
                        company, and our index has never seen the record this
                        search returns.
                      metadata:
                        - field: realtime_filters
                          type: unsupported
                          message: >-
                            realtime_filters: 'company.headcount.range' is not
                            something the live search can be asked for. There is
                            nowhere else to put it: a job watch narrows only on
                            company, and our index has never seen the record
                            this search returns.
                realtime_filters_without_flag:
                  summary: realtime_filters sent without config.is_realtime
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        realtime_filters needs config.is_realtime: true. Without
                        it no live search runs, so there is nothing to ask. Move
                        these conditions to 'filters'. filters: This field is
                        required.
                      metadata:
                        - field: realtime_filters
                          type: extra_forbidden
                          message: >-
                            realtime_filters needs config.is_realtime: true.
                            Without it no live search runs, so there is nothing
                            to ask. Move these conditions to 'filters'.
                        - field: filters
                          type: missing
                          message: 'filters: This field is required.'
                realtime_flag_without_filters:
                  summary: config.is_realtime set without realtime_filters
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        realtime_filters is required when config.is_realtime is
                        true: it is what the live search is asked for.
                        Conditions about the author or the hiring company go in
                        narrowing_filters, keyed by dataset.
                      metadata:
                        - field: realtime_filters
                          type: missing
                          message: >-
                            realtime_filters is required when config.is_realtime
                            is true: it is what the live search is asked for.
                            Conditions about the author or the hiring company go
                            in narrowing_filters, keyed by dataset.
                realtime_field_not_live:
                  summary: A realtime_filters field the live search cannot express
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        realtime_filters:
                        'experience.employment_details.current.function_category'
                        is not something the live search can be asked for. Move
                        it under 'narrowing_filters.person', expressed in
                        person's own vocabulary.
                      metadata:
                        - field: realtime_filters
                          type: unsupported
                          message: >-
                            realtime_filters:
                            'experience.employment_details.current.function_category'
                            is not something the live search can be asked for.
                            Move it under 'narrowing_filters.person', expressed
                            in person's own vocabulary.
                filters_on_realtime_watch:
                  summary: filters sent on a realtime watch
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        'filters' is the index tier's tree and cannot narrow a
                        realtime watch: it would be asked of an index that has
                        never seen the record the live search just found, which
                        drops every result. Put conditions the live search
                        answers in 'realtime_filters', and conditions about the
                        author or the hiring company in narrowing_filters, keyed
                        by dataset.
                      metadata:
                        - field: filters
                          type: extra_forbidden
                          message: >-
                            'filters' is the index tier's tree and cannot narrow
                            a realtime watch: it would be asked of an index that
                            has never seen the record the live search just
                            found, which drops every result. Put conditions the
                            live search answers in 'realtime_filters', and
                            conditions about the author or the hiring company in
                            narrowing_filters, keyed by dataset.
                narrowing_without_flag:
                  summary: narrowing_filters sent without config.is_realtime
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        narrowing_filters needs config.is_realtime: true. An
                        index watch has one source, so its conditions all belong
                        in 'filters'.
                      metadata:
                        - field: narrowing_filters
                          type: extra_forbidden
                          message: >-
                            narrowing_filters needs config.is_realtime: true. An
                            index watch has one source, so its conditions all
                            belong in 'filters'.
                narrowing_inside_config:
                  summary: narrowing_filters nested inside config
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        narrowing_filters goes at the top level of the body,
                        beside realtime_filters, not inside config.
                      metadata:
                        - field: config.narrowing_filters
                          type: extra_forbidden
                          message: >-
                            narrowing_filters goes at the top level of the body,
                            beside realtime_filters, not inside config.
                narrowing_block_not_allowed:
                  summary: A narrowing block this dataset cannot ask about
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        narrowing_filters.job: A person watch cannot narrow on
                        job. It may narrow on: person, company. A condition
                        about the record the search returns belongs in
                        'realtime_filters'.
                      metadata:
                        - field: narrowing_filters.job
                          type: unsupported
                          message: >-
                            narrowing_filters.job: A person watch cannot narrow
                            on job. It may narrow on: person, company. A
                            condition about the record the search returns
                            belongs in 'realtime_filters'.
                narrowing_foreign_field:
                  summary: A field from another dataset inside a narrowing block
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        'basic_profile.location.country' is a person field, so
                        it cannot be asked of the company block. Put it under
                        'narrowing_filters.person' instead.
                      metadata:
                        - field: narrowing_filters.company
                          type: unsupported
                          message: >-
                            'basic_profile.location.country' is a person field,
                            so it cannot be asked of the company block. Put it
                            under 'narrowing_filters.person' instead.
                realtime_cadence_floor:
                  summary: A realtime watch scheduled more often than daily
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        config.trigger.every_hours must be at least 24 when
                        refresh_frequency_days is 1: a live run fetches from the
                        source and is billed per new record. Use
                        refresh_frequency_days 30 to run more often.
                      metadata:
                        - field: config.trigger.every_hours
                          type: greater_than_equal
                          message: >-
                            config.trigger.every_hours must be at least 24 when
                            refresh_frequency_days is 1: a live run fetches from
                            the source and is billed per new record. Use
                            refresh_frequency_days 30 to run more often.
                realtime_too_broad:
                  summary: >-
                    realtime_filters matches more records than a realtime watch
                    may track
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        This watch would follow 4,632,710 records, more than the
                        10,000 a daily-refresh watch can track. Please narrow
                        down your search with other filters.
                      metadata: []
                bad_payload_delivery_type:
                  summary: An unknown config.payload_delivery_type
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        config.payload_delivery_type must be one of ['inline',
                        'link'].
                      metadata:
                        - field: config.payload_delivery_type
                          type: enum
                          message: >-
                            config.payload_delivery_type must be one of
                            ['inline', 'link'].
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          description: >
            The key is not entitled to the dataset the watch reads, or the
            requested `fields`

            include groups the key may not receive.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WatcherErrorResponse'
              examples:
                dataset_not_granted:
                  summary: The key cannot watch this dataset
                  value:
                    error:
                      type: permission_error
                      message: >-
                        You do not have access to the person dataset. Contact
                        info@crustdata.com to request access.
                      metadata: []
                fields_denied:
                  summary: A requested field group is not enabled on the key
                  value:
                    error:
                      type: permission_error
                      message: 'Access denied to fields: contact'
                      metadata:
                        - denied_fields:
                            - contact
                          permitted_fields:
                            - basic_profile
                            - experience
        '429':
          $ref: '#/components/responses/RateLimited'
        '500':
          description: The watch could not be created.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WatcherErrorResponse'
              example:
                error:
                  type: internal_error
                  message: Error creating watch! Contact info@crustdata.com
                  metadata: []
components:
  parameters:
    DatasetPath:
      name: dataset
      in: path
      required: true
      description: The dataset the watch is built on.
      schema:
        type: string
        enum:
          - person
          - company
          - job
          - social_post
        example: person
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
      description: >
        API version to use. `2025-11-01` is the only accepted value. Send it on
        every call: it is

        enforced today on `POST /watch/{dataset}/search`, where a missing or
        unrecognized value returns

        `400`, and the other watch routes accept a request without it rather
        than relying on that.
  schemas:
    DiscoveryWatchCreateRequest:
      type: object
      description: >
        Body for creating a discovery watch. The dataset comes from the path,
        and the API version from

        the `x-api-version` header.


        `filters` is required on an ordinary watch. On a realtime watch
        (`config.is_realtime: true`)

        `realtime_filters` is what the watch runs on, `narrowing_filters`
        narrows what it returned,

        and `filters` is refused.
      required:
        - config
      properties:
        preview:
          type: boolean
          default: false
          description: >
            Ask what this watch would do instead of creating it. The request is
            validated exactly as a

            create is, nothing is persisted, and no credits are charged or
            reserved — so a preview works

            even on an account with no credits left, which is the balance a
            preview is usually being run

            to inform.


            Answers `200` with the preview rather than `201` with a watch.
            Everything else in the body

            means the same thing it means on a create, so preview and create
            differ by this flag alone.
          example: true
        filters:
          description: >
            The search filter to re-run each interval. A single leaf or a nested
            AND/OR group, in

            the dataset's full search grammar.


            Required on an index watch, and refused on a realtime one. A
            realtime watch's records

            are new by construction, so asking this tree about one means asking
            an index that has

            never seen it, which drops every result. Narrow a realtime watch
            with

            `narrowing_filters` instead.
          oneOf:
            - $ref: '#/components/schemas/FilterCondition'
            - $ref: '#/components/schemas/FilterConditionGroup'
        realtime_filters:
          description: >
            What the live search is asked for on a realtime watch. Requires
            `config.is_realtime:

            true`, and sending one without the other is a `400` in both
            directions.


            This tree accepts fewer fields and a simpler shape than the
            dataset's full search

            grammar. Each leaf follows the leaf schema for the path's dataset:

            `RealtimeConditionPerson`, `RealtimeConditionCompany`,
            `RealtimeConditionJob`, or

            `RealtimeConditionSocialPost`. Each one lists the fields that
            dataset's live search

            accepts and the operators and values each field takes. The tree
            shape is in

            `RealtimeConditionGroup`.


            Fields the live search cannot express belong in `narrowing_filters`,
            when the

            dataset that owns them is one this watch may narrow on; the refusal
            names the

            block. Values are unchanged: you write the same ones here as you do
            on an index

            watch, and the watch translates them for the live search.
          anyOf:
            - $ref: '#/components/schemas/RealtimeConditionPerson'
            - $ref: '#/components/schemas/RealtimeConditionCompany'
            - $ref: '#/components/schemas/RealtimeConditionJob'
            - $ref: '#/components/schemas/RealtimeConditionSocialPost'
            - $ref: '#/components/schemas/RealtimeConditionGroup'
        narrowing_filters:
          type: object
          description: >
            What narrows a realtime watch, keyed by dataset. Requires
            `config.is_realtime: true`,

            and goes at the top level of the body rather than inside `config`.


            A record the live search just found is too new for its own index to
            hold, so narrowing

            asks about the durable entity behind it instead: the author of a
            post, the company

            hiring for a job, the person as the index already knows them. Each
            block is a plain

            single-dataset tree asked of that dataset's own index, in that
            dataset's own

            vocabulary, so a field belonging to another dataset is refused
            rather than resolved.


            A block keeps that dataset's **full search grammar**, unlike
            `realtime_filters`: an

            `or` across two different fields, nested `and` / `or` groups, and
            every negation

            operator all work, because an index answers it rather than the live
            search. The one

            restriction is that every leaf must belong to the block's own
            dataset. The fields and

            operators are exactly those of that dataset's search endpoint:
            `PersonSearchCondition`

            on `POST /person/search` for the `person` block, and
            `SearchCondition` on

            `POST /company/search` for the `company` block.


            Only `person` and `company` may be named, and which of the two
            depends on the watch:

            a `person` or `social_post` watch may narrow on either, and a
            `company` or `job` watch

            on `company` alone. Name one block. A job posting or a social post
            is the new record

            itself, so there is no older copy of it to ask about, and a
            condition about the record

            the search returned belongs in `realtime_filters`.


            A record whose entity the index does not hold is dropped rather than
            delivered

            unchecked. Immutable once set, like `realtime_filters`.
          additionalProperties:
            oneOf:
              - $ref: '#/components/schemas/FilterCondition'
              - $ref: '#/components/schemas/FilterConditionGroup'
          example:
            company:
              op: and
              conditions:
                - field: basic_info.employee_count_range
                  type: in
                  value:
                    - 201-500
                    - 501-1000
        sorts:
          type: array
          description: >
            Delivery order within a run, for example newest first. Sorting does
            not change which

            records are new, only the order they arrive in when a run is capped.
          items:
            $ref: '#/components/schemas/SortSpec'
        fields:
          type: array
          description: >
            Field groups or field paths to include in each delivered `record`.
            Defaults to the

            dataset's standard projection. Every requested field is checked
            against the key's

            entitlements at creation, and `fields` does not affect what a record
            costs.
          items:
            type: string
          example:
            - basic_profile
            - experience
        'on':
          type: array
          description: >
            Which membership transitions notify you. Only `added`, records that
            newly match, is

            supported today, and it is the default.
          items:
            type: string
            enum:
              - added
          default:
            - added
          example:
            - added
        config:
          $ref: '#/components/schemas/DiscoveryWatchConfig'
        notifications:
          type: array
          description: >
            Delivery channels. May be empty for a pull-only watch, which pushes
            nothing and whose

            results you read from the run-history endpoints instead.
          items:
            $ref: '#/components/schemas/NotificationChannel'
        overflow_policy:
          type: string
          enum:
            - redeliver
            - drop
          default: redeliver
          description: >
            What happens to new records beyond `max_results_per_run`.
            `redeliver` leaves the

            overflow unseen so it comes back in a later run. `drop` marks every
            new record seen so

            the overflow never returns.
          example: redeliver
    DiscoveryWatchPreview:
      type: object
      description: >
        What a discovery watch would match right now. `can_create` is stated
        rather than implied by an

        empty `error`, so a caller does not have to infer validity from an
        absence.
      properties:
        can_create:
          type: boolean
          description: >
            Whether this body would be accepted by a create. Every check a
            create runs has already run,

            so `true` means the create will pass and `false` names the reason in
            `error`.
          example: true
        count:
          type: integer
          nullable: true
          description: >
            How many records match right now. The first run marks this whole set
            seen — permanently —

            and delivers at most 5 of it, so a broad filter spends its backlog
            on run one. Narrow it

            before arming rather than after. `null` when the index could not be
            reached.
          example: 1240
        sample:
          type: array
          description: >-
            Up to three matching records, each cut to the identity a delivered
            notification keeps.
          items:
            type: object
            additionalProperties: true
        counted_against:
          type: string
          nullable: true
          description: >
            Where the count came from, not which tier the watch will run on. A
            realtime watch is

            previewed against the index too, because sampling live means running
            the live retrieval

            the watch exists to pay for, so its preview is an illustration
            rather than a forecast:

            staler, and broader wherever a live-only field has no index column.
          example: index
        credits:
          $ref: '#/components/schemas/WatchPreviewCredits'
        error:
          type: string
          nullable: true
          description: Why the watch cannot be created, when `can_create` is `false`.
        error_field:
          type: string
          nullable: true
          description: The body field the error is attached to, when it belongs to one.
    DiscoveryWatch:
      type: object
      description: A discovery watch, as returned by create, get, list, and update.
      properties:
        id:
          type: integer
          description: The watch's id. Use it on every management and run-history path.
          example: 47609
        kind:
          type: string
          enum:
            - discovery
          example: discovery
        dataset:
          type: string
          enum:
            - person
            - company
            - job
          example: job
        api_version:
          type: string
          example: '2025-11-01'
        config_version:
          type: string
          description: Version of the stored config shape.
          example: '2025-11-01'
        status:
          type: string
          enum:
            - active
            - paused
            - suspended
            - expired
            - cancelled
          description: >
            Lifecycle state. `suspended` is set by the system, most often for an
            insufficient

            balance, and blocks status changes until it is resolved.
          example: active
        filters:
          description: >-
            The saved filter, as sent at creation. `null` on a realtime watch,
            which does not take one.
          oneOf:
            - $ref: '#/components/schemas/FilterCondition'
            - $ref: '#/components/schemas/FilterConditionGroup'
        realtime_filters:
          description: >
            The tree the live search is asked for, as sent at creation. `null`
            on an ordinary

            index-tier watch.
          oneOf:
            - $ref: '#/components/schemas/FilterCondition'
            - $ref: '#/components/schemas/FilterConditionGroup'
        narrowing_filters:
          type: object
          nullable: true
          description: >
            The saved narrowing blocks, as sent at creation. `null` on an
            index-tier watch and on

            a realtime watch that narrows on nothing.
          additionalProperties:
            oneOf:
              - $ref: '#/components/schemas/FilterCondition'
              - $ref: '#/components/schemas/FilterConditionGroup'
        'on':
          type: array
          items:
            type: string
          example:
            - added
        sorts:
          type: array
          nullable: true
          items:
            $ref: '#/components/schemas/SortSpec'
        fields:
          type: array
          nullable: true
          items:
            type: string
        config:
          $ref: '#/components/schemas/DiscoveryWatchConfig'
        notifications:
          type: array
          description: The configured channels. A stored channel secret is never returned.
          items:
            $ref: '#/components/schemas/NotificationChannel'
        created_at:
          type: string
          format: date-time
          example: '2026-07-16T03:16:38.351849Z'
        last_run_at:
          type: string
          format: date-time
          nullable: true
          description: When the watch last ran. `null` until the baseline run completes.
          example: '2026-08-04T05:32:47.000000Z'
        notifications_count:
          type: integer
          description: All-time count of records this watch has delivered.
          example: 128
        credits_consumed:
          type: number
          description: All-time credits this watch has spent.
          example: 64
        last_notified_at:
          type: string
          format: date-time
          nullable: true
          description: When this watch last delivered anything.
          example: '2026-08-04T05:32:47.000000Z'
    WatcherErrorResponse:
      type: object
      description: >
        Every watcher failure, whatever the status code. `type` is the
        machine-readable code,

        `message` is the sentence you can show a user, and `metadata` carries
        per-problem detail.


        Validation collects every failure in one pass, so a body with three
        problems answers once

        with three `metadata` entries and a `message` that joins them. Each
        validation entry is a

        `{field, type, message}` triple: `field` is the request path that
        failed, indexed into

        filter and track trees; `type` is drawn from the vocabulary the search
        and enrich APIs use

        (`missing`, `enum`, `greater_than_equal`, `less_than_equal`,
        `string_type`, `int_type`,

        `bool_type`, `list_type`, `dict_type`, `too_long`, `date_parsing`,
        `extra_forbidden`,

        `invalid`) plus `unknown_field` and `unsupported`, which only watcher
        emits.


        A limit that names no request field, such as the tracking cap, carries
        an empty `metadata`.

        Three responses put something other than a triple in it: `Invalid
        fields: ...` carries

        `available_fields`, `Access denied to fields: ...` carries
        `denied_fields` and

        `permitted_fields`, and a test send that was never attempted carries the
        `delivered` and

        `envelope` it had built. Check for the keys you expect before iterating.
      required:
        - error
      example:
        error:
          type: not_found
          message: Watch not found
          metadata: []
      properties:
        error:
          type: object
          required:
            - type
            - message
            - metadata
          properties:
            type:
              type: string
              description: Machine-readable error type.
              enum:
                - invalid_request
                - unauthorized
                - permission_error
                - not_found
                - rate_limit_error
                - internal_error
              example: not_found
            message:
              type: string
              description: >
                Human-readable description. On a validation failure this is
                every entry's

                message joined in order.
              example: Watch not found
            metadata:
              type: array
              description: >-
                One entry per problem, empty when the failure names no request
                field.
              items:
                type: object
                additionalProperties: true
                properties:
                  field:
                    type: string
                    description: The request path that failed.
                    example: config.trigger.every_hours
                  type:
                    type: string
                    description: The failure code for this one problem.
                    example: greater_than_equal
                  message:
                    type: string
                    description: The sentence for this one problem.
                    example: config.trigger.every_hours must be an integer >= 1.
              example:
                - field: config.trigger.every_hours
                  type: greater_than_equal
                  message: config.trigger.every_hours must be an integer >= 1.
    FilterCondition:
      type: object
      description: >
        One filter leaf. `field` and the operators are exactly those of the
        dataset's own search

        endpoint, so the Person, Company, and Job search references are the full
        catalog.
      required:
        - field
        - type
      properties:
        field:
          type: string
          description: >
            Dot-path of the field to filter on, for example

            `experience.employment_details.current.title` for a person or
            `job_details.title` for a

            job. Field names are unique across datasets, so a leaf naming
            another dataset's field is

            a valid cross-dataset condition rather than a mistake.
          example: experience.employment_details.current.title
        type:
          type: string
          description: >
            The comparison operator. Crustdata writes greater-or-equal as `=>`
            and less-or-equal as

            `=<`, not `>=` / `<=`.


            A cross-dataset leaf may not use a row-level negation operator
            (`!=`, `not_in`, `(!)`,

            `geo_exclude`): it would match subjects with some *other* matching
            row rather than

            subjects with none. List the values you do want instead.
          example: (.)
          enum:
            - '='
            - '!='
            - in
            - not_in
            - '>'
            - <
            - '=>'
            - '=<'
            - (.)
            - (!)
            - '[.]'
            - geo_distance
            - geo_exclude
        value:
          description: >
            The value to compare against. A scalar for `=`, `!=`, `>`, `<`,
            `=>`, `=<`, and the

            substring operators; an array for `in` and `not_in`; an object for
            the geo operators.

            Required for every operator except the null checks.
          example: Machine Learning Engineer
    FilterConditionGroup:
      type: object
      description: >-
        A group that combines conditions with AND or OR. Groups nest, so an
        `and` group can sit inside an `or` group's `conditions`.
      required:
        - op
        - conditions
      properties:
        op:
          type: string
          enum:
            - and
            - or
          description: How to combine `conditions`.
          example: and
        conditions:
          type: array
          minItems: 1
          description: The conditions to combine. Each item is a leaf or another group.
          items:
            oneOf:
              - $ref: '#/components/schemas/FilterCondition'
              - $ref: '#/components/schemas/FilterConditionGroup'
    RealtimeConditionPerson:
      type: object
      description: >
        One `realtime_filters` leaf on a `person` watch (`POST
        /watch/person/search`). Operators

        and values per field:


        - `experience.employment_details.current.title`,
        `experience.employment_details.past.title`:
          `=` `!=` `in` `not_in` `(.)`. Free text.
        - `experience.employment_details.current.seniority_level`: `=` `!=` `in`
        `not_in`. One of
          `Owner / Partner`, `CXO`, `Vice President`, `Director`, `Experienced Manager`,
          `Entry Level Manager`, `Strategic`, `Senior`, `Entry Level`, `In Training`.
        -
        `experience.employment_details.{current,past}.{company_name,company_id,company_linkedin_profile_url,company_website_domain}`:
          `=` `!=` `in` `not_in`. Four spellings of one employer filter. A name is resolved to
          company IDs before the search runs.
        - `experience.employment_details.last_company.name`: `=` `!=` `in`
        `not_in`. Checked on
          each person the search returns, not sent to the search.
        - `experience.employment_details.current.company_headcount_range`: `=`
        `in`. A headcount
          range, for example `51-200`.
        - `experience.employment_details.current.company_industries`,
          `experience.employment_details.current.company_headquarters_country`: `=` `!=` `in`
          `not_in`. An industry name, a country name.
        - `basic_profile.location.country`, `basic_profile.location.state`,
          `basic_profile.location.city`: `=` `!=` `in` `not_in`. A bare city or state is enough: the
          watch resolves it to the live search's place. A country or state beside it places the
          name more precisely, and the watch searches on the most specific one. A place it cannot
          resolve is refused with `400`; try another value from Person Autocomplete, or add the
          country.
        - `years_of_experience`,
        `experience.employment_details.current.years_at_employer`: `=>`
          `=<`. A tenure bucket edge, whole years: `=>` one of `0`, `1`, `3`, `6`, `11`; `=<` one
          of `0`, `2`, `5`, `10`.
        - `experience.employment_details.current.start_date`: `=>` `=<`. The
        same edges as date
          math: `=<` one of `now-0y`, `now-1y`, `now-3y`, `now-6y`, `now-11y` (at least that long
          in the role); `=>` one of `now-0y`, `now-2y`, `now-5y`, `now-10y` (at most that long).
        - `basic_profile.headline`, `basic_profile.summary`: `(.)`. Free text,
        the watch's keyword.

        - `basic_profile.first_name`, `basic_profile.last_name`: `=`. Free text.

        - `education.schools.school`: `=` `!=` `in` `not_in` `(.)`. A school
        name.

        - `recently_changed_jobs`, `professional_network.recently_posted`,
          `professional_network.mentioned_in_news`: `=`. `true` only. The last two exist only on a
          realtime watch.
      required:
        - field
        - type
        - value
      properties:
        field:
          type: string
          description: >
            Field name to filter on. Valid fields:
            experience.employment_details.current.title,
            experience.employment_details.past.title,
            experience.employment_details.current.seniority_level,
            experience.employment_details.current.company_name,
            experience.employment_details.current.company_id,
            experience.employment_details.current.company_linkedin_profile_url,
            experience.employment_details.current.company_website_domain,
            experience.employment_details.past.company_name,
            experience.employment_details.past.company_id,
            experience.employment_details.past.company_linkedin_profile_url,
            experience.employment_details.past.company_website_domain,
            experience.employment_details.last_company.name,
            experience.employment_details.current.company_headcount_range,
            experience.employment_details.current.company_industries,
            experience.employment_details.current.company_headquarters_country,
            basic_profile.location.country, basic_profile.location.state,
            basic_profile.location.city, years_of_experience,
            experience.employment_details.current.years_at_employer,
            experience.employment_details.current.start_date,
            basic_profile.headline, basic_profile.summary,
            basic_profile.first_name, basic_profile.last_name,
            education.schools.school, recently_changed_jobs,
            professional_network.recently_posted,
            professional_network.mentioned_in_news
          example: experience.employment_details.current.title
        type:
          type: string
          description: >-
            Filter operator. Each field takes only the operators listed for it
            above.
          enum:
            - '='
            - '!='
            - in
            - not_in
            - (.)
            - '=>'
            - '=<'
        value:
          description: >
            The value to compare against: a scalar, or an array for `in` and
            `not_in`. Take values

            from `POST /person/search/autocomplete`. You write the same values
            as on an index

            watch, and the watch translates them for the live search.
          oneOf:
            - type: string
            - type: number
            - type: boolean
            - type: array
              items:
                oneOf:
                  - type: string
                  - type: number
      example:
        field: experience.employment_details.current.title
        type: (.)
        value: Head of Revenue Operations
    RealtimeConditionCompany:
      type: object
      description: >
        One `realtime_filters` leaf on a `company` watch (`POST
        /watch/company/search`). Operators

        and values per field:


        - `locations.headquarters`: `=` `!=` `in` `not_in`. A headquarters
        string from
          `POST /company/search/autocomplete`, for example `San Francisco, California, United States`.
          The watch resolves it to the live search's place; a value it cannot resolve is a `400`
          (a preview answers `can_create: false`) asking for another autocomplete value or
          `locations.country`. A tree naming both `locations.headquarters` and an included
          `locations.country` is refused: put the country in `narrowing_filters.company`. An
          excluded country (`!=`, `not_in`) beside it is fine.
        - `locations.country`, `taxonomy.professional_network_industry`: `=`
        `!=` `in` `not_in`. A
          country name, an industry name.
        - `basic_info.employee_count_range`: `=` `in`. One of `myself only`,
        `2-10`, `11-50`, `51-200`,
          `201-500`, `501-1000`, `1001-5000`, `5001-10000`, `10001+`.
        - `basic_info.fortune_rank`: `=` `in`. One of `50`, `51-100`, `101-250`,
        `251-500`.
          Realtime only; the index has no such field.
        - `headcount.total`: `=>` `=<`. A bucket edge: `=>` one of `1`, `11`,
        `51`, `201`, `501`,
          `1001`, `5001`, `10001`; `=<` one of `10`, `50`, `200`, `500`, `1000`, `5000`, `10000`.
        - `followers.count`: `=>` `=<`. A bucket edge: `=>` one of `1`, `51`,
        `101`, `1001`,
          `5001`; `=<` one of `50`, `100`, `1000`, `5000`.
        - `headcount.growth_percent.12m`: `=>` `=<`. A percentage.

        - `roles.distribution.<department>`: `=>` `=<`. A headcount in that
        department.

        - `roles.growth_yoy.<department>`: `=>` `=<`. A percentage over a fixed
        12-month window.

        - `revenue.estimated.lower_bound_usd`: `=>` only. USD.

        - `revenue.estimated.upper_bound_usd`: `=<` only. USD.

        - `technographics.technologies.name`: `=` `in`. A technology name.

        - `people.senior_leadership_changed_recently`: `=`. `true` only,
        covering the last three
          months. Realtime only.
        - `funding.*`: any funding field of the company index, with its index
        operators.
          `funding.last_round_type` takes one of `pre_seed`, `seed`, `angel`, `series_a` to
          `series_j`, `series_unknown`, `private_equity`, `debt_financing`, `convertible_note`,
          `grant`, `corporate_round`, `equity_crowdfunding`, `product_crowdfunding`,
          `secondary_market`, `post_ipo_equity`, `post_ipo_debt`, `post_ipo_secondary`,
          `non_equity_assistance`, `initial_coin_offering`, `undisclosed`. For
          example `funding.last_round_type` `in` `["seed", "series_a"]`, or
          `funding.last_fundraise_date` `=>` / `=<` with an ISO date or date math such as
          `now-30d`. No date window is added for you: add one yourself, or a broad watch is
          refused by the realtime size limit.

        A tree naming any `funding.*` field is answered by the company index as
        written, in any

        group shape, and takes `funding.*` fields only. Every other field above
        is refused in such

        a tree. Put a company condition such as location or size in
        `narrowing_filters.company`

        instead. `basic_info.fortune_rank` and
        `people.senior_leadership_changed_recently` have no

        index field, so `narrowing_filters.company` refuses them too. To filter
        on either one, leave

        the `funding.*` fields out: without them, both work as realtime filters
        beside the other

        fields above.
      required:
        - field
        - type
        - value
      properties:
        field:
          type: string
          description: >
            Field name to filter on. In a tree with a `funding.*` field, only
            `funding.*` fields are valid. Valid fields: locations.headquarters,
            locations.country, taxonomy.professional_network_industry,
            basic_info.employee_count_range, basic_info.fortune_rank,
            headcount.total, followers.count, headcount.growth_percent.12m,
            roles.distribution.accounting, roles.distribution.administrative,
            roles.distribution.arts_and_design,
            roles.distribution.business_development,
            roles.distribution.community_and_social_services,
            roles.distribution.consulting, roles.distribution.education,
            roles.distribution.engineering, roles.distribution.entrepreneurship,
            roles.distribution.finance, roles.distribution.healthcare_services,
            roles.distribution.human_resources,
            roles.distribution.information_technology, roles.distribution.legal,
            roles.distribution.marketing,
            roles.distribution.media_and_communication,
            roles.distribution.military_and_protective_services,
            roles.distribution.operations,
            roles.distribution.product_management,
            roles.distribution.program_and_project_management,
            roles.distribution.purchasing, roles.distribution.quality_assurance,
            roles.distribution.real_estate, roles.distribution.research,
            roles.distribution.sales,
            roles.distribution.customer_success_and_support,
            roles.growth_yoy.accounting, roles.growth_yoy.administrative,
            roles.growth_yoy.arts_and_design,
            roles.growth_yoy.business_development,
            roles.growth_yoy.community_and_social_services,
            roles.growth_yoy.consulting, roles.growth_yoy.education,
            roles.growth_yoy.engineering, roles.growth_yoy.entrepreneurship,
            roles.growth_yoy.finance, roles.growth_yoy.healthcare_services,
            roles.growth_yoy.human_resources,
            roles.growth_yoy.information_technology, roles.growth_yoy.legal,
            roles.growth_yoy.marketing,
            roles.growth_yoy.media_and_communication,
            roles.growth_yoy.military_and_protective_services,
            roles.growth_yoy.operations, roles.growth_yoy.product_management,
            roles.growth_yoy.program_and_project_management,
            roles.growth_yoy.purchasing, roles.growth_yoy.quality_assurance,
            roles.growth_yoy.real_estate, roles.growth_yoy.research,
            roles.growth_yoy.sales,
            roles.growth_yoy.customer_success_and_support,
            revenue.estimated.lower_bound_usd,
            revenue.estimated.upper_bound_usd, technographics.technologies.name,
            people.senior_leadership_changed_recently,
            funding.total_investment_usd, funding.last_round_amount_usd,
            funding.last_fundraise_date, funding.last_round_type,
            funding.investors, funding.tracxn_investors
          example: locations.headquarters
        type:
          type: string
          description: >
            Filter operator. Each field takes only the operators listed for it
            above. The

            remaining index operators (`<`, `>`, `is_null`, `is_not_null`,
            `(.)`, `[.]`) work

            only in a tree with a `funding.*` field.
          enum:
            - '='
            - '!='
            - in
            - not_in
            - '=>'
            - '=<'
            - <
            - '>'
            - is_null
            - is_not_null
            - (.)
            - '[.]'
        value:
          description: >
            The value to compare against: a scalar, or an array for `in` and
            `not_in`. Take values

            from `POST /company/search/autocomplete`. You write the same values
            as on an index

            watch, and the watch translates them for the live search. The
            realtime-only closed

            sets are listed as their own options.
          anyOf:
            - type: string
              description: '`basic_info.fortune_rank`, realtime only.'
              enum:
                - '50'
                - 51-100
                - 101-250
                - 251-500
            - type: array
              description: '`basic_info.fortune_rank` with `in`, realtime only.'
              items:
                type: string
                enum:
                  - '50'
                  - 51-100
                  - 101-250
                  - 251-500
            - type: integer
              description: '`headcount.total` with `=>`.'
              enum:
                - 1
                - 11
                - 51
                - 201
                - 501
                - 1001
                - 5001
                - 10001
            - type: integer
              description: '`headcount.total` with `=<`.'
              enum:
                - 10
                - 50
                - 200
                - 500
                - 1000
                - 5000
                - 10000
            - type: integer
              description: '`followers.count` with `=>`.'
              enum:
                - 1
                - 51
                - 101
                - 1001
                - 5001
            - type: integer
              description: '`followers.count` with `=<`.'
              enum:
                - 50
                - 100
                - 1000
                - 5000
            - type: string
              nullable: true
            - type: number
            - type: boolean
            - type: array
              items:
                oneOf:
                  - type: string
                  - type: number
      example:
        field: locations.headquarters
        type: in
        value:
          - San Francisco, California, United States
    RealtimeConditionJob:
      type: object
      description: >
        One `realtime_filters` leaf on a `job` watch (`POST /watch/job/search`).
        Operators and

        values per field:


        - `job_details.title`, `content.description`: `=` `(.)`. Free text, the
        watch's keyword.
          `=` matches exactly, `(.)` loosely. A multi-word value is quoted for you.
        - `job_details.workplace_type`: `=` `in`. `On-site`, `Remote`, or
        `Hybrid`. Any other
          value is refused with `400`, and the message lists these three.
        - `job_details.employment_type`: `=` `in`. `full_time`, `part_time`,
        `contract`,
          `temporary`, `intern`, `volunteer`, or `other`. Any other value is refused with `400`.
        - `location.country`, `location.state`, `location.city`: `=` `in`. A
        bare city or state is
          enough; a country or state beside it places the name more precisely. A place the watch
          cannot resolve is refused with `400`; try another value from Job Autocomplete, or add
          the country.
        - `company.basic_info.industries`: `=` `in`. An industry name.

        - `company.basic_info.name`: `=` `in`. An employer name, resolved
        against the company
          index. Every company of that name is followed. A name the index does not hold is
          refused with `400`, and one condition may name at most 300 companies.
        - `company.basic_info.professional_network_id`: `=` `in`. The employer's
        professional
          network id, as a string. Sent as given, with no lookup.
      required:
        - field
        - type
        - value
      properties:
        field:
          type: string
          description: >
            Field name to filter on. Valid fields: job_details.title,
            content.description, job_details.workplace_type,
            job_details.employment_type, location.country, location.state,
            location.city, company.basic_info.industries,
            company.basic_info.name, company.basic_info.professional_network_id
          example: job_details.title
        type:
          type: string
          description: >-
            Filter operator. Each field takes only the operators listed for it
            above.
          enum:
            - '='
            - in
            - (.)
        value:
          description: >
            The value to compare against: a string, or an array for `in`. Take
            values from

            `POST /job/search/autocomplete`. You write the same values as on an
            index watch, and

            the watch translates them for the live search.
          oneOf:
            - type: string
            - type: array
              items:
                type: string
      example:
        field: job_details.title
        type: (.)
        value: machine learning engineer
    RealtimeConditionSocialPost:
      type: object
      description: >
        One `realtime_filters` leaf on a `social_post` watch (`POST
        /watch/social_post/search`).

        Operators and values per field:


        - `text`: `=` `(.)`. Free text, the watch's keyword and the search's
        main input. A
          multi-word value is quoted for you. One phrase per value: for several phrases, use an
          `or` group of `text` conditions, which the watch joins into one search.
        - `date_posted`: `=>` only. One of the live search's windows: `now-24h`,
        `now-7d`,
          `now-1M`, `now-3M`, `now-1y`.
        - `actor.industry`: `=` `in`. An industry name, as `POST
        /social_post/search` takes it.

        - `actor.actor_type`: `=` `!=` `in` `not_in`. `person` or `company`.

        - `actor.company_url`: `=` `!=` `in` `not_in`. A company profile URL.

        - `classification.category`: `=` `!=` `in` `not_in`. Your own category
        names; each post
          is sorted into one of them.
        - `classification.intent`: `=` `!=`. One sentence describing what the
        post should be about.


        The last four are checked on each post the search returns, not sent to
        the search.
      required:
        - field
        - type
        - value
      properties:
        field:
          type: string
          description: >
            Field name to filter on. Valid fields: text, date_posted,
            actor.industry, actor.actor_type, actor.company_url,
            classification.category, classification.intent
          example: text
        type:
          type: string
          description: >-
            Filter operator. Each field takes only the operators listed for it
            above.
          enum:
            - '='
            - '!='
            - in
            - not_in
            - (.)
            - '=>'
        value:
          description: >
            The value to compare against: a string, or an array for `in` and
            `not_in`. You write

            the same values as on an index watch.
          anyOf:
            - type: string
              description: '`date_posted` with `=>`, realtime only.'
              enum:
                - now-24h
                - now-7d
                - now-1M
                - now-3M
                - now-1y
            - type: string
            - type: array
              items:
                type: string
      example:
        field: text
        type: (.)
        value: we are hiring
    RealtimeConditionGroup:
      type: object
      description: >
        The shape of a `realtime_filters` tree. The live search is an AND of
        filters, with OR only

        between values of one filter, so the tree is either one bare leaf or:


        - A top-level `and` group of leaves.

        - Inside it, an `or` group only when every leaf names the **same field**
        with an include
          operator (`=`, `in`, `(.)`). It works as a value list.
        - No nested `and` groups.

        - No `sorts` on a realtime watch. A live search has no stable order.


        Keyword fields (person `basic_profile.headline` and
        `basic_profile.summary`, job

        `job_details.title` and `content.description`, post `text`) feed the
        live search's one

        free-text keyword. Several of them, in `and` or `or` groups, fold into
        one boolean

        expression.


        A `company` tree that names any `funding.*` field is the exception. The
        company index

        answers that whole tree as written, so it takes the full index grammar:
        nested `and` and

        `or` groups and every index operator. It names `funding.*` fields only.
        Put any other

        company condition, such as location or size, in
        `narrowing_filters.company`. A tree that

        mixes them is refused. `basic_info.fortune_rank` and

        `people.senior_leadership_changed_recently` exist only in the live
        search, so a funding

        watch cannot filter on them. Leave the `funding.*` fields out to use
        either one.
      required:
        - op
        - conditions
      properties:
        op:
          type: string
          enum:
            - and
            - or
          description: '`and` at the top level. `or` only as a value list of one field.'
          example: and
        conditions:
          type: array
          minItems: 1
          description: >-
            Leaves of the path's dataset, or an `or` group of one field's
            values.
          items:
            anyOf:
              - $ref: '#/components/schemas/RealtimeConditionPerson'
              - $ref: '#/components/schemas/RealtimeConditionCompany'
              - $ref: '#/components/schemas/RealtimeConditionJob'
              - $ref: '#/components/schemas/RealtimeConditionSocialPost'
              - $ref: '#/components/schemas/RealtimeConditionGroup'
    SortSpec:
      type: object
      description: >-
        One sort key. Only indexed, sortable fields of the dataset may be sorted
        on; anything else returns `400` at create time.
      required:
        - field
        - order
      properties:
        field:
          type: string
          description: Dot-path of the field to sort by.
          example: metadata.date_added
        order:
          type: string
          enum:
            - asc
            - desc
          description: Sort direction.
          example: desc
    DiscoveryWatchConfig:
      type: object
      description: Schedule and per-run caps for a discovery watch.
      required:
        - trigger
      properties:
        trigger:
          $ref: '#/components/schemas/WatchTrigger'
        is_realtime:
          type: boolean
          default: false
          description: >
            Run each search against a live search rather than the Crustdata
            index, so the watch

            finds records as they appear on the web. Requires
            `realtime_filters`, and puts the

            watch on the 1-day SLA.


            Four things change when this is `true`. `filters` is refused, and

            `narrowing_filters` is what narrows the watch instead.
            `trigger.every_hours` must be

            `24` or more, because a live run retrieves from the web and is
            billed per new

            record.

            On `person` and `company`, `realtime_filters` may not match more
            than 10,000

            records, counted on that tree alone: those live searches report a
            total, so a

            broad watch is refused at creation. The `job` and `social_post`
            searches page

            through results instead of counting them, so no total exists to
            check and a broad

            watch is accepted.

            And delivery costs 150 credits per new record on every dataset, the
            1-day SLA rate,

            rather than the 0.5 or 2 a 30-day SLA watch pays.


            Immutable, like `realtime_filters` and `narrowing_filters`: all
            three define the

            watch rather than schedule it, so a `PATCH` carrying any of them is
            refused and you

            create a new watch instead. A create, `GET`, or `PATCH` response
            echoes it back,

            alongside a `refresh_frequency_days` reporting the SLA the watch
            bills at: `1` when

            realtime, `30` otherwise.


            This flag is the only thing that picks how a discovery watch reads.
            Sending

            `config.refresh_frequency_days` on a discovery watch is refused
            whatever its value.
          example: true
        max_results_per_run:
          type: integer
          minimum: 1
          maximum: 10000
          default: 25
          description: >
            Most records to deliver in one run. The first, baseline run is
            always capped at 5

            regardless of this value.


            A value above 1000 requires `config.payload_delivery_type` of
            `link`. Inline delivery

            posts its chunks one after another, so it stops at 1000 records per
            run, while a link

            run is always one request. The rule reads both keys together and
            applies on create and

            on PATCH, so a PATCH is checked against the watch as it will be:
            raising the cap on a

            link watch is accepted, raising it alone on an inline watch is not,
            and switching a

            watch that already carries a cap above 1000 back to inline is
            refused.
          example: 25
        preferred_hour:
          type: integer
          minimum: 0
          maximum: 23
          nullable: true
          description: Hour of day, in UTC, to prefer for the run.
          example: 9
        expires_at:
          type: string
          format: date
          nullable: true
          description: Auto-expire date, `YYYY-MM-DD`. The watch stops running after it.
          example: '2027-01-01'
        payload_delivery_type:
          type: string
          enum:
            - inline
            - link
          default: inline
          description: >
            Where the run's records travel. `inline` puts them in the
            notification body under

            `results`, split across several requests when a run is large. `link`
            leaves the body

            carrying no records at all and adds `metadata.payload_delivery`, a
            pre-signed S3 URL

            for one NDJSON file holding every record of the run.


            `link` is required when `config.max_results_per_run` is above 1000,
            because inline

            delivery stops at 1000 records per run.


            Switch to `link` when a run can exceed what your receiver accepts:
            an AWS Lambda proxy

            integration caps a request at 6 MB and an ALB target at 1 MB, and an
            oversize body is

            refused whole. `inline` is never overridden by size, so a large run
            stays inline and

            is split instead.


            Mutable. Changing it leaves the watch's filters, tracked fields, and
            sort order

            untouched, but a `config` PATCH is validated whole, so send the
            current `trigger`

            alongside it. A create, `GET`, or `PATCH` response echoes the stored
            value under

            `config.payload_delivery_type`, but that is the watch's setting
            rather than what a

            given run did: read `metadata.payload_delivery.type` on a
            notification, or

            `payload_delivery.type` on a run summary, to see which mode a run
            actually used, since

            a `link` watch falls back to `inline` when the file cannot be
            written.
          example: link
    NotificationChannel:
      description: >-
        One delivery channel. Every channel on a watch receives every
        notification.
      oneOf:
        - $ref: '#/components/schemas/WebhookChannel'
        - $ref: '#/components/schemas/SlackChannel'
        - $ref: '#/components/schemas/GoogleChatChannel'
        - $ref: '#/components/schemas/EmailChannel'
      discriminator:
        propertyName: type
        mapping:
          webhook: '#/components/schemas/WebhookChannel'
          slack: '#/components/schemas/SlackChannel'
          google_chat: '#/components/schemas/GoogleChatChannel'
          email: '#/components/schemas/EmailChannel'
    WatchPreviewCredits:
      type: object
      description: What this watch will be charged, at the settings it was asked about.
      properties:
        per_notification:
          type: number
          description: >
            Credits per delivered record (discovery) or per change found
            (entity), at the tier this

            body describes. Read it before arming: on a discovery watch the tier
            is fixed at creation,

            so this is the rate for the life of the watch.
          example: 0.5
    WatchTrigger:
      type: object
      description: How often the watch runs. Interval is the only trigger type today.
      required:
        - type
        - every_hours
      properties:
        type:
          type: string
          enum:
            - interval
          description: Trigger type.
          example: interval
        every_hours:
          type: integer
          minimum: 1
          description: Hours between runs, for example `1`, `6`, `24`, or `168`.
          example: 24
    WebhookChannel:
      type: object
      description: >-
        An HTTPS endpoint you control. Deliveries are signed, and a URL that
        resolves to a private, loopback, or link-local address is rejected.
      required:
        - type
        - url
      properties:
        type:
          type: string
          enum:
            - webhook
          example: webhook
        url:
          type: string
          format: uri
          description: Public `http(s)` URL to POST each notification to.
          example: https://your-app.com/webhooks/crustdata
        headers:
          type: object
          additionalProperties:
            type: string
          description: >-
            Extra headers to send with each delivery, for routing or
            authentication on your side.
          example:
            X-Watch-Name: ml-engineers-paris
    SlackChannel:
      type: object
      description: >-
        A Slack incoming webhook. The URL must be a genuine
        `https://hooks.slack.com/services/...` webhook; any other URL fails
        delivery.
      required:
        - type
        - webhook_url
      properties:
        type:
          type: string
          enum:
            - slack
          example: slack
        webhook_url:
          type: string
          format: uri
          example: https://hooks.slack.com/services/T000/B000/XXXX
    GoogleChatChannel:
      type: object
      description: A Google Chat incoming webhook.
      required:
        - type
        - url
      properties:
        type:
          type: string
          enum:
            - google_chat
          example: google_chat
        url:
          type: string
          format: uri
          example: https://chat.googleapis.com/v1/spaces/AAAA/messages?key=...
    EmailChannel:
      type: object
      description: One or more email recipients.
      required:
        - type
        - to
      properties:
        type:
          type: string
          enum:
            - email
          example: email
        to:
          type: array
          minItems: 1
          items:
            type: string
            format: email
          description: Recipient addresses.
          example:
            - you@company.com
  responses:
    Unauthorized:
      description: >
        The API key is missing or not valid. Both failures answer with the same
        body, so the

        response does not tell you which of the two happened.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/WatcherErrorResponse'
          example:
            error:
              type: unauthorized
              message: Invalid API key in request.
              metadata: []
    RateLimited:
      description: >
        Too many watch requests. The per-endpoint limit is 10 requests per
        minute per API key, which is

        what bounds bursty create and update loops. Steady use is unaffected.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/WatcherErrorResponse'
          example:
            error:
              type: rate_limit_error
              message: >-
                Rate limit exceeded for this endpoint. Please write to
                gtm@crustdata.co.
              metadata: []
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: API key passed as a Bearer token in the Authorization header.

````

## Related topics

- [Cross-dataset filters](https://docs.crustdata.com/watcher-docs/cross-dataset-filters.md)
- [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md)
- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
- [Update a discovery watch](https://docs.crustdata.com/api-reference/watch-apis/pause-resume-or-reconfigure-a-discovery-watch.md)
- [Create an entity watch](https://docs.crustdata.com/api-reference/watch-apis/create-an-entity-watch.md)
