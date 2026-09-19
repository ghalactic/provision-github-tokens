---
status: accepted
---

# Use provider-controlled trust for token authorization

The provider repo's configuration is the sole authority on what tokens
requesters can obtain: requesters declare what they _want_, the provider decides
what they're _allowed_. Provider permission rules match consumers (repos or
accounts, by pattern), restrict target resources, and set permission levels, so
no requester can escalate beyond what the provider allows. Requester-controlled
authorization, delegation chains, and per-token static allowlists were rejected
as insecure, hard to audit, or unable to scale. ADR-0012 adds an
installation-permissions boundary beyond this policy layer.
