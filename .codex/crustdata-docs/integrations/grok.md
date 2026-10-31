> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Grok connector

Grok reaches Crustdata through the same [MCP server](https://docs.crustdata.com/for-agents/mcp.md) as every other client. Crustdata is not in the Grok connector catalog, so you add it as a custom connector.

The endpoint is the same everywhere:

```
https://install.crustdata.com/mcp
```

* **One URL to add.** No SDK, no local process, no config file.
* **Browser sign-in.** No API key to paste into a chat.
* **Grok Bot too.** Bots use the connectors on your account, so this covers them as well.

## Before you start

* A Crustdata account. [Sign in or create one](https://app.crustdata.com/auth/login).
* Allow popups for `grok.com`. The sign-in opens in a popup window.

## Add the connector

**1. Open your connectors**

Go to [grok.com/connectors](https://grok.com/connectors), or click **Plugins** in the Grok sidebar and open the **Connectors** tab.

**2. Start a new connector**

Click **New Connector**, then choose **Custom**.

**3. Fill in the connection**

* **Name:** Crustdata
* **Server URL:** `https://install.crustdata.com/mcp`

Click **Add Connector**.

**4. Authorize**

A popup asks **Authorize Grok?**. Click **Continue**, then sign in. To use a key instead, click **Connect with an API key**.

**5. Pick a team**

Choose the team the connector acts as. It uses that team's credits and data access.

Crustdata then appears under **Connected** with a status of **Added**.

## Check it worked

Ask Grok:

> How many Crustdata credits do I have?

A number means you are connected.

If you get no number:

* Check the **Connectors** tab. If Crustdata is not under **Connected**, the sign-in did not finish.
* Confirm popups are allowed for `grok.com`, then add the connector again.
* Start a new chat. A connector added mid-conversation may not be picked up until you do.

## Try it

Ask for what you want in plain English:

* "Show me AI startups with 100-500 employees"
* "Who are the engineering leaders at Anthropic?"
* "What jobs does Stripe have open right now?"
* "Find the profile for `jane.doe@acme.com`"

A single request can chain steps: "Find AI startups hiring engineers, then get me the founders' emails."

Credit costs vary by request and plan. See [Pricing](https://docs.crustdata.com/general/pricing.md) for
per-request credit costs and [Rate limits](https://docs.crustdata.com/general/rate-limits.md) for limits.

## Support

For help or feedback, contact [support@crustdata.co](mailto:support@crustdata.co).


## Related topics

- [Connect Crustdata to your stack](https://docs.crustdata.com/integrations/overview.md)
- [MCP Server](https://docs.crustdata.com/for-agents/mcp.md)
- [Claude Code plugin](https://docs.crustdata.com/integrations/claude-plugin.md)
- [Social Post Search API](https://docs.crustdata.com/social-post-docs/indexed-search/introduction.md)
- [Crustdata CLI](https://docs.crustdata.com/for-agents/cli.md)
