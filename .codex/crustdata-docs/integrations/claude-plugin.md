> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Claude Code plugin

The Crustdata plugin for Claude Code bundles the [MCP server](https://docs.crustdata.com/for-agents/mcp.md) and ready-to-run skills into a single install. One command adds the data tools (1B+ people profiles and 60M+ companies) and the skills; sign in once and you're set.

> [!NOTE]
>
> This installs Crustdata in **Claude Code**. For **Claude.ai** or **Claude Desktop**, add the [MCP connector](https://docs.crustdata.com/for-agents/mcp.md) instead.

* **One command to install.** The data tools and the skills come together, no config to hand-write.
* **Skills, ready to run.** They install with the plugin and appear under the `/crustdata` namespace.
* **Sign in once.** No API key to copy or paste; the tools and the skills share a single sign-in.

## Quick start

**1. Install the plugin**

Add the Crustdata marketplace and install the plugin:

```bash theme={"theme":"vitesse-black"}
claude plugin marketplace add crustdata/skills
claude plugin install crustdata@crustdata-plugin
```

This adds the Crustdata MCP server and the skills.

**2. Sign in**

Run **`/crustdata:login`** and your browser opens for a one-time sign-in, no key to paste. Until you sign in, Crustdata tool calls simply point you at the command; nothing nags you at session start.

Prefer a key? Set `CRUSTDATA_API_KEY` in your environment instead and skip the sign-in.

No account yet? [Sign up at crustdata.co](https://crustdata.co).

**3. Start using it**

Ask Claude a question, or run a skill from the `/crustdata` menu. Try one of the example prompts below.

## Example prompts

Once installed, you can ask Claude questions like:

| Prompt | What it does |
| - | - |
| "Find AI startups hiring engineers, then get me the founders' emails" | Search, then enrich, in a single step |
| "Who are the engineering leaders at Anthropic?" | Searches people by seniority and company |
| "What jobs does Stripe have open right now?" | Fetches live job listings |
| "Enrich this company with headcount and funding" | Pulls a full firmographic profile |
| "How many credits do I have?" | Checks your account balance |

## Skills

Ask Claude what it installed:

> What Crustdata skills do you have?

Eight ship with the plugin, under the `/crustdata` namespace:

| Skill | What it does |
| - | - |
| `/crustdata:account-research` | Account deep-dive and plan, org chart, tech stack and wedge, or a competitive battlecard |
| `/crustdata:candidate-sourcing` | Find engineering candidates, verify profiles, find business and personal emails, draft outreach into Gmail |
| `/crustdata:email-enrichment` | Turn a list of email addresses into person profiles, with verification and resume on long lists |
| `/crustdata:icp-builder` | One-time setup: turn one profile URL into your ICP, persona and writing voice for the other skills to read |
| `/crustdata:meeting-prep` | Score inbound against your ICP, build a one-screen pre-call brief, or plan discovery and a demo flow |
| `/crustdata:sales-outreach` | Cold emails, call scripts, social notes, replies, objection talk-tracks and sequences, each grounded in one recent signal |
| `/crustdata:sales-prospecting` | Net-new lists, lookalikes, account ranking, event lists, expansion radar, TAM sizing and champion tracking |
| `/crustdata:warm-path-workspace` | An interactive deal workspace: buying-group map, stakeholder dossiers, live signals and ranked warm-intro paths |

## What's included

> [card] MCP data tools
>
> The full Crustdata [MCP server](https://docs.crustdata.com/for-agents/mcp.md): search and enrich companies, people, and jobs, and read social and web content, in plain English.

> [card] Skills
>
> Ready-made workflows install with the plugin and appear under `/crustdata`, so common tasks run end to end.

> [card] One sign-in
>
> The data tools and the skills share a single sign-in. No API key to copy or paste.

Credit costs vary by request and plan. See [Pricing](https://docs.crustdata.com/general/pricing.md) for
per-request credit costs and [Rate limits](https://docs.crustdata.com/general/rate-limits.md) for limits.

## Sign-in

Run **`/crustdata:login`** to sign in with your Crustdata account. It's a one-time browser sign-in, no API key to copy or paste. The data tools and the skills share that single sign-in, tokens refresh silently, and if it ever expires a Crustdata tool call points you back at the command. `CRUSTDATA_API_KEY` works as an override if you'd rather pass a key directly.

## Support

For help or feedback, contact [support@crustdata.co](mailto:support@crustdata.co).


## Related topics

- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [Connect Crustdata to your stack](https://docs.crustdata.com/integrations/overview.md)
- [MCP Server](https://docs.crustdata.com/for-agents/mcp.md)
- [Codex plugin](https://docs.crustdata.com/integrations/codex.md)
- [Crustdata CLI](https://docs.crustdata.com/for-agents/cli.md)
