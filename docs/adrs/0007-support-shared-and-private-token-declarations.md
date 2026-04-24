---
status: accepted
date: 2024-10-13
decision-makers: ezzatron
---

# Support shared and private token declarations

## Context and problem statement

Multiple repos in an organization often need the same token (same permissions,
same target account). Without a sharing mechanism, each repo must duplicate the
full token declaration. But making all declarations globally visible creates
namespace conflicts and removes isolation between unrelated repos.

## Decision

Token declarations have a sharing flag:

- **Private** (default) — only the declaring repo can use the declaration
- **Shared** — any requester repo can reference and use the declaration

Declarations are identified by `{owner/repo}.{name}`. When a repo references a
declaration, the registry checks whether it's shared or whether the reference
comes from the declaring repo itself.

This supports both self-contained repos (private declarations) and organizations
where a central repo defines reusable declarations for others.

## Consequences

- Good, because shared declarations eliminate duplication across repos.
- Good, because private-by-default prevents accidental exposure.
- Bad, because shared declarations create coupling between repos — changes to a
  shared declaration affect all consumers.

## Alternatives considered

- **All declarations private**: forces duplication across repos that need the
  same token.
- **All declarations shared**: namespace conflicts and no isolation between
  unrelated repos.
- **Per-requester access lists**: complex to maintain for minimal benefit over a
  binary shared/private flag.
