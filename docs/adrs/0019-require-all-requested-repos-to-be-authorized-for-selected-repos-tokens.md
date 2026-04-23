---
status: accepted
date: 2025-02-02
decision-makers: ezzatron
---

# Require all requested repos to be authorized for selected-repos tokens

## Context and problem statement

When a token declaration requests access to a specific set of repositories, some
repos may be authorized while others are not. The system must decide whether to
issue a token scoped to only the authorized repos, or to refuse the request
entirely.

## Decision outcome

Selected-repos token authorization uses all-or-nothing semantics: every
requested repository must be independently authorized, or the entire token
request fails. There is no partial success where a token is issued for a subset
of the requested repos.

Each repo's permissions are evaluated separately against the rules, and the
overall authorization is the logical AND of all per-repo results. A single
unauthorized repo causes the entire request to be denied.

### Consequences

- Good, because consumers can rely on getting exactly the repos they declared —
  there is no silent scope reduction that could cause downstream workflows to
  fail in unexpected ways.
- Good, because authorization failures are surfaced as explicit denials rather
  than silently degraded tokens, making misconfigurations easier to diagnose.
- Bad, because a single misconfigured repo in a multi-repo declaration blocks
  all repos, even those that would be authorized individually.

### Alternatives rejected

- **Issue tokens for the authorized subset**: the consumer would receive a token
  with fewer repos than requested, leading to silent failures in workflows that
  depend on the full set.
- **Best-effort with warnings**: consumers might not notice warnings, and
  downstream workflows would still fail unpredictably when they try to access
  unauthorized repos.

## More information

- Related: [ADR-0017] — the three repository scope categories, of which
  selected-repos is one

[adr-0017]:
  0017-split-token-authorization-into-three-repository-scope-categories.md
