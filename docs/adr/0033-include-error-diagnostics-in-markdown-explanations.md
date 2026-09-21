---
status: accepted
---

# Include error diagnostics in Markdown explanations

Markdown explanations carry the raw error diagnostic — HTTP response bodies and
error stacks — in a collapsed raw-HTML `<details>` block, in addition to the
log-level output ADR-0030 already specifies. Requesters can't read the
provider's logs and ADR-0031 promises dashboards full Markdown explanations, so
the diagnostic has to travel with the explanation. Raw HTML is an accepted
exception to the AST-only rendering rule because mdast has no details node; an
always-visible code block was rejected for dominating the explanation.
