---
status: accepted
date: 2024-10-14
decision-makers: ezzatron
---

# Distinguish requester and consumer as separate roles

## Context and problem statement

The system originally used "consumer" for both the repo that _declares_ what
tokens it needs and the repo that _receives_ the issued token. This was
confusing because a declaring repo can request tokens be provisioned to a
different repo entirely.

## Decision outcome

Use two distinct terms:

- **Requester** — the repo that contains a config file declaring what tokens it
  needs and where they should be provisioned as secrets.
- **Consumer** — the repo or account that actually receives the issued token.
  This may be the requester itself, or a different repo that the requester has
  nominated as a provisioning target.

The `consumers` field in permission rules is consistent with this terminology —
it matches against the repos that will consume the token.

### Consequences

- Good, because the two sides of a provisioning interaction now have distinct
  names.
- Bad, because the two terms must be used precisely — casual interchange will
  reintroduce the original confusion.
