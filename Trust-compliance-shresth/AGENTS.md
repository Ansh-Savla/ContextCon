# SignalGate project instructions

**Current implementation: [`signalgate/`](signalgate/)** (Next.js 16 + Tailwind v4 + shadcn/ui). Read [`signalgate/README.md`](signalgate/README.md) first. `PLAN.md`, `EXAMPLES.md` and `concept/` describe v1 and are historical.

Before planning or changing this project, read the root [`AGENTS.md`](../AGENTS.md), the shared [CrustData steering](../.codex/steering.md), this folder's [`PLAN.md`](PLAN.md), and [`UI-DESIGN.md`](UI-DESIGN.md) for visual or interface work.

Follow the SignalGate scope and evidence rules in `PLAN.md`: CrustData is the required identity and company-context layer; preserve source provenance and ambiguity; keep investment fit separate from trust evidence; and do not claim fraud, KYC/AML clearance, legal compliance, beneficial ownership, payment authority, or creditworthiness without authoritative evidence and explicit scope.

Keep API credentials server-side and out of source control, logs, browser code, screenshots, and fixtures. Do not contact real people or trigger external transactions. If API permissions, source coverage, costs, event rules, or actual demo results conflict with the plan, surface the issue and propose a narrow course correction before expanding scope. Keep SignalGate-specific instructions in this project folder rather than changing shared steering for unrelated projects.

For all UI implementation, follow `UI-DESIGN.md` as the shared visual and interaction contract. Extend the existing warm-paper / deep-blue direction in `concept/ui-mockup.png` and `app/app/globals.css`; do not replace it with a generic dashboard kit. Keep the design guide as the source of truth for both Codex and Claude Code.
