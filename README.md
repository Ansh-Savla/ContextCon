# SignalGate

**Try the deployed website: https://filling-nutten-outcome-spatial.trycloudflare.com**

SignalGate checks whether a company is safe to invest in or lend to.

Paste in a request the way you received it: a forwarded pitch, wire instructions, a loan application, or a single line like "can we lend to Zeta?". In about a minute you get:

- **A decision.** Investors get Proceed, Proceed with conditions, Decline, Stop the wire, or Not enough evidence. Lenders get Ready for underwriting, Refer, or Decline.
- **The reasons**, each linked to the CrustData record or web page it came from.
- **A printable memo** for the investment or credit committee.
- **The follow-up work, done locally**: the deal or credit file is updated, a suspicious wire is put on hold, and the case goes to a review inbox if needed. Nothing is sent to anyone.

Built for ContextCon at IIT Bombay (Trust and Compliance track) on CrustData's company and people data.

## How it works

1. **Read the request.** Pull out the company, the people, the claims and the amount.
2. **Find the real company** in CrustData. If more than one company could match, it stops instead of guessing.
3. **Check the company.** Is it still operating? Has it been acquired? Is it as big as claimed?
4. **Check the people.** Do the founders, and whoever sent the request, really work there today?
5. **Look for fraud.** Lookalike email domains, impostors, bad press.
6. **Weigh the signals.** Hiring, headcount growth, funding, similar companies.
7. **Decide.** Fixed rules make the decision. The AI never does.
8. **Finish the work.** Write the outcome to local files and set up monitoring.

The AI model (Gemini) only reads the request and writes the memo text. If it fails, the app falls back to plain rules and still finishes.
## Examples to try

| Example | What happens |
|---|---|
| BluePine: closing wire instructions | The sender's domain is a lookalike and the "CFO" never worked there. **Stop the wire.** |
| BluePine: pitch | A co-founder left in 2023 and the team is 4 people, not 20. **Proceed with conditions.** |
| Wicked Good Cupcakes: credit line | Claims to be independent, but was acquired by Hickory Farms and has 2 staff. **Decline.** |
| Zeta: name only | 25 companies share the name. **Not enough evidence.** It won't guess. |

## Run it locally

You need Node 20 or newer and a CrustData API key.

```bash
git clone https://github.com/Ansh-Savla/ContextCon.git
cd ContextCon/Trust-compliance-shresth/signalgate
npm install
cp .env.example .env.local   # add your keys
npm run dev                  # open http://localhost:3000
```

On Windows, run `git config --global core.longpaths true` before cloning.

To run a case from the terminal: `npm run case -- bluepine-wire`

### Keys (in `.env.local`)

| Key | Required? | Without it |
|---|---|---|
| `CRUSTDATA_API_KEY` | Yes | Lookups fail and every case ends with "not enough evidence" |
| `GEMINI_API_KEY` | No | Requests are read and memos written with simple rules |
| `TAVILY_API_KEY` | No | News search uses CrustData web search instead |

## CrustData endpoints used

| Endpoint | What for |
|---|---|
| Company Identify | Match a name or website to one company |
| Company Enrich | Status, owner, headcount, funding, revenue estimate, web traffic |
| Person Search | Whether a person works at the company now, or when they left |
| Job Search | Hiring in the last 90 days |
| Company Search | Similar companies for comparison |
| Web Search | News and adverse media |
| Watcher | Checks a monitoring rule for after the deal closes (preview only, nothing is created) |

Each case has a credit limit. Repeat lookups come from a 24-hour cache, so re-opening a case costs nothing.

## Repository layout

| Folder | Contents |
|---|---|
| `Trust-compliance-shresth/signalgate` | The app (Next.js + TypeScript) |
| `Trust-Compliance` | Earlier prototype (Heartbeat, Python) |
| `investing` | Investment team's company profiler (Sightline), parts of which are merged into the app |
| `Problem-Statement` | Hackathon brief |

## Limits

- It only uses public and CrustData records. It can't see bank statements, contracts or other private documents.
- The decision rules were set by hand, not tuned on past deals with known outcomes.
- All actions are simulated local writes. It never contacts people or moves money.
