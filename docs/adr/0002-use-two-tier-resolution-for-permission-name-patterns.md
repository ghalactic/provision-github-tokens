---
status: superseded by ADR-0029
---

# Use two-tier resolution for permission name patterns

Provider permission rules support glob-style patterns as permission keys. Within
a rule, pattern keys resolve max-wins (the highest access level among all
matching patterns applies) and literal keys unconditionally override the pattern
result: `"*": write` with `contents: none` grants everything except contents.
Inter-rule semantics remain last-rule-wins.

**Superseded by ADR-0029**, which changes the pattern tier to min-wins so
overlapping patterns fail closed instead of escalating.
