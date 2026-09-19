---
status: accepted
---

# Separate provider and requester configuration

Configuration is split into two YAML files: a **provider config** in the repo
running the action (permission rules — what tokens are allowed — and provision
rules — where secrets can go) and a **requester config** in each requesting repo
(what tokens it needs and where to provision them). The provider controls policy
centrally while requesters self-serve their own declarations. A single
centralized config would force the provider to enumerate every requesting repo;
requester-only config would let requesters self-authorize.
