# SignalGate: end-to-end examples

Each example is a request the agent has not seen before. It is pasted as-is, and the agent runs it to a finished, cited case report with no follow-up questions. These texts are the intake chips in the UI and the demo fixtures.

- **Investment lens:** E1, E2, E3, E7, E8
- **Trust lens:** E4, E5, E6
- **Heartbeat:** computed for every resolved company.

Marked inputs are synthetic.
- Requests labelled **SYNTHETIC DEMO INPUT** are made up for the demo.
- Their representatives are fictitious and the domains are invented lookalikes.
- None of them alleges wrongdoing by a real person or company.

Company coverage marked ✅ was resolved live on 31 Oct 2026, by domain, at confidence 1.0 (see `../Trust-Compliance/shark-information-crust-data-provides.md`).

---

## E1: VC associate, pre-investment screen (investment)

**Persona:** Associate at a US seed fund preparing a first-pass screen before a partner call.

```text
hey, can you screen Misto for me (mistobox.com)? coffee subscription co,
founders say founded 2012, team of ~10, and they were backed on Shark Tank.
our thesis: US consumer subscription, under 50 staff, founded before 2015,
want a heartbeat of at least 40.
```

- **CrustData:** `company/identify` by domain ✅ (ID 2436762) → `company/enrich` → founders from `people` → free `job/search` count → `web/search/live` news.
- **Expected:**
  - Thesis-fit checklist: sector, geo, size (9 measured), founded year, and Heartbeat against 40.
  - "Backed on Shark Tank": **insufficient evidence** unless a relevant source turns up. A provider funding total of 0 is not proof that they never raised.
  - **Outcome:** Advance to human diligence, plus open questions.

## E2: Angel / syndicate lead, founder claim check (investment)

**Persona:** Syndicate lead checking a founder's pitch claims before taking allocations.

```text
Founder of Tom & Chee (tomandchee.com) pitched us today. Says he co-founded it in 2009,
they now have about 1,000 staff and do $500M+ revenue. Can you sanity check before I
send this to the syndicate?
```

- **CrustData:** identify ✅ (ID 1228597) → enrich (`people.founders`, `headcount`, `revenue`) → `person/search` founder at the company ID → `person/enrich` work history.
- **Expected:**
  - Founded 2009: supported, cited.
  - Staff: profile range 501–1000 vs measured 107. **Conflicting evidence**, with both values shown and labelled.
  - Revenue: matches the provider *estimate* only, labelled as an estimate.
  - Heartbeat checked against the "1,000 staff" scale claim (rule T-HB).
  - **Outcome:** Hold for specific verification.

## E3: Indian early-stage VC analyst, forwarded pitch (investment)

**Persona:** Analyst at an India-focused fund triaging a forwarded deck email.

```text
---------- Forwarded message ---------
From: <partner>
Subject: Fwd: Intro - <COMPANY> (<domain>)

pls take a look, looks interesting. Fintech, founded by <Founder A> (ex-<Employer>) and
<Founder B>, raising Series A, claim ~120 people. Thesis fit = India fintech seed–Series A.
Sent from my iPhone
```

The company is chosen at preflight from 2–3 well-covered Indian fintechs, and the placeholders are filled from real records.

- **CrustData:** identify → enrich → founders confirmed as currently at the company ID → `priorFounderRoles` (repeat founder) → free job count → 2 news searches.
- **Expected:**
  - Thesis-fit table and Heartbeat.
  - Each founder or employer claim marked supported, conflicting or insufficient.
  - **Outcome:** set by the rules.

## E4: Procurement officer, vendor onboarding (trust)

**Persona:** Procurement officer onboarding a new bakery supplier.

```text
New supplier form
Company: Wicked Good Cupcakes
Website: wickedgoodcupcakes.com
HQ: Massachusetts, USA
Employees: 150
Established: 2011
```

- **CrustData:** identify by domain ✅. The name alone returns several exact candidates; the domain picks ID 2525868. Then enrich for `locations` and `headcount`.
- **Expected:**
  - Identity, location and founded year: supported.
  - Size: profile range 51–200 fits the claim, but measured headcount is 2. **Conflicting evidence**, with the meaning of each value explained.
  - Heartbeat is probably Faint or Low signal, with **no trust penalty** for being small.
  - **Outcome:** Hold for specific verification.

## E5: AP controller, bank-detail change request (trust, hero demo)

**Persona:** Accounts-payable controller who receives an urgent bank-change request.

```text
SYNTHETIC DEMO INPUT
From: Alex Sample <alex.sample@tomandchee-payments.co>
Subject: URGENT - updated remittance details

Hi, I'm the new finance lead at Tom & Chee. Our bank changed, please update our
remittance details before Friday's payment run. New account details attached.
```

- **CrustData:**
  - identify `tomandchee-payments.co` → no match or a different company.
  - identify the name "Tom & Chee" → canonical `tomandchee.com` ✅.
  - Lookalike-domain rule: brand plus an extra token, different TLD.
  - `person/search` for "Alex Sample" at the company ID → none.
- **Expected:**
  - Domain mismatch.
  - Representative not found at the company.
  - **Outcome:** Hold, contradiction found.
  - Note in the report: no payment action was taken, and payment authority can't be confirmed from public data.

## E6: Credit / risk analyst, name-only supplier (trust, robustness)

**Persona:** Credit analyst asked to triage a supplier with almost no details.

```text
supplier "Zeta" wants net-60 terms, says they have 500 staff. thoughts?
```

- **CrustData:** identify by name → several candidates with close scores → ambiguity rule.
- **Expected:**
  - **Outcome:** Insufficient evidence, because the identity is ambiguous.
  - Top candidates are listed with domain, size and score.
  - No company-specific conclusions.
  - No credit limit: that is out of scope by design.

## E7: Fund compliance officer, adverse-information pre-check (investment + trust)

**Persona:** Compliance officer doing a pre-term-sheet media check.

```text
Before we issue a term sheet to <E3 company>: anything regulatory, legal or
fraud-related on the company or its founders?
```

- **CrustData:** reuse the E3 IDs → `web/search/live` (news, name plus domain, date-bounded) → relevance filter → `web/enrich/live` on at most 3 sources.
- **Expected:**
  - Each hit labelled relevant or likely namesake.
  - Each relevant hit labelled allegation, regulator action or court finding.
  - "No relevant adverse results in N sources" is never reported as a clean record.

## E8 (stretch): IC member, conflict of interest (investment)

**Persona:** Investment-committee member checking for undisclosed overlaps.

```text
Run E1 again, and check against our partner roster:
[{"name": "Pat Example (SYNTHETIC)", "past_employers": ["<employer>"]}]
```

- **CrustData:** founders' work histories (`person/enrich`) compared with the supplied roster.
- **Expected:** dated overlaps are reported as **potential issue to review**. Without a roster, the check shows "not checked: no roster supplied".
