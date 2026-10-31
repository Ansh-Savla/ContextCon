> ## Documentation Index
> Fetch the complete documentation index at: https://docs.crustdata.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Job Title Normalization

> Turn messy, real-world job titles into a clean, structured, and actionable taxonomy — available directly through the Crustdata Person API.

> [!NOTE]
>
> Job Title Normalization (JTN) is currently in **beta**. Field names,
> taxonomy values, and confidence scoring may evolve based on feedback. To
> share input or request access, write to
> [support@crustdata.co](mailto:support@crustdata.co).

**Use this when** you need to clean up raw, free-text job titles for
targeting, market sizing, segmentation, or downstream analytics — without
building your own ML pipeline.

JTN transforms each raw title into a rich, structured record using
Crustdata's own ML models and a proprietary, data-derived taxonomy. Every
title is mapped to a high-level **Department**, a specific **Category
(Sub-Department)**, and a standardized **Matched Title**, and is returned
inline as `basic_profile.normalized_title`.

### Where JTN is available

JTN ships as a field on every person record returned by the Person APIs —
no extra endpoint or `fields` flag is required.

| API | Field path | Notes |
| - | - | - |
| [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/introduction.md) | `basic_profile.normalized_title` | Included whenever `basic_profile` is in `fields`. |
| [Person Search (PersonDB)](https://docs.crustdata.com/person-docs/search/introduction.md) | `basic_profile.normalized_title` | Returned on every match. Also usable as a filter and sort field — see the [Person Search reference](https://docs.crustdata.com/person-docs/search/reference.md#basic-profile). |

## The problem: messy title data

Raw job titles are wildly inconsistent, which makes accurate targeting,
market sizing, and segmentation nearly impossible. Real-world data is full
of:

* **Generic titles** — ambiguous roles like "Manager," "Director," or
  "Consultant" that lack any functional context.
* **Acronyms & typos** — shorthand such as "MTS" or "SDE," plus
  misspellings that general-purpose models struggle to interpret.
* **Non-English titles** — roles written in many different languages.

Without normalization, sales and marketing teams burn time manually
cleaning data — which leads directly to poor campaign performance and
inaccurate reporting.

## The solution: structured taxonomy mapping

Every raw title is mapped to three fields:

| Taxonomy field | Description | Example input | Example output |
| - | - | - | - |
| **Department** | High-level function of the role | `Analyst II, Commercial Bank` | `Finance & Accounting` |
| **Category / Sub-Department** | Specific functional grouping | `Analyst II, Commercial Bank` | `Credit & Debt Management` |
| **Matched Title** | Standardized, canonical title | `Analyst II, Commercial Bank` | `Credit Analyst - Commercial Banking` |

### Why JTN

> [card] Superior accuracy & functional alignment
>
> Unlike systems built on rigid public standards (such as ESCO), our
> taxonomy is data-derived and powered by our own ML models. The model
> focuses on a role's *functional intent* rather than its seniority or
> rank — so `Senior Data Engineer` is correctly grouped with
> `Data Engineer`.

> [card] Actionable data for downstream systems
>
> JTN returns clean, structured fields (Department, Category, Matched
> Title) that map cleanly into your CRM, campaign segmentation, and BI
> tools — making your targeting immediately more granular and
> effective.

## Example: Person Enrich response

JTN is exposed inline on the person record at
`basic_profile.normalized_title`. No extra `fields` flag is required — if
`basic_profile` is requested, `normalized_title` is included. The same
field is also returned on every [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md)
match.

### Example request

```json theme={"theme":"vitesse-black"}
{
    "professional_network_profile_urls": ["https://www.linkedin.com/in/sharroh"],
    "fields": ["basic_profile", "experience"]
}
```

### Example response (truncated)

```json theme={"theme":"vitesse-black"}
[
    {
        "matched_on": "https://www.linkedin.com/in/sharroh",
        "match_type": "professional_network_profile_url",
        "matches": [
            {
                "confidence_score": 1.0,
                "person_data": {
                    "basic_profile": {
                        "current_title": "Software Engineer",
                        "name": "Rohit S",
                        "normalized_title": {
                            "confident": true,
                            "department": "Engineering & Technology",
                            "sub_department": "Software Engineering",
                            "matched_title": "Software Engineer - 2",
                            "similarity": 0.9047
                        }
                    }
                }
            }
        ]
    }
]
```

### `normalized_title` field reference

| Field | Type | Description |
| - | - | - |
| `department` | string | High-level function of the role. One of the 20 departments in the taxonomy. |
| `sub_department` | string | Specific functional grouping (Category). One of the 226 sub-departments in the taxonomy. |
| `matched_title` | string | Standardized canonical title that the raw input was mapped to. |
| `similarity` | float | Cosine similarity (0–1) between the raw input title and the matched canonical title. Higher = closer match. |
| `confident` | boolean | `true` when JTN's internal heuristics consider the mapping high-confidence. Use this as a filter for stricter downstream use. |

> [!TIP]
>
> For strict segmentation use cases, filter on `normalized_title.confident == true`.
> For broader coverage (e.g. enrichment top-ups), use all results and
> inspect `similarity`.

***

## The taxonomy

The JTN taxonomy covers **20 departments** and **226 sub-departments
(categories)**, derived from a normalized set of canonical titles.

### Departments

* Consulting & Professional Services
* Customer Service & Support
* Data & Analytics
* Education & Research
* Engineering & Technology
* Executive Leadership
* Finance & Accounting
* Government & Public Sector
* Healthcare & Medical
* Legal & Compliance
* Manufacturing & Quality
* Marketing
* Media & Communications
* Operations & Logistics
* Other
* People & HR
* Product & Design
* Real Estate & Construction
* Retail & Hospitality
* Sales & Revenue

### Departments & sub-departments

> [accordion] Consulting & Professional Services
>
> * Advisory & Strategy Consulting
> * Business Analysis & Operations
> * Consulting Project & Program Delivery
> * Executive & Business Coaching
> * Human Resources Consulting
> * IT & Technical Consulting
> * Independent & Fractional Consulting
> * Management Consulting
> * Marketing & Sales Consulting
> * Organizational Change Management
> * SAP & ERP Consulting
> * Solutions Architecture

> [accordion] Customer Service & Support
>
> * Customer Experience Strategy
> * Customer Onboarding & Activation
> * Customer Relationship Management
> * Customer Success & Retention
> * Customer Support Operations
> * Member & Membership Services
> * Technical Support & Help Desk

> [accordion] Data & Analytics
>
> * Analytics Consulting & Strategy
> * Business Intelligence & Insights
> * Data Engineering & Operations
> * Data Science & Analytics
> * Geospatial & Product Analytics
> * Quantitative & Applied Analytics

> [accordion] Education & Research
>
> * Academic Advising & Counseling
> * Athletic Coaching & Administration
> * Early Childhood & Special Education
> * Experiential & Clinical Education
> * Fellowships & Postdoctoral Research
> * Institutional & Alumni Relations
> * Library & Information Science
> * Performing & Fine Arts Instruction
> * Program & Curriculum Development
> * Research & Laboratory Science
> * STEM Education
> * Student Affairs & Residential Life
> * Teaching & Instruction
> * Tutoring & Academic Support
> * Vocational & Corporate Training

> [accordion] Engineering & Technology
>
> * CAD Design & Technical Drafting
> * Civil & Structural Engineering
> * Cloud & DevOps Engineering
> * Cybersecurity & Security Engineering
> * Data Engineering & Analytics
> * Database Administration
> * Embedded Systems & Firmware Engineering
> * Environmental & Marine Engineering
> * Field & Technical Service Engineering
> * Frontend Development
> * Geoscience & Geology Engineering
> * IT Infrastructure & Support
> * IT Leadership & Management
> * Industrial & Process Engineering
> * Machine Learning & AI Engineering
> * Mechanical & Electrical Engineering
> * Mobile Development
> * Network & Telecoms Engineering
> * Product Management Technical
> * R\&D and Innovation Engineering
> * Software Engineering
> * Software Quality Assurance & Testing
> * Systems & Solutions Architecture
> * Technical Project Management

> [accordion] Executive Leadership
>
> * Board Governance & Advisory
> * Corporate Strategy & Business Development
> * Executive & C-Suite Leadership
> * Executive Support & Coordination
> * Founder & Entrepreneurship Leadership
> * General & Regional Management
> * Investor Relations & Governance
> * Program & Project Leadership
> * Sales & Marketing Leadership
> * Technology & Engineering Leadership
> * Vice President Leadership

> [accordion] Finance & Accounting
>
> * Accounts Payable & Receivable
> * Actuarial & Cost Analysis
> * Audit & Assurance
> * Credit & Debt Management
> * Financial Controlling & Reporting
> * Financial Operations & Accounting
> * Financial Planning & Analysis
> * Insurance & Underwriting
> * Investment & Asset Management
> * Loan Processing & Origination
> * Mergers & Acquisitions
> * Payroll & Billing Administration
> * Retail & Commercial Banking
> * Risk Management
> * Tax Accounting & Compliance
> * Trading & Portfolio Management
> * Wealth & Relationship Management

> [accordion] Government & Public Sector
>
> * Agricultural & Environmental Services
> * Emergency & Protective Services
> * Government Policy & Relations
> * Law Enforcement & Corrections
> * Military & Defense Operations
> * Public Administration & Civil Service

> [accordion] Healthcare & Medical
>
> * Behavioral & Wellness Therapy
> * Biomedical & Health Informatics
> * Clinical Laboratory Sciences
> * Clinical Research & Trials
> * Dentistry & Oral Health
> * Emergency & Trauma Services
> * Healthcare Administration & Operations
> * Medical Imaging & Radiology
> * Mental Health & Counseling
> * Nursing & Clinical Care
> * Nutrition & Dietetics
> * Pharmacy & Drug Safety
> * Physical & Occupational Therapy
> * Physician & Medical Practice
> * Revenue Cycle & Medical Coding
> * Social Work & Community Services
> * Speech & Audiology Services
> * Surgical & Procedural Care
> * Veterinary & Animal Care

> [accordion] Legal & Compliance
>
> * Corporate Legal Affairs
> * Data Privacy & Governance
> * EHS & Safety Compliance
> * Financial Crimes & Investigations
> * Paralegal & Legal Support
> * Regulatory & Environmental Compliance

> [accordion] Manufacturing & Quality
>
> * Laboratory & Quality Analysis
> * Maintenance & Reliability
> * Manufacturing Engineering & Operations
> * Print & Prepress Operations
> * Process & Continuous Improvement
> * Quality Assurance & Control
> * Skilled Trades & Fabrication

> [accordion] Marketing
>
> * Brand Management & Communications
> * Campaign & Promotions Management
> * Content Marketing
> * Digital & Social Media Marketing
> * E-Commerce Marketing
> * Marketing Analytics & Research
> * Marketing Strategy & Planning
> * Trade & Channel Marketing

> [accordion] Media & Communications
>
> * Audio & Music Production
> * Broadcast & Journalism
> * Community & Stakeholder Engagement
> * Corporate Communications & PR
> * Creative Writing & Storytelling
> * Curatorial & Exhibition Management
> * Digital Content & Social Media
> * Editorial & Copywriting
> * Event Production & Coordination
> * Media Strategy & Planning
> * Performance & Acting
> * Photography & Visual Media
> * Technical Writing & Translation
> * Video & Film Production

> [accordion] Operations & Logistics
>
> * Administrative & Office Services
> * Document & Records Management
> * Driver & Fleet Operations
> * Event & Program Coordination
> * Facilities & Building Management
> * Field & Technical Operations
> * Health, Safety & Environment
> * Inventory & Asset Management
> * Operational Security Services
> * Operations Management
> * Process & Data Management
> * Procurement & Purchasing
> * Project & Program Management
> * Supply Chain & Logistics
> * Trade & Customs Compliance
> * Warehouse & Distribution Operations

> [accordion] Other
>
> * Arts & Creative Services
> * Athletic & Sports Professions
> * Career & Employment Services
> * Personal & Caregiving Services
> * Program & Administrative Support
> * Religious & Spiritual Leadership
> * Volunteer & Community Services

> [accordion] People & HR
>
> * Compensation, Benefits & Rewards
> * Diversity, Equity & Inclusion
> * HR Business Partnering & Generalist
> * HR Operations & Administration
> * Learning & Development
> * Talent Acquisition & Recruiting
> * Workforce Planning & Analytics

> [accordion] Product & Design
>
> * Apparel & Fashion Design
> * Creative Direction & Art Direction
> * D Art & Animation
> * Freelance & Contract Creative
> * Graphic & Visual Design
> * Product Development & Innovation
> * Product Management
> * UX & UI Design
> * Web & Digital Design

> [accordion] Real Estate & Construction
>
> * Architectural & Interior Design
> * Construction Project Management & Controls
> * Construction Site Supervision & Trades
> * Landscaping & Grounds Maintenance
> * Real Estate Appraisal & Investment
> * Real Estate Leasing & Property Management
> * Real Estate Sales & Brokerage

> [accordion] Retail & Hospitality
>
> * Aviation & Inflight Service
> * Beauty & Personal Care
> * Event & Banquet Operations
> * Food & Beverage Operations
> * Front Desk & Guest Services
> * Golf & Club Services
> * Hotel & Hospitality Management
> * Kitchen & Culinary Operations
> * Reservations & Travel Services
> * Restaurant & Dining Management
> * Retail Sales & Merchandising
> * Retail Store Management
> * Visual Merchandising & Inventory

> [accordion] Sales & Revenue
>
> * Account Management & Strategy
> * Bid & Proposal Management
> * Channel & Partner Sales
> * Field & Regional Sales
> * Healthcare & Insurance Sales
> * Industry & Specialist Sales
> * Inside & Outside Sales
> * International & Global Sales
> * Philanthropy & Fundraising
> * Retail & Consumer Sales
> * Revenue Operations & Analytics
> * Sales Development & Prospecting
> * Sales Operations & Enablement
> * Sales Training & Enablement
> * Solution Consulting & Presales

***

## What to do next

* **Try it on Enrich** — call [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/introduction.md)
  with `fields: ["basic_profile"]` and inspect
  `basic_profile.normalized_title`.
* **Try it on Search** — every [Person Search](https://docs.crustdata.com/person-docs/search/introduction.md)
  result returns `basic_profile.normalized_title`. You can also filter or
  sort on the nested fields — see the
  [Person Search reference](https://docs.crustdata.com/person-docs/search/reference.md#basic-profile).
* **Field references** — [Person Enrich](https://docs.crustdata.com/person-docs/enrichment/reference.md) ·
  [Person Search](https://docs.crustdata.com/person-docs/search/reference.md).
* **Feedback** — JTN is in beta; send taxonomy or accuracy feedback to
  [support@crustdata.co](mailto:support@crustdata.co).


## Related topics

- [Capabilities](https://docs.crustdata.com/general/capabilities.md)
- [Person Search reference](https://docs.crustdata.com/person-docs/search/reference.md)
- [Person Discovery Watcher](https://docs.crustdata.com/watcher-docs/person/discovery.md)
- [Identify People](https://docs.crustdata.com/api-reference/person-apis/identify-people-from-profile-urls-emails-or-google-scholar-profile-urls.md)
- [Job Autocomplete API](https://docs.crustdata.com/job-docs/autocomplete/introduction.md)
