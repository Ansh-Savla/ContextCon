# Vendor trust investigation pipeline

Combine checks 1–4 in one investigation. Each check collects and cites its own evidence. Check 5 then searches for corroborating or conflicting information and revises the findings where justified.

```mermaid
flowchart TD
    A["Request: company name/domain, representative,<br/>documents or claims, optional internal roster"]
    B["Extract claims and identifiers<br/>Keep references to the submitted text"]
    C["Resolve company and people with CrustData<br/>Keep candidate matches and matching evidence"]
    D{"Identity clear enough<br/>for each check?"}
    U["Mark ambiguous identities unresolved<br/>Continue checks that have enough evidence"]
    E["Retrieve relevant company/person data once<br/>Save records, field paths and retrieval dates"]

    F1["1. Business identity and presence<br/>Compare name, domain, location and activity<br/>Cite company records and fetched sources"]
    F2["2. Possible impersonation<br/>Compare submitted domain and representative<br/>Cite identity and employment evidence"]
    F3["3. Operating claims<br/>Compare claimed scale with observed signals<br/>Cite workforce history and relevant business sources"]
    F4["4. Possible conflicts of interest<br/>Compare declared stakeholders with internal roster<br/>Cite supplied records and professional histories"]

    G["Combine initial findings and source references<br/>Record missing evidence separately"]
    H["5. Corroboration and adverse-information search<br/>Use CrustData web search/fetch for relevant claims<br/>Check entity match, dates and original sources"]
    I["Review evidence<br/>Reject namesakes; distinguish allegations from findings<br/>Adjust confidence up or down; preserve contradictions"]
    J["Apply simple rules<br/>Supported / conflicting evidence / insufficient evidence<br/>Every material finding must have a source"]
    K["Completed report<br/>Findings for all four checks, sources, confidence reasons,<br/>unresolved questions and policy-based next step"]

    A --> B --> C --> D
    D -->|Yes| E
    D -->|Partly or no| U
    U --> E
    E --> F1
    E --> F2
    E --> F3
    E --> F4
    F1 --> G
    F2 --> G
    F3 --> G
    F4 --> G
    G --> H --> I --> J --> K
```

## What each check can conclude

| Check | Useful result | Evidence gap to preserve |
|---|---|---|
| **1. Vendor legitimacy** | Submitted business details agree with, or conflict with, the resolved business and its observed activity | Legal existence requires authoritative registration evidence; provider status alone is insufficient |
| **2. Impersonation** | Submitted identifiers or representative details are inconsistent with the claimed business | Employment does not establish control of an email account or signing authority; alternate domains may be legitimate |
| **3. Shell-company risk triage** | Specific operating claims have support, conflicting evidence, or insufficient evidence | Sparse public data does not establish a shell company; ownership and transaction evidence may be unavailable |
| **4. Conflicts of interest** | A dated professional overlap or declared relationship needs disclosure review | Without an authorized internal roster, mark this check insufficient evidence; professional overlap alone does not prove a conflict |

## Keep the implementation small

Use one backend workflow with four check functions sharing the same retrieved records and source list. The branches show separate checks; they do not require separate agents. Use model calls to extract claims and summarize evidence, with ordinary code controlling identity thresholds, missing-data handling and final labels.

Every finding stores: **claim, result, evidence IDs, confidence reason and missing evidence**. Every evidence record stores: **URL or CrustData record ID, field path or excerpt, source date if known, and retrieval time**. Keep raw responses locally. A submission is evidence of what was claimed, not proof that the claim is true.

Check 5 is a bounded follow-up, not an automatic confidence boost. Fetch relevant primary sources where accessible and search for both corroboration and contradictions. No adverse search results do not establish a clean record. Repeated articles citing the same source do not count as independent corroboration. Stop at the request's time/credit budget and report remaining gaps.

Apply the [sample's observed limitations](shark-information-crust-data-provides.md): null hiring is unknown, revenue is estimated, employee ranges and measured headcount have different meanings, news can concern namesakes, and unknown freshness stays unknown. Skip unavailable checks rather than inventing evidence. Return a partial report when calls fail.

The output is an investigation and bounded next-step recommendation. Keep actions local and read-only; do not contact people or perform transactions. This document describes the requested vendor workflow and does not change the separate SignalGate investment-diligence plan in project steering.
