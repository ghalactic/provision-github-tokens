---
status: accepted
---

# Discover requesters via app installations

Requesters are discovered by enumerating the repositories reachable by
provisioner app installations and checking each candidate for a requester config
file. This makes the app-installation boundary the security boundary: only repos
an app is installed on can participate, enforced by GitHub's own installation
model. Adding a new requester is just adding a config file — no provider-side
change. Alternatives (hardcoded allowlists, webhook-driven discovery) added
inflexibility, infrastructure, or lost the security boundary.
