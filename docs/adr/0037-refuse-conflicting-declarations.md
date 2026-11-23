---
status: accepted
---

# Refuse conflicting declarations

Two requesters can declare the same secret name at the same **Provision
target**, and writes are upserts, so the last would silently win. Declarations
conflict when they disagree about what the consumer would get — token shape,
secret visibility, or name casing, compared case-insensitively. Identical
declarations don't conflict; either write produces the same secret.

Conflicts are resolved during authorization: a conflicting declaration is
denied, its explanation names the other declarations, and provisioning writes
only allowed declarations. Every participant is told, allowed or denied, so
fixing authorization can't reveal a second problem. No other layer knows about
conflicts; the summary and dashboards report the denied declaration like any
other.
