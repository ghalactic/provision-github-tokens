---
status: accepted
---

# Use min-wins for overlapping permission patterns

Within a single rule, the pattern tier resolves overlapping pattern matches to
the lowest access level (min-wins), superseding the max-wins choice in ADR-0002.
Literal permission keys still unconditionally override the pattern result for
the same permission name, and cross-rule semantics remain last-rule-wins. This
lets overlapping patterns fail closed and reduce accidental over-grants;
providers that relied on max-wins must restructure to split logic across rules.
Specificity based precedence was rejected as harder to reason about than a
single min-wins rule.
