> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Crustdata CLI

> Use the Crustdata API from your terminal. Search, identify, and enrich companies and people, run bulk jobs, and get raw JSON for scripts and agents.

The `crustdata` CLI gives you the full Crustdata API in your terminal. Each API endpoint is a command with typed flags. On a terminal, the CLI prints markdown tables. When you pipe the output to another program, the CLI prints raw JSON. You, your scripts, and your agents can use the same commands.

## Quick start

**1. Install**

On macOS and Linux:

```bash theme={"theme":"vitesse-black"}
curl -fsSL https://static-assets.crustdata.com/cli/install.sh | sh
```

On Windows:

```powershell theme={"theme":"vitesse-black"}
irm https://static-assets.crustdata.com/cli/install.ps1 | iex
```

The installer verifies the checksums and puts the binary in `~/.crustdata/bin`. It also adds that directory to your `PATH`. To stop the installer from changing your `PATH`, set `CRUSTDATA_NO_MODIFY_PATH=1`.

After the install, open a new terminal. To upgrade the CLI later, run `crustdata upgrade`.

**2. Authenticate**

```bash theme={"theme":"vitesse-black"}
crustdata auth login
```

This command opens your browser. Sign in and pick your team. The CLI then saves the API key for that team.

If the machine has no browser, add `--no-browser`. The CLI prints the sign-in URL and asks you to paste the redirect back.

For CI and scripts, set `CRUSTDATA_API_KEY`, or read the key from a file with `crustdata auth login --with-token < key.txt`. [Non-interactive authentication](#non-interactive-authentication) compares the options.

**3. Run a command**

```bash theme={"theme":"vitesse-black"}
crustdata company enrich --domains stripe.com --fields basic_info,headcount
```

This command returns the `basic_info` and `headcount` fields for `stripe.com`.

## Commands

Run `crustdata <command> --help` to see the flags and runnable examples for any command.

| Command | What it does |
| - | - |
| `company search / identify / enrich / reviews / suggest` | Finds, identifies, and enriches companies. Gets employee reviews. Suggests values for search fields. |
| `person search / enrich / contacts / dev / suggest` | Finds and enriches people. Gets contact details and dev-platform profiles. Suggests values for search fields. |
| `job search / suggest` | Searches job listings. Suggests values for search fields. |
| `social-post search / fetch` | Finds social posts by keyword, person, or company. |
| `web search / fetch` | Searches the web and fetches pages in real time. |
| `batch <noun> <verb>` | Runs bulk jobs. It submits a job, waits for it with `--wait`, and downloads the JSONL results. |
| `account credits / endpoints` | Shows your credit balance and rate limits. |
| `auth login / logout / status / token` | Manages authentication with browser sign-in or an API key. |
| `docs / docs read / docs fs` | Searches and reads these docs from the terminal. |
| `mcp install / list / remove` | Installs, lists, and removes the Crustdata MCP server in agent clients. |
| `upgrade` | Updates the CLI in place and verifies the checksum. |

### Live mode

Four commands support `--live`:

* `company search`
* `person search`
* `person enrich`
* `job search`

Without `--live`, these commands query the indexed dataset. With `--live`, they query the professional network in real time.

Live search uses different field names from indexed search, for example `REGION` and `CURRENT_TITLE`. Live `company search` and live `person search` also need `--page`.

## Filters

Search commands take a `--filter` flag in the form `'field op value'`. You can repeat `--filter`. The CLI joins all filters with AND.

```bash theme={"theme":"vitesse-black"}
crustdata company search \
  --filter 'headcount.total > 100' \
  --filter 'locations.country in United States,Canada' \
  --limit 25
```

The operators are the same as in the API: `=`, `!=`, `<`, `>`, `=<`, `=>`, `in`, `not_in`, `(.)`, and `[.]`. For `in` and `not_in`, give a comma-separated list of values.

Field names are the API's dot-paths, such as `headcount.total`. If the API does not know a field name, it returns `invalid_request: Unsupported columns in conditions`. To check a field name before you send a request, use `--dry-run`, tab completion, or the field tables in the API reference.

### OR logic and nested groups

`--filter` gives you AND only. For OR logic and nested groups, write the full JSON request body and pass it with `--input`:

* `--input query.json` reads the body from a file.
* `--input -` reads the body from stdin.

If you also pass a flag, the flag value replaces the matching field in the body. The [company examples](#companies) include an OR query.

## Output

On a terminal, the CLI prints markdown tables. When you pipe the output, the CLI prints the raw JSON response. To choose the format yourself, add `--format json` or `--format md`.

To select part of the JSON response, use the built-in `--jq` flag. You do not need to install `jq`. `--jq` always prints JSON.

```bash theme={"theme":"vitesse-black"}
crustdata account credits --jq .account.credits
```

The CLI writes data only to stdout. It writes progress messages and hints to stderr.

The CLI does not fetch the next page for you, because each page costs credits. To get the next page of an indexed search, pass the `next_cursor` value from the response to `--cursor`.

### Exit codes

| Code | Meaning |
| - | - |
| `0` | The command succeeded. |
| `1` | The command failed because of an API error, a bad flag, or a missing argument. |
| `4` | The command failed because of an authentication error. |

## Preview requests for free

Use these tools to build a request before you spend credits:

* `--dry-run` prints the request body that the CLI composes, and does not send it. Every request command supports `--dry-run`.
* `--example` prints request examples from the API spec. Every request command supports `--example`.
* Tab completion suggests field names and operators.

These tools spend no credits and need no authentication.

### Dry runs

```bash theme={"theme":"vitesse-black"}
# See exactly what --filter compiles into, without sending it
crustdata company search --dry-run \
  --filter 'headcount.total > 10000' \
  --filter 'locations.country in United States' --limit 5

# Live mode composes a flat array instead of a condition tree
crustdata person search --dry-run --live \
  --filter 'CURRENT_TITLE in CEO' --page 1

# See how flags override an --input body
echo '{"limit":100,"cursor":"abc"}' | \
  crustdata company search --input - --limit 5 --dry-run
```

### Spec examples

```bash theme={"theme":"vitesse-black"}
# List the spec's ready-made request bodies
crustdata company search --example

# Print one of them
crustdata company search --example=recently_funded_us_companies

# Use a spec example as the body, add your flags, and preview it
crustdata company search --example=recently_funded_us_companies > /tmp/q.json
crustdata company search --input /tmp/q.json --limit 3 --dry-run
```

> [!NOTE]
>
> To print a named example, use the `=` form: `--example=name`. With no name, `--example` lists the examples that exist.

### Tab completion

To turn on tab completion in your current shell session, run this line:

```bash theme={"theme":"vitesse-black"}
source <(crustdata completion zsh)   # or bash / fish / powershell
```

To turn on completion for every new session, follow the steps in `crustdata completion zsh --help`.

Tab completion then fills in field names and operators:

```bash theme={"theme":"vitesse-black"}
crustdata company search --filter 'head<TAB>      # headcount.* fields from the spec vocabulary
crustdata company search --live --filter '<TAB>   # vocabulary flips to REGION, COMPANY_HEADCOUNT, ...
crustdata company search --filter 'headcount.total <TAB>   # the 10 operators
```

Tab completion does not fill in values. To get valid values for a field, use a `suggest` command, such as `crustdata company suggest country 'Uni'` or `crustdata person suggest basic_profile.city 'San'`. Unlike the tools above, `suggest` calls the API.

## Examples

Each example below runs as written on CLI v0.2.5.

### Companies

```bash theme={"theme":"vitesse-black"}
# Enrich one company
crustdata company enrich --domains stripe.com --fields basic_info,headcount

# Get one value from the enrichment response
crustdata company enrich --domains stripe.com --fields basic_info \
  --jq '.[0].matches[0].company_data.basic_info.name'

# Match a company name to a company record
crustdata company identify --names "Stripe" --exact-match

# Indexed search: the CLI joins the filters with AND
crustdata company search \
  --filter 'headcount.total > 10000' \
  --filter 'locations.country in United States' \
  --limit 2

# OR logic needs a JSON body. Flags still override body fields such as limit.
echo '{"filters":{"op":"or","conditions":[
  {"field":"basic_info.primary_domain","type":"=","value":"stripe.com"},
  {"field":"basic_info.primary_domain","type":"=","value":"openai.com"}
]}}' | crustdata company search --input - --limit 3 --jq .total_count

# Live search: uses live field names and needs --page
crustdata company search --live --filter 'REGION in United States' --page 1

# Employee reviews for a company
crustdata company reviews --crustdata-company-id 631394

# Suggest valid values for a search field
crustdata company suggest country 'Uni'
```

### People

```bash theme={"theme":"vitesse-black"}
# Indexed person search
crustdata person search \
  --filter 'basic_profile.location.country = United States' --limit 2

# Live person search: uses live field names and needs --page
crustdata person search --live \
  --filter 'CURRENT_TITLE in CEO' \
  --filter 'REGION in United States' --page 1

# Enrich a profile
crustdata person enrich \
  --professional-network-profile-urls https://www.linkedin.com/in/dvdhsu/

# Contact details (fields use dotted paths)
crustdata person contacts \
  --professional-network-profile-urls https://www.linkedin.com/in/dvdhsu/ \
  --fields contact.business_emails

# Dev-platform profile from a GitHub URL
crustdata person dev --profile-url https://github.com/rajnandan1

# Suggest values for a person search field
crustdata person suggest basic_profile.city 'San'
```

### Jobs, posts, and the web

```bash theme={"theme":"vitesse-black"}
# Fuzzy-match job titles with the (.) operator
crustdata job search --filter 'job_details.title (.) engineer' --limit 2

# Social posts by keyword (supports OR/AND, up to 6 terms)
crustdata social-post search --keyword 'series B' --limit 2

# A company's recent posts
crustdata social-post fetch --company-domain stripe.com --limit 2

# Search the web in real time
crustdata web search --query 'crustdata'
```

### Account and housekeeping

```bash theme={"theme":"vitesse-black"}
# Credit balance as a bare number
crustdata account credits --jq .account.credits

# Preview a bulk job without spending credits
crustdata batch person contacts \
  --professional-network-profile-urls https://www.linkedin.com/in/dvdhsu/ \
  --fields contact.business_emails --dry-run

# Update the CLI in place
crustdata upgrade
```

## Bulk jobs

```bash theme={"theme":"vitesse-black"}
crustdata batch person enrich --input people.json --wait --download
```

This command does three things:

1. It submits the bulk job.
2. It polls the job until the job completes (`--wait`).
3. It downloads the results as decompressed JSONL (`--download`).

You can also submit a job without `--wait` and come back to it later:

```bash theme={"theme":"vitesse-black"}
crustdata batch status <id>      # check the job
crustdata batch download <id>    # download the results
```

## Search the docs

The CLI can search and read these docs. It uses the public docs MCP server, so you do not need to authenticate.

```bash theme={"theme":"vitesse-black"}
crustdata docs "how do credits work"        # full-text search with page links
crustdata docs read general/rate-limits     # print a whole page
crustdata docs fs -- tree /api-reference    # browse the docs as a filesystem
```

## Set up the Crustdata MCP

The Model Context Protocol (MCP) lets agent clients, such as Claude Code and Cursor, call external tools. `crustdata mcp install` adds the hosted [Crustdata MCP server](https://docs.crustdata.com/for-agents/mcp.md) to your agent clients.

```bash theme={"theme":"vitesse-black"}
crustdata mcp install                # interactive picker
crustdata mcp install claude-code    # installs the Crustdata plugin (MCP + skills)
crustdata mcp install cursor windsurf
crustdata mcp list                   # per-client install state and auth mode
crustdata mcp remove cursor          # deletes only the crustdata entry
```

Supported targets:

* `claude-code` installs the Crustdata plugin, which includes the MCP server and skills. To install only the MCP server, add `--mcp-only`.
* `cursor`, `vscode`, and `windsurf` get a `crustdata` entry in the client's MCP config.
* `claude-desktop` connects through the `mcp-remote` bridge.
* `claude-web` gets printed manual steps, because connectors are set at the account level.

The CLI edits only the `crustdata` entry in each client config. It keeps all other entries as they are. To see the exact change without writing it, add `--dry-run`.

By default, each client signs in with OAuth the first time it connects. For headless setups, where nobody can complete a browser sign-in, use one of these flags:

* `--with-key` writes your saved API key into the client config as plain text. The CLI prints a warning when you use it.
* `--with-key=env` writes the reference `${env:CRUSTDATA_API_KEY}` instead of the key itself.

## For scripts and agents

* When you pipe the output, the CLI always prints raw JSON.
* `--jq` works everywhere and needs no other install.
* `--help` on any command shows runnable examples.
* `--dry-run` composes any request without sending it. An agent can use it to explore commands without spending credits.
* The CLI writes data only to stdout. The [exit codes](#exit-codes) tell you what failed.

### Non-interactive authentication

The CLI opens a browser only when it runs on a real terminal. When stdin is a pipe, the CLI never opens a browser. The CLI shows the paste prompt only when you give it no key in another way. This means an agent never waits on a hidden prompt.

Use one of these three methods:

```bash theme={"theme":"vitesse-black"}
# 1. Environment variable: no login step, and nothing is written to disk.
#    Best for short-lived sandboxes. It wins over the config file when both exist.
export CRUSTDATA_API_KEY=cd_xxx

# 2. Stdin: saves the key in the config file and keeps it out of shell history.
echo "$KEY" | crustdata auth login --with-token

# 3. Inline flag: one command, but the key lands in your shell history.
crustdata auth login --token cd_xxx
```

`auth login` checks the key against the API before it saves the key. If the key is not valid, the command exits with code `4`. A bad key fails at setup, not in the middle of a task. To see the current authentication state, run `crustdata auth status`.


## Related topics

- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [MCP Server](https://docs.crustdata.com/for-agents/mcp.md)
- [Usage](https://docs.crustdata.com/general/usage.md)
- [Rate limits](https://docs.crustdata.com/general/rate-limits.md)
- [Permissions](https://docs.crustdata.com/general/permissions.md)
