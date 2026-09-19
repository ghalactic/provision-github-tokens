---
status: accepted
---

# Use last-rule-wins for rule resolution ordering

When multiple permission or provision rules match the same consumer/target pair,
later rules override earlier ones. Providers order rules most-general to
most-specific: start with broad defaults, add exceptions below. Order determines
behavior — no implicit priority or specificity calculations — and the same
semantics apply to both rule types. The hazard is the reverse: accidentally
placing a broad rule after a specific one silences the specific rule.
Restrictive and permissive resolution strategies were rejected because each
makes targeted exceptions to the opposite posture impossible.
