---
status: accepted
---

# Rely on app installation controls for token revocation

The only supported revocation mechanism is at the app installation level: revoke
permissions from the installation, or disable or delete the installation or app.
The action implements no per-token revocation, because GitHub's API requires
possession of a token to revoke it (only consumers hold it after the run) and
installation access tokens are short-lived (~1 hour), limiting exposure anyway.
Consumer-side revocation workflows and central token storage were rejected as
too complex to coordinate or a high-value attack target; this is a natural
extension of the installation-permissions boundary in ADR-0012. Revocation is
coarse: revoking one token affects every token issued by the same installation.
