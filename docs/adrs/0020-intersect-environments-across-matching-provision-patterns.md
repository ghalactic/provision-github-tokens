---
status: accepted
date: 2025-05-27
decision-makers: ezzatron
---

# Intersect environments across matching provision patterns

## Context and problem statement

A secret declaration can specify provision targets using patterns that match
repos. When multiple repo patterns in the declaration match the same physical
repository, each pattern may specify different environment lists. The system
must decide how to combine them — should the target repo receive secrets in the
union of all matched environments, or only those environments that all patterns
agree on?

## Decision

When multiple repo patterns match the same target repository, their environment
lists are intersected — only environments present in every matching pattern's
list are included.

This is stricter than the handling of secret types (actions, codespaces,
dependabot), which use union semantics. The asymmetry reflects the different
risk profiles: environments often represent deployment stages where unintended
access is higher-impact.

## Consequences

- Good, because a broad repo pattern can't inadvertently extend environment
  access beyond what a more specific pattern intended.
- Good, because adding a new repo pattern can only narrow environment scope,
  never widen it.
- Bad, because a pattern with an empty environment list causes the intersection
  to be empty for any repo it matches.

## Alternatives considered

- **Union of environments**: a broad pattern would override the intent of
  narrower patterns that restrict environments.
- **Last-pattern-wins**: fragile ordering dependency, inconsistent with
  intersection semantics used elsewhere.
- **Require explicit per-repo environment lists**: eliminates ambiguity but
  sacrifices pattern-based convenience.
