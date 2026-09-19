---
status: accepted
---

# Support using different app installations for issuance and provisioning

Each configured GitHub App is explicitly designated as an **issuer** (creates
installation access tokens), a **provisioner** (writes secrets to repos and
organizations), or both. Separating the two lets the provisioner hold
secrets-write permissions without expanding the issuer's permissions boundary
(ADR-0012); now the provisioner can be a different app. A single app for both
remains deliberately supported to keep simple configurations simple. One-purpose
apps were rejected because they'd force two apps even when one suffices;
per-installation designation was rejected as too granular.
