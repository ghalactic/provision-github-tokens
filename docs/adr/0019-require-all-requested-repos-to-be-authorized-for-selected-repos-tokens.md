---
status: accepted
---

# Require all requested repos to be authorized for selected-repos tokens

Selected-repos token authorization is all-or-nothing: every requested repository
must be independently authorized, or the entire request fails. Each repo's
permissions are evaluated separately and combined with a logical AND, so a
single unauthorized repo blocks the whole token. Consumers therefore get exactly
the repos they declared — there's no silent scope reduction that would cause
downstream workflows to fail unpredictably. Issuing a token for the authorized
subset was rejected for exactly that reason.
