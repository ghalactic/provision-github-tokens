---
status: accepted
date: 2025-02-03
decision-makers: ezzatron
---

# Separate token and provision authorization

## Context and problem statement

A requester's request involves two distinct questions: can it obtain a token
with certain permissions, and can it place that token as a secret in a
particular scope? Combining these into a single authorization check would mean
that granting token permissions implicitly grants provisioning rights, or vice
versa.

## Decision outcome

Authorization is split into two independent checks that must both pass:

1. **Token authorization** — can this requester get a token with these
   permissions for these repos?
2. **Provision authorization** — can this requester place a secret in this scope
   (actions, codespaces, dependabot, environment) at this target?

These are orthogonal: a requester might be allowed to obtain a token but not
provision it to a particular secret scope, or vice versa. Splitting them gives
providers fine-grained control over both _what tokens exist_ and _where they end
up_.

This also reflects the architecture — token issuance and secret provisioning may
use different GitHub Apps with different capabilities.

### Consequences

- Good, because providers can independently control token permissions and secret
  placement.
- Good, because the two checks mirror the two app roles (issuer and
  provisioner), keeping concerns separated.
- Bad, because providers must configure two sets of rules instead of one.

### Alternatives rejected

- **Single unified authorization**: can't independently control token
  permissions vs. secret placement — granting a token implicitly allows
  provisioning it anywhere.
- **Provision-only authorization**: can't restrict which tokens exist — any
  declared token would be created regardless of permissions policy.

## More information

- Related: [ADR-0008] — provider-controlled trust model defines the token
  authorization rules
- Related: [ADR-0011] — dual app roles align with the two authorization layers

[ADR-0008]: 0008-use-provider-controlled-trust-for-token-authorization.md
[ADR-0011]:
  0011-use-dual-app-roles-for-token-issuance-and-secret-provisioning.md
