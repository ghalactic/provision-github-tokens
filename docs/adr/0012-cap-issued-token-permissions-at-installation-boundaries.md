---
status: accepted
---

# Cap issued token permissions at installation boundaries

An issuer installation's own permissions act as a hard boundary on any tokens it
creates, analogous to an [AWS IAM permissions boundary]: a request is denied if
it asks for any permission the installation doesn't have, regardless of what the
provider's rules allow. Both checks must pass — policy (ADR-0008) _and_
installation permissions. Revoking a permission from an installation immediately
prevents any token from including it. Automatic downgrade was rejected as it
would silently grant fewer permissions than requested; ignoring the boundary
isn't possible because GitHub's API enforces it anyway.

[aws iam permissions boundary]:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
