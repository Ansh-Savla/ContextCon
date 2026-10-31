# CrustData Hackathon Project Steering

## Core strict rule

**Use CrustData to the maximum useful extent in every relevant workflow.** CrustData's API, canonical identity graph, MCP tools, and other available CrustData data products are core requirements, not optional integrations. Start with CrustData for person and company identity, enrichment, jobs, web research, and change monitoring whenever those capabilities support the task. Build the workflow around those capabilities instead of treating CrustData as a decorative demo call.

Use every relevant CrustData capability needed to finish the service accurately. Do not call unrelated endpoints just to inflate usage, burn credits, or add latency. When an important CrustData capability is unavailable, explain the gap and use a clearly labeled fallback only where needed to finish the workflow.

## Product objective

Build an agent that completes a real paid service from an unseen request to a finished, reviewable result. Optimize for useful autonomous execution, precise data, verifiable reasoning, robust handling of incomplete or conflicting inputs, and a clear two-minute demo. A prompt wrapper that stops at recommendations is not an end-to-end service.

## CrustData implementation rules

- Prefer CrustData for canonical person and company identification before joining, ranking, or making claims about entities.
- Use the relevant search, identify, enrich, job, web search/fetch, watcher, MCP, or other available CrustData capability as the task requires. Preserve match confidence, matched-on values, and unresolved records; never invent a match.
- Use returned evidence to support each material claim and decision. Preserve source, URL or record identifier, timestamps, relevant fields, and the reason a result supports the conclusion. Distinguish sourced facts from inference and uncertainty.
- Follow the CrustData API documentation and tool schemas. The event brief specifies `authorization: Bearer …` and `x-api-version: 2025-11-01`; verify the current official docs before implementation and surface any version mismatch rather than silently changing it.
- Check remaining credits, batch within documented limits, use free/low-cost identity resolution before paid enrichment, and handle rate limits with backoff. Maximize relevant coverage while keeping calls purposeful.
- Keep API keys and tokens in environment variables or the approved credential store. Never commit, print, or expose them in client-side code.

## Hackathon boundaries

- The event brief says agents may interact only with the team's local environment and authorized APIs. Do not message, call, email, or otherwise interact with external real people. CrustData skills may include outreach workflows; those steps are out of scope here.
- Do not submit real purchases, payments, applications, or other external transactions. If a service needs such an action to demonstrate completion, represent it as a clearly labeled simulated or prepared action.
- The event materials conflict on whether CrustData use is optional. This project follows the strict requirement above: CrustData use is mandatory.
- Idea and architecture preparation are allowed by the brief; coding was scheduled to begin at 10:30 AM on October 31, 2026. Respect any event-day rule that applies to the team's participation.

## Agent and interface quality

- Model the real workflow: request intake, structured plan, tool execution, evidence capture, deterministic validation, exception handling, and a finished deliverable.
- Keep each decision traceable to evidence. Make uncertainty and exceptions visible instead of silently guessing or dropping data.
- Build a distinctive, high-craft, demo-ready UI when the product needs one. Make it specific to the service and its data, accessible, legible, and usable at the demo screen size. Avoid generic AI dashboards and decorative UI without a workflow purpose.
- Inspect the existing files and stack before choosing frameworks or adding dependencies. Keep the implementation small enough to finish and explain in the hackathon window.
- Do not add or run tests unless the user asks to test or verify implementation. If asked to verify, choose checks that cover the actual end-to-end workflow and report what ran.

## Skill routing

Project skills live under `.agents/skills/` so Codex can discover them. Use `hackathon-agent-builder` for service workflow and evidence design, `frontend-craft` for product UI, and the official CrustData skill matching the use case. For current API behavior, trust CrustData's official docs and tool schemas over old examples in a skill.

## Active product direction: Trust-compliance-shresth

The active product is **SignalGate**, a startup investment diligence and trust-signal triage agent. Its primary workflow accepts a startup's name/domain, optional founder profiles, investor thesis, and a small set of claims to check; it returns a company/person identity resolution, thesis-fit brief, evidence-backed claim matrix, risk signals, unresolved questions, and a bounded next-step recommendation.

Keep investment fit and trust evidence as separate dimensions. The result is a diligence triage artifact, not an investment decision, fraud determination, KYC/AML clearance, legal opinion, or compliance certificate. Allowed result language includes supported, conflicting evidence, potential issue to review, and insufficient evidence. Missing public data is not evidence of fraud. Similar names, allegations, inferred affiliations, professional history, workforce changes, and domain signals must never be presented as proof of wrongdoing, beneficial ownership, payment authority, or legal status.

CrustData is the required identity and operating-context layer. Resolve company and people identities first; then use only relevant, permitted, credit-budgeted enrichment, professional history verification, jobs, news/web search and fetch, and optionally watchers. Inspect `/account/endpoints` and remaining credits before a demo run. Use verification only if the account has that add-on and the budget allows it. Treat registry, sanctions, filings, and other external sources as jurisdiction-scoped evidence overlays, with their source and retrieval date retained. Gemini may extract claims and summarize supplied evidence into a schema; deterministic rules must control match thresholds, evidence labels, and final triage outcomes.

The hackathon MVP is one read-only pre-investment diligence workflow with an evidence ledger and a compact company/person/claim/source graph. Do not expand the MVP into trade-credit underwriting, payment authorization or invoice bank-change approval, full beneficial-ownership discovery, global PEP/AML screening, continuous monitoring, or a multi-agent platform. Those require datasets, permissions, controls, and time not established in the current project. Watchers, more jurisdictions, and richer monitoring are later phases only after the core demo works.

## Scope, critique, and course-correction rules

- Before implementation, read `Trust-compliance-shresth/PLAN.md`; this is the concrete execution plan and records assumptions, source coverage, keys, demo path, deliverables, and acceptance criteria.
- When a proposed feature depends on unavailable data, paid access, permissions, legal authority, or a longer workflow, state the limitation and propose the smallest evidence-backed alternative. Do not preserve an attractive feature name if the actual capability cannot support it.
- Surface material ambiguity early. If it does not block safe progress, state a reversible assumption in the plan and continue. Ask the user only when an answer changes scope, access, cost, or data handling in a material way.
- Course-correct when API permissions, credit balance, data coverage, official source behavior, event rules, or observed demo results contradict the plan. Update the plan and steering together, explain the change and its reason, and keep the MVP boundary intact unless the user explicitly freezes a different scope.
- Do not add endpoints, paid services, datasets, frameworks, visual assets, or agents just because they are available. Each must directly improve the completed diligence artifact or its evidence quality and fit the time/credit budget.
- Keep source claims and product claims aligned. If a source cannot substantiate a claim, label it unresolved instead of making the system appear more certain.
- The current directory is a blank project shell. Inspect it again before choosing dependencies or scaffolding; do not assume the stack in this plan is already installed. Keep all secrets server-side, in ignored local environment files or a managed secret store, and never expose them to browser code, logs, screenshots, commits, or sample fixtures.
