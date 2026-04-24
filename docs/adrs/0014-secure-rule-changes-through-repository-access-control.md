---
status: accepted
date: 2024-08-25
decision-makers: ezzatron
---

# Secure rule changes through repository access control

## Context and problem statement

The action's permission rules and provision rules determine what tokens can be
created and where secrets can be placed. Changes to these rules have security
implications — relaxing a permission rule or adding a new provision target
effectively grants access. The system needs a way to control who can make these
changes without building a custom authorization layer on top.

## Decision outcome

The provider configuration — which contains all permission rules and provision
rules — lives in a dedicated repository, separate from the repositories that
consume tokens. Security is enforced through the access controls of the provider
repository itself.

This design assumes that the provider repository has stricter write access than
the requesting repositories. In a typical setup, a platform or security team
maintains the provider repository while development teams maintain their own
requesting repositories. The requesting teams control their own token
declarations (what they _want_), but cannot unilaterally change what they're
_allowed_.

Development teams can still self-serve by submitting pull requests against the
provider repository for rule changes. The owning team reviews and approves or
denies these changes using standard code review, with the full history captured
in the commit log.

### Consequences

- Good, because no custom authorization mechanism is needed — repository access
  control and code review provide the security layer.
- Good, because rule changes are auditable through the commit history of the
  provider repository.
- Good, because development teams can self-serve by submitting pull requests for
  rule changes, rather than filing tickets or waiting on manual provisioning.
- Bad, because the security model depends on the provider repository's access
  controls being correctly configured — a misconfigured repository could allow
  unauthorized rule changes.

### Alternatives rejected

- **In-app authorization for rule changes**: adds significant complexity — would
  need its own user management, permissions model, and audit logging, all of
  which Git and GitHub already provide.
- **Rules defined per-requester in each requesting repo**: no central control —
  equivalent to letting requesters self-authorize (see [ADR-0004]).
- **Out-of-band rule management** (e.g. a separate admin UI or API): splits the
  source of truth, making it harder to audit and reason about what rules are
  active.

## More information

- Related: [ADR-0004] — the two-config split that places policy in the provider
  repo and declarations in requester repos
- Related: [ADR-0008] — the provider-controlled trust model that this access
  control secures

[adr-0004]: 0004-separate-provider-and-requester-configuration.md
[adr-0008]: 0008-use-provider-controlled-trust-for-token-authorization.md
