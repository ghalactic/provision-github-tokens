# Agent instructions

## Build, test, and lint

This project uses a Make-based build system (via
[makefiles.dev](https://makefiles.dev/v1)) with `npm exec` under the hood. Run
`make` with no arguments to execute the default target (test).

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

### Access level hierarchy

Permission levels are ranked: `none` (0) < `read` (1) < `write` (2) < `admin`
(3). See `src/access-level.ts`.

### Error handling

Use `errorMessage()` and `errorStack()` from `src/error.ts` to safely extract
messages from unknown error values. The top-level `main()` catches all errors
and calls `setFailed()`.
