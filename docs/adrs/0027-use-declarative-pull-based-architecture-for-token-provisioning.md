---
status: accepted
date: 2024-08-25
decision-makers: ezzatron
---

# Use declarative pull-based architecture for token provisioning

## Context and problem statement

Centralized push-based token provisioning systems require per-requester
configuration in a central repo, with ownership managed through directory
structure and CODEOWNERS rules that grow in complexity with scale.

## Decision

Requesters declare what tokens they need in config files within their own repos.
The action discovers requesters, authorizes against provider policy, and
provisions tokens in a single run. Onboarding a new requester is just adding a
config file — ownership maps to existing repo boundaries.

## Consequences

- Good, because onboarding is self-service with no central repo changes.
- Good, because no complex CODEOWNERS configuration is needed.
- Bad, because all requesters are discovered and processed in a single run,
  which scales with the number of participating repos.

## Alternatives considered

- **Centralized per-requester workflows**: every new requester requires a
  central repo change and ownership rules grow with the number of teams.
- **External service**: adds infrastructure and operational burden that GitHub
  Actions already handles.

## More information

- Related: [ADR-0004] — the provider/requester config split that enables this
  architecture
- Related: [ADR-0006] — the discovery mechanism that finds requesters
  automatically
- Related: [ADR-0008] — the trust model that authorizes requests against
  provider policy

[adr-0004]: 0004-separate-provider-and-requester-configuration.md
[adr-0006]: 0006-discover-requesters-via-app-installations.md
[adr-0008]: 0008-use-provider-controlled-trust-for-token-authorization.md
