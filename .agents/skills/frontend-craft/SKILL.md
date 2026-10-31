---
name: frontend-craft
description: Design and build polished, distinctive, accessible interfaces for data-heavy agent workflows, emphasizing usable work queues, visible evidence, and clear execution states.
---

# Frontend Craft

Use when building or substantially changing the user interface for this hackathon product.

## Design direction

- Read the product and its data before choosing the visual direction. Base the interface on the real service workflow and the objects it handles.
- Give the product a clear visual thesis, a restrained token system, and one memorable detail tied to its domain. Avoid a generic chatbot frame or interchangeable AI dashboard.
- Design for a live demo: make the request, progress, evidence, exception state, and completed deliverable easy to understand at a glance.
- Use real CrustData-derived names, company information, logos, and profile images when authorized and available. Keep provenance close to the claim. Use clearly marked sample data when live access is unavailable.
- Keep copy specific and concise. Make every visible control describe the action it performs.

## Interface behavior

- Preserve the existing framework, components, and useful behavior. Do not add dependencies or invent features without a reason.
- Use semantic HTML, keyboard-accessible controls, visible focus, adequate contrast, and accessible names for icon-only actions.
- Make loading, empty, partial, error, and success states understandable. Do not hide unresolved matches, long names, source links, or omitted rows through truncation.
- Make the layout work at the actual presentation viewport and remain usable at narrower widths when feasible or requested.
- Use motion only when it clarifies progress, hierarchy, or interaction, and respect reduced-motion settings.

## Review

When implementation is requested, inspect the changed interface in a browser if available and correct visible clipping, overlap, unreadable text, missing evidence, and confusing states. Source inspection alone is not visual verification. Follow the user request and project rules on whether to run checks or tests; report exactly what was inspected.
