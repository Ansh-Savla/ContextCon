# SignalGate app: developer quick start

A diligence desk for **investors** (equity diligence + compliance clearance) and **lenders** (KYB + credit readiness), built on CrustData's identity graph. See the [project README](../README.md) for the product story and demo cases.

## 1. Run it in 3 minutes

> **Windows:** the repo includes long CrustData doc filenames. Run `git config --global core.longpaths true` before cloning, or clone into a short path such as `C:\dev`.

```bash
git clone https://github.com/Ansh-Savla/ContextCon.git
cd ContextCon && git checkout trust-compliance
cd Trust-compliance-shresth/signalgate
npm install                      # Node >= 20.9 (tested on 20.19)
cp .env.example .env.local       # then paste your keys (see below)
npm run dev                      # open http://localhost:3000
```

Pick an example card and press **Run diligence**. Or run a case from the terminal:

```bash
npm run case -- bluepine-wire          # any id in lib/examples.ts
npm run case -- "Screen acme.in before our ₹50 lakh cheque"
npm run typecheck
```

## Deploy (production)

```bash
git clone https://github.com/Ansh-Savla/ContextCon.git   # Windows: git config --global core.longpaths true first
cd ContextCon && git checkout trust-compliance
cd Trust-compliance-shresth/signalgate
npm ci
npm run build
npm start                         # serves on port 3000 (set PORT to change)
```

- **Project root:** `Trust-compliance-shresth/signalgate`. Set this as the root directory on Vercel, Render, Railway and similar hosts.
- **Environment variables:** set them in the host, or in `.env.local` next to `package.json`.
  - `CRUSTDATA_API_KEY` is required.
  - Optional: `TAVILY_API_KEY`, `LLM_PROVIDER=gemini`, `LLM_MODEL=gemini-3.8-flash`, `LLM_FALLBACK_MODELS=gemini-flash-lite-latest`, `GEMINI_API_KEY`.
  - All of them are documented in [`.env.example`](.env.example).
- **Writable data folder:** the API cache, saved cases and simulated records go to `./data`.
  - Override this with `SIGNALGATE_DATA_DIR=/some/writable/path`.
  - On Vercel the app automatically uses `/tmp/signalgate-data`, which is ephemeral.
- **Recommended host:** any Node 20+ server or container (Render, Railway, Fly, a VM). A fresh case takes 20–75 s and streams its progress.
  - Vercel needs a plan that allows long functions; the run route sets `maxDuration = 300`.
- **Health check:** `GET /api/status` returns JSON with the credit balance and model chain.

## 2. Keys (`.env.local`; never commit it)

| Variable | Needed? | What happens without it |
|---|---|---|
| `CRUSTDATA_API_KEY` | **Required** | Lookups fail; the case ends "insufficient evidence" |
| `TAVILY_API_KEY` | Optional | Adverse-media and press searches fall back to CrustData `/web/search/live` |
| `GEMINI_API_KEY` + `LLM_PROVIDER=gemini` | Optional | Parsing, relevance judging and memos fall back to rules and templates |

The chain is `gemini-3.8-flash` → `gemini-flash-lite-latest` → OpenRouter (if `OPENROUTER_API_KEY` is set) → rules. **Decisions are always rule-based.** All variables are documented in [`.env.example`](.env.example).

## 3. Credits and the cache

- **Caps:** every paid CrustData call is checked against per-run caps (25 credits; per-endpoint call limits) and an app-wide cap (1,500), tracked in `data/ledger.json`.
- **Exact charges** come from the `x-credits-used` response header.
- **Cache:** identical requests are served from `data/cache/` (24 h) at 0 credits. A typical fresh case costs 0–3 credits; re-runs are free.
- **Local data:** `data/` (cache, saved runs, simulated systems of record) is git-ignored and stays on your machine. `CACHE_MODE=refresh` forces live calls.

## 4. Where things are

```
app/page.tsx                  shell: sidebar (recent cases, spend, brain) + composer / live run / case view
app/api/run/route.ts          POST {text} → NDJSON stream of trace events, then the finished case
app/api/status/route.ts       balance, ledger, brain chain, recent runs, inbox count
app/api/runs/[id]/route.ts    replay a saved case (0 credits)
components/desk/              composer, run-progress, case-view (tabs, source sheet, provenance), charts, timeline, geo-map, help, primitives
components/ui/                shadcn/ui primitives (Tailwind v4, neutral theme in app/globals.css)
lib/types.ts                  case model: Intake, Check, Evidence, Decision, CaseResult
lib/examples.ts               demo requests (US + India, investor + lender)
lib/help-content.ts           Help window content: guide, decisions, data sources, Heartbeat, glossary
lib/server/desk.ts            the pipeline: intake → resolve → profile/KYB → people → screening → analysis → decision → actions
lib/server/intake.ts          request parser (rules + span-checked Gemini)
lib/server/crustdata.ts       CrustData client: rationing, cache, retries, pacing, credit capture
lib/server/tavily.ts          Tavily search (secondary, labelled)
lib/server/llm.ts             Gemini / OpenRouter chain with fallbacks
lib/server/heartbeat.ts       company-activity score (activity only, never a fraud signal)
lib/server/domain.ts          lookalike-domain detection
lib/server/budget.ts, config.ts  ledger, caps, cache
scripts/case.ts               CLI runner
```

## 5. CrustData endpoints used

| Endpoint | Used for | Cost |
|---|---|---|
| `POST /company/identify` | Resolve name/website → canonical company, with candidates | free |
| `POST /company/enrich` | Profile, ownership/acquirer, headcount and history, funding, revenue estimate, people, traffic, news | 2 |
| `POST /person/search` | Is this person at the company now, or did they leave (dated) | ~0.2/result |
| `POST /job/search` (`limit:0`) | Roles posted in the last 90 days | free |
| `POST /company/search` | Peer companies: same industry + country, similar headcount band | ~0.5/result |
| `POST /watch/company/test` | Validates a post-closing monitoring rule (preview, `deliver:false`: nothing created or sent) | free |
| `POST /web/search/live` | Fallback web/news search | 1 |
| `GET /account/credits` | Balance shown in the sidebar | free |

## 6. Adding a demo case

Append to `lib/examples.ts` (`id`, `market`, `requester`, `title`, `persona`, `text`). Mark made-up inputs with `SYNTHETIC DEMO INPUT` and use fictitious people and lookalike domains only.

## 7. Troubleshooting

- **Port 3000 busy:** stop the other dev server, or run `npx next dev -p 3001`.
- **Gemini 402/429 or timeouts:** expected occasionally. The trace shows a fallback and the case still completes.
- **`next dev` regenerates `AGENTS.md`/`CLAUDE.md`:** that's Next.js 16's agent note. Leave `AGENTS.md` committed; `CLAUDE.md` is git-ignored by the repo root.
- **New files under `lib/` not showing in `git status`:** the repo root ignores Python `lib/` folders; this folder's `.gitignore` re-includes `lib/`. Keep that rule.

## Rules of the road (hackathon)

- Read-only research only.
- Never contact real people or move money; every "action" is a labelled local JSON write.
- Keep keys in `.env.local` only.
