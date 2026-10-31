# Trust and Compliance with CrustData

The theme brief describes Trust & Compliance as telling real businesses from shell companies, setting credit limits, and running fraud analysis. CrustData has no corporate registry, but it can answer a question that matters just as much: **does this company look like a real, operating business?** Its data on headcount over time, employees' work histories, hiring, web presence and founders' backgrounds is hard for a shell company to fake.

## Ideas, mapped to CrustData endpoints

### 1. "Is this business real?" (KYB / shell-company detector)

- **Input:** something messy, like a company name, domain, invoice PDF text or email signature.
- **Steps:**
  - Company Identify resolves it to a canonical company.
  - Company Enrich pulls headcount trend, founding date, funding, web traffic and locations.
  - Person Search finds people who currently work there.
  - Person Enrich checks whether those employees have plausible career histories or look like thin, fake profiles.
  - Job Search checks whether the company is actually hiring.
  - Web Search/Fetch checks registries (OpenCorporates, MCA, Companies House) and news.
- **Red flags:** 0–2 employees but a large claimed revenue, a founder linked to many short-lived companies, a recent domain, a registered-agent address, no web footprint, or a mismatch between the claimed and observed industry.
- **Output:** a legitimacy score with a cited source for every signal.

### 2. Trade credit limit agent

- **Input:** "Vendor X wants ₹50L of net-60 credit."
- The agent estimates the company's real size from headcount, growth or decline, funding stage, hiring speed and web traffic.
- It recommends a limit with its reasoning and the conditions behind it ("cap at ₹15L until 6 months of history; headcount fell 30% in Q3").

### 3. Vendor-onboarding / invoice fraud check (business email compromise)

- **Input:** "Invoice from john@acme-corp.co asking us to change bank details."
- The agent checks that the domain matches the canonical Acme domain (catching lookalikes) and that John really works at Acme in finance (Person Search/Enrich). It also checks whether he recently left the company.
- **Output:** a verdict of approve, hold or escalate.

### 4. Founder and director network analysis

- The agent takes the founders and executives and pulls their past companies.
- It builds a small graph and flags patterns: serial short-lived companies, the same few people across many entities, or links to known-bad companies found through adverse-media web search.

### 5. Continuous monitoring with Watcher

- Watcher subscribes to approved counterparties.
- Signals like layoffs, CFO or CEO departures, headcount collapse or negative news automatically trigger a re-score and a credit-limit downgrade with an audit trail. This shows "zero human intervention" well in a demo.

### 6. Adverse media and PEP-lite screening

- The agent runs a person or company through web search and fetch, clusters hits for fraud, litigation and sanctions, and removes false positives by matching on CrustData's canonical identity (same person versus same name).

## Recommendation for a 5-hour sprint

Build **#1 as the core, with #3 or #5 as the "wow" add-on**, packaged as an MCP server or CLI agent. Here's how that lines up with the judging criteria:

- **End-to-end:** one unseen request ("Onboard this vendor: <pasted invoice>") goes in, and a finished KYB report with a decision comes out.
- **Data integrity:** keep an evidence ledger where every claim links to the CrustData response or the URL it came from. Judges explicitly score this.
- **Robustness:** show it handling messy inputs like typos, a parent company versus its subsidiary, a missing domain, Identify returning several candidates, empty enrich fields and API errors. Make "insufficient data → escalate" an explicit outcome rather than a hallucinated score.
- **Demo:** run a side-by-side of a real company versus a shell-like one, with the score and cited red flags appearing live.

The event rules forbid agents from contacting real people, so keep all checks read-only through APIs. No emailing vendors to verify.
