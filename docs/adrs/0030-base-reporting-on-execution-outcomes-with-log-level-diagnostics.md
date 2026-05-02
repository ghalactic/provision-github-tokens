---
status: accepted
date: 2026-04-26
decision-makers: ezzatron
---

# Base reporting on execution outcomes with log-level diagnostics

## Context and problem statement

Authorization explanations ([ADR 0009][0009]) tell the user what _would_ happen,
but token creation and secret provisioning can fail for reasons unrelated to
authorization (API errors, missing targets, rate limits). When failures
occurred, the job summary still showed authorization-based outcomes and logs
lacked structured diagnostics, making root-cause investigation difficult.

## Decision

Report based on **actual execution outcomes**, not authorization intent:

- The job summary reflects final provisioning results. Failed secrets include a
  terse failure reason. Success means every target was provisioned.
- Detailed per-phase diagnostics (token creation and provisioning) are emitted
  as structured log output using dedicated explainer modules — the same pattern
  established for authorization explanations.
- Debug-level log entries include response bodies (pretty-printed JSON) and
  error stacks, with consistent indentation for multi-line content.
- Failure reasons follow a fixed precedence so that the most actionable cause
  surfaces first.

## Consequences

- Good, because failures are diagnosable from logs without reading source code.
- Good, because the summary accurately reflects what happened, not what was
  planned.
- Bad, because log volume increases — mitigated by placing verbose detail at
  debug level.

## Alternatives considered

- **Detailed diagnostics in the summary**: would exceed the [1 MB summary
  limit][0024] at moderate scale and duplicate information already available in
  logs.

## More information

- [ADR 0009][0009] — established the explainer pattern for authorization.
- [ADR 0024][0024] — summary size constraint that motivates keeping diagnostics
  in logs.

[0009]: 0009-generate-human-readable-authorization-explanations.md
[0024]:
  0024-constrain-job-summary-content-to-fit-the-github-actions-size-limit.md
