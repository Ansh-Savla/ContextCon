# Trust and Compliance with CrustData

The strongest idea is a **business verification agent**: give it a vendor's name, website, and onboarding documents; it returns an evidence-backed assessment of whether the claimed business identity is consistent, what looks suspicious, and what remains unverified.

The [problem statement](Problem-Statement/ContextCon%20PS%20-%20CrustData.pdf) explicitly includes distinguishing genuine businesses from shell companies, setting credit limits, and fraud analysis. It also requires a completed workflow with verifiable evidence in a two-minute demo.

CrustData provides the core research layer: company identification and enrichment, professional profiles, web search/fetch, and change monitoring. These support the following product ideas. [API documentation](https://docs.crustdata.com/openapi-specs/2025-11-01/introduction)

| Idea | What the agent does with CrustData | Finished deliverable | Additional evidence needed |
|---|---|---|---|
| **1. Vendor legitimacy check** | Resolves the company; compares submitted details against its domain, location, leadership, workforce, and public presence | Vendor verification report with matched facts, contradictions, and missing evidence | Official registration records to establish legal existence |
| **2. Business impersonation detector** | Compares the claimed company and representative with canonical company and professional identities | Case report showing domain, company, and employment mismatches | Authorized signatory or domain-control evidence where required |
| **3. Shell-company risk triage** | Investigates whether claimed scale and operations align with workforce, hiring, leadership, and public activity | Evidence matrix identifying inconsistencies and unresolved questions | Ownership, filings, and transaction records for stronger conclusions |
| **4. Vendor conflict-of-interest checker** | Resolves vendors and declared stakeholders; compares professional histories with an authorized internal roster | Relationship map with dated overlaps and disclosure questions | Internal declarations and ownership records |
| **5. Adverse-information investigator** | Resolves the correct entity, searches for relevant reports, fetches sources, and separates namesakes | Dated investigation dossier with source quality and match confidence | Authoritative regulator, court, or sanctions records for those checks |
| **6. Trade-credit assessment assistant** | Builds company context from size, funding, workforce trends, and public business signals | Policy-based credit recommendation with assumptions and evidence gaps | Financial statements, payment history, and existing exposure |
| **7. Continuous vendor review** | Tracks supported company/person field changes and reruns relevant checks | Updated risk dossier explaining what changed and why it matters | Separate scheduled checks for sources outside supported watcher fields |

Company and people enrichment supply the business and employment context; web APIs support source investigation. Watchers can track supported person/company field changes, subject to account permissions. [Company enrichment](https://www.crustdata.com/apis/company-enrichment), [People enrichment](https://www.crustdata.com/apis/people-enrichment), [Web search](https://docs.crustdata.com/api-reference/web-apis/web-search), [Watcher documentation](https://docs.crustdata.com/api-reference/watch-apis/create-an-entity-watch)

## Recommended hackathon build: Vendor Trust Investigator

Combine ideas 1 and 2. It has a clear buyer in procurement or vendor onboarding, makes CrustData central, and can finish a useful service within a narrow scope.

The workflow:

1. **Intake:** vendor name, domain, representative, and an onboarding form or invoice.
2. **Resolve:** identify the company through CrustData, preserving ambiguous matches.
3. **Investigate:** enrich the company and relevant representative; fetch evidence for specific claims.
4. **Compare:** check submitted claims against sourced facts using explicit rules.
5. **Deliver:** generate a report containing the identity match, claim-by-claim findings, evidence links, timestamps, and a policy outcome such as "checks satisfied," "contradiction found," or "insufficient evidence."

A strong demo would use a **clearly labeled synthetic onboarding application** that impersonates an established business. The agent resolves the genuine company, detects inconsistencies in the submitted domain or representative, and produces the completed case report without contacting anyone.

## Evidence and decision boundaries

Keep **evidence coverage separate from risk**. A small company with little public data should receive an "insufficient evidence" result. Sparse data alone does not establish fraud or shell-company status. Likewise, public professional profiles cannot establish beneficial ownership, signing authority, bank-account ownership, or compliance certification.

For the hackathon, keep all results local or within authorized APIs. Do not contact real people or perform external transactions. Any downstream action should be clearly labeled as simulated or prepared.

**Ranking:** vendor verification for the strongest overall build; impersonation detection for the clearest demo; continuous monitoring as the next extension.
