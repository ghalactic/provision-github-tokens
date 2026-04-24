---
status: accepted
date: 2024-10-14
decision-makers: ezzatron
---

# Use last-rule-wins for rule resolution ordering

## Context and problem statement

Both permission rules and provision rules can overlap — a single consumer or
target might match multiple rules. When this happens, the system needs a
predictable way to determine which rule takes effect. The resolution strategy
must be easy to reason about and powerful enough to express both broad defaults
and targeted exceptions.

## Decision

When multiple rules match, later rules override earlier ones. This applies
consistently to both permission rules and provision rules. Providers order their
rules from most general to most specific, and later rules overwrite permissions
established by earlier ones.

This makes rule authoring straightforward: start with broad defaults, then add
exceptions below. The final state of permissions for a given consumer/target
pair is determined by walking the rules top-to-bottom, with each matching rule's
permissions overwriting what came before.

## Consequences

- Good, because rule behavior is determined entirely by order — no implicit
  priority or specificity calculations.
- Good, because it's trivial to add exceptions — place a more specific rule
  after a general one.
- Good, because the same semantics apply to both permission rules and provision
  rules, reducing cognitive load.
- Bad, because accidentally placing a broad rule after a specific one can
  silently override the specific rule.

## Alternatives considered

- **Most-restrictive-wins**: makes it impossible to grant targeted exceptions to
  broad restrictions without removing the restriction entirely.
- **Most-permissive-wins**: makes it impossible to restrict specific cases after
  granting broad access.
- **Specificity-based resolution**: difficult to define for glob patterns, and
  hard for providers to reason about when multiple patterns overlap.
