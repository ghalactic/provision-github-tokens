---
status: accepted
---

# Reject empty token permission requests

Token authorization rejects requests whose permissions object has no entry with
a meaningful access level, before any rules are evaluated. GitHub's API treats
an empty permissions object as a request for _all_ permissions the installation
has, so a config mistake that produced empty permissions would otherwise create
a maximally permissioned token. Rejection turns the mistake into an explicit
error; warn-but-proceed was rejected because the consequence is too severe for a
warning. The trade-off: requesting all of an installation's permissions is
impossible — the request must always enumerate them.
