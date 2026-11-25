# Agent instructions

## Purpose and scope

This is a **GitHub Action** (`action.yml`, runs on `node24`) that declaratively
provisions GitHub tokens as repository/organization secrets across multiple
repos.

## Build, test, and lint

This project uses [mise] for both tool installation and task running. Run
`mise install` to install the tools. Run `mise tasks` to list available tasks.

[mise]: https://mise.jdx.dev

```sh
# Run all unit tests
mise run test

# Run all tests, lint, and other pre-commit checks
mise run pre-commit

# Run a single test file
pnpm exec vitest --run src/token-factory.spec.ts

# Run tests matching a name pattern
pnpm exec vitest --run -t "pattern"
```

This project does not use `package.json` scripts.

### Generated files

The build bundles `src/main.ts` → `dist/main.js` using esbuild (via
`script/build.ts`). Because this is a GitHub Action, GitHub runs `dist/main.js`
directly — it doesn't build from source at runtime. All generated files are
listed in `[vars] generated_files` in `mise/config.toml` and **must be
committed**.

## Conventions

### Writing style

Use **sentence case** for all headings, labels, and prose — never title case.
The only exception is references to external writing that has its own style
rules (e.g. a proper noun, a product name, or a title defined elsewhere).

Before writing any documentation, you MUST consult the project's skills
`diataxis` and the `google-developer-style-guide` family for style and content
guidelines. Where the skills' guidelines conflict with this file, defer to this
file.

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

### Testing

- **Vitest** with two projects: `unit` (always runs) and `e2e` (only in GitHub
  Actions)
- Unit tests are co-located in `src/` as `*.spec.ts` files
- Test data factories in `test/github-api.ts` — use `openapi-sampler` against
  the actual GitHub OpenAPI spec to create realistic `TestApp`,
  `TestInstallation`, `TestRepo`, `TestEnvironment` objects
- `__mocks__/@actions/core.ts` — Manual mock of `@actions/core` with
  `__setInputs()`, `__getOutput()`, and `__reset()` helpers for
  controlling/inspecting action I/O in tests
- The `vitest/no-mocks-import` ESLint rule is disabled because tests import
  helpers from `__mocks__/`

#### Don't use helpers or hooks when they reduce clarity

Using test helpers or hooks (i.e. `beforeAll`, `beforeEach`) can sometimes be
(ab)used to avoid repetitive or verbose test code, but this can also make tests
harder to read, understand, and maintain.

Where there's a genuine need for a helper or hook, make sure that it doesn't
reduce readability or clarity of the tests. Don't make the reader jump around
the code to understand what a test is doing.

#### Coverage

The project targets **100% test coverage** (`mise run coverage`). A human
reviewer should be able to run coverage and immediately see pass/fail without
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

### Code style

#### Exported symbols before unexported symbols

In every module, place exported functions, types, interfaces, and classes above
unexported ones. Use function hoisting to keep exports at the top — define
unexported helper functions below the exported functions that call them, not
above.

### Access level hierarchy

Permission levels are ranked: `none` (0) < `read` (1) < `write` (2) < `admin`
(3). See `src/access-level.ts`.

### Error handling

Use `errorMessage()` and `errorStack()` from `src/error.ts` to safely extract
messages from unknown error values. The top-level `main()` catches all errors
and calls `setFailed()`.

### Architecture Decision Records

ADRs live in `docs/adr/`. Use the `domain-modeling` skill to decide when a
decision warrants an ADR and to write it. See `docs/agents/domain.md` for how
skills consume ADRs.

**ADRs tend to come out too verbose on the first pass.** After completing a new
ADR, immediately re-read it and cut it down as if a reviewer had said "The new
ADR is too verbose." Tighten every section, remove redundant phrasing, and
collapse multi-sentence explanations into single sentences where possible.
Commit the trimmed version — not the first draft.

### Commit messages

Write commit messages for **human readers**, not automated tooling.

- **Don't use conventional commit prefixes** (e.g. `feat:`, `fix:`, `chore:`)
- **Use the imperative mood** — write as if completing "If applied, this commit
  will \_\_\_" (e.g. "Add error handling", not "Added error handling" or "Adds
  error handling")
- **Capitalize the subject line** and don't end it with a period
- **Limit the subject line to 50 characters** (72 is the hard maximum)
- **Separate subject from body with a blank line** — a subject-only message is
  fine for most changes
- **Wrap the body at 72 characters** and use it to explain _what_ and _why_, not
  _how_ (the code shows how)

## Agent skills

### Issue tracker

Issues live as GitHub issues, managed with the `gh` CLI. See
`docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage labels, each matching its role name: `needs-triage`,
`needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See
`docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root. See
`docs/agents/domain.md`.
