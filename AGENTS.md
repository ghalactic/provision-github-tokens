# Agent instructions

## Build, test, and lint

This project uses a Make-based build system (via [makefiles.dev]) with
`npm exec` under the hood. Run `make` with no arguments to execute the default
target (test).

[makefiles.dev]: https://makefiles.dev

```sh
make          # Run all unit tests (default target)
make lint     # TypeScript type-check + ESLint + Prettier
make test     # Run all Vitest tests
make coverage # Run tests with coverage reports

# Run a single test file
npm exec -- vitest --run test/suite/unit/token-factory.spec.ts

# Run tests matching a name pattern
npm exec -- vitest --run -t "pattern"

# Build the dist bundle
make dist/main.js

# Regenerate all generated files (schemas, dist bundle, etc.)
make regenerate

# Verify generated files match committed versions
make verify-generated

# Full pre-commit check (lint + tests + verify-generated)
# IMPORTANT: This can auto-fix formatting and regenerate files.
# Always run `git status` afterwards to see what changed.
make precommit
```

**Always run `make precommit` after modifying source files** — it rebuilds the
dist bundle, regenerates schemas, runs lint, and runs tests. If you only run
`make test` and `make lint`, stale generated files won't be caught. Run
`git status` afterwards to stage any regenerated files.

The build bundles `src/main.ts` → `dist/main.js` using esbuild (via
`script/build.ts`). Generated files that must be committed: `dist/main.js`,
`dist/main.js.map`, and the two `generated.*.schema.json` files in
`src/schema/`.

## Architecture

This is a **GitHub Action** (`action.yml`, runs on `node24`) that declaratively
provisions GitHub tokens as repository/organization secrets across multiple
repos.

### Pipeline flow (orchestrated by `src/main.ts`)

1. **Read config** — Parse the provider YAML config (from the repo running the
   action) and the apps input (GitHub App credentials)
2. **Discover apps** — Find all GitHub App installations and register them in
   `AppRegistry`
3. **Discover requesters** — Find repos containing
   `.github/ghalactic/provision-github-tokens.yml` requester configs; register
   their token declarations in `TokenDeclarationRegistry`
4. **Authorize** — `TokenAuthorizer` validates token permission requests against
   provider rules; `ProvisionAuthorizer` validates where secrets can be
   provisioned
5. **Create tokens** — `TokenFactory` issues GitHub installation access tokens
   for authorized requests
6. **Provision secrets** — `Provisioner` encrypts tokens (libsodium) and stores
   them as GitHub secrets (actions, codespaces, dependabot, or environment)

### Key subsystems

| Module                                                  | Responsibility                                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `AppRegistry`                                           | Central registry of GitHub Apps, their installations, and which app can issue/provision for a given target |
| `TokenAuthorizer`                                       | Evaluates token requests against permission rules from provider config                                     |
| `ProvisionAuthorizer`                                   | Evaluates secret provisioning requests against provision rules                                             |
| `TokenDeclarationRegistry`                              | Tracks token declarations from requester repos (shared or private)                                         |
| `TokenFactory`                                          | Creates installation access tokens via the GitHub API                                                      |
| `Provisioner`                                           | Encrypts and writes secrets to repos/orgs/environments                                                     |
| `token-auth-explainer/` and `provision-auth-explainer/` | Generate human-readable text explanations of authorization decisions                                       |

### Config system

- **Provider config** (`src/config/provider-config.ts`) — YAML file in the
  provider repo defining permission rules and provision rules. Schema:
  `src/schema/provider.v1.schema.json`
- **Requester config** (`src/config/requester-config.ts`) — YAML file in each
  consuming repo declaring desired tokens and secrets. Schema:
  `src/schema/requester.v1.schema.json`
- **Apps input** (`src/config/apps-input.ts`) — GitHub Action input containing
  app credentials (parsed from YAML)
- Validation uses Ajv with `ajv-errors` (`src/config/validation.ts`)

## Conventions

### Markdown

All Markdown should read well in both raw text and rendered HTML.

- **Run Prettier before committing any Markdown file.** Use
  `npx prettier --write <file>` and stage the result. Prettier rewraps prose,
  reformats tables, and adjusts whitespace — you must incorporate these changes
  before committing, not in a separate fixup commit.
- Prettier config: `proseWrap: "always"`, `printWidth: 80`. Wrap prose to 80
  columns.
- **Link references** — Prefer `[text]` / `[text][ref]` with `[ref]: URL`
  definitions close to where they are used (lowercased), rather than inline
  `[text](URL)`. This keeps prose scannable in plain text and avoids long URLs
  breaking the reading flow. Duplicate definitions are fine as long as they
  resolve to the same URL. See `README.md` for an example.

### TypeScript

- **ESM with explicit `.js` extensions** in all imports (e.g.,
  `import { foo } from "./bar.js"`)
- **Strict TypeScript** with `NodeNext` module resolution
- **No emit** — TypeScript is used only for type-checking; esbuild handles
  bundling
- Formatting via **Prettier** with `prettier-plugin-organize-imports`
  (auto-sorts imports)

### Factory/creator pattern

Most subsystems use a `createX()` factory function that returns a typed object
or closure. The factory accepts dependencies as parameters (manual dependency
injection). See `createTokenAuthorizer()`, `createAppRegistry()`,
`createProvisioner()`, etc.

### Discriminated unions for results

Authorization results use discriminated unions with a `type` field:

```ts
type TokenAuthResult =
  | { type: "ALL_REPOS"; ... }
  | { type: "NO_REPOS"; ... }
  | { type: "SELECTED_REPOS"; ... }
```

### Pattern matching

Custom `Pattern` interface (`src/pattern.ts`) with `test()` and `toString()`
methods. Used via `GitHubPattern` (glob-style matching for accounts/repos) and
`NamePattern` (case-insensitive glob for names).

### Type organization

- `src/type/` — Pure type definitions (no runtime code): `permissions.ts`,
  `provider-config.ts`, `requester-config.ts`, `token-auth-result.ts`,
  `provision-auth-result.ts`, `github-api.ts`, etc.
- `octokit-openapi.d.ts` — Type augmentation for `@octokit/openapi`

### Testing

- **Vitest** with two projects: `unit` (always runs) and `e2e` (only in GitHub
  Actions)
- Unit tests live in `test/suite/unit/` mirroring `src/` structure
- Test data factories in `test/github-api.ts` — use `openapi-sampler` against
  the actual GitHub OpenAPI spec to create realistic `TestApp`,
  `TestInstallation`, `TestRepo`, `TestEnvironment` objects
- `__mocks__/@actions/core.ts` — Manual mock of `@actions/core` with
  `__setInputs()`, `__getOutput()`, and `__reset()` helpers for
  controlling/inspecting action I/O in tests
- The `vitest/no-mocks-import` ESLint rule is disabled because tests import
  helpers from `__mocks__/`

#### Coverage

The project targets **100% test coverage** (`make coverage`). A human reviewer
should be able to run coverage and immediately see pass/fail without
investigating individual files.

When introducing new code, write tests that fully cover it. If a branch is
genuinely unreachable in tests, use an Istanbul ignore comment with `@preserve`
(so esbuild keeps it) instead of leaving a coverage gap:

```ts
/* istanbul ignore next - @preserve */
throw new Error("Invariant violation: ...");
```

Acceptable uses of coverage ignore comments — modeled on existing usage:

- **Invariant-violation throws** — defensive guards for states that should be
  structurally impossible (e.g. exhaustive switch/if-else defaults, null checks
  after prior validation steps). Always throw with a message starting with
  `"Invariant violation: "`.
- **Never-observed API behavior** — defensive checks against theoretically
  possible but never-seen GitHub API response shapes. Add a brief explanation
  (e.g.
  `/* istanbul ignore next - never seen without an account login - @preserve */`).

Do **not** use coverage ignores to skip writing tests for reachable code paths.
If a branch can be reached through normal inputs, write tests for it.

### Access level hierarchy

Permission levels are ranked: `none` (0) < `read` (1) < `write` (2) < `admin`
(3). See `src/access-level.ts`.

### Error handling

Use `errorMessage()` and `errorStack()` from `src/error.ts` to safely extract
messages from unknown error values. The top-level `main()` catches all errors
and calls `setFailed()`.

### Architecture Decision Records

ADRs live in `docs/adrs/` using MADR format with numeric prefixes
(`0001-title.md`). When writing or updating ADRs:

- **Be concise** — only include sections that earn their keep. Drop optional
  MADR sections (Decision Drivers, Pros and Cons, etc.) unless they add real
  value.
- **Self-contained** — do not reference GitHub issues or PRs for context. A
  reader must understand the decision from the ADR alone.
- **Resilient to refactoring** — do not reference specific file paths, function
  names, or code symbols. Describe decisions in terms of concepts and behavior
  so that ADRs don't need updating when code moves around.
