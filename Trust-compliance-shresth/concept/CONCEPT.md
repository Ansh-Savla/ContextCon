> **Historical (v1).** Superseded by the rebuilt app in [`signalgate/`](../signalgate/) — see its README.

# SignalGate concept: what is being built

**One-liner:** SignalGate is an AI diligence desk for the India and US markets. You paste a deal or vendor request about a startup. Its agents investigate it through CrustData's identity graph, then finish the job:
- an IC memo for an investor
- an auditor-ready vendor file for procurement
- a payment hold with a complaint-ready case file for accounts payable

A human only sees the exceptions.

## Where every concept lives

| What | File |
|---|---|
| Main case screen (visual target) | [ui-mockup.png](ui-mockup.png), rendered from [ui-mockup.html](ui-mockup.html). It shows case E5, the India bank-change request, with illustrative numbers. |
| Agent architecture diagram | [PLAN.md → Agents and the "brain" provision](../PLAN.md) |
| Service → finished work → local action table | [PLAN.md → Service, not tool](../PLAN.md) |
| Heartbeat metric (formula, weights, bands) | [PLAN.md → Heartbeat](../PLAN.md) |
| US + India example requests (E1–E9) | [EXAMPLES.md](../EXAMPLES.md) |
| Data-quality rules from the live research | [PLAN.md → Data-quality rules](../PLAN.md) |
| Build order, time cut and verification | [PLAN.md → Build sequence / Verification](../PLAN.md) |

## How to read the mockup

1. **Request:** the text exactly as pasted. Every highlighted span was extracted.
2. **Parsed intake:** what the Intake agent understood, and whether the Gemini parser and the rules parser agree.
3. **Verdict stamp:** HOLD, ADVANCE, PASS or INSUFFICIENT, decided only by rules. Each verdict comes with the rule IDs behind it.
4. **Clerk action:** the finished work, written to a local system of record. It is simulated, and nothing is sent anywhere.
5. **Claim matrix:** what was submitted, what was observed, the status, and the evidence IDs.
6. **Evidence ledger:** every CrustData call or derived rule, with a timestamp.
7. **Heartbeat:** an activity score built from transparent components. It is never used as a fraud signal.
8. **Agent trace:** which agent and which brain took each step, the credits used, and any fallbacks.

## The brain and its fallbacks

The LLM chain is `gemini-3.8-flash` → `gemini-flash-lite-latest` → OpenRouter (only if a key is set) → the rules brain.
- Each step falls back on its own when a call fails with 402, 429, a 5xx error or a timeout.
- The trace marks every fallback.
- Statuses and outcomes are always decided by rules.
