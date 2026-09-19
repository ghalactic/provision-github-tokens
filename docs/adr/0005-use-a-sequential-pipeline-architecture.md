---
status: accepted
---

# Use a sequential pipeline architecture

The action runs as a fixed sequence of phases — read provider config, discover
apps and installations, discover requesters and register token declarations,
authorize all requests, create installation access tokens, provision secrets.
Each phase depends on outputs of prior phases, which prevents cycles and
guarantees authorization runs with complete information. The cost: all discovery
must finish before any authorization begins, even for requesters that could be
processed earlier.
