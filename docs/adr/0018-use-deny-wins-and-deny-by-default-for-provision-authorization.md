---
status: accepted
---

# Use deny-wins and deny-by-default for provision authorization

Provision authorization is deliberately conservative, because misplacing a
secret exposes a token to unintended consumers. Within a rule, a deny from any
matching pattern vetoes the result for that target (deny-wins); a specific
target denied by a broad pattern needs a separate later rule. Across rules,
targets that no rule explicitly allows are denied (deny-by-default). This is the
opposite of token permission patterns, which resolve max-wins (ADR-0002) — an
asymmetry providers must understand.
