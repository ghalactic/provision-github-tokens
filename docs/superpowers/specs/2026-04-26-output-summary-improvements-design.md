# Output and summary improvements

Relates to: GitHub issue #60 — improve output/summary for token creation and
actual provisioning.

## Problem

The job summary only reflects authorization decisions, not what actually
happened at runtime. Users looking at the summary after a run want to know
whether their secrets were actually provisioned, not just whether they were
allowed. Log output for the token creation and provisioning phases is similarly
limited to count summaries that don't explain individual outcomes.

## Approach

Add thin rendering layers on top of the existing architecture. The result types
(`TokenCreationResult`, `ProvisioningResult`) already carry all the information
needed — we just need to render it.

## New explainer modules

### Token creation explainer

New module `src/token-creation-explainer/text.ts`, following the existing
`token-auth-explainer/` and `provision-auth-explainer/` pattern.

Generic type `TokenCreationResultExplainer<T>` defined in
`src/type/token-creation-result.ts`. The factory function that creates the
explainer receives the full `Map<TokenAuthResult, TokenCreationResult>` so it
can precompute deduplication backreferences. The returned explainer function
takes an individual `TokenAuthResult` and its `TokenCreationResult`. Entries are
numbered by iteration order. For deduplicated tokens, output references the
earlier number (e.g., "Same token as #2") instead of repeating details.

Result type mappings:

- `CREATED` — "✅ Token created for \<account\>"
- `NOT_ALLOWED` — "❌ Token not allowed"
- `NO_ISSUER` — "❌ No suitable issuer app"
- `REQUEST_ERROR` — "❌ Failed to create token: \<status\>: \<message\>", with
  the JSON response body logged at debug level as an indented sub-item
- `ERROR` — "❌ Failed to create token: \<errorMessage\>", with the full stack
  logged at debug level as an indented sub-item

Uses `errorMessage()` and `errorStack()` from `src/error.ts` for safe extraction
from unknown error values.

Debug-level sub-items for request error response bodies and error stacks are
multi-line. Each line of the debug output shares a base indentation level
underneath its parent, and preserves any additional indentation built into the
multi-line string. Request error response bodies are pretty-printed via
`JSON.stringify` with a space parameter of 2.

### Provisioning explainer

New module `src/provisioning-explainer/text.ts`.

Generic type `ProvisioningResultExplainer<T>` defined in
`src/type/provisioning-result.ts`.

The explainer receives the nested
`Map<ProvisionAuthResult, Map<ProvisionAuthTargetResult, ProvisioningResult>>`.
Output is structured at the secret level with target sub-entries.

Result type mappings for each target:

- `PROVISIONED` — "✅ Provisioned to \<target type\> secret in \<target\>"
- `NOT_ALLOWED` — "❌ Not allowed"
- `NO_TOKEN` — "❌ Token wasn't created"
- `NO_PROVISIONER` — "❌ No suitable provisioner app"
- `REQUEST_ERROR` — "❌ Failed to provision: \<status\>: \<message\>", with the
  JSON response body logged at debug level as an indented sub-item
- `ERROR` — "❌ Failed to provision: \<errorMessage\>", with the full stack
  logged at debug level as an indented sub-item

The same multi-line indentation rules described in the token creation explainer
section apply here.

## Integration into existing modules

### token-factory.ts

Replace the current count-based `info()` calls with explainer output. Entries
are numbered as `Token #1:`, `Token #2:`, etc. (the surrounding group label
"Creating tokens" provides context). Import `debug` from `@actions/core` for
debug-level output. When no tokens to create, emit
`warning("❌ No tokens were created")`. No changes to the return type or public
API.

### provisioner.ts

Replace the current count-based `info()` calls with explainer output. Entries
are numbered as `Secret #1:`, `Secret #2:`, etc. (the surrounding group label
"Provisioning secrets" provides context). When nothing to provision, emit
`warning("❌ No secrets were provisioned")`. No changes to the return type or
public API.

### authorizer.ts

No changes — it already has its own explainer integration.

## Summary changes

### Signature

`renderSummary()` gains two new parameters:

```ts
renderSummary(
  githubServerUrl: string,
  actionUrl: string,
  authResult: AuthorizeResult,
  tokens: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
)
```

### Heading

"Provisioned X of Y secrets" where X counts secrets where all targets have a
`PROVISIONED` result. Provisioning results are guaranteed to be populated.

### Failures table

Adds a fifth column, **Reason**, at the end. A secret is a failure if any target
does not have a `PROVISIONED` result.

The reason shown is the most fundamental failure, prioritized:

1. "Secret not allowed" — provision auth denied the whole secret
2. "Token not allowed" — underlying token auth was denied
3. "No suitable issuer" — no app could issue the token
4. "Failed to issue token" — API error during token creation
5. "No suitable provisioner" — no app could provision the secret
6. "Failed to provision to some targets" — partial failure
7. "Failed to provision" — all targets failed during provisioning

### Successes table

No changes — same four columns, no reason column.

### main.ts

Capture the return values from `createTokens()` and `provisionSecrets()` and
pass them to `renderSummary()`.

## Testing strategy

### Explainer testing through existing suites

The new explainers are not tested in isolation. They are integrated into the
existing token-factory and provisioner test suites, matching the established
pattern where auth explainers are validated through the systems that produce
their input.

In existing token-factory tests, replace low-level `.toEqual()` assertions on
result type objects with inline snapshot assertions on explainer output. The
explainer output encodes the same information — result types, error details,
deduplication backreferences — in a more human-readable form.

In existing provisioner tests, do the same: replace result-shape assertions with
explainer snapshot assertions where possible. The secret-level / target-level
structure of the explainer output captures the nested result shape.

If any existing low-level assertion can't be straightforwardly replaced with
explainer output, leave it in place with a `FIXME` comment explaining what needs
follow-up, rather than getting rid of it, or getting bogged down in trying to
refactor the test to make it work.

### Summary tests

Update existing fixture files to reflect the new failure reason column and
heading logic. Add new fixture cases covering the new failure types (NO_ISSUER,
NO_TOKEN, NO_PROVISIONER, REQUEST_ERROR, ERROR, and partial failure). Test setup
needs to produce token creation and provisioning results to pass to
`renderSummary()`.

## Out of scope

- Changes to the authorization explainers or their tests
- Changes to the authorization logic itself
- New action outputs or environment variables
- Markdown summary for token creation results (only the final provisioning
  outcome matters in the summary)
