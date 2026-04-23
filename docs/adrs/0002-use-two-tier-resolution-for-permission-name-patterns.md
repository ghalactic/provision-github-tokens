---
status: accepted
date: 2026-04-23
decision-makers: ezzatron
---

# Use two-tier resolution for permission name patterns

## Context and Problem Statement

Provider permission rules support glob-style patterns as permission keys (e.g.,
`"*": write`, `"secret_*": write`). When a rule mixes pattern and literal keys,
the result for a permission that matches both is ambiguous. We need a resolution
strategy that supports both broad granting and targeted de-escalation within a
single rule:

```yaml
permissions:
  "*": write
  contents: none # must override the wildcard
```

## Decision Outcome

Two-tier resolution within each rule:

1. **Pattern keys** (containing `*`): max-wins — the highest access level among
   all matching patterns applies.
2. **Literal keys** (no `*`): unconditionally override whatever patterns
   computed.

If neither tier matches a requested permission, the rule doesn't affect it.
Inter-rule semantics are unchanged (last rule overrides via `Object.assign`).

### Consequences

- Good, because broad grants (`"*": write`) and targeted restrictions
  (`contents: none`) work in the same rule.
- Bad, because among patterns, only the most permissive match wins — no
  "narrowest pattern wins" option.

### Alternatives rejected

- **Flat max-wins** (no tiers): can't de-escalate — `contents: none` loses to
  `"*": write`.
- **Separate `permissionsMatch` key**: splits one concept across two fields; the
  existing schema already accepts arbitrary keys.
- **Specificity-based**: hard to define for globs, harder for providers to
  reason about.

## More Information

- Related: [ADR-0003] — patterns resolve against requested permissions only

[ADR-0003]:
  0003-resolve-permission-patterns-against-requested-permissions-only.md
