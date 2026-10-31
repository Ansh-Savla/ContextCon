> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Account credit balance

> Returns the account's remaining credit balance together with the
recurring credit grant: the grant size, how often it refreshes, and the
next refresh date.

Accounts with credit wallets enabled also receive a `wallets` list —
the recurring wallet (refreshed each cycle, spent first) and the top-up
wallet (purchased credits that roll over until their expiry date). The
key is absent for accounts without wallets. Always gate spending
decisions on `account.credits`; `wallets` is informational.

Accounts with live top-ups additionally receive a `credit_topups`
list — one entry per top-up still holding credits, with its origin
(`purchase`, `auto_topup`, or `granted`), original and remaining
credits, and expiry date, sorted soonest expiry first. The key is
absent otherwise.

This endpoint is free and consumes no credits. It is rate limited to
300 requests per minute. It requires the `x-api-version: 2025-11-01`
header — requests without it return `400`.




## OpenAPI

````yaml /openapi-specs/2025-11-01/account.yaml get /account/credits
openapi: 3.0.3
info:
  title: Account API
  version: '2025-11-01'
  description: >
    The Account API provides free, API-key-authenticated introspection endpoints
    for your Crustdata account.


    - **Endpoints**: List every Crustdata API endpoint with your account's
    access status, enabled and disabled response fields, and effective rate
    limits.

    - **Credits**: Check your remaining credit balance and recurring credit
    grant details.

    - **Usage**: See what your team spent credits on, request by request or
    summed by day, product, endpoint, or charge component, and which requests
    failed.


    Every endpoint here is a plain `GET` request that consumes **no credits**.
    The Bearer API key identifies the account, so no account or user ID is
    passed in the path. Send the `x-api-version: 2025-11-01` header;
    `/account/endpoints` and `/account/credits` return `400` without it.


    One thing to know before you call `/account/endpoints`: unfiltered it
    returns every endpoint with every field permission, which is around 89 KB of
    JSON on a single line. Pass `?path=/web/enrich/live` first to see the
    response shape in five lines, then widen with `category` or `status`.
servers:
  - url: https://api.crustdata.com
    description: Production API server
security:
  - bearerAuth: []
tags:
  - name: Account APIs
    description: >-
      Account-level introspection: endpoint permissions, rate limits, credit
      balance, and usage
paths:
  /account/credits:
    get:
      tags:
        - Account APIs
      summary: Get account credit balance
      description: |
        Returns the account's remaining credit balance together with the
        recurring credit grant: the grant size, how often it refreshes, and the
        next refresh date.

        Accounts with credit wallets enabled also receive a `wallets` list —
        the recurring wallet (refreshed each cycle, spent first) and the top-up
        wallet (purchased credits that roll over until their expiry date). The
        key is absent for accounts without wallets. Always gate spending
        decisions on `account.credits`; `wallets` is informational.

        Accounts with live top-ups additionally receive a `credit_topups`
        list — one entry per top-up still holding credits, with its origin
        (`purchase`, `auto_topup`, or `granted`), original and remaining
        credits, and expiry date, sorted soonest expiry first. The key is
        absent otherwise.

        This endpoint is free and consumes no credits. It is rate limited to
        300 requests per minute. It requires the `x-api-version: 2025-11-01`
        header — requests without it return `400`.
      operationId: getAccountCredits
      parameters:
        - $ref: '#/components/parameters/ApiVersionHeader'
      responses:
        '200':
          description: |
            Credit balance and recurring-grant details for the account.

            The response is small and fixed: a single `account` object with four
            keys, plus `wallets` and `credit_topups` on accounts that have
            credit wallets enabled. The three examples cover every shape you
            can get back.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AccountCreditsResponse'
              examples:
                no_recurring_grant:
                  summary: Account with no recurring grant
                  description: |
                    An account topped up directly rather than on a cycle.
                    `recurring_credits` is `0` and both recurring-grant
                    fields are `null`. Treat `credits` as the only balance
                    that matters.
                  value:
                    account:
                      credits: 964501.02
                      recurring_credits: 0
                      recurring_credits_frequency: null
                      recurring_credits_refresh_date: null
                standard_account:
                  summary: Account with a monthly recurring grant, no wallets
                  description: |
                    The common shape. `recurring_credits` credits land on
                    `recurring_credits_refresh_date` and the cycle repeats
                    at `recurring_credits_frequency`. No `wallets` key.
                  value:
                    account:
                      credits: 3915552.99
                      recurring_credits: 1000000
                      recurring_credits_frequency: monthly
                      recurring_credits_refresh_date: '2026-08-06T00:00:00+00:00'
                wallet_enabled_account:
                  summary: Account with credit wallets enabled
                  description: |
                    Only accounts with wallets enabled get the `wallets`
                    key. Spending draws the recurring wallet first, then
                    the top-up wallet. Gate spending decisions on
                    `account.credits`, not on the wallet rows.
                  value:
                    account:
                      credits: 128179.25
                      recurring_credits: 1000
                      recurring_credits_frequency: monthly
                      recurring_credits_refresh_date: '2026-08-13T00:00:00+00:00'
                      wallets:
                        - type: recurring
                          credits: 850
                          next_refresh_date: '2026-08-13T00:00:00+00:00'
                          expires_at: null
                        - type: topup
                          credits: 127329.25
                          next_refresh_date: null
                          expires_at: '2027-07-31T23:59:59Z'
                      credit_topups:
                        - type: granted
                          granted_credits: 2000
                          remaining_credits: 2000
                          granted_at: '2026-08-13T00:00:00+00:00'
                          expires_at: '2026-11-13T00:00:00+00:00'
                        - type: purchase
                          granted_credits: 130000
                          remaining_credits: 125329.25
                          granted_at: '2026-07-31T23:59:59Z'
                          expires_at: '2027-07-31T23:59:59Z'
        '400':
          description: Invalid request — missing or unsupported `x-api-version` header.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StructuredErrorResponse'
              examples:
                missing_api_version_header:
                  summary: No x-api-version header
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Missing required header: x-api-version. Please set
                        x-api-version header appropriately.
                      metadata: []
                unsupported_api_version:
                  summary: Unsupported x-api-version value
                  value:
                    error:
                      type: invalid_request
                      message: >-
                        Account credits requires API version 2025-11-01. Current
                        version: 2024-01-01. Please set x-api-version header
                        appropriately.
                      metadata: []
        '401':
          description: >-
            Unauthorized. The API key is missing from the request or is not
            valid.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthErrorResponse'
              examples:
                invalid_api_key:
                  summary: Bearer token present but not a valid key
                  value:
                    message: Invalid API key in request
                missing_api_key:
                  summary: No Authorization header at all
                  value:
                    message: Missing API key in request
        '404':
          description: No account record found for the authenticated user.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimpleErrorResponse'
              example:
                error: User not found
        '500':
          description: Internal server error while fetching the credit balance.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimpleErrorResponse'
              example:
                error: Failed to fetch credits
components:
  parameters:
    ApiVersionHeader:
      name: x-api-version
      in: header
      required: true
      description: >-
        API version to use. This endpoint currently requires `2025-11-01`.
        Requests without the header, or with any other value, return `400`.
      schema:
        type: string
        enum:
          - '2025-11-01'
        default: '2025-11-01'
        example: '2025-11-01'
  schemas:
    AccountCreditsResponse:
      type: object
      description: >-
        Wrapper object for the account credit summary. The balance always sits
        under the `account` key, never at the top level.
      required:
        - account
      example:
        account:
          credits: 964501.02
          recurring_credits: 0
          recurring_credits_frequency: null
          recurring_credits_refresh_date: null
      properties:
        account:
          $ref: '#/components/schemas/AccountCredits'
    StructuredErrorResponse:
      type: object
      description: >
        Structured error payload. `/account/endpoints` and `/account/credits`
        use it

        for a missing or unsupported `x-api-version` header, and the

        `/account/usage/*` endpoints use it for every error. The `status` filter

        error on `/account/endpoints` uses the flatter `SimpleErrorResponse`
        shape

        instead, so parse defensively.
      required:
        - error
      example:
        error:
          type: invalid_request
          message: >-
            Missing required header: x-api-version. Please set x-api-version
            header appropriately.
          metadata: []
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
              description: Machine-readable error type identifier.
              example: invalid_request
            message:
              type: string
              description: Human-readable description of what went wrong.
              example: >-
                Missing required header: x-api-version. Please set x-api-version
                header appropriately.
            metadata:
              type: array
              description: >-
                Additional structured context for the error. Empty for
                header-validation failures.
              items:
                type: object
                description: Context entry for the error.
              example: []
    AuthErrorResponse:
      type: object
      description: >
        Authentication error payload. The message distinguishes the two
        failures:

        `Missing API key in request` when no `Authorization` header was sent,
        and

        `Invalid API key in request` when the Bearer token is not a valid key.
      required:
        - message
      example:
        message: Invalid API key in request
      properties:
        message:
          type: string
          description: Human-readable authentication error message.
          example: Invalid API key in request
    SimpleErrorResponse:
      type: object
      description: >-
        Error payload with a single human-readable message. Used for the
        `status` filter error and for the `404` and `500` responses.
      required:
        - error
      example:
        error: Invalid status 'bogus'; expected one of ['enabled', 'disabled']
      properties:
        error:
          type: string
          description: Human-readable description of what went wrong.
          example: Invalid status 'bogus'; expected one of ['enabled', 'disabled']
    AccountCredits:
      type: object
      description: Credit balance and recurring-grant details for the account.
      required:
        - credits
        - recurring_credits
        - recurring_credits_frequency
        - recurring_credits_refresh_date
      properties:
        credits:
          type: number
          description: >-
            Credits currently remaining on the account. Fractional, and the only
            number to gate spending decisions on.
          example: 964501.02
        recurring_credits:
          type: integer
          description: >-
            Number of credits granted each billing cycle. `0` on accounts that
            are topped up directly instead of on a cycle.
          example: 1000000
        recurring_credits_frequency:
          type: string
          nullable: true
          description: >-
            How often the recurring grant refreshes, for example `monthly`.
            `null` when no recurring grant is configured.
          example: monthly
        recurring_credits_refresh_date:
          type: string
          nullable: true
          description: >-
            ISO 8601 timestamp of the next recurring grant refresh. `null` when
            no recurring grant is configured.
          example: '2026-08-06T00:00:00+00:00'
        wallets:
          type: array
          description: |
            Per-wallet credit breakdown, present only for accounts with credit
            wallets enabled (the key is absent otherwise). Usage draws the
            recurring wallet first, then the top-up wallet. Informational —
            gate spending decisions on `credits`; during brief settlement
            windows the wallet rows may not sum exactly to it.
          items:
            $ref: '#/components/schemas/AccountWallet'
        credit_topups:
          type: array
          description: |
            One entry per top-up still holding credits, sorted soonest expiry
            first. Present only when the account has live top-ups (the key is
            absent otherwise). Informational — gate spending decisions on
            `credits`.
          items:
            $ref: '#/components/schemas/AccountCreditTopup'
    AccountWallet:
      type: object
      description: One credit wallet in the account's balance breakdown.
      required:
        - type
        - credits
        - next_refresh_date
        - expires_at
      properties:
        type:
          type: string
          enum:
            - recurring
            - topup
          description: >-
            Wallet kind — `recurring` refreshes each billing cycle and is spent
            first; `topup` holds purchased credits that roll over.
          example: recurring
        credits:
          type: number
          description: Credits currently attributed to this wallet. May be fractional.
          example: 850
        next_refresh_date:
          type: string
          nullable: true
          description: >-
            ISO 8601 timestamp of the wallet's next refresh. Set only on the
            `recurring` wallet; `null` otherwise.
          example: '2026-08-13T00:00:00+00:00'
        expires_at:
          type: string
          nullable: true
          description: >-
            ISO 8601 timestamp when the wallet's credits expire. Set only on the
            `topup` wallet (new purchases extend it); `null` otherwise.
          example: '2027-07-31T23:59:59Z'
    AccountCreditTopup:
      type: object
      description: One top-up still holding credits in the account's top-up wallet.
      required:
        - type
        - granted_credits
        - remaining_credits
        - granted_at
        - expires_at
      properties:
        type:
          type: string
          enum:
            - purchase
            - auto_topup
            - granted
          description: >-
            How the top-up entered the account — a one-time `purchase`, an
            `auto_topup` reload, or credits `granted` by Crustdata.
          example: purchase
        granted_credits:
          type: number
          description: Credits this top-up originally added.
          example: 130000
        remaining_credits:
          type: number
          description: Credits from this top-up still unspent. May be fractional.
          example: 125329.25
        granted_at:
          type: string
          description: ISO 8601 timestamp the top-up was added.
          example: '2026-07-31T23:59:59Z'
        expires_at:
          type: string
          nullable: true
          description: >-
            ISO 8601 timestamp when this top-up's unspent credits expire. `null`
            for top-ups without an expiry.
          example: '2027-07-31T23:59:59Z'
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: API key passed as a Bearer token in the Authorization header.

````

## Related topics

- [Credits](https://docs.crustdata.com/general/credits.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
- [Codex plugin](https://docs.crustdata.com/integrations/codex.md)
- [Claude Code plugin](https://docs.crustdata.com/integrations/claude-plugin.md)
- [Permissions](https://docs.crustdata.com/general/permissions.md)
