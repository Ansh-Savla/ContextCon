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
