---
status: accepted
---

# Require explicit role selection for write-level token requests

Token declarations requesting write-level access or higher must name the
specific app (role) that should issue the token, because GitHub attributes that
app's name and avatar to the write operations it performs. The action refuses to
create a write-level token without a role. Read-only declarations may omit the
role, letting the action auto-select an issuer. Always requiring a role was
rejected as unnecessary verbosity for read-only tokens; silent auto-selection
was rejected because users lose control over which identity appears alongside
their automated actions.
