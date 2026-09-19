---
status: accepted
---

# Default to the defining repository's account and support self-targeting

Two defaults make the most common case — a repo requesting a token and placing
it as a secret in its own repo — the least configuration: a token declaration
that omits the account defaults to the requesting repo's own account, and
provision rules have dedicated self-targeting fields for the repo's own
repository and account rather than relying on patterns that happen to match. A
self-target can override a pattern result, so providers can write broad deny
rules with a self-provisioning carve-out. Explicit-everywhere configuration was
rejected as verbose and copy-paste-prone; pattern-only targeting doesn't express
intent.
