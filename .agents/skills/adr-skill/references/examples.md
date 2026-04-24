# ADR examples

These are filled-out examples from the repo showing two levels of detail. Both
are deliberately brief — this is the target verbosity.

## Concise example

```markdown
---
status: accepted
date: 2025-07-05
decision-makers: Erin
---

# Distinguish requester and consumer as separate roles

## Context and problem statement

The project originally used "consumer" for both the repo that declares its token
needs and the repo that receives the issued token. When a requester provisions
tokens to a different repo, this ambiguity created confusion.

## Decision

Use two distinct terms:

- **Requester** — the repo containing a config file declaring token needs.
- **Consumer** — the repo or account that receives the issued token. May be the
  requester itself or a different repo.

## Consequences

- Good, because documentation and code review discussions are unambiguous.
- Bad, because existing docs and ADRs use the old terms and may need updating.
```

## Detailed example

This is about as long as an ADR should get. Anything longer should be trimmed.

```markdown
---
status: accepted
date: 2025-05-10
decision-makers: Erin
---

# Define access level hierarchy for permission comparison

## Context and problem statement

The authorization system needs to compare GitHub permission levels (none, read,
write, admin) when evaluating whether a request exceeds what a rule allows.
GitHub has no built-in numeric ranking, leading to ad-hoc string comparisons.

## Decision

Define a numeric ranking: none (0) < read (1) < write (2) < admin (3). Provide
utility functions to compare levels and convert between string and numeric
representations. All permission comparisons must use these utilities.

## Consequences

- Good, because permission comparisons are consistent and centralized.
- Good, because adding a new level requires changing one module.
- Bad, because the ranking assumes a strict linear hierarchy, which may not hold
  if GitHub introduces non-linear permissions.

## Alternatives considered

- String comparison with a lookup table: Achieves the same result but scatters
  the hierarchy knowledge into each comparison site.
- TypeScript enum with numeric values: Weaker type safety for the string
  conversion use case.

## More information

Revisit if GitHub introduces permission levels that don't fit a linear
hierarchy.
```
