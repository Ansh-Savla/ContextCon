> **Historical (v1).** Superseded by the rebuilt app in [`signalgate/`](signalgate/) — see its README.

# SignalGate: the Shark Tank Diligence Desk (US + India examples)

Each request below is pasted as-is. The agent takes it, with no follow-up questions, to a finished deliverable and a local action, as described in [PLAN.md](PLAN.md).

- **Market coverage:** US (E1, E2, E4, E8) and India (E3, E5, E6, E7).
- **Lenses:** investment (E1, E2, E3, E8, E9) and trust (E4, E5, E6, E7).
- Company IDs marked ✅ were resolved live on 2026-10-31.

Every request labelled **SYNTHETIC DEMO INPUT** is made up for the demo:
- representatives are fictitious
- domains are invented lookalikes
- no wrongdoing is alleged against a real person or company

Facts quoted below in "What the run must catch" come from the teammates' live CrustData and web research. They are expectations for the run to verify, not hard-coded answers.

---

## E1 · US · VC associate → pre-investment screen: Misto ✅ (id 2436762)

```text
hey, can you screen Misto for me (mistobox.com)? coffee subscription co from Shark Tank,
founders say founded 2012, team of ~10, and they got a Shark deal.
our thesis: US consumer subscription, under 50 staff, founded before 2015,
want a heartbeat of at least 40.
```

**What the run must catch:**
- Resolve by **domain**. A name-only lookup gives the wrong record, MistoBox LLC at 0.8.
- Measured headcount is 9.
- A funding total of 0 is not proof that no deal happened.

**Deliverable / action:**
- IC memo: thesis fit, Heartbeat, claim matrix.
- Pipeline entry: **Advance**.
- Open question: "Shark deal: insufficient evidence".

## E2 · US · Angel → founder-claim check: Tom + Chee ✅ (id 1228597)

```text
Founder of Tom + Chee (tomandchee.com) pitched our syndicate. Says he co-founded it in 2009,
they now have about 1,000 staff and do $500M+ revenue. Sanity check before I send it out?
```

**What the run must catch:**
- Founded 2009: supported.
- Staff: profile range 501–1000 vs measured 107. **Conflicting**, with both values shown.
- $500M–1B revenue is a provider *estimate*, labelled as such.
- Heartbeat is checked against the scale claim (rule T-HB).

**Deliverable / action:**
- Founder dossier.
- Syndicate record note: **Hold**.

## E3 · India · India VC analyst → screen of a messy forwarded pitch: BluePine Foods ✅ (id 12347153)

```text
---------- Forwarded message ---------
From: partner
Subject: Fwd: BluePine Industries - Shark Tank India S1

pls look at BluePine Industries (frozen momos, Delhi NCR). Shark Tank India deal
Rs 75 lakh for 12%, founders Aditi Bhutia Madan and Naveen Panwar run it together,
team of ~20 now. Thesis: India consumer food brands, seed-Series A, min heartbeat 40.
site: bluepinefoods.com
Sent from my iPhone
```

**What the run must catch:**
- **Name recovery:** "BluePine Industries" gives no match (only Reliance Industries and others). The domain resolves BluePine Foods at confidence 1.0.
- The company describes itself as "first pitcher… #sharktankindia". That counts as self-reported support only.
- The ₹75L Shark deal is **absent from CrustData funding**, which shows $0 and one IIT Mandi Catalyst seed round, but the web reports it. Mark it **conflicting sources** and request the cap table.
- **Naveen Panwar left in Oct 2023**, so the "run it together" claim is **conflicting**.
- Measured headcount is 4, against the claimed ~20: **conflicting**.
- Revenue estimate $1M–2.5M is unverified.
- Web traffic is volatile (rule R-VOLATILE).

**Deliverable / action:**
- IC memo.
- Pipeline entry: **Hold**.
- Diligence questions: cap table, Shark deal closure, team size.

## E4 · US · Procurement officer → vendor onboarding: Wicked Good Cupcakes ✅ (id 2525868)

```text
New supplier form
Company: Wicked Good Cupcakes
Website: wickedgoodcupcakes.com
HQ: Massachusetts, USA
Employees: 150
Established: 2011
```

**What the run must catch:**
- The name alone gives several exact candidates, so the domain decides.
- Range 51–200 vs measured 2: **conflicting**.
- A small, real firm is **not penalised** for being small.

**Deliverable / action:**
- Auditor-ready vendor file.
- Vendor master entry: **Exception**.

## E5 · India · AP controller → bank-change / BEC check (SYNTHETIC)

```text
SYNTHETIC DEMO INPUT
From: Rohit Sample <rohit.sample@bluepinefoods-payments.in>
Subject: URGENT: revised bank details for pending invoices

Hi team, I am the new Finance Head at BluePine Foods. Our bank account has changed.
Please update remittance details before this Friday's payment run for the Rs 4.2 lakh invoice.
```

**What the run must catch:**
- `bluepinefoods-payments.in` vs canonical `bluepinefoods.com`: a lookalike (brand plus extra token, different TLD).
- "Rohit Sample" is not found at company id 12347153.
- ₹4.2 lakh is parsed as INR 420,000.

**Deliverable / action:**
- **Payment hold** written to `data/ap-queue.json`.
- Complaint-ready case file.
- Prepared (unsent) task to call back on the number in the vendor master.

## E6 · India · Credit analyst → supplier triage, name only

```text
supplier "Zeta" wants net-60 terms, says they have 500 staff. thoughts?
```

**What the run must catch:**
- Many close identify candidates, so the identity is ambiguous.
- No company-specific conclusions.
- No credit limit: out of scope by design.

**Deliverable / action:**
- Exceptions-inbox item: **Insufficient evidence**, with the candidates listed (domain, size, score).

## E7 · India · Compliance → adverse-information pre-check: BluePine Foods

```text
Before we send a term sheet to BluePine Foods (bluepinefoods.com): anything regulatory,
legal or fraud-related on the company or its founders?
```

**What the run must catch:**
- Reuse the E3 IDs.
- A web result about "₹50L for 20% with Varun Alagh" is **a different pitch**, so reject it (rule R-OTHER-EVENT).
- Relevant hits are labelled allegation, regulator action or court finding.
- No hits is never reported as "clean".

**Deliverable / action:**
- Dated dossier.
- Compliance log entry.

## E8 · US · VC → follow-on / zombie check: VerbalizeIt (id 1919920)

```text
VerbalizeIt (Shark Tank season 4, human translation) - they say they have 45 people and
spend ~$27K/month on Google Ads, raising a bridge. worth a follow-on look?
```

**What the run must catch:**
- **Acquired by Smartling on 2016-05-19**, yet the provider shows `status=active`. Flag that conflict (rules R-ACQUIRED and R-STATUS-CONFLICT).
- `all_domains` includes smartling.com, so the ~700K visits and $27.1K/mo ads belong to the acquirer. Exclude them from Heartbeat.
- The 45 "employees" are likely stale profiles.
- Both founders left within 0–5 months of the acquisition (end dates cited).
- The Shark Tank S4 deal ($250K for 20% with O'Leary) did not close. That comes from web sources, labelled.

**Deliverable / action:**
- Memo, pipeline entry: **Pass: not an independent company**.
- Heartbeat shows ghost signals that are excluded.

## E9 (stretch) · IC member → conflict of interest

```text
Re-run E3, and check against our partner roster:
[{"name": "Pat Example (SYNTHETIC)", "past_employers": ["NSRCEL-IIM Bangalore"]}]
```

**Deliverable:** dated overlaps reported as **potential issue to review**. Without a roster, the check reads "not checked: no roster supplied".
