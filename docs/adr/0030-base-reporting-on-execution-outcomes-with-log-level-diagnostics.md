---
status: accepted
---

# Base reporting on execution outcomes with log-level diagnostics

The job summary reports actual execution outcomes — whether each secret was
provisioned — rather than authorization intent (ADR-0009), with a terse failure
reason per failed secret and success meaning every target was provisioned.
Detailed per-phase diagnostics (token creation and provisioning) are emitted as
structured log output using the same explainer pattern established for
authorization, with response bodies and error stacks at debug level and failure
reasons under a fixed precedence so the most actionable cause surfaces first.
Verbose detail in the summary was rejected because it would exceed the summary
size limit (ADR-0024) and duplicate the logs.
