---
status: accepted
date: 2024-08-25
decision-makers: ezzatron
---

# Separate provider and requester configuration

## Context and problem statement

The action needs configuration to define both what tokens are allowed (policy)
and what tokens each repo needs (declarations). Combining these into a single
config file would either require the provider to enumerate every requesting repo
or let requesting repos self-authorize.

## Decision

Use two separate YAML config files:

- **Provider config** — lives in the repo running the action; defines permission
  rules (what tokens are allowed) and provision rules (where secrets can go)
- **Requester config** — lives in each requesting repo; declares what tokens it
  needs and where to provision them as secrets

The provider controls policy centrally while requesters self-serve their own
declarations without touching the provider repo.

## Consequences

- Good, because policy and declarations are independently maintained.
- Good, because adding a new requester doesn't require changes to the provider
  repo.
- Bad, because two config files can drift out of sync if not coordinated.

## Alternatives considered

- **Single centralized config**: doesn't scale — provider must enumerate every
  requester.
- **Requester-only config**: no central policy control — requesters could
  self-authorize.
- **Push-based provisioning**: provider must know all consumers upfront; doesn't
  support self-service.
