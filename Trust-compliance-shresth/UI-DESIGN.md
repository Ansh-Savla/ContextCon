# SignalGate UI design contract

> **v2 note (31 Oct, 13:00):** the user chose a neutral premium Tailwind + shadcn/ui theme for the rebuilt app in `signalgate/`. Tokens live in `signalgate/app/globals.css` (one deep-blue accent, semantic status colours). The status-language, evidence, accessibility and "Heartbeat is not a fraud signal" rules below still apply; the warm-paper palette references describe v1.

**Purpose:** Shared visual and interaction direction for Codex and Claude Code.  
**Applies to:** `Trust-compliance-shresth/app/` and any later SignalGate interface.  
**Primary reference:** [`concept/ui-mockup.png`](concept/ui-mockup.png), with the current implementation tokens in [`app/app/globals.css`](app/app/globals.css).

## Product feel

Build a **calm investment-committee workbench with the clarity of a modern financial operations console**. It should feel credible, precise, private, and comfortable to use for a long review session. The premium feel comes from hierarchy, typography, spacing, restrained color, data integrity, and responsive feedback—not decorative effects.

Use the existing warm-paper, dark-ink, deep-blue direction as the visual foundation. Preserve the evidence-led case-file character in the concept mockup while refining the screen into a more composed, human-oriented product. Do not turn it into a generic AI chat, stock-trading terminal, cyber-risk console, or animated marketing page.

## What to borrow from the references

| Reference | Borrow | Do not copy / build |
|---|---|---|
| Linear workspace | Clear case hierarchy, compact navigation, predictable review queue, keyboard-friendly controls | Linear branding or a clone of its issue tracker |
| Vercel/Geist console | Strong typography, precise metadata, understandable execution trace, deliberate status system | Developer-only density across the whole product |
| Stripe dashboard | Legible financial tables, dates and units beside values, filtering that supports a real review task | A wall of charts or payment product styling unrelated to the case |
| Raycast | Fast command/search entry as an optional shortcut after the main flow works | A command palette as the primary interface |
| React Flow / Foundry node editor | Only the idea of tracing relationships between evidence objects | A drag-and-drop workflow editor: SignalGate runs a fixed guarded workflow and users do not author agents |
| High-motion landing pages | A subtle transition to clarify run progress, when useful | 3D scenes, scroll theatrics, glassmorphism, or motion that hides sources and status |
| v0, 21st.dev, Magic UI, Aceternity UI, shadcn/ui | Inspiration or a carefully selected primitive/block if it fits the current app | Installing several overlapping kits, importing a full template, or accepting generated code without checking behavior, accessibility, and bundle cost |

Keep the app’s existing Next.js/React/CSS stack unless a specific component need justifies a dependency. For the evidence relationship view, prefer a small, stable SVG or simple list/diagram. React Flow is intended for node-based editors and is unnecessary for a read-only evidence graph unless a real interaction requirement emerges. The graph must have an accessible list/table equivalent.

## Visual system

### Palette

Use the current `globals.css` palette as the baseline; centralize any refinements as CSS custom properties rather than adding one-off hex values.

| Role | Existing token/value | Use |
|---|---|---|
| Canvas | `--paper: #f6f3ec` | Warm, quiet page background |
| Surface | `--card: #fffdf8` | Evidence panels and form surfaces |
| Primary text | `--ink: #1b1d22` | Main copy, headings, key values |
| Secondary text | `--muted: #5d6270` | Dates, descriptions, secondary labels; never make essential content faint |
| Divider | `--rule: #ddd6c7` | Fine table and card boundaries |
| Primary action/link | `--accent: #0f4c81` | Interactive focus, links, primary action, selected navigation |
| Accent tint | `--accent-bg: #eef4fa` | Selected/active context where needed |
| Outcome colors | Existing `--hold`, `--ok`, `--warn`, `--na`, `--pass` pairs | Use only for their named semantic state, always with a text label and preferably an icon |

Keep surfaces mostly neutral. Deep blue is the product accent; warm paper is the distinctive element. Do not add gold, neon green, gradients, or extra accent colors just to make the interface look “premium.” If a new semantic color is proposed, add a named token and check its foreground/background contrast. Never use color alone to encode a result.

Status language must remain precise:

- **SUPPORTED** means the cited evidence supports that specific claim; it does not mean the company is safe.
- **CONFLICTING** means the cited records disagree on that specific fact; show both values and their dates.
- **HOLD** is an action/triage state; show the reason and the evidence that triggered it.
- **PASS** is an investment or workflow outcome, never a blanket trust/compliance clearance.
- **INSUFFICIENT / NOT CHECKED** means the workflow lacks enough evidence or did not run that check; it is not a negative finding.
- Company activity / **Heartbeat** is context about observed activity. Do not title it “Is the company alive?” or place it where it can be read as a fraud/legitimacy score. Show its components, date range, missing-data treatment, and “not a fraud signal” explanation near the metric.

### Type

- Use a clean system sans-serif for application copy. Retain a restrained serif touch for the SignalGate wordmark or one prominent case verdict only.
- Use tabular numerals for credits, amounts, dates, counts, IDs, and metrics.
- Reserve monospace for API paths, entity IDs, timestamps, raw snippets, and trace details. Do not style all headings and all table content as code.
- Working scale: page title 24–30 px; section title 16–18 px; body/table copy 14–15 px; secondary copy 13–14 px; dense metadata 12 px minimum. Use 11 px only for nonessential overlines or tiny decoration, not evidence or controls.
- Use sentence case for most headings. Small, spaced uppercase labels can identify sections, but the current mockup uses them frequently; reduce them so they remain a deliberate accent.

### Shape and depth

- Prefer crisp 1 px dividers, modest 6–10 px corner radii, and no or very soft shadows.
- Use spacing and alignment to separate content before adding borders or cards. Avoid nesting card inside card repeatedly.
- Keep the primary canvas quiet; reserve high-saturation outcome tints for actual exception rows.
- Use one clear primary button per active step. Do not make every control blue.

## Screen hierarchy and case workflow

At the demo’s first glance, answer in this order: **which case is this; what was decided; why; what was checked; where is the evidence; what happens next?**

Retain the current three-part workbench, refining it as follows:

1. **Top bar:** SignalGate, current case/company, market or jurisdiction, live/replay/synthetic marker, and one compact run state. Keep credits, brain/fallback chain, and detailed endpoint telemetry available in the trace or a compact expandable status area rather than competing with the case identity.
2. **Request / parsed intake:** preserve the original request and visibly mark extracted spans. Show what the parser understood and parser disagreement. Make the request input readable prose by default; use monospace only for raw headers, IDs, and codes.
3. **Outcome panel:** use a clean state label plus a one-sentence reason. Keep the memorable case-file “stamp” idea if desired, but make it flat, aligned, and visually proportional; avoid a large tilted stamp that makes a preliminary triage look like a legal order.
4. **Claim matrix:** one row per claim, with submitted value, observed values, source date, status, and evidence link. Preserve contradictory values side by side. Make a row open a source detail panel instead of cramming all citations into a narrow cell.
5. **Evidence ledger / agent trace:** show steps, source/endpoint, resolved entity ID, timestamp, credits, retry/fallback state, and outcome. Keep API diagnostics available but collapsed until asked for; the default trace should be understandable to an analyst, not only an engineer.
6. **Activity context:** display Heartbeat as a set of dated components and coverage. Put the missing-data rule next to it. Never treat missing fields as zero or convert this metric into an eligibility/fraud verdict.
7. **Local action:** make each completed action clearly say **simulated · local only** and name the file or record that changed. Prepared callback tasks must be visibly unsent. Nothing in the UI should imply a real payment, email, or external submission occurred.
8. **Evidence graph:** keep the company/person/claim/evidence connections compact and secondary to the claim matrix. Selecting an item should reveal its source, match confidence, date, and relation. Supply a keyboard-operable list view.

Do not show empty panels as if checks passed. Show **not run**, **unavailable**, **no record found in this source**, or **ambiguous match** with a plain explanation. Make live data, stored replay, and illustrative/synthetic values visibly different. Never fabricate live activity to make a demo more dramatic.

## Interaction and motion

- Every button, filter, link, and example chip must have an obvious label and visible hover/focus/disabled states.
- Preserve normal browser behavior for links. Use buttons for actions and links for navigation/source opening.
- Streamed agent work should read like a calm progress log: step name, current action, and completed/skipped/failed state. Announce meaningful updates accessibly; avoid a rapidly changing ticker.
- Use motion for hierarchy, selection, or run progress only. Honor `prefers-reduced-motion`; never require animation to understand evidence or status.
- Avoid unnecessary modals. Use a side panel/drawer for source detail if it preserves the table context and works with keyboard focus.
- Keyboard shortcuts/command palette are a post-MVP enhancement. The entire case review must remain usable without them.

## Accessibility and responsive behavior

Target WCAG 2.2 AA for the core screen. W3C guidance sets a 4.5:1 contrast minimum for normal text and 3:1 for large text. Keep visible keyboard focus; do not remove the browser outline without a stronger replacement. Aim for 40–44 px primary action/control heights and at least WCAG 2.2 AA’s 24×24 CSS-pixel target or sufficient spacing for smaller targets. Provide text/icon/state labels in addition to color.

Primary review viewport: 1440×900; also ensure the 1280×720 demo view keeps the verdict, top conflicts, and first evidence rows visible without horizontal scrolling. At narrower widths, deliberately reflow: use a two-column layout where it still reads well, then stack into clearly ordered sections or tabs. Do not simply shrink three desktop columns until the content becomes unreadable. Keep long names, claims, source titles, amounts, and evidence IDs inspectable; allow wrapping or an explicit expand action instead of silently clipping them.

Respect browser zoom and larger text. Use semantic headings, table headers, labels, `aria-live` for important asynchronous state, and accessible names for icon-only controls. If an evidence relationship is drawn visually, provide its information in semantic text as well. Test status colors in grayscale/high contrast and with common color-vision differences.

## How to use the supplied design galleries

The screenshots/examples supplied by the user are inspiration for interaction quality, not a mandate to combine every style. Use galleries to answer a specific question such as “how should a side panel behave?” or “how should a command menu group actions?” Before importing any component, inspect the existing app and ask whether its behavior solves a SignalGate task. Prefer a small accessible primitive or adapt the current CSS. Keep licenses/attribution for any copied assets or code; do not download third-party dashboard screenshots or use another company’s logo as SignalGate branding.

No decorative asset pack is required for the MVP. Use company marks only when they come from authorized CrustData data and provide a neutral initials fallback. The supplied UI mockup and simple SVG data marks are enough; invest the time in typography, content hierarchy, evidence detail, and responsive behavior.

## Implementation review checklist

Before considering a UI slice done:

- Check its rendering in a browser at the two demo viewports and one narrow viewport; source inspection alone is not visual review.
- Confirm the main outcome, top reason, and cited evidence can be understood quickly without reading the full agent trace.
- Check empty, running, partial, replay, synthetic, no-match, ambiguous, conflicting, and failed-source states where relevant.
- Confirm each status has text and is not conveyed by color alone; check text and focus contrast.
- Navigate the primary flow with keyboard only; inspect focus order, table semantics, and source-detail behavior.
- Check reduced-motion behavior, long-content wrapping, and zoom/reflow.
- Ensure all visible credit/model telemetry matches the execution trace and does not imply data that was not retrieved.
- Keep original data provenance close to claims; LLM prose never replaces the evidence row.

## Research and reference links

- [Vercel Geist design system](https://vercel.com/geist/introduction), [Geist colors](https://vercel.com/geist/colors), and [Geist typography](https://vercel.com/geist/typography): use for hierarchy, semantic color tokens, and numeric/metadata typography ideas.
- [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines): responsive behavior, keyboard interaction, async announcements, and reduced-motion implementation practices.
- [Stripe Dashboard charts](https://support.stripe.com/questions/dashboard-home-page-charts-for-business-insights): quick dashboard summaries belong alongside more accurate, detailed reports; do not let a single chart replace the evidence record.
- [Linear keyboard shortcuts](https://linear.app/changelog/2021-03-25-keyboard-shortcuts-help): keyboard efficiency is a useful enhancement for repeat users, not a substitute for visible controls.
- [React Flow](https://reactflow.dev/index): MIT-licensed node editor for interactive node-based interfaces; only use if SignalGate grows a true user-authored workflow/editor requirement.
- [shadcn/ui](https://ui.shadcn.com/): accessible, composable building blocks that can be customized; selectively source primitives, not a wholesale visual identity.
- [Apple guidance on color](https://developer.apple.com/design/human-interface-guidelines/color) and [UI design](https://developer.apple.com/design/tips/): consistent semantic color, contrast, hierarchy, touch targets, and readable layout.
- [W3C WCAG 2.2 contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum), [focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible), and [target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum): accessibility requirements used by this guide.
- [Anthropic Claude Code memory files](https://docs.anthropic.com/en/docs/claude-code/memory): project `CLAUDE.md` files load as instructions and can import shared Markdown guidance with `@path`.
- User-provided galleries: [v0](https://v0.app), [21st.dev](https://21st.dev/community/components), [Magic UI](https://magicui.design), [Aceternity UI](https://ui.aceternity.com), and [CopilotKit Generative UI](https://docs.copilotkit.ai/concepts/generative-ui-overview). Browse for isolated ideas; do not add their dependencies by default.
