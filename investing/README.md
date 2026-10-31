# Sightline

Investor-grade company profiles built on the Crustdata identity graph. Enter **one company**: a name, website or LinkedIn URL, plus optional notes such as founder names to check. You get a single profile page with the company header and an active/acquired/closed status, KPI cards, ECharts charts (headcount, funding, revenue estimate, web traffic, team mix, employee reviews), founder cards with a detail drawer, financials, and a **Company research** panel (overview, news, funding, market, competitors) powered by Tavily. Under the hood every profile is built from these checks:

- **Reality check.** Is the company operating, dormant, acquired or defunct? Crustdata's own status is shown next to the verdict, and conflicts are flagged.
- **Identity resolution.** Matching goes profile URL → domain → name variants → web-discovered domain. Rejected candidates are listed, ties are broken on the description, and an unresolvable match stops instead of guessing.
- **Founders and leadership.** Built from Crustdata job records, with each person's role verified against the company id. Flags cover departures, recent departures, moves to the acquirer, possible competing ventures, late co-founders and stale "current" roles.
- **Input claims.** Founder names in the request are checked against Crustdata job records: CONFIRMED, PARTIAL or NOT FOUND.
- **Plausibility guards.** Revenue estimates are rejected when the implied revenue per employee is unrealistic for the industry. Headcount reported after a closure is marked stale. The checks also catch an acquirer's domain carried on the record, website traffic collapsing to zero, and staff in unexpected countries.
- **Money.** Recorded rounds are listed beside deals announced in the press, with implied valuations. Flags fire when an announced deal is missing from recorded funding or reports disagree on terms. Exit multiples and distress language are surfaced.
- **News, filtered for name collisions.** Generic names such as "Geek Chic" need a second anchor (a founder surname, the city, the product) before an article counts.
- **Score and questions.** A rule-based score, with data confidence shown separately, and questions for the founder call generated from the conflicts.
- **Evidence ledger.** Every fact has a clickable `E#` chip that points to the Crustdata call (tool, request, recording time) or the web page it came from.

## Run it

```bash
cd investing
python3 -m venv .venv            # on Debian/Ubuntu without python3-venv: python3 -m venv --without-pip .venv
.venv/bin/pip install -r requirements.txt   # or: python3 -m pip --python .venv/bin/python install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 5000
# open http://localhost:5000
```

Keys go in `investing/.env` (gitignored; never in frontend code):

```
TAVILY_API=tvly-...            # enables Company research (about 8 Tavily credits per uncached company)
CRUSTDATA_API_KEY=...          # optional: live Crustdata instead of recorded responses
```

**Financials (reported):** for P&L lines (revenue, COGS, gross margin, SG&A, EBITDA, net profit), `app/financials.py` reads press coverage of company filings (Entrackr, Inc42, …) through Tavily. It extracts figures only from sentences that name the company near the number, and keeps each figure's quote and URL. Gross margin, EBITDA % and totals are computed only from disclosed numbers. Anything not disclosed stays empty. No LLM is involved.

Research and financials results are cached in `fixtures/tavily-*.json`, so each company is researched once. Company-specific research sections (overview, news, funding) drop sources that don't mention the company. If none are left, the AI summary is withheld.

Data source modes:

| Mode | When | What happens |
|---|---|---|
| **REPLAY** (default) | `CRUSTDATA_API_KEY` not set | Requests are answered from `fixtures/`: real Crustdata responses recorded through the Crustdata MCP. Free and deterministic, which suits the demo. Requests not in the cache are logged to `fixtures/_missing.jsonl` and shown as "not in fixture cache". |
| **LIVE** | `export CRUSTDATA_API_KEY=...` | Calls `https://api.crustdata.com` with `authorization: Bearer …` and `x-api-version: 2025-11-01`. Every response is written to `fixtures/` so reruns are free. 429 and 5xx responses are retried with backoff, with at most 4 concurrent requests. |

CLI (same pipeline, no browser): `.venv/bin/python cli.py test_inputs/1_shark_tank_india.txt [out.json]`

## Test inputs

The UI shows the 12 single-company samples from `test_inputs/examples.txt` as quick picks. Every one has recorded Crustdata and Tavily responses, so the demo runs offline and free. The batch files below are for the CLI.

| File | What it exercises | Expected highlights |
|---|---|---|
| `1_shark_tank_india.txt` | Live, funded companies; wrong founder names; a wrong company name; a company that probably doesn't exist | Beyond Snack and HairOriginals rank top. qZense: **CEO co-founder left Jun 2026** (high). TagZ: **ACQUIRED** by Reliance, 0.79× down exit, distress press, CEO moved to the acquirer. BluePine Industries resolves to **BluePine Foods** (the "Bluepine" home-services app is rejected). Jugaad Life: **UNRESOLVED, no evidence**. Input founder names "Meghana", "Sangeeta Kumar", "Neil" come back **NOT FOUND**. |
| `2_shark_tank_us_reality_check.txt` | 2013 companies that Crustdata still calls "active" | Geek Chic: **DEFUNCT** (2017 closure) plus **stale headcount** (41 people in 2026). VerbalizeIt: **ACQUIRED** by Smartling, acquirer's domain on the record. Tom & Chee: ACQUIRED (a "shut down" mention in a comeback article is ignored). Stella Valle: **DORMANT, sources disputed** (PitchBook says out of business; a 2026 article says trading). Ryan's Barkery: not in the graph → **DEFUNCT (web only)**, $25K-for-25% deal recovered from press. |
| `3_mixed_identifiers.txt` | LinkedIn URL with tracking parameters, bare domain, website URL with a path, a table separator row, a duplicate line | Every line resolves by exact URL or domain; the duplicate is dropped. |
| `4_edge_cases.txt` | Ambiguous name with no description, a made-up company with invented founders, odd formatting | "Geek Chic" alone gives **NEEDS REVIEW** (two exact-name companies), with no research spent. "Zyntrix Quantum Bakeries" gives **UNRESOLVED, no evidence**, and its invented founders come back NOT FOUND. "QZENSE LABS : …" resolves to qZense. |

## Architecture

```
app/intake.py     parse messy lines -> name / domain / LinkedIn / hint / founder-name claims
app/pipeline.py   resolve (identify -> candidate scoring -> web domain discovery) and research
                  (company_enrich, person_search, job_search, web_search_live in parallel)
app/rules.py      deterministic reconciliation: status, plausibility, founder movement, deals, exit,
                  news relevance, score, questions; every fact carries an evidence id
app/crust.py      Crustdata REST client: live or replay, disk cache keyed by tool + request body
app/main.py       FastAPI: /api/analyze streams NDJSON stage events + memos; static UI
tools/            fixture import (MCP recordings -> fixtures/), headless screenshot helper
```

Crustdata endpoints used: `/company/identify` (free), `/company/enrich`, `/person/search` (exact mode, employer id re-checked on every row), `/job/search`, `/web/search/live`. A full memo costs about 5–7 credits per company.

## Known limits

- Real private-company financials (audited revenue, burn) are not available. Crustdata's revenue figure is a model estimate and is shown only with its plausibility verdict.
- Web search ignores `OR`, so queries stay short. Snippets are often undated, and some come with Persian-calendar dates, which are converted.
- Founders who never created a profile (for example Tom & Chee's Trew Quackenbush) can't be verified. The memo says so instead of inventing one.
- The score is a transparent heuristic for ranking a batch, not investment advice.
