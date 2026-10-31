> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Best practices

> How to handle rate limit headers, insufficient credit responses, and denied endpoint access when building production clients against the Crustdata API.

Practical patterns for building reliable clients against the Crustdata API. Each section explains the signal the API sends, then shows the code you need to react to it.

## Handle rate limits

Crustdata returns rate limit headers on every response. Read them after each call and pace your client accordingly — this is more reliable than guessing limits up front, and it gives you visibility before you hit the cap.

> [!NOTE]
>
> Rate limits are enforced on a **sliding window**. The window does not
> reset at fixed clock intervals — instead, each request counts against the
> limit for the duration of the window, and `x-ratelimit-reset` tells you
> how many seconds until the oldest request ages out and capacity frees up.
> Spreading traffic evenly is safer than bursting and waiting for a "reset."

### Rate limit headers

| Header | Meaning |
| - | - |
| `x-ratelimit-limit` | Maximum requests allowed within the sliding window. |
| `x-ratelimit-remaining` | Requests you have left right now. |
| `x-ratelimit-reset` | Seconds until the next request ages out and capacity frees up. |

Example values on a response:

```
x-ratelimit-limit: 30
x-ratelimit-remaining: 29
x-ratelimit-reset: 60
```

### Read the headers and pace requests

After each request, inspect `x-ratelimit-remaining`. When it gets close to zero, wait `x-ratelimit-reset` seconds before sending the next call.

```python Python theme={"theme":"vitesse-black"}
import time
import requests

def call_crustdata(url, payload, api_key):
    response = requests.post(
        url,
        headers={
            "authorization": f"Bearer {api_key}",
            "content-type": "application/json",
            "x-api-version": "2025-11-01",
        },
        json=payload,
    )

    remaining = int(response.headers.get("x-ratelimit-remaining", 1))
    reset = int(response.headers.get("x-ratelimit-reset", 0))

    if remaining <= 1 and reset > 0:
        time.sleep(reset)

    response.raise_for_status()
    return response.json()
```

```javascript Node.js theme={"theme":"vitesse-black"}
async function callCrustdata(url, payload, apiKey) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
            "x-api-version": "2025-11-01",
        },
        body: JSON.stringify(payload),
    });

    const remaining = Number(
        response.headers.get("x-ratelimit-remaining") ?? 1,
    );
    const reset = Number(response.headers.get("x-ratelimit-reset") ?? 0);

    if (remaining <= 1 && reset > 0) {
        await new Promise((r) => setTimeout(r, reset * 1000));
    }

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
}
```

### Retry on 429 with backoff and jitter

If you do receive a `429 Too Many Requests`, wait `x-ratelimit-reset` seconds and retry. Add jitter so concurrent workers do not all retry at the same instant.

```python Python theme={"theme":"vitesse-black"}
import random
import time
import requests

def call_with_retry(url, payload, api_key, max_retries=3):
    headers = {
        "authorization": f"Bearer {api_key}",
        "content-type": "application/json",
        "x-api-version": "2025-11-01",
    }
    for attempt in range(max_retries):
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 429:
            response.raise_for_status()
            return response.json()
        reset = int(response.headers.get("x-ratelimit-reset", 1))
        time.sleep(reset + random.uniform(0, 1))
    raise RuntimeError("Exceeded retry budget")
```

```javascript Node.js theme={"theme":"vitesse-black"}
async function callWithRetry(url, payload, apiKey, maxRetries = 3) {
    const headers = {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "x-api-version": "2025-11-01",
    };
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });
        if (response.status !== 429) {
            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }
            return response.json();
        }
        const reset = Number(
            response.headers.get("x-ratelimit-reset") ?? 1,
        );
        const jitter = Math.random();
        await new Promise((r) => setTimeout(r, (reset + jitter) * 1000));
    }
    throw new Error("Exceeded retry budget");
}
```

> [!NOTE]
>
> See [Rate limits](https://docs.crustdata.com/general/rate-limits.md) for default per-endpoint limits
> and how to request higher throughput.

## Handle insufficient credits

When your account has no remaining credits, the API returns `402 Payment Required` with a structured error body. Treat this as terminal — retrying will not succeed until credits are added.

An API key that has its own monthly cap returns the same status and `error.type` once that cap is exhausted, with a message naming the key's limit and its reset date. Handle both with the same branch — see [Per-key monthly limit](https://docs.crustdata.com/general/credits.md#per-key-monthly-limit).

### Response shape

```json theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "insufficient_credits",
        "message": "Insufficient credits. Please get in touch with the Crustdata sales team.",
        "metadata": []
    }
}
```

| Field | Description |
| - | - |
| `error.type` | `insufficient_credits` for this case. |
| `error.message` | Human-readable message safe to surface in logs and UI. |
| `error.metadata` | Reserved for additional context. May be empty. |

### Detect and stop

Catch `402` early, pause the workflow, and alert the operator. Do not feed the same request back into a retry loop.

```python Python theme={"theme":"vitesse-black"}
import requests

class InsufficientCreditsError(Exception):
    pass

def call_crustdata(url, payload, api_key):
    response = requests.post(
        url,
        headers={
            "authorization": f"Bearer {api_key}",
            "content-type": "application/json",
            "x-api-version": "2025-11-01",
        },
        json=payload,
    )

    if response.status_code == 402:
        body = response.json()
        raise InsufficientCreditsError(body["error"]["message"])

    response.raise_for_status()
    return response.json()
```

```javascript Node.js theme={"theme":"vitesse-black"}
class InsufficientCreditsError extends Error {}

async function callCrustdata(url, payload, apiKey) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
            "x-api-version": "2025-11-01",
        },
        body: JSON.stringify(payload),
    });

    if (response.status === 402) {
        const body = await response.json();
        throw new InsufficientCreditsError(body.error.message);
    }

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
}
```

> [!WARNING]
>
> Do not retry `402` responses. Repeated calls without adding credits will
> return the same error and obscure the real problem in your logs.

### Get more credits

Reach out to [support@crustdata.co](mailto:support@crustdata.co) to discuss your usage, upgrade your plan, or add credits to your account.

## Handle denied endpoint access

A `403 Forbidden` means the API key you used is not allowed to call that endpoint. A workspace admin can restrict an individual key to a subset of the endpoints the account has enabled, so a key that works for one endpoint can be refused on another.

### Response shape

```json theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "permission_error",
        "message": "This API key does not have access to /person/search. A workspace admin can update the key's endpoint access in the dashboard.",
        "metadata": []
    }
}
```

### Detect and stop

When the endpoint itself is refused, treat `403` the way you treat `402`: terminal, not worth retrying. No change to the body will alter the outcome. Route it to the operator, who can widen the key's endpoint access in the dashboard. A `403` naming specific fields is the other case, below.

### Denied fields

The same status and `error.type` come back when the endpoint is allowed but a
value in `fields` is not enabled on the account. The message names the refused
fields and links to a call for enabling them. `metadata` carries the same split:

```json theme={"theme":"vitesse-black"}
{
    "error": {
        "type": "permission_error",
        "message": "Access denied to fields: hiring.recent_openings. To enable access, please book a call with us at https://meetings-na2.hubspot.com/chris-pisarski/web-demo-request",
        "metadata": [
            {
                "denied_fields": ["hiring.recent_openings"],
                "permitted_fields": ["basic_info", "funding", "headcount"]
            }
        ]
    }
}
```

Batch endpoints put the permitted list in the message and leave `metadata`
empty, so on a wide grant that message runs to tens of kilobytes. Size any log
line or error column accordingly.

Resending the same body gets the same `403`. Sending a narrower `fields` list
returns the rest of the record. See
[Permissions](https://docs.crustdata.com/general/permissions.md#when-a-request-asks-for-a-disabled-field).

> [!NOTE]
>
> See [Permissions](https://docs.crustdata.com/general/permissions.md) for the endpoint that lists what the
> account has enabled, and [Per-key endpoint access](https://docs.crustdata.com/general/permissions.md#per-key-endpoint-access)
> for how a single key can be narrowed below that.


## Related topics

- [API Introduction](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction.md)
- [Rate limits](https://docs.crustdata.com/general/rate-limits.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
- [Job Title Normalization](https://docs.crustdata.com/guides/job-title-normalization.md)
- [Company Identify API](https://docs.crustdata.com/company-docs/identify/introduction.md)
