---
status: accepted
---

# Split token authorization into three repository-scope categories

Token authorization is split into three categories by requested repository
scope: **all repos** (a single permission set, includes future repos),
**selected repos** (per-repo evaluation; every repo must be authorized — see
ADR-0019), and **no repos** (account-level capabilities only). Each category has
its own matching criteria in permission rules, because the scopes carry very
different risk — and notably, GitHub grants permissions account-wide even when a
token can only access selected repos. A single authorization path was rejected
as unable to distinguish these risk profiles; automatic scope downgrade was
rejected as silently changing the requester's intent.
