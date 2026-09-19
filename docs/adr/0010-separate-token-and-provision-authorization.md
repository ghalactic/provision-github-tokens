---
status: accepted
---

# Separate token and provision authorization

Authorization is split into two independent checks that must both pass: **token
authorization** (can this requester get a token with these permissions for these
repos?) and **provision authorization** (can it place a secret of this type —
actions, codespaces, dependabot, environment — at this target?). Granting one
never implies the other, giving providers fine-grained control over what tokens
exist and where they end up. This also mirrors the issuer/provisioner split
(ADR-0011), where the two operations may run under different apps. A single
unified check was rejected because a requester allowed to obtain a token would
implicitly be able to provision it anywhere.
