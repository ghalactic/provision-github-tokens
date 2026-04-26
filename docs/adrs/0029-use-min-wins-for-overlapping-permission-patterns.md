---
status: accepted
date: 2026-04-26
decision-makers: ezzatron
---

# Use min-wins for overlapping permission patterns

## Context and problem statement

ADR-0002 chose max-wins for overlapping pattern keys within a rule. That makes
broad grants easy but makes targeted de-escalation between overlapping patterns
impossible. We need overlapping patterns to prefer the safer result while
keeping existing literal override and rule-order behavior.

## Decision

Within a single rule, the pattern tier resolves overlapping pattern matches to
the lowest access level (min-wins). Literal permission keys still
unconditionally override the pattern result for the same permission name. Across
rules, semantics remain last-rule-wins.

## Consequences

- Good, because overlapping patterns fail closed and reduce accidental
  over-grants.
- Good, because literal keys still provide explicit per-permission exceptions.
- Bad, because providers that relied on max-wins must reorder or rewrite
  patterns.

## Alternatives considered

- Keep max-wins for patterns: preserves existing behavior but keeps permissive
  outcomes for overlapping patterns.
- Add specificity-based precedence: rejected because glob specificity is harder
  to reason about than a single min-wins rule.

## More information

- Supersedes: [ADR-0002][adr-0002].
- Related: [ADR-0003][adr-0003], [ADR-0015][adr-0015].

[adr-0002]: 0002-use-two-tier-resolution-for-permission-name-patterns.md
[adr-0003]:
  0003-resolve-permission-patterns-against-requested-permissions-only.md
[adr-0015]: 0015-use-last-rule-wins-for-rule-resolution-ordering.md
