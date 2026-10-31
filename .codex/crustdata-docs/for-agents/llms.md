> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# llms.txt

> A machine-readable index of the Crustdata documentation that AI tools and agents use to read the docs efficiently.

`llms.txt` is a machine-readable index of this documentation, written for large
language models and AI agents. It maps every page to a one-line summary so a
model can pull the right reference directly instead of crawling the whole site.

The docs expose three machine-readable tiers — pick by how much context you have:

| Tier | URL | Size | Use it to |
| - | - | - | - |
| Index | [`/llms.txt`](https://static-assets.crustdata.com/llms.txt) | \~35 KB | Discover pages and pick what to read |
| Page | append `.md` to any docs URL (e.g. [`/general/pricing.md`](https://docs.crustdata.com/general/pricing.md)) | 5–50 KB each | Fetch exactly the pages you need |
| Full corpus | [`/llms-full.txt`](https://static-assets.crustdata.com/llms-full.txt) | \~1.5 MB | Ingest everything at once (RAG indexing, local search) — larger than most single model contexts by design |

## What's in it

The index groups every page by product area, mirroring this site:

| Section | Contents |
| - | - |
| Getting started | Introduction, Pricing, Rate limits, Credits, and the MCP server |
| Company, Person, Job, Web, Social Post | Each API area's guides and reference |
| Migration guides | Legacy endpoint → current replacement mappings |
| API reference | Every endpoint in the `2025-11-01` version |

## Use it with an AI tool

Give your AI tool or agent the URL `https://static-assets.crustdata.com/llms.txt`
— the complete index, covering everything listed above including the migration
guides and the full API reference. Tools that support the `llms.txt` convention
can also auto-discover `/llms.txt` on the docs domain, but that copy lists only
a subset of pages, so paste the complete index URL when you can. The model
reads the index, then fetches only the pages it needs as Markdown — keeping
answers accurate and context small.

## What to do next

* **Read the index** — open [`llms.txt`](https://static-assets.crustdata.com/llms.txt) to see every page and its summary.
* **Connect an assistant** — the [MCP server](https://docs.crustdata.com/for-agents/mcp.md) lets Claude, Cursor, and other clients query Crustdata in natural language.
* **Start from the top** — the [Introduction](https://docs.crustdata.com/general/introduction.md) maps the five API areas.


## Related topics

- [Crustdata CLI](https://docs.crustdata.com/for-agents/cli.md)
