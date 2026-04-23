---
status: accepted
date: 2024-08-25
decision-makers: ezzatron
---

# Use a sequential pipeline architecture

## Context and problem statement

The action must read configuration, discover apps and requesters, authorize
requests, create tokens, and provision secrets. These operations have data
dependencies — for example, authorization needs token declarations that come
from requester discovery, and token creation needs authorization results.

## Decision outcome

Run the action as a fixed sequence of phases:

1. Read provider config
2. Discover GitHub Apps and their installations
3. Discover requester repos and register their token declarations
4. Authorize all token and provision requests
5. Create installation access tokens for authorized requests
6. Provision tokens as secrets

Each phase depends on outputs from prior phases. This ordering prevents cycles
and ensures authorization decisions are made with complete information.

### Consequences

- Good, because data dependencies are satisfied by construction — no phase runs
  before its inputs are ready.
- Good, because the flow is deterministic and easy to debug from logs.
- Bad, because all discovery must complete before any authorization begins, even
  if some requesters could be processed earlier.

### Alternatives rejected

- **Event-driven**: complex state management with eventual consistency; hard to
  reason about when all inputs are ready.
- **Single-pass interleaving**: authorization can't reference token declarations
  that haven't been discovered yet.
