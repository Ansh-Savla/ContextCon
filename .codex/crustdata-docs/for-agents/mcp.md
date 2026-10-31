> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# MCP Server

> Connect Crustdata's B2B data platform to Claude and other AI assistants via MCP (Model Context Protocol).

## Quick start

You need a Crustdata account to use the MCP server. [Sign in or create one](https://app.crustdata.com/auth/login).

The endpoint is the same everywhere:

```
https://install.crustdata.com/mcp
```

> [card] [Add to Claude](https://claude.ai/customize/connectors?modal=add-custom-connector\&connectorName=Crustdata+MCP\&connectorUrl=https%3A%2F%2Finstall.crustdata.com%2Fmcp)
>
> Opens the **Add custom connector** dialog on claude.ai.

> [card] [Add to Cursor](https://cursor.com/install-mcp?name=Crustdata\&config=eyJ1cmwiOiAiaHR0cHM6Ly9pbnN0YWxsLmNydXN0ZGF0YS5jb20vbWNwIn0%3D)
>
> Installs through Cursor's MCP handler.

> [card] [Add to VS Code](https://vscode.dev/redirect/mcp/install?name=Crustdata\&config=%7B%22type%22%3A%20%22http%22%2C%20%22url%22%3A%20%22https%3A%2F%2Finstall.crustdata.com%2Fmcp%22%7D)
>
> Registers the server over streamable HTTP.

> [card] [Add to ChatGPT](https://chatgpt.com/plugins/plugin_asdk_app_6a8cc6dc38ac819198b700b1b4e67fb0)
>
> Opens the Crustdata listing in the plugin directory.

> [tab] Claude
>
> The **Add to Claude** card does this in one click. To set it up manually:
>
> **1. Open the connector settings**
>
> In Claude, open **Customize**, then **Connectors**, then **Add custom connector**.
>
> **2. Configure the connection**
>
> * **Name:** Crustdata
> * **URL:** `https://install.crustdata.com/mcp`
>
> Click **Add** to save.
>
> **3. Connect**
>
> Open the new connector under **Not connected** and click **Connect**, then sign in with your Crustdata account.
>
> Connectors are account-wide. Once you add it, Crustdata is available on claude.ai, Claude Desktop, and mobile.

> [tab] Claude Code
>
> Add the connector from your terminal:
>
> ```bash wrap theme={"theme":"vitesse-black"}
> claude mcp add --transport http crustdata https://install.crustdata.com/mcp
> ```
>
> Then sign in: run `/mcp` inside Claude Code and pick **crustdata**.
>
> The [Crustdata plugin](https://docs.crustdata.com/integrations/claude-plugin.md) registers this same connector and adds ready-to-run skills, if you want both in one install.

> [tab] Codex CLI
>
> Add the connector from your terminal:
>
> ```bash wrap theme={"theme":"vitesse-black"}
> codex mcp add crustdata --url https://install.crustdata.com/mcp
> ```
>
> Codex detects that the server uses OAuth and opens a Crustdata sign-in in your browser. If the sign-in does not open or does not finish, run `codex mcp login crustdata`.
>
> Run `/mcp` inside Codex to confirm **crustdata** is listed.
>
> The [Crustdata plugin for Codex](https://docs.crustdata.com/integrations/codex.md) registers this same connector and adds ready-to-run skills, if you want both in one install.

> [tab] Antigravity
>
> Add Crustdata to Antigravity's MCP config and sign in with your Crustdata account. No API key needed.
>
> Antigravity 2.0, the IDE, and the CLI share one config file, `~/.gemini/config/mcp_config.json`. Pick the one you use.
>
> > [accordion] Antigravity 2.0
> >
> > **1. Open the config folder**
> >
> > In Antigravity 2.0, click **Settings** at the bottom left, then **Customizations**. Under **Installed MCP Servers**, click **Open MCP Config**. This opens the folder that holds `mcp_config.json` (`~/.gemini/config/mcp_config.json`) in your file manager, not the file itself.
> >
> > **2. Add the server**
> >
> > Open `mcp_config.json` in a text editor. On a new install the file is empty: paste the block below as is. If the file already has an `mcpServers` object, add the `crustdata` entry inside it.
> >
> > ```json wrap theme={"theme":"vitesse-black"}
> > {
> >   "mcpServers": {
> >     "crustdata": {
> >       "serverUrl": "https://install.crustdata.com/mcp"
> >     }
> >   }
> > }
> > ```
> >
> > Use `serverUrl` for remote servers. Some Antigravity versions reject `url` and `httpUrl`. Save the file.
> >
> > **3. Refresh**
> >
> > Click the refresh icon next to **Add MCP**. `crustdata` appears with an **Authenticate** button and an `Unauthorized` error. That is expected until you sign in.
> >
> > **4. Sign in**
> >
> > Click **Authenticate** and sign in with your Crustdata account in the browser. Copy the authorization code the browser shows, paste it into the field in Antigravity, and click **Submit**. The dot next to `crustdata` turns green when you are connected.
>
> > [accordion] Antigravity IDE
> >
> > **1. Open the raw config**
> >
> > Click **…** at the top of the agent side panel, then **MCP Servers**, **Manage MCP Servers**, **View raw config**. This opens `~/.gemini/config/mcp_config.json`.
> >
> > **2. Add the server**
> >
> > If the file is empty, paste the block below as is. If it already has an `mcpServers` object, add the `crustdata` entry inside it.
> >
> > ```json wrap theme={"theme":"vitesse-black"}
> > {
> >   "mcpServers": {
> >     "crustdata": {
> >       "serverUrl": "https://install.crustdata.com/mcp"
> >     }
> >   }
> > }
> > ```
> >
> > Save the file.
> >
> > **3. Refresh**
> >
> > On the **Manage MCP servers** page, click **Refresh**. `crustdata` appears with **Configure** and **Authenticate** buttons and an `Unauthorized` error. That is expected until you sign in.
> >
> > **4. Sign in**
> >
> > On the same page, click **Authenticate** next to `crustdata`. Sign in through your browser. If Antigravity asks for an authorization code, paste it and click **Submit**.
>
> > [accordion] Antigravity CLI
> >
> > **1. Add the server**
> >
> > Run this in your terminal, not inside an `agy` session.
> >
> > ```bash wrap theme={"theme":"vitesse-black"}
> > agy mcp add crustdata https://install.crustdata.com/mcp
> > ```
> >
> > Run `agy mcp list` to confirm it is listed.
> >
> > **2. Sign in**
> >
> > Start `agy` and run `/mcp`. Select `crustdata` with the arrow keys, press **Enter** for its actions, and choose **Authenticate**. Open the URL it shows, sign in, then paste the authorization code back into the CLI.

> [tab] Programmatic access
>
> You can use the same server from your own code: agent frameworks, backend jobs, or anywhere the sign-in flow is not practical. Connect any MCP client to the endpoint and pass your Crustdata API key as a bearer token.
>
> * **Endpoint:** `https://install.crustdata.com/mcp`
> * **Header:** `Authorization: Bearer YOUR_API_KEY`
>
> For MCP clients that take a JSON config with custom headers:
>
> ```json wrap theme={"theme":"vitesse-black"}
> {
>   "mcpServers": {
>     "crustdata": {
>       "type": "streamable-http",
>       "url": "https://install.crustdata.com/mcp",
>       "headers": { "Authorization": "Bearer YOUR_API_KEY" }
>     }
>   }
> }
> ```

When Crustdata can't answer a request, your assistant may send us a short report through the `feedback` tool, so we can fix the gap. The tool tells the assistant to leave out names, emails, and other personal details. Your client asks you before the first report. Allow the tool once and your client stops asking.

## Check it worked

Ask your assistant:

> How many credits do I have?

A number means you are connected.

If you get no number:

* Restart your client. A mid-session install may not take effect until it does.
* Re-run your client's sign-in step, which is separate from adding the connector.
* In Antigravity, check that the entry uses `serverUrl`, not `url`, and that you pasted the authorization code after **Authenticate**.
* Watch the [setup walkthrough](#setup-walkthrough).

## Try it

Ask for what you want in plain English:

* "Show me AI startups with 100-500 employees"
* "Who are the engineering leaders at Anthropic?"
* "What jobs does Stripe have open right now?"
* "Find the profile for [jane.doe@acme.com](mailto:jane.doe@acme.com)"
* "Get me the email for this person's profile"

A single request can chain steps. "Find AI startups hiring engineers, then get me the founders' emails" runs start to finish without you breaking it up.

## What you can do

> [card] Companies
>
> Find and enrich companies by industry, headcount, location, and funding, with full firmographic profiles.

> [card] People and contacts
>
> Search people by title, seniority, company, and skills, then enrich profiles with business emails, personal emails, and phone numbers.

> [card] Jobs
>
> Search millions of job listings with filters and breakdowns, or pull a company's live openings on demand.

> [card] Social and web
>
> Track recent social posts by person, company, or keyword, and search and read content from across the web.

Hand it a list instead of one name and it enriches the whole list, splitting the work into batches on its own.

## Credits

Every request reports the exact credits it spent, in real time, measured from what the request actually did rather than estimated. Enrichment takes the cheapest correct path, so you do not over-spend by accident.

Costs vary by request and plan. See [Pricing](https://docs.crustdata.com/general/pricing.md) for per-request costs and [Rate limits](https://docs.crustdata.com/general/rate-limits.md) for limits.

## Catalog resources

The server publishes its own usage guide as MCP resources: markdown pages an agent reads directly instead of re-deriving the tool list and schemas each session. Read `crustdata://catalog` first. It carries the must-know rules and an index of the sections.

| Resource | What's in it |
| - | - |
| `crustdata://catalog` | Start here. The must-know rules and an index of the sections below |
| `crustdata://catalog/quickstart` | How to drive the server: writing a script that composes tool calls |
| `crustdata://catalog/tools` | Every callable tool with its one-line purpose and cost |
| `crustdata://catalog/query-builder` | Filters, operators, and matching behavior |
| `crustdata://catalog/results` | Shaping results: `project`, `compact`, `paginate`, `parallelMap` |
| `crustdata://catalog/fields` | Common filter columns and identifiers per tool |
| `crustdata://catalog/patterns` | Recipes: search then enrich, identify then enrich, bulk, pagination |
| `crustdata://catalog/dry-run` | Testing a script for zero credits before running it for real |
| `crustdata://catalog/ranking` | Bounding result pages server-side and ranking in code |
| `crustdata://catalog/cost` | Credit pricing and the cheapest-path rules |
| `crustdata://catalog/full` | The entire guide in one read |

Any MCP client can fetch these with a standard resource read: `session.read_resource("crustdata://catalog")` in the Python SDK, or `client.readResource({ uri: "crustdata://catalog" })` in TypeScript.

## Setup walkthrough

Still stuck? Watch the full setup from start to finish.

[Get started with the Crustdata MCP](https://www.youtube.com/embed/2ZAuKWlFOMw)

Get started with the Crustdata MCP

## Support

For help or feedback, contact [support@crustdata.co](mailto:support@crustdata.co).


## Related topics

- [Crustdata CLI](https://docs.crustdata.com/for-agents/cli.md)
- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [Grok connector](https://docs.crustdata.com/integrations/grok.md)
- [Codex plugin](https://docs.crustdata.com/integrations/codex.md)
- [Claude Code plugin](https://docs.crustdata.com/integrations/claude-plugin.md)
