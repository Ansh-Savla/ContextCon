> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Codex plugin

The Crustdata plugin for Codex bundles the [MCP server](https://docs.crustdata.com/for-agents/mcp.md) and ready-to-run skills into a single install. Two commands add the data tools (1B+ people profiles and 60M+ companies) and the skills.

> [!NOTE]
>
> This installs Crustdata in **Codex**, the coding agent. To use Crustdata in **ChatGPT** itself, add the [ChatGPT plugin](https://chatgpt.com/plugins/plugin_asdk_app_6a8cc6dc38ac819198b700b1b4e67fb0) instead.

* **Two commands to install.** The data tools and the skills come together, no config file to hand-write.
* **Sign in once.** A browser sign-in, no API key to paste.
* **The same endpoint everywhere.** The plugin registers `https://install.crustdata.com/mcp`.

## Before you start

* Codex installed and signed in. Run `codex login` if `codex login status` reports **Not logged in**.
* A Crustdata account. [Sign in or create one](https://app.crustdata.com/auth/login).

## Quick start

**1. Install the plugin**

Add the Crustdata marketplace and install the plugin:

```bash theme={"theme":"vitesse-black"}
codex plugin marketplace add crustdata/skills
codex plugin add crustdata@crustdata-plugin
```

**2. Sign in**

```bash theme={"theme":"vitesse-black"}
codex mcp login crustdata
```

Your browser opens for a one-time sign-in. No key to paste.

**3. Start using it**

Ask Codex a question, or run one of the bundled skills.

## Check it worked

```bash theme={"theme":"vitesse-black"}
codex mcp list
```

Crustdata should appear with a status of `enabled`:

```
Name       Url                                Bearer Token Env Var  Status   Auth
crustdata  https://install.crustdata.com/mcp  -                     enabled  OAuth
```

## Example prompts

| Prompt | What it does |
| - | - |
| "Find AI startups hiring engineers, then get me the founders' emails" | Search, then enrich, in a single step |
| "Who are the engineering leaders at Anthropic?" | Searches people by seniority and company |
| "What jobs does Stripe have open right now?" | Fetches live job listings |
| "Enrich this company with headcount and funding" | Pulls a full firmographic profile |
| "How many credits do I have?" | Checks your account balance |

## Already installed it in ChatGPT?

ChatGPT and Codex share one plugin directory, so the [ChatGPT plugin](https://chatgpt.com/plugins/plugin_asdk_app_6a8cc6dc38ac819198b700b1b4e67fb0) shows up in Codex as soon as you install it there. It carries the data tools on their own. Install the Crustdata plugin above to add the skills.

## Skills

Ask Codex what it installed:

> What Crustdata skills do you have?

Eight ship with the plugin, namespaced `crustdata:`:

| Skill | What it does |
| - | - |
| `crustdata:account-research` | Account deep-dive and plan, org chart, tech stack and wedge, or a competitive battlecard |
| `crustdata:candidate-sourcing` | Find engineering candidates, verify profiles, find business and personal emails, draft outreach into Gmail |
| `crustdata:email-enrichment` | Turn a list of email addresses into person profiles, with verification and resume on long lists |
| `crustdata:icp-builder` | One-time setup: turn one profile URL into your ICP, persona and writing voice for the other skills to read |
| `crustdata:meeting-prep` | Score inbound against your ICP, build a one-screen pre-call brief, or plan discovery and a demo flow |
| `crustdata:sales-outreach` | Cold emails, call scripts, social notes, replies, objection talk-tracks and sequences, each grounded in one recent signal |
| `crustdata:sales-prospecting` | Net-new lists, lookalikes, account ranking, event lists, expansion radar, TAM sizing and champion tracking |
| `crustdata:warm-path-workspace` | An interactive deal workspace: buying-group map, stakeholder dossiers, live signals and ranked warm-intro paths |

## What's included

> [card] MCP data tools
>
> The full Crustdata [MCP server](https://docs.crustdata.com/for-agents/mcp.md): search and enrich companies, people, and jobs, and read social and web content, in plain English.

> [card] Skills
>
> Ready-made workflows for prospecting, account research, outreach, meeting prep, and candidate sourcing.

> [card] One sign-in
>
> The data tools and the skills share a single sign-in. No API key to copy or paste.

Credit costs vary by request and plan. See [Pricing](https://docs.crustdata.com/general/pricing.md) for
per-request credit costs and [Rate limits](https://docs.crustdata.com/general/rate-limits.md) for limits.

## Troubleshooting

* **`MCP tool call requires approval`.** Non-interactive runs (`codex exec`) decline tool calls that need approval. Run Codex interactively and approve the call.
* **`Not inside a trusted directory`.** `codex exec` expects a git repository. Run it in your project, or pass `--skip-git-repo-check`.
* **The sign-in does not stick.** Run `codex mcp login crustdata` again. Judge it by whether a request works, not by the `Auth` column.

## Support

For help or feedback, contact [support@crustdata.co](mailto:support@crustdata.co).


## Related topics

- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [Connect Crustdata to your stack](https://docs.crustdata.com/integrations/overview.md)
- [MCP Server](https://docs.crustdata.com/for-agents/mcp.md)
- [Claude Code plugin](https://docs.crustdata.com/integrations/claude-plugin.md)
- [Usage](https://docs.crustdata.com/general/usage.md)
