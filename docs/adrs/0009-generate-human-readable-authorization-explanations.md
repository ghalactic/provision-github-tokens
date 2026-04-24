---
status: accepted
date: 2024-10-14
decision-makers: ezzatron
---

# Generate human-readable authorization explanations

## Context and problem statement

The authorization rule system evaluates layered pattern matching across multiple
rules. When a token request is denied, the reason is not obvious from the config
alone — multiple rules may interact, and the final decision depends on which
patterns matched and what permissions they contributed. Without explanations,
debugging denied requests requires reading the authorization logic itself.

## Decision

Every authorization decision produces a human-readable text explanation that
appears in the GitHub Actions log. The explanation describes:

- What was requested (token permissions, target repos, secret destinations)
- Whether it was allowed or denied
- Which rules matched and what they contributed
- Why the final decision was reached

Explanations are generated for both token authorization and provision
authorization decisions.

## Consequences

- Good, because denied requests are debuggable without reading the authorization
  logic.
- Good, because logs serve as an audit trail for security reviews.
- Bad, because explanations add verbosity to action logs.

## Alternatives considered

- **Silent pass/fail**: no way to debug denied requests without reading source
  code.
- **Raw rule dumps**: show the matching rules but not how they combined to
  produce the decision — not human-readable.
- **Separate audit log system**: unnecessary complexity for an action that
  already runs in CI with built-in logging.
