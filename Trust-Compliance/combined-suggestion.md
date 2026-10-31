# Combined suggestion: Vendor Trust Investigator

Build an agent that takes a messy vendor onboarding request and returns a completed, evidence-backed investigation report. Combine business identity verification with impersonation checks, using CrustData as the core identity and research layer.

This combines [Sol's proposal](sol-reply.md) and [Opus's proposal](opus-reply.md), while keeping conclusions within what the evidence can establish.

## Service contract

**Buyer:** procurement, vendor onboarding, or a business trust team.

**Input:** a vendor name, domain, representative, and optional onboarding form, invoice, or pasted email text. Include the claims to check and the applicable onboarding policy.

**Finished output:** a local investigation report and structured JSON containing:

- Resolved company and person identities, match confidence, and unresolved alternatives.
- A claim-by-claim comparison of submitted information against sourced evidence.
- Contradictions, missing evidence, source freshness, and investigation limitations.
- A policy outcome: `checks_satisfied`, `contradiction_found`, or `insufficient_evidence`.
- An evidence ledger linking material findings to source records or URLs and timestamps.

The agent completes the investigation autonomously. An insufficient-evidence outcome is a completed investigation with explicit gaps; it does not imply that the vendor is fraudulent. Outcomes apply only to the checks actually performed and do not certify overall legal compliance.

## Core workflow

1. **Extract and normalize.** Parse names, domains, addresses, representative details, and business claims from the submitted material. Preserve the original text supporting each extracted claim.
2. **Resolve identities.** Use CrustData Company Identify and the relevant person identification/search capabilities. Resolve the claimed business separately from a potentially suspicious submitted domain. Preserve multiple candidates and distinguish parent companies, subsidiaries, and trading names.
3. **Research relevant claims.** Enrich the resolved company and relevant representative. Use company history, workforce trends, professional histories, hiring, and public information only where they help assess a submitted claim.
4. **Investigate discrepancies.** Use CrustData web search and fetch to retrieve supporting sources. Consult authoritative registration or regulatory records where needed and accessible; report unavailable evidence explicitly.
5. **Apply explicit rules.** Compare each claim with the evidence. Keep sourced facts, derived comparisons, and model inferences separate. Record the policy rule behind each outcome.
6. **Deliver the case.** Generate the report, structured findings, evidence ledger, and execution summary. No external outreach or transactions are required.

## What to adopt from both proposals

| Capability | Purpose | Scope |
|---|---|---|
| Canonical company identity resolution | Avoid investigating a namesake or joining evidence to the wrong entity | Core |
| Domain and representative consistency checks | Identify possible impersonation in onboarding documents or invoices | Core |
| Claim-to-evidence comparison | Show exactly which submitted details agree, conflict, or remain unverified | Core |
| Historical operating signals | Compare claimed scale with workforce trends, hiring, and public activity | Use when relevant to a claim |
| Evidence ledger | Make every material finding reviewable | Core |
| Relationship graph | Show shared executives or professional histories for further investigation | Later extension |
| Continuous review | Reassess findings when supported company or person fields change | Later extension |
| Trade-credit assessment | Combine business context with financial records and a credit policy | Separate future workflow |

## Evidence and decision boundaries

**Separate evidence coverage from risk.** Few employees, sparse profiles, no hiring, or little web presence do not establish fraud or shell-company status. A newly formed or small legitimate business can have all these characteristics. A contradiction between a specific submitted claim and reliable evidence is more useful than a generic legitimacy score.

Public company and professional information can corroborate identity and operating activity. It does not, by itself, establish legal registration, beneficial ownership, signing authority, control of an email account, or bank-account ownership. A matching finance employee does not authorize a payment or bank-detail change.

Treat shared employers and overlapping professional histories as relationship evidence. Do not present them as verified directorship, ownership, collusion, or wrongdoing. Resolve adverse-information hits carefully and distinguish allegations from established findings. Avoid claiming PEP or sanctions screening coverage without the appropriate authoritative sources and matching process.

Do not derive a precise credit limit from headcount, funding, or traffic alone. That workflow needs financial statements, payment history, existing exposure, and an explicit credit policy.

Prefer claim-level statuses and visible coverage over an unexplained numeric legitimacy score.

## Robustness requirements

- Handle typos, missing domains, ambiguous names, parent/subsidiary relationships, and conflicting identifiers.
- Preserve unresolved identity matches rather than silently selecting one.
- Distinguish an empty response, unavailable field, stale evidence, and tool failure from a negative finding.
- Return partial findings with explicit gaps when a source or API is unavailable.
- Track evidence publication dates and retrieval times; avoid treating stale employment information as current confirmation.
- Keep policy checks deterministic where possible and attach evidence references to their results.

## Five-hour MVP

Implement one intake path, company and representative resolution, targeted enrichment, domain/claim comparison, and a completed report with an evidence ledger. Support pasted text first; add document parsing only if the existing stack makes it practical within the sprint.

Use the relevant CrustData capabilities purposefully. Check credits, resolve identities before paid enrichment, reuse canonical IDs, respect documented limits, and handle rate limits. Verify current schemas and field entitlements before implementation. Pin the API version required by the project and keep credentials server-side, outside logs and source control.

Defer relationship visualization, broad screening coverage, credit-limit decisions, and continuous monitoring until the core investigation works end to end. Watcher extensions must use supported and entitled fields; negative-news monitoring may require separate scheduled research.

## Two-minute demo

Submit a previously unseen, clearly labeled synthetic onboarding application that claims to represent an established business and includes an inconsistent domain or representative detail.

1. Show the submitted claims.
2. Show CrustData resolving the claimed business and retrieving relevant evidence.
3. Open one contradiction and its source.
4. Show the completed report and policy outcome.
5. Show how missing or ambiguous evidence produces an explicit unresolved result.

Any comparison case should also be labeled synthetic where appropriate. Do not describe a real business as fraudulent based on sparse public data. Keep all checks within the local environment and authorized APIs; do not contact real people, change real credit limits, approve payments, or perform external transactions. Label downstream actions as simulated or prepared.

## Supporting references

- [Problem statement](../Problem-Statement/ContextCon%20PS%20-%20CrustData.pdf)
- [Project steering](../.codex/steering.md)
- [CrustData API introduction](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction)
- [Company enrichment](https://www.crustdata.com/apis/company-enrichment)
- [People enrichment](https://www.crustdata.com/apis/people-enrichment)
- [Web search](https://docs.crustdata.com/api-reference/web-apis/web-search)
- [Entity watches](https://docs.crustdata.com/api-reference/watch-apis/create-an-entity-watch)
