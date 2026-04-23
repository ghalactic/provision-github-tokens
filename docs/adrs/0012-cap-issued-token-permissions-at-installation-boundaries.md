---
status: accepted
date: 2024-10-14
decision-makers: ezzatron
---

# Cap issued token permissions at installation boundaries

## Context and problem statement

GitHub App installation access tokens are created by installations, and each
installation has its own set of granted permissions. When the action creates
tokens on behalf of requesters, there's a question of what should happen when a
requester asks for permissions that exceed what the issuer installation itself
has.

Provider-controlled rules (see [ADR-0008]) define _policy_ — what requesters are
allowed to request. But policy alone isn't sufficient. An issuer installation's
own permissions represent a hard technical boundary on what tokens it can
create, analogous to an [AWS IAM permissions boundary]. Even if provider rules
would allow a token request, the issuer cannot grant permissions it doesn't
have.

## Decision outcome

An issuer installation's permissions act as a hard boundary for any tokens it
creates. A token request is denied if it asks for any permission that the issuer
installation doesn't have, regardless of what the provider's rules allow.

This boundary is enforced independently of — and in addition to — the provider's
permission rules. Both checks must pass: the provider must allow the request
_and_ the issuer must have the requested permissions.

### Consequences

- Good, because the issuer installation's permissions provide a clear, immutable
  security boundary that cannot be overridden by configuration.
- Good, because this gives organizations direct control through GitHub's own app
  installation permissions UI — revoking a permission from an installation
  immediately prevents any token from including it.
- Good, because this motivates separating issuer and provisioner roles (see
  [ADR-0011]) — the provisioner's permissions don't expand the issuer's
  boundary.
- Bad, because a mismatch between provider rules and installation permissions
  can cause confusing authorization failures that require checking both
  configurations.

### Alternatives rejected

- **Ignore installation permissions, rely only on provider rules**: not
  technically possible — GitHub's API enforces that installation tokens cannot
  exceed the installation's permissions. Making this an explicit design decision
  rather than a hidden API constraint improves clarity.
- **Automatically downgrade tokens to the installation's permissions**: would
  silently grant fewer permissions than requested, leading to hard-to-debug
  failures in downstream workflows.

## More information

- Related: [ADR-0008] — provider-controlled trust defines the policy layer; this
  ADR defines the installation boundary layer
- Related: [ADR-0011] — separating issuer and provisioner roles prevents the
  provisioner's permissions from expanding the issuer's boundary

[ADR-0008]: 0008-use-provider-controlled-trust-for-token-authorization.md
[ADR-0011]:
  0011-use-dual-app-roles-for-token-issuance-and-secret-provisioning.md
[AWS IAM permissions boundary]:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
