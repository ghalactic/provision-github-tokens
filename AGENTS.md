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

# Regenerate all generated files (schemas, dist bundle, etc.)
make regenerate

# Full pre-commit check (lint + tests + verify-generated)
make precommit
```

### Generated files and the change workflow

The build bundles `src/main.ts` → `dist/main.js` using esbuild (via
`script/build.ts`). Because this is a GitHub Action, GitHub runs `dist/main.js`
directly — it does not build from source at runtime. The bundled output and
other generated files (schemas, source maps) **must be committed to the
repository**. The `GENERATED_FILES` variable in `Makefile` is the authoritative
list.

After modifying source files, follow this workflow **in order** before
committing:

1. **Regenerate** — Run `make regenerate` to rebuild all generated files.
2. **Stage** — Run `git status` to see what changed, then stage the regenerated
   files. Trust that the generators produce correct output — do not read through
   generated files to verify them.
3. **Precommit** — Run `make precommit` to lint, test, and verify that all
   generated files are up to date.

This order matters. `make precommit` includes a `verify-generated` step that
fails if the committed generated files don't match the source. Regenerating and
staging first avoids a wasted round-trip.

## Purpose and scope

This is a **GitHub Action** (`action.yml`, runs on `node24`) that declaratively
provisions GitHub tokens as repository/organization secrets across multiple
repos.

## Conventions

### Writing style

Use **sentence case** for all headings, labels, and prose — never title case.
The only exception is references to external writing that has its own style
rules (e.g. a proper noun, a product name, or a title defined elsewhere).

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

ADRs live in `docs/adrs/`. **Always use the repo-local ADR skill** at
`.agents/skills/adr-skill/` when writing or updating ADRs — it encodes all
project conventions (brevity, sentence case, no file paths, etc.) and walks you
through the full workflow. Do not use globally installed ADR skills.

**ADRs tend to come out too verbose on the first pass.** After completing a new
ADR, immediately re-read it and cut it down as if a reviewer had said "The new
ADR is too verbose." Tighten every section, remove redundant phrasing, and
collapse multi-sentence explanations into single sentences where possible.
Commit the trimmed version — not the first draft.

**Consult ADRs during research.** When investigating an area of the codebase,
search `docs/adrs/` for ADRs that relate to the subsystem or concept you're
working on. ADRs capture the _why_ behind design decisions — reading them before
making changes helps you avoid inadvertently contradicting prior decisions or
re-litigating settled debates. If you find that existing ADRs conflict with
proposed changes, surface this to the user before proceeding.

### Commit messages

Write commit messages for **human readers**, not automated tooling.

- **Do not use conventional commit prefixes** (e.g. `feat:`, `fix:`, `chore:`)
- **Use the imperative mood** — write as if completing "If applied, this commit
  will \_\_\_" (e.g. "Add error handling", not "Added error handling" or "Adds
  error handling")
- **Capitalize the subject line** and do not end it with a period
- **Limit the subject line to 50 characters** (72 is the hard maximum)
- **Separate subject from body with a blank line** — a subject-only message is
  fine for most changes
- **Wrap the body at 72 characters** and use it to explain _what_ and _why_, not
  _how_ (the code shows how)

### Finishing a development branch

When development on a feature branch is complete (all code and tests are
committed and passing), perform the following cleanup **before pushing and
creating a PR**:

1. **Distill decisions into ADRs** — Any architectural decisions made during the
   feature branch should be captured in ADRs (using available ADR skills). ADRs
   are the lasting record; plans and specs are ephemeral.
2. **Delete plan and spec files** — Remove any files under `docs/superpowers/`
   (plans, specs, retros). These are useful during development but become stale
   quickly and confuse code reviewers when they don't match the final
   implementation. They remain in Git history for posterity.
3. **Push and create the PR** — Only after the above steps are committed.

### Responding to PR feedback

When asked to address PR review feedback, follow this process:

#### 1. Gather feedback

- Fetch all review threads on the PR (e.g. via `get_review_comments`).
- **Skip resolved threads** — they have already been addressed.
- Identify the PR author — treat their comments as likely coming from the user
  you are chatting with (they are usually the same person).
- Collect each unresolved thread into a summary: the file, line range, reviewer
  comment, and any follow-up discussion within the thread.

#### 2. Triage with the user

- Present the collected feedback items to the user in a clear list.
- For each item, briefly describe the reviewer's concern and suggest a possible
  resolution approach.
- Work with the user via chat to decide which items to address and how. The user
  may choose to address all feedback, a subset, or propose alternative
  resolutions. Do not start implementing until the user has confirmed the
  approach.

#### 3. Implement changes

- Implement the agreed-upon changes. Group related feedback items into atomic
  commits wherever possible.
- Follow the
  [generated files workflow](#generated-files-and-the-change-workflow)
  (regenerate → review → stage → precommit) before committing.
- Push all commits before replying to any review threads.

#### 4. Reply and resolve threads

- For each addressed feedback item, reply to the corresponding review thread.
- Every reply **must** include:
  - A clear indication that the response was generated by the agent (e.g.
    _"Generated by <Agent Name>"_).
  - A reference to the commit SHA in which the feedback was resolved (e.g.
    _"Addressed in <short commit SHA>"_).
- After replying, **resolve the thread** so it no longer appears as outstanding.
- Do **not** reply to or resolve threads that were not addressed in this round —
  leave them for future discussion.
