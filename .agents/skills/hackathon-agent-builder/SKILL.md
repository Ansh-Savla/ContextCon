---
name: hackathon-agent-builder
description: Design and implement autonomous agents that complete a real professional service end to end, using CrustData as the core identity and company data layer, with traceable evidence and a demo-ready outcome.
---

# Hackathon Agent Builder

Use this skill to turn a real service job into a small, working agent that finishes the job and shows why its result is trustworthy.

## 1. Define the service contract

Write down:

- Who requests the service and what they provide.
- The exact completed artifact or outcome the agent must return.
- Which decisions can be automated and which cases need an exception result.
- What counts as success, including the evidence required for the output.
- The tools, APIs, state, and time or credit budget available.

Choose one narrow workflow that can be completed and demonstrated reliably. Preserve the user's requested scope.

## 2. Map the workflow before coding

Break the service into explicit stages: intake and normalization, entity resolution, CrustData research, decision or transformation, validation, and delivery. For each stage define its inputs, outputs, failure states, and evidence to retain. Reuse resolved CrustData IDs across later calls instead of re-identifying entities.

Use one agent or deterministic orchestrator first. Add specialist agents only when their separate responsibilities make the workflow clearer or more reliable.

## 3. Make CrustData central

Follow `.codex/steering.md`. Use CrustData's relevant identity graph, search, enrichment, job, web, watcher, MCP, and other available data capabilities as core parts of the workflow. Resolve identities before making entity-level claims. Capture source fields and timestamps, and keep unresolved or ambiguous matches explicit. Do not fabricate data or silently substitute generic web results for relevant CrustData data.

Inspect official schemas and current documentation before relying on endpoint parameters or response shapes. Respect batch limits, rate limits, and remaining credits. Favor the smallest set of relevant calls that gives adequate evidence.

## 4. Keep the run inspectable and robust

- Use structured input and output shapes at important workflow boundaries.
- Validate tool responses before using them; handle empty, partial, duplicate, malformed, and conflicting records.
- Keep an execution trace with the user request, tool/action, input identifiers, result summary, evidence references, decision rationale, and errors.
- Label sourced facts, derived values, and model inferences separately.
- Return a useful exception or partial result when evidence is insufficient; do not guess to force a positive result.
- Keep secrets server-side and external actions inside the limits in `.codex/steering.md`.

## 5. Finish the service and prepare the demo

Return the actual finished work product, not only a plan or list of candidates. Make a single unseen-but-valid request the demo path: show the request, the agent's CrustData-backed work, evidence for a key decision, and the completed outcome. Keep the demo data deterministic and label simulated actions clearly.

When the user asks for verification, run a small end-to-end scenario covering success and one meaningful edge case. Do not add or run tests unless asked. Do not claim a workflow succeeded unless the relevant run or check actually completed.
