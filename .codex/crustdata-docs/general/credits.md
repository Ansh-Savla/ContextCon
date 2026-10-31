> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Credits

> Check your remaining Crustdata API credit balance and recurring credit grant with a single free GET request.

Use this endpoint to check your remaining API credit balance and your
recurring credit grant: how many credits you receive each cycle, how often,
and when the next refresh lands. For what each endpoint costs *you* — your
account's own per-endpoint prices — call
[`/account/endpoints`](https://docs.crustdata.com/general/permissions#how-to-read-the-prices). Poll it to
monitor usage and confirm you have enough credits before a large batch of
requests. You can also view credits and usage in your
[dashboard](https://app.crustdata.com/), or read your usage request by request
with the [usage endpoints](https://docs.crustdata.com/general/usage.md).

Every new self-serve account gets free credits.

> [!NOTE]
>
> This endpoint is **free** — checking your balance does not consume any
> credits. For how credits are charged per endpoint, see [Pricing](https://docs.crustdata.com/general/pricing.md).

## Endpoint

```
GET https://api.crustdata.com/account/credits
```

It takes no query parameters or request body. Authenticate with your API key
in the `Authorization` header and send the required
`x-api-version: 2025-11-01` header — requests without it return `400`. Rate
limited to 300 requests per minute.

## Example request

```bash Request theme={"theme":"vitesse-black"}
curl --request GET \
  --url https://api.crustdata.com/account/credits \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'x-api-version: 2025-11-01'
```

```python Python theme={"theme":"vitesse-black"}
import requests

resp = requests.get(
    "https://api.crustdata.com/account/credits",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "x-api-version": "2025-11-01",
    },
)
print(resp.json()["account"]["credits"])
```

```json Response theme={"theme":"vitesse-black"}
{
  "account": {
    "credits": 9406.5,
    "recurring_credits": 10000,
    "recurring_credits_frequency": "monthly",
    "recurring_credits_refresh_date": "2026-08-01T00:00:00+00:00"
  }
}
```

## Response fields

| Field | Type | Description |
| - | - | - |
| `account.credits` | number | Remaining API credits on your account — the shared pool all your API keys draw from. May be fractional. |
| `account.recurring_credits` | number | Credits granted each billing cycle. `0` if your plan has no recurring grant. |
| `account.recurring_credits_frequency` | string \| null | Grant cadence (for example `monthly`). `null` if no recurring grant. |
| `account.recurring_credits_refresh_date` | string \| null | ISO timestamp of the next grant refresh. `null` if no recurring grant. |
| `account.wallets` | array | Per-wallet breakdown — only present when your account has credit wallets enabled. See below. |
| `account.credit_topups` | array | One entry per top-up still holding credits — only present when your account has live top-ups. See below. |

## Credit wallets

Accounts with credit wallets enabled hold their balance in two wallets, and the
response includes a `wallets` list breaking the balance down:

* **`recurring`** — your plan's cycle grant. Refreshes on `next_refresh_date`
  and is spent first.
* **`topup`** — credits you purchase. They roll over month to month; each
  purchase expires individually (see below), and `expires_at` shows the latest
  expiry across them.

### Credit expiry

* Purchased credits — self-serve purchases and automatic top-ups — expire
  **12 months after the purchase that added them**.
* Credits granted by your account manager may carry a custom expiry date;
  each grant keeps its own.
* Only **unused** credits are removed at expiry. Usage always draws from the
  earliest-expiring credits first, so nothing you have already spent is ever
  affected, and later batches keep their full term.

```json Response (wallets enabled) theme={"theme":"vitesse-black"}
{
  "account": {
    "credits": 128179.25,
    "recurring_credits": 1000,
    "recurring_credits_frequency": "monthly",
    "recurring_credits_refresh_date": "2026-08-13T00:00:00+00:00",
    "wallets": [
      {
        "type": "recurring",
        "credits": 850.0,
        "next_refresh_date": "2026-08-13T00:00:00+00:00",
        "expires_at": null
      },
      {
        "type": "topup",
        "credits": 127329.25,
        "next_refresh_date": null,
        "expires_at": "2027-07-31T23:59:59Z"
      }
    ]
  }
}
```

| Field | Type | Description |
| - | - | - |
| `wallets[].type` | string | `recurring` or `topup`. |
| `wallets[].credits` | number | Credits currently attributed to this wallet. May be fractional. |
| `wallets[].next_refresh_date` | string \| null | Next refresh of the recurring wallet. `null` on the top-up wallet. |
| `wallets[].expires_at` | string \| null | When the top-up wallet's credits expire. `null` on the recurring wallet. |

> [!NOTE]
>
> Gate spending decisions on `account.credits` — it is the balance that controls
> API access. `wallets` is informational: during brief settlement windows the
> wallet rows may not sum exactly to `account.credits`. If your account does not
> have credit wallets, the `wallets` key is absent and the response is unchanged.

## Top-up breakdown

Accounts with live top-ups also receive a `credit_topups` list — one entry per
top-up still holding credits, sorted soonest expiry first. Use it to see how
much of each top-up remains and when it expires.

```json Response excerpt (live top-ups) theme={"theme":"vitesse-black"}
{
  "account": {
    "credit_topups": [
      {
        "type": "granted",
        "granted_credits": 2000.0,
        "remaining_credits": 2000.0,
        "granted_at": "2026-08-13T00:00:00+00:00",
        "expires_at": "2026-11-13T00:00:00+00:00"
      },
      {
        "type": "purchase",
        "granted_credits": 130000.0,
        "remaining_credits": 125329.25,
        "granted_at": "2026-07-31T23:59:59Z",
        "expires_at": "2027-07-31T23:59:59Z"
      }
    ]
  }
}
```

| Field | Type | Description |
| - | - | - |
| `credit_topups[].type` | string | How the top-up entered your account: `purchase` (one-time purchase), `auto_topup` (automatic reload), or `granted` (added by Crustdata). |
| `credit_topups[].granted_credits` | number | Credits this top-up originally added. |
| `credit_topups[].remaining_credits` | number | Credits from this top-up still unspent. May be fractional. |
| `credit_topups[].granted_at` | string | ISO timestamp the top-up was added. |
| `credit_topups[].expires_at` | string \| null | When this top-up's unspent credits expire. `null` for top-ups without an expiry. |

> [!NOTE]
>
> Credits expiring soonest are always spent first, so the first entry shrinks
> before the others. `credit_topups` is informational like `wallets` — the key
> is absent when your account has no live top-ups, and the rest of the response
> is unchanged.

## Errors

| Status | Body | Cause |
| - | - | - |
| `401` | `{ "message": "Missing API key in request" }` | No `Authorization` header. |
| `401` | `{ "message": "Invalid API key in request" }` | `Authorization` header carries an invalid key. |
| `400` | `{ "error": { "type": "invalid_request", "message": "Missing required header: x-api-version. ..." } }` | No `x-api-version` header. |
| `429` | — | More than 300 requests per minute. |

## Per-call usage: the `X-Credits-Used` header

Every response from the data API endpoints — search, enrich, identify,
autocomplete, web, and batch — includes an `X-Credits-Used` header reporting
the exact credits that request deducted:

```bash Request theme={"theme":"vitesse-black"}
curl -i --request POST \
  --url https://api.crustdata.com/person/search \
  --header 'authorization: Bearer YOUR_API_KEY' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-11-01' \
  --data '{"filters": {"field": "basic_profile.name", "type": "(.)", "value": "Jane"}, "limit": 1}'
```

```http Response headers theme={"theme":"vitesse-black"}
HTTP/2 200
x-credits-used: 0.03
```

The value is an exact decimal (for example `3`, `0.09`). Endpoints that don't
consume credits report `0`, and the header also appears on error responses, so
you can log it on every call.

When reconciling header values against your balance:

* Balance deduction rounds a fractional cost up to the next whole credit, so
  header values summed across requests can be slightly less than your balance
  change.
* Asynchronous work is billed when the job runs, not at submission: batch job
  submissions and background-job searches report `0`.
* Responses generated before a request reaches the API — for example a `429`
  from rate limiting — do not carry the header.
* The free `/account/usage/*` endpoints do not carry the header at all.

To see what a charge was made of, pass the response's `X-Request-Id` to
[`GET /account/usage/events/{request_id}`](https://docs.crustdata.com/general/usage#events). Its
`cost_components` lines add up to the `X-Credits-Used` value.

## Auto top-up

Auto top-up automatically buys more credits when your balance runs low, so your
requests keep working instead of failing at zero. You set it up in your
dashboard.

The dashboard's Credits page sells credits two ways. Both use the same credit
packages and the same pricing. The difference is who starts the purchase.

| | One-time purchase | Auto top-up |
| - | - | - |
| Who buys | You, each time | Crustdata, automatically |
| When | Whenever you choose | When your balance drops below a threshold you set |
| How much | Any package you pick at checkout | The reload amount you configured, the same each time |
| Card | Checkout through Stripe | The saved card you authorized for automatic charges |
| Turning off | Nothing to turn off | One click on the Credits page, any time |

> [!NOTE]
>
> Auto top-up is configured in your [dashboard](https://app.crustdata.com/)

### Turn it on

**1. Open the Credits page**

Go to the **Credits** page in your [dashboard](https://app.crustdata.com/).

**2. Turn on Auto top-up**

Under **Auto top-up**, click **Turn on**.

**3. Add a card**

Add a card and authorize automatic charges.

**4. Set your amounts**

Choose the balance **threshold** that triggers a top-up and the **reload
amount** to add each time, then click **Save**.

### Settings

* **Threshold:** when your balance falls below this number of credits, a top-up runs.
* **Reload amount:** how many credits to buy each time, 500 at minimum. Auto top-up buys this fixed amount on every run; it does not refill your balance up to a target number. Set it comfortably above your threshold so one top-up gives you real runway before the next one.
* **Monthly limit** (optional): the most credits Auto top-up can add in a calendar month. Once you reach it, top-ups pause until the next month and you get an email.
* **Notification emails:** the addresses that receive the Auto top-up notices, including a reminder before your saved card expires.

> [!NOTE]
>
> Each top-up is charged to your saved card at your standard credit rate,
> including any volume discount. See [Pricing](https://docs.crustdata.com/general/pricing.md) for rates.
> The exact charge is shown before you save.

### When it runs

Your balance is checked as your API usage flows, and once right after you save
the configuration. If the balance is already below the threshold when you
enable Auto top-up, the first reload starts immediately. Each breach buys one
reload; once the reload lifts your balance back above the threshold, nothing
more is bought until usage brings it below the line again.

### How you're charged

Each top-up charges your saved card automatically and adds the credits as soon
as the payment succeeds. The charge is the reload amount at your account's
credit rate, shown in the dialog before you save. You get an email receipt,
and the invoice appears in your **Invoices** tab. Credits added by Auto top-up
follow the same 12-month expiry as any other purchase (see
[Credit expiry](#credit-expiry)).

### If a payment fails

If a charge is declined, you get an email and the top-up is retried on the
next balance check. After three consecutive failed charges, Auto top-up turns
itself off and emails you so you can update your card.

### Turn it off or change your card

Turn off Auto top-up any time from the Credits page. Use **Replace card** to
change the card. Removing your card also turns off Auto top-up.

## Per-key monthly limit

Account credits are shared, but a workspace admin can cap how many of them an
individual API key spends each month. Set the cap on the **API Keys** page in
your [dashboard](https://app.crustdata.com/). It applies to that one key and
resets on the 1st of each month (UTC), and your other keys keep drawing on the
account balance as usual.

Use it for a key you hand to a teammate, a customer, or an unattended job, so
one key cannot spend the whole balance. The cap covers the endpoints that
consume credits.

### When the cap is reached

Calls made with that key return `402` until the cap resets or an admin raises it:

```json theme={"theme":"vitesse-black"}
{
  "error": {
    "type": "insufficient_credits",
    "message": "This API key's monthly credit limit has been exhausted. It resets on Aug 01, 2026 (UTC). A workspace admin can raise or disable the limit in the dashboard.",
    "metadata": []
  }
}
```

The status and `error.type` are the same as an account-level out-of-credits
response, so a client that already handles `402` needs no new code. Only the
message differs, which is how you tell the two apart in a log. The reset
sentence appears when a reset date is known.

Raising or removing the cap takes effect on the next call. Raising it keeps the
month's usage so far; it does not restart the count.

### Batch jobs

A batch submit is checked against the cap before the job starts, on the job's
estimated cost plus the estimates of the key's batches that are still running.
A job the key cannot afford is refused with `402` and a different `error.type`,
`credit_limit_exceeded`. The message says how many credits the job needs, how
many the key has left this month, and what would get it through: fewer
identifiers, waiting for running jobs to finish, or a higher cap. A job larger
than the cap itself can only be admitted by raising the cap. Nothing is charged
for a refused submit.

```json theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "credit_limit_exceeded",
        "message": "This batch needs ~300 credits; this API key has 200 of its 500 monthly credits remaining, with 200 committed to 1 running batch job. Submit fewer identifiers, wait for running jobs to finish, or ask a workspace admin to raise the limit.",
        "metadata": []
    }
}
```

### Stopping a key

Set a key's monthly limit to `0` to block it from the next call onward. It stays
blocked until an admin raises the limit — it does not start working again on the
1st of the month.

## What to do next

* **Understand charges** — see [Pricing](https://docs.crustdata.com/general/pricing.md) for per-endpoint credit costs.
* **Avoid 429s** — review [Rate limits](https://docs.crustdata.com/general/rate-limits.md) when polling at scale.
* **Check API access** — see [Permissions](https://docs.crustdata.com/general/permissions.md) for which endpoints and fields your account can use.


## Related topics

- [Account credit balance](https://docs.crustdata.com/api-reference/account-apis/get-account-credit-balance.md)
- [MCP Server](https://docs.crustdata.com/for-agents/mcp.md)
- [Pricing](https://docs.crustdata.com/general/pricing.md)
- [Usage](https://docs.crustdata.com/general/usage.md)
- [Social Post Search API](https://docs.crustdata.com/social-post-docs/indexed-search/introduction.md)
