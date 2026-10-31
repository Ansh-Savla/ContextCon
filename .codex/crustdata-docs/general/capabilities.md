> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Capabilities

> What the Crustdata API can do, organized by use case: prospect lists, candidate sourcing, enrichment, job-change and funding alerts, company research, and B2B data for AI agents.

The Crustdata API finds, enriches and monitors people and companies, and searches job postings, social posts and the web. It combines 15+ sources into one record per person or company. Some endpoints are add-ons or in beta; [Permissions](https://docs.crustdata.com/general/permissions.md) shows which ones your account can call.

## Build a prospect list from a description of your customer

Describe the accounts and people you want in plain English or with structured filters. Company Search finds the accounts by industry, headcount, funding, location and tech stack. People Search finds the decision-makers inside them by title, seniority and function. Contact Enrichment then returns business emails, personal emails and phone numbers for the people you keep.

Endpoints: [Company Search API](https://docs.crustdata.com/company-docs/search/introduction.md), [People Search API](https://docs.crustdata.com/person-docs/search/introduction.md), [Semantic People Search API](https://docs.crustdata.com/guides/person-semantic-search.md) (beta), [Contact Enrichment API](https://docs.crustdata.com/person-docs/contact/enrich.md)

## Source candidates for a recruiting product

Search people by role, skills, location, employer and education, and get each profile back with full work history including start and end dates. Job Title Normalization maps raw job titles to a standard taxonomy so you can rank candidates consistently.

Endpoints: [People Search API](https://docs.crustdata.com/person-docs/search/introduction.md), [Job Title Normalization](https://docs.crustdata.com/guides/job-title-normalization.md)

## Enrich records you already have

Person Enrichment turns a profile URL into the full person record. Reverse Email Lookup resolves an email address, business or personal, to the person behind it. Company Identify matches a company name, domain or profile URL to a Crustdata company, which Company Enrichment expands into a full profile. On enterprise plans, Batch Person and Company Enrichment take up to 10,000 records per job and deliver the results as a file.

Endpoints: [Person Enrichment API](https://docs.crustdata.com/person-docs/enrichment/introduction.md), [Reverse Email Lookup API](https://docs.crustdata.com/person-docs/contact/identify.md), [Company Identify API](https://docs.crustdata.com/company-docs/identify/introduction.md), [Company Enrichment API](https://docs.crustdata.com/company-docs/enrichment/introduction.md), [Batch Person Enrichment API](https://docs.crustdata.com/person-docs/enrichment/batch-enrich.md), [Batch Company Enrichment API](https://docs.crustdata.com/company-docs/enrichment/batch.md)

## Get alerts on job changes, hiring and funding

Watchers turn a list or a search into a recurring feed. A Person Entity Watcher takes a list of candidates or customers and tells you when one changes jobs or titles. A Company Entity Watcher tracks your accounts for headcount moves, funding rounds and news. Discovery Watchers re-run a saved search and send the people or companies that newly match it. A Job Watcher sends newly posted roles that match your filters. Alerts go to a webhook, Slack or email.

Endpoints: [Person Entity Watcher](https://docs.crustdata.com/watcher-docs/person/entity.md), [Company Entity Watcher](https://docs.crustdata.com/watcher-docs/company/entity.md), [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md), [Company Discovery Watcher](https://docs.crustdata.com/watcher-docs/company/discovery.md), [Job Watcher](https://docs.crustdata.com/watcher-docs/job/watch.md)

## Research a company and its tech stack

Company Enrichment returns firmographics, headcount, funding, revenue, hiring, web traffic, employee reviews and news in one call. Technographics adds the tools and platforms a company uses, detected from its web presence and its job postings. The Job Postings Search API shows what a company is hiring for, and its aggregations count postings by role, location or source.

Endpoints: [Company Enrichment API](https://docs.crustdata.com/company-docs/enrichment/introduction.md), [Technographics](https://docs.crustdata.com/guides/technographics.md), [Job Postings Search API](https://docs.crustdata.com/job-docs/search/introduction.md)

## Track what people and companies post

Social Post Search finds posts by keyword, author, engagement, reactors and mentions. Use it to spot buying intent or to see who engages with a competitor's posts. A Social Post Watcher sends new posts that match your filters.

Endpoints: [Social Post Search API](https://docs.crustdata.com/social-post-docs/indexed-search/introduction.md), [Social Post Watcher](https://docs.crustdata.com/watcher-docs/social-post/discovery.md)

## Give an AI agent B2B data

Connect Claude, ChatGPT, Cursor or your own agent to Crustdata through the MCP Server, the Crustdata CLI, or the Claude Code and Codex plugins. The agent calls the same search and enrichment endpoints, and uses Web Search and Web Fetch to read news, research papers and any public page.

Endpoints: [MCP Server](https://docs.crustdata.com/for-agents/mcp.md), [Crustdata CLI](https://docs.crustdata.com/for-agents/cli.md), [Claude Code plugin](https://docs.crustdata.com/integrations/claude-plugin.md), [Codex plugin](https://docs.crustdata.com/integrations/codex.md), [Web Search API](https://docs.crustdata.com/web-docs/search/introduction.md), [Web Fetch API](https://docs.crustdata.com/web-docs/fetch/introduction.md)

## Related pages

* [Data updates](https://docs.crustdata.com/general/data-updates.md) - how often each dataset is refreshed
* [Pricing](https://docs.crustdata.com/general/pricing.md)


## Related topics

- [Company Search API](https://docs.crustdata.com/company-docs/search/introduction.md)
- [Changelog](https://docs.crustdata.com/openapi-specs/2025-11-01/changelog.md)
