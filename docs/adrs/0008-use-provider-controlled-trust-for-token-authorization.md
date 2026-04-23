---
status: accepted
date: 2024-10-14
decision-makers: ezzatron
---

# Use provider-controlled trust for token authorization

## Context and problem statement

Requesters declare what tokens they want, but someone must decide what they're
actually allowed to have. If requesters control their own authorization, any
repo could escalate its own permissions. The trust model must ensure that a
central authority controls what tokens are issued.

## Decision outcome

The provider repo's configuration is the sole authority on what tokens
requesters can obtain. Requesters declare what they _want_; the provider decides
what they're _allowed_.

Provider permission rules specify:

- Which consumers (repos or accounts, matched by pattern) can request tokens
- For which target resources (all repos, specific repos, or no repos)
- With what permission levels

Requesters cannot escalate beyond what the provider allows. The provider has
veto power over every token request.

### Consequences

- Good, because a single repo controls the security policy for all token
  issuance.
- Good, because pattern-based rules scale to many requesters without
  per-requester configuration.
- Bad, because requesters depend on the provider to update rules when their
  needs change.

### Alternatives rejected

- **Requester-declared permissions with no central control**: insecure — any
  repo could request arbitrary permissions.
- **Transitive delegation chains**: hard to audit — trust flows through multiple
  intermediaries.
- **Per-token static allowlists**: inflexible — doesn't support pattern-based
  rules or scale to many requesters.
