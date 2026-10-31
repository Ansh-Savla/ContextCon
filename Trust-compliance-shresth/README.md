# SignalGate: a diligence desk for investors and lenders (India + US)

**One request in, finished work out.** Paste a forwarded pitch, a loan application, or an email asking you to wire money. SignalGate's agents:
1. verify the company and its people in **CrustData's canonical identity graph**
2. screen for payment fraud and adverse news (**Tavily**, with a CrustData web fallback)
3. build the investment case or the credit case
4. decide using cited rules
5. **complete the work**: an IC or credit memo, the deal pipeline or credit file updated, conditions precedent listed, and a wire placed on hold when fraud is suspected

A human only sees the exceptions.

Built for ContextCon 03 at IIT Bombay (CrustData × YC), in the *Investing* and *Trust & Compliance* themes.

## One desk, two clients

| | Investor (equity) | Lender (credit / KYB) |
|---|---|---|
| Question | "Should we write this cheque?" | "Should we lend, and how much is sane?" |
| Compliance track | KYB, people, fraud and adverse screening, giving **Cleared / Cleared with conditions / Not cleared / Insufficient** | Same |
| Business track | Thesis fit, traction, funding history, team, company activity | Credit readiness grade (A–D), requested amount vs an **indicative policy cap** (labelled as illustrative) |
| Decision | Proceed to term sheet / Proceed only with conditions / Decline / Stop the wire | Ready for underwriting / Refer / Decline / Insufficient |
| Finished work (local, simulated) | Pipeline stage, closing checklist (conditions precedent), wire hold, IC memo | Credit file, KYB register, credit memo |

## Live demo cases

| Case | Market | Outcome | What the agents caught |
|---|---|---|---|
| BluePine pitch | India | **Proceed only with conditions** | Wrong company name recovered from the website. Co-founder **left in 2023-10**. 4 measured staff vs "~20". The ₹75L Shark Tank deal is in the press but **not in the funding record**, so the closing checklist asks for the cap table. |
| BluePine closing wire (synthetic) | India | **Stop the wire** | `bluepinefoods-payments.in` is a lookalike domain, and the "CFO" was never at the company. Wire hold plus a prepared call-back. |
| VerbalizeIt follow-on | US | **Decline: not independent** | Acquired by Smartling (2016) but still listed "active". Ad spend and traffic belong to the acquirer. |
| Misto first screen | US | **Proceed to term sheet** | 5/5 thesis fit. The Shark deal is reported but not in the funding record, so it becomes a condition. |
| Wicked Good Cupcakes credit line | US | **Decline** | Claims "independent" but is a subsidiary of Hickory Farms. 2 measured staff vs 150 claimed. Grade D. |
| Tom + Chee expansion loan | US | **Decline** | Claims independence, but was acquired by Gold Star Chili (2017). 107 measured staff vs "~1,000". |
| Zeta credit line | India | **Insufficient: KYB incomplete** | 25 companies match the name, so no conclusions are drawn |

## Quick start

```bash
cd Trust-compliance-shresth/signalgate
npm install && cp .env.example .env.local   # add CRUSTDATA_API_KEY (+ optional TAVILY / GEMINI keys)
npm run dev                                   # http://localhost:3000
```

Full developer guide (keys, credits, code map, troubleshooting): [signalgate/README.md](signalgate/README.md).

## What is sourced from CrustData

| What you see | CrustData endpoint · fields |
|---|---|
| Company identity, candidates, confidence | `/company/identify` · `matches[].confidence_score`, `basic_info` |
| Name, website, founded, HQ, status, industry, logo | `/company/enrich` · `basic_info`, `locations`, `taxonomy` |
| Ownership / acquirer, and the parent company | `/company/enrich` · `funding.acquired_by`, `revenue.acquisition_status`; parent via identify + enrich |
| Measured headcount, growth, history chart, self-reported band, team mix, map | `/company/enrich` · `headcount.total`, `growth_percent`, `timeseries`, `by_role_absolute`, `by_region_absolute`, `basic_info.employee_count_range` |
| Funding rounds, investors, timeline events | `/company/enrich` · `funding.milestones`, `funding.investors` |
| Revenue estimate band, web traffic, followers, ad spend, news | `/company/enrich` · `revenue.estimated`, `web_traffic`, `followers`, `seo`, `news` |
| Founders and officers, photos, tenure, departures | `/company/enrich` · `people.*`; `/person/search` · `experience.employment_details`, `basic_profile.profile_picture_permalink` |
| Hiring (roles in 90 days) | `/job/search` (`limit:0`) |
| Peer companies | `/company/search` |
| Post-closing monitoring rule | `/watch/company/test` (Watcher preview) |
| **Not CrustData** | Tavily (adverse media, press, press photos) · Gemini (parsing, relevance, memo prose) · rules (decisions, Heartbeat maths) |

In the app, every check, chart and source carries a **CRUSTDATA** / **TAVILY** / **RULE** chip, and the Sources tab has a "CrustData data used" panel.

## Highlights

- **Help window** (sidebar and case header): guide, decisions and statuses, data sources, activity score, and a searchable glossary (KYB, SAFE, CP, term sheet, cap table, lakh/crore, NBFC…)
- **Charts** from CrustData time series: headcount with funding and acquisition markers, web traffic, followers, revenue-estimate band, team mix, peers ranking
- **Story tab**: dated company timeline (founded → rounds → people joining/leaving → acquisition → press) and press photos
- **Map** of where the team is (country bubbles from headcount by region, HQ outlined)
- **Parent company** card when the target was acquired; **post-closing monitoring** validated with the CrustData Watcher preview

## How it works

```
Request ─► Intake agent (rules + Gemini, span-checked) ─► Investigator: CrustData identify → enrich → person search → job search
        ─► Screening: Tavily (fallback CrustData web search) + Gemini namesake judge ─► Analyst: Heartbeat, thesis fit / credit grade
        ─► Decision rules (deterministic, cited) ─► Case clerk: memo + local systems of record + exceptions inbox
```

- **The decision is made by rules, not the LLM.** The LLM reads requests, judges whether an article is about this company, and drafts memos from cited checks. Each LLM step falls back from `gemini-3.8-flash` to `flash-lite` to rules.
- **Every check cites sources** (`S1…Sn`): a CrustData record ID and field path, a Tavily/web URL, or a derived rule. In the UI, a click on any check opens its sources.
- **Credits are rationed.** Limits per run, per endpoint, and in total for the app; the exact charge is read from `x-credits-used`; identical calls are served from cache at 0. Cases cost **0–2 CrustData credits** each.
- **Company activity (Heartbeat)** is the weighted mean of team growth, hiring, web demand, audience, news recency and capital recency. Missing data is left out, and it is never used as a fraud signal.

## Boundaries

- Read-only research. Every action is a labelled local simulation.
- It never contacts people, files reports or moves money.
- Sanctions/PEP screening is shown as **not run**, because official lists aren't connected.
- The indicative exposure cap is an illustrative policy, not an approved limit.

## Repository map

| Path | Status |
|---|---|
| `signalgate/` | **Current app (v2)**: start here |
| `README.md` | This overview |
| `UI-DESIGN.md` | UI principles (v2 applies them on a neutral shadcn theme) |
| `PLAN.md`, `EXAMPLES.md`, `concept/` | First iteration (v1) plan, examples and mockup, kept for history; superseded by `signalgate/` |
| `AGENTS.md` | Instructions for coding agents working in this folder |
