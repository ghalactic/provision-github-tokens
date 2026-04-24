---
status: accepted
date: 2025-02-03
decision-makers: ezzatron
---

# Use deny-wins and deny-by-default for provision authorization

## Context and problem statement

Provision rules determine whether a secret can be placed at a given target.
Unlike token permission rules — which use max-wins to determine the highest
access level ([ADR-0002]) — provision rules need a more conservative resolution
strategy, because misplacing a secret exposes a token to unintended consumers.

[adr-0002]: 0002-use-two-tier-resolution-for-permission-name-patterns.md

## Decision

Provision authorization uses two complementary postures:

- **Deny-wins within rules**: when multiple account, repo, or environment
  patterns match within a single rule, a deny from any pattern vetoes the result
  for that target. To allow a specific target denied by a broad pattern, the
  provider must write a separate later rule.
- **Deny-by-default across rules**: if no rule explicitly allows a target,
  provisioning is denied. The three-state model (`allow`, `deny`, `undefined`)
  treats both `undefined` and `deny` as denied for the final decision.

## Consequences

- Good, because broad deny patterns can't be overridden by narrower patterns in
  the same rule.
- Good, because new targets are never provisioned to without an explicit allow.
- Bad, because the asymmetry with token authorization (max-wins) is a subtlety
  providers must understand.

## Alternatives considered

- **Max-wins for provision patterns**: a specific allow could override a broad
  deny, risking unintended secret exposure.
- **Allow-by-default**: providers would have to explicitly deny every unwanted
  combination.

## More information

- Related: [ADR-0010] — provision authorization is one of the two independent
  authorization checks
- Contrast: [ADR-0002] — token permission patterns use max-wins, the opposite of
  deny-wins

[adr-0010]: 0010-separate-token-and-provision-authorization.md
