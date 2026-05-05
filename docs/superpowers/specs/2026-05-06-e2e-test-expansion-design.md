# E2E test expansion

## Problem

The existing E2E test is a smoke test — it dispatches a workflow and asserts it
doesn't crash. It doesn't verify that provisioned tokens actually work, doesn't
assert on the job summary output, and doesn't exercise failure cases.

## Approach

Expand E2E tests to cover happy paths and failure cases by:

- Adding a `summary` action output so downstream steps can capture the Markdown
- Asserting on summary content via file snapshots
- Verifying provisioned tokens work by having the consumer repo use a token to
  call an authenticated GitHub API endpoint
- Manufacturing failure cases via deliberately-unauthorized token and provision
  declarations in the consumer config

## Infrastructure

### Repos involved

- `ghalactic/provision-github-tokens` — the provider (this repo)
- `ghalactic-fixtures/provision-github-tokens-ci-consumer` — the consumer

### Apps and installations

Three issuer apps and three provisioner apps are installed across multiple
accounts. The provider config in this repo already services any account.

### Tokens

- `GITHUB_TOKEN` — used by the E2E test for operations on this repo
- `FIXTURES_GITHUB_TOKEN` — a PAT with `repo` + `workflow` scopes, used by the
  E2E test for cross-repo operations on the consumer repo (creating/deleting
  temp branches, dispatching workflows, polling runs)

## Action code change

Add a public `summary` output to the action:

- `action.yml` — add `outputs.summary` with description
- `src/main.ts` — call `core.setOutput("summary", markdownContent)` where the
  summary Markdown is already being written to `$GITHUB_STEP_SUMMARY`

## Provider config change

Add a scoped permission rule to
`.github/ghalactic/provision-github-tokens.provider.yml`:

```yaml
- description: Consumer fixture can read actions on itself
  resources:
    - accounts:
        - ghalactic-fixtures
      selectedRepos:
        - provision-github-tokens-ci-consumer
  consumers:
    - ghalactic-fixtures/provision-github-tokens-ci-consumer
  permissions:
    actions: read
```

## Provider workflow changes

Update `.github/workflows/run-action-for-ci.yml`:

- Add `id: action` and `continue-on-error: true` to the action step (it will
  fail due to unauthorized consumer requests)
- Add a "Write summary" step that writes the summary output to a file via an
  environment variable (avoids shell injection and handles all content safely)
- Add an "Upload summary" step using `actions/upload-artifact@v7` with
  `archive: false` uploading `summary.md`

```yaml
- name: Run action
  id: action
  continue-on-error: true
  uses: ./
  with:
    apps: ...

- name: Write summary
  env:
    SUMMARY: ${{ steps.action.outputs.summary }}
  run: printf '%s' "$SUMMARY" > summary.md

- name: Upload summary
  uses: actions/upload-artifact@v7
  with:
    path: summary.md
    archive: false
```

## Consumer config changes

Update
`ghalactic-fixtures/provision-github-tokens-ci-consumer/.github/ghalactic/provision-github-tokens.yml`:

```yaml
tokens:
  readMetadata:
    repos:
      - provision-github-tokens-ci-consumer
    permissions:
      metadata: read
  readActions:
    repos:
      - provision-github-tokens-ci-consumer
    permissions:
      actions: read
  unauthorizedToken:
    repos:
      - provision-github-tokens-ci-consumer
    permissions:
      contents: write

provision:
  secrets:
    READ_METADATA_TOKEN:
      token: readMetadata
      github:
        repo:
          actions: true
          environments: ["*"]
    READ_ACTIONS_TOKEN:
      token: readActions
      github:
        repo:
          actions: true
    UNAUTHORIZED_PROVISION:
      token: readMetadata
      github:
        repos:
          ghalactic/provision-github-tokens:
            actions: true
    PARTIALLY_AUTHORIZED_PROVISION:
      token: readMetadata
      github:
        repo:
          actions: true
        repos:
          ghalactic/provision-github-tokens:
            actions: true
```

This produces:

- Happy paths: `READ_METADATA_TOKEN` and `READ_ACTIONS_TOKEN` provisioned
  successfully
- Token auth failure: `unauthorizedToken` requests `contents: write` which the
  provider doesn't grant
- Fully failed provision: `UNAUTHORIZED_PROVISION` targets a repo the requester
  doesn't own
- Partially failed provision: `PARTIALLY_AUTHORIZED_PROVISION` provisions to
  self (success) + cross-repo (failure)

## Consumer verification workflow

New file:
`ghalactic-fixtures/provision-github-tokens-ci-consumer/.github/workflows/verify-tokens.yml`

```yaml
name: Verify tokens

on:
  workflow_dispatch:

jobs:
  verify:
    name: Verify tokens
    runs-on: ubuntu-latest

    steps:
      - name: List action secrets
        uses: actions/github-script@v9
        with:
          github-token: ${{ secrets.READ_ACTIONS_TOKEN }}
          script: |
            const { data } = await github.rest.actions.listRepoSecrets(context.repo);
            console.table(
              data.secrets.map((s) => ({
                name: s.name,
                created: s.created_at,
                updated: s.updated_at,
              })),
            );

      - name: Assert READ_ACTIONS_TOKEN exists
        uses: actions/github-script@v9
        with:
          github-token: ${{ secrets.READ_ACTIONS_TOKEN }}
          script: |
            const { data } = await github.rest.actions.listRepoSecrets(context.repo);
            const names = data.secrets.map(s => s.name);
            if (!names.includes("READ_ACTIONS_TOKEN")) {
              core.setFailed("READ_ACTIONS_TOKEN not found in secrets list");
            }
```

The token verifies itself by listing the consumer repo's own action secrets and
asserting it appears in the list.

## E2E test helpers

Generalize `test/e2e.ts` to support cross-repo dispatches:

- Extract dispatch + wait logic to accept `owner`, `repo`, and `workflowId`
  parameters instead of hardcoding `SELF_WORKFLOW_ID`
- The cleanup callback (branch deletion) targets the specified repo
- Create a second Octokit instance using `FIXTURES_GITHUB_TOKEN` for cross-repo
  operations
- `waitForWorkflowRunToSucceed` accepts owner/repo to poll the correct repo

## E2E test structure

Rewrite `test/suite/e2e/run-self.spec.ts` with `it.sequential` tests:

1. Dispatch provider workflow (same temp-branch pattern), wait for success
2. Download `summary.md` artifact from the completed run, assert via
   `toMatchFileSnapshot(join(fixturesPath, "summary.md"))`
3. Create temp branch in consumer repo using `FIXTURES_GITHUB_TOKEN`, dispatch
   `verify-tokens.yml`, wait for success, cleanup

Snapshot file location: `test/suite/e2e/testdata/summary.md`

File snapshot path pattern matches existing convention:

```ts
const fixturesPath = join(import.meta.dirname, "testdata");
expect(summaryContent).toMatchFileSnapshot(join(fixturesPath, "summary.md"));
```

## Artifact handling

- Upload uses `actions/upload-artifact@v7` with `archive: false` (direct
  unarchived upload)
- The artifact is named after the file: `summary.md`
- The E2E test downloads the artifact via the GitHub REST API
  (`listWorkflowRunArtifacts` + `downloadArtifact`)
- Need to verify at implementation time whether unarchived artifacts download as
  raw content or still require zip handling

## Testing strategy

These E2E tests can only run under GitHub Actions — they require real app
credentials, workflow dispatches, and cross-repo access. They cannot be verified
locally.

### Implementation sequence

1. Implement all code changes (action output, provider config, consumer config,
   consumer workflow, E2E test code, helper generalization)
2. Push and open a PR — this triggers CI which runs the E2E tests
3. The summary snapshot test will fail on the first run because the snapshot
   file doesn't exist yet
4. **Manual step:** inspect the CI run to verify the provider workflow completed
   and the consumer verification workflow succeeded
5. **Manual step:** retrieve the actual summary content from the CI artifacts
   (or from the snapshot update output) and commit it as
   `test/suite/e2e/testdata/summary.md`
6. Push again — CI should now pass with the snapshot in place

### Ongoing maintenance

When the action's summary output format changes, the E2E snapshot will fail.
Update it by running with `--update` in CI or by manually retrieving the new
output from the failed run's artifacts.
