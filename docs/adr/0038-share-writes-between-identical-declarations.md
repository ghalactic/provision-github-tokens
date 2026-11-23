---
status: accepted
---

# Share writes between identical declarations

Two requesters can declare the same secret name with the same content at the
same provision target. Each write is an upsert, so writing once per declaration
repeats encryption and the GitHub call. Identical declarations have the identity
that conflict detection uses (ADR-0037): secret name as written, provision
target, token shape, and account secret visibility.

The provisioner groups allowed targets that have a token by that identity. The
first encrypts and writes; every member of the group receives its
`ProvisionResult`, including failures. A target without a token makes no write,
reports its own `NO_TOKEN`, and joins no group.

Reporting is unchanged: each declaration still appears in the summary and on its
requester's dashboard.

This extends ADR-0028's creation-level cache to writes.
