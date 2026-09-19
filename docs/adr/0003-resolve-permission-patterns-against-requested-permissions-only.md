---
status: accepted
---

# Resolve permission patterns against requested permissions only

Patterns resolve against the requested permissions only — the set declared in
the requester's token declaration — never against a hard-coded list of GitHub
permissions. `"*": write` requesting `{contents: write, metadata: read}`
resolves to `{contents: write, metadata: write}`, not 30+ permissions. The
system is permission-name-agnostic; new GitHub permissions work automatically, a
hard-coded list would require maintenance and clutter results with permissions
the requester never asked for. The flip side: providers can't proactively grant
permissions the requester didn't request.
