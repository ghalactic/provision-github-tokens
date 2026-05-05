# E2E test expansion implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand E2E tests to verify provisioned tokens actually work and assert
on summary output via file snapshots, covering both happy paths and failure
cases.

**Architecture:** The action gains a `summary` output. The provider workflow
captures and uploads it as an artifact. The E2E test dispatches the provider
workflow, downloads and snapshots the summary, then dispatches a consumer
verification workflow in a cross-repo fixture. Test helpers are generalized to
support cross-repo dispatch with a separate PAT.

**Tech Stack:** TypeScript, Vitest, GitHub Actions, Octokit, GitHub REST API

---

## File map

| File                                                      | Action | Responsibility                              |
| :-------------------------------------------------------- | :----- | :------------------------------------------ |
| `action.yml`                                              | Modify | Add `summary` output declaration            |
| `src/main.ts`                                             | Modify | Set `summary` output via `core.setOutput`   |
| `.github/ghalactic/provision-github-tokens.provider.yml`  | Modify | Add `actions: read` rule for consumer       |
| `.github/workflows/run-action-for-ci.yml`                 | Modify | Add `continue-on-error`, write/upload steps |
| `test/e2e.ts`                                             | Modify | Generalize for cross-repo dispatch          |
| `test/gha.ts`                                             | Modify | Add `fixturesOctokit` from PAT              |
| `test/octokit.ts`                                         | Modify | Add factory accepting explicit token        |
| `test/suite/e2e/run-self.spec.ts`                         | Modify | Rewrite with sequential tests               |
| `test/suite/e2e/testdata/summary.md`                      | Create | Empty placeholder (populated by CI)         |
| Consumer: `.github/ghalactic/provision-github-tokens.yml` | Modify | Add tokens and provision entries            |
| Consumer: `.github/workflows/verify-tokens.yml`           | Create | Verification workflow                       |

---

### Task 1: Add `summary` output to the action

**Files:**

- Modify: `action.yml`
- Modify: `src/main.ts`

- [ ] **Step 1: Add output declaration to `action.yml`**

Add an `outputs` section after `inputs`:

```yaml
outputs:
  summary:
    description: >-
      The Markdown content of the job summary produced by the action.
```

- [ ] **Step 2: Import `setOutput` and call it in `src/main.ts`**

Change the import:

```ts
import { group, setFailed, setOutput, summary } from "@actions/core";
```

After the `summary.addRaw(...).write()` call, add `setOutput`:

```ts
const summaryMarkdown = renderSummary(
  githubServerUrl,
  actionUrl,
  authorizeResult,
  tokenCreationResults,
  provisionResults,
);

await summary.addRaw(summaryMarkdown).write();
setOutput("summary", summaryMarkdown);
```

This requires extracting `renderSummary(...)` into a variable instead of passing
it inline to `summary.addRaw(...)`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: exit code 0

- [ ] **Step 4: Run unit tests**

Run: `npx vitest run`

Expected: all tests pass (no behavior change for existing tests)

- [ ] **Step 5: Commit**

```bash
git add action.yml src/main.ts
git commit -m "Add summary output to action"
```

---

### Task 2: Update provider config

**Files:**

- Modify: `.github/ghalactic/provision-github-tokens.provider.yml`

- [ ] **Step 1: Add `actions: read` rule for consumer fixture**

Add a second rule under `permissions.rules`:

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

- [ ] **Step 2: Commit**

```bash
git add .github/ghalactic/provision-github-tokens.provider.yml
git commit -m "Grant actions:read to consumer fixture"
```

---

### Task 3: Update provider workflow

**Files:**

- Modify: `.github/workflows/run-action-for-ci.yml`

- [ ] **Step 1: Add `id`, `continue-on-error`, and post-action steps**

The full workflow file should become:

```yaml
name: Run action for CI

on:
  workflow_dispatch:

jobs:
  run:
    name: Run action for CI
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Run action
        id: action
        continue-on-error: true
        uses: ./
        with:
          apps: |
            - appId: ${{ toJSON(vars.ISSUER_APP_A_ID) }}
              privateKey: ${{ toJSON(secrets.ISSUER_APP_A_PK) }}
              issuer:
                enabled: true
                roles:
                  - role-a
                  - role-b
            - appId: ${{ toJSON(vars.PROVISIONER_APP_A_ID) }}
              privateKey: ${{ toJSON(secrets.PROVISIONER_APP_A_PK) }}
              provisioner:
                enabled: true
            - appId: ${{ toJSON(vars.ISSUER_APP_B_ID) }}
              privateKey: ${{ toJSON(secrets.ISSUER_APP_B_PK) }}
              issuer:
                enabled: true
                roles:
                  - role-b
            - appId: ${{ toJSON(vars.PROVISIONER_APP_B_ID) }}
              privateKey: ${{ toJSON(secrets.PROVISIONER_APP_B_PK) }}
              provisioner:
                enabled: true
            - appId: ${{ toJSON(vars.ISSUER_APP_C_ID) }}
              privateKey: ${{ toJSON(secrets.ISSUER_APP_C_PK) }}
              issuer:
                enabled: true
            - appId: ${{ toJSON(vars.PROVISIONER_APP_C_ID) }}
              privateKey: ${{ toJSON(secrets.PROVISIONER_APP_C_PK) }}
              provisioner:
                enabled: true

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

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/run-action-for-ci.yml
git commit -m "Capture and upload action summary as artifact"
```

---

### Task 4: Generalize E2E test helpers

**Files:**

- Modify: `test/octokit.ts`
- Modify: `test/gha.ts`
- Modify: `test/e2e.ts`

- [ ] **Step 1: Add token-accepting Octokit factory to `test/octokit.ts`**

```ts
export function createTestOctokitWithToken(token: string): TestOctokit {
  return new CustomOctokit({ auth: token });
}
```

- [ ] **Step 2: Add `fixturesOctokit` to `test/gha.ts`**

Add a `fixturesOctokit` field to `GitHubActionsContext` and populate it from
`FIXTURES_GITHUB_TOKEN`:

```ts
import {
  createTestOctokit,
  createTestOctokitWithToken,
  type TestOctokit,
} from "./octokit.js";

export type GitHubActionsContext = {
  eventName: string;
  fixturesOctokit: TestOctokit;
  headRef: string;
  octokit: TestOctokit;
  owner: string;
  ref: string;
  refName: string;
  repo: string;
  runAttempt: string;
  runId: string;
  sha: string;
};

export function getGhaContext(): GitHubActionsContext {
  const {
    FIXTURES_GITHUB_TOKEN: fixturesToken = "",
    GITHUB_EVENT_NAME: eventName = "",
    GITHUB_HEAD_REF: headRef = "",
    GITHUB_REF_NAME: refName = "",
    GITHUB_REF: ref = "",
    GITHUB_REPOSITORY: slug = "",
    GITHUB_RUN_ID: runId = "",
    GITHUB_SHA: sha = "",
    GITHUB_RUN_ATTEMPT: runAttempt = "",
  } = process.env;

  const [owner, repo] = slug.split("/");
  const octokit = createTestOctokit();
  const fixturesOctokit = createTestOctokitWithToken(fixturesToken);

  return {
    eventName,
    fixturesOctokit,
    headRef,
    octokit,
    owner,
    ref,
    refName,
    repo,
    runAttempt,
    runId,
    sha,
  };
}
```

- [ ] **Step 3: Generalize `test/e2e.ts` for cross-repo dispatch**

Replace the module contents with a generalized API:

```ts
/* eslint-disable no-console */
import { vi } from "vitest";
import { sleep } from "./async.js";
import type { GitHubActionsContext } from "./gha.js";
import type { Reference, TestOctokit, WorkflowRun } from "./octokit.js";

export const E2E_TIMEOUT = 3 * 60 * 1000; // 3 minutes
const WAIT_INTERVAL = 15 * 1000; // 15 seconds
const WAIT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export type WorkflowDispatchOptions = {
  octokit: TestOctokit;
  owner: string;
  repo: string;
  workflowId: string;
  label: string;
};

export async function createWorkflowRun(
  cleanup: Cleanup,
  context: GitHubActionsContext,
  options: WorkflowDispatchOptions,
): Promise<WorkflowRun> {
  const { octokit, owner, repo, workflowId, label } = options;
  const runRef = await createRunRef(
    cleanup,
    octokit,
    owner,
    repo,
    context,
    label,
  );
  const existingRun = await findRun(
    octokit,
    owner,
    repo,
    workflowId,
    context.sha,
    runRef,
  );

  if (existingRun) {
    throw new Error(
      `Run ${runRef.ref} already exists: ${existingRun.html_url}`,
    );
  }

  await dispatchRun(octokit, owner, repo, workflowId, runRef);

  return waitFor(`${workflowId} run`, async () => {
    const run = await findRun(
      octokit,
      owner,
      repo,
      workflowId,
      context.sha,
      runRef,
    );
    if (!run) throw new Error(`Run ${runRef.ref} not found`);
    return run;
  });
}

export async function waitForWorkflowRunToComplete(
  octokit: TestOctokit,
  owner: string,
  repo: string,
  run: WorkflowRun,
): Promise<string | null> {
  return waitFor("workflow run to complete", async () => {
    const {
      data: { status, conclusion },
    } = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: run.id,
    });

    if (status !== "completed") {
      throw new Error(`Workflow run ${run.html_url} is ${status}`);
    }

    return conclusion;
  });
}

async function createRunRef(
  cleanup: Cleanup,
  octokit: TestOctokit,
  owner: string,
  repo: string,
  { runId, runAttempt }: GitHubActionsContext,
  label: string,
): Promise<Reference> {
  const sha = await resolveDefaultBranchSha(octokit, owner, repo);
  const refName = `heads/ci-${runId}-${runAttempt}-${label}`;
  const ref = `refs/${refName}`;

  cleanup(async () => {
    try {
      await octokit.rest.git.deleteRef({ owner, repo, ref: refName });
    } catch (cause) {
      console.warn(`Failed to cleanup ref ${ref}`, { cause });
    }
  });

  const { data } = await octokit.rest.git.createRef({ owner, repo, sha, ref });

  return data;
}

async function resolveDefaultBranchSha(
  octokit: TestOctokit,
  owner: string,
  repo: string,
): Promise<string> {
  const { data } = await octokit.rest.repos.get({ owner, repo });
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${data.default_branch}`,
  });

  return ref.object.sha;
}

async function findRun(
  octokit: TestOctokit,
  owner: string,
  repo: string,
  workflowId: string,
  sha: string,
  runRef: Reference,
): Promise<WorkflowRun | undefined> {
  const {
    data: {
      workflow_runs: [run],
    },
  } = await octokit.rest.actions.listWorkflowRuns({
    owner,
    repo,
    event: "workflow_dispatch",
    workflow_id: workflowId,
    branch: runRef.ref.replace(/^refs\/heads\//, ""),
    per_page: 1,
  });

  return run;
}

async function dispatchRun(
  octokit: TestOctokit,
  owner: string,
  repo: string,
  workflowId: string,
  runRef: Reference,
): Promise<void> {
  await octokit.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowId,
    ref: runRef.ref,
  });
}

async function waitFor<T>(
  description: string,
  fn: () => Promise<T>,
): Promise<T> {
  await sleep(WAIT_INTERVAL);

  try {
    return await vi.waitFor(fn, {
      timeout: WAIT_TIMEOUT,
      interval: WAIT_INTERVAL,
    });
  } catch (cause) {
    throw new Error(`Timed out waiting for ${description}`, { cause });
  }
}

type Cleanup = (fn: () => Promise<void>) => void;
```

Key differences from the old version:

- `createWorkflowRun` accepts explicit `octokit`, `owner`, `repo`, `workflowId`
- For cross-repo dispatch (consumer), the branch SHA comes from the target
  repo's default branch (via `resolveDefaultBranchSha`), not from `context.sha`
- For self-dispatch (provider), the branch SHA still comes from `context.sha`
  (the current CI run's commit)
- `waitForWorkflowRunToComplete` returns the conclusion string (not void) so the
  caller can check it
- Removed `head_sha` filter from `findRun` since cross-repo branches won't share
  the CI run's SHA

Wait — there's a design issue. For the self-dispatch (provider workflow), the
branch is created from `context.sha` so that the dispatched workflow runs on the
PR's code. For the cross-repo dispatch (consumer), the branch is created from
the consumer's default branch HEAD. We need to support both cases.

Revised approach: `createRunRef` accepts an explicit `sha` parameter. The caller
decides which SHA to use:

- Self-dispatch: pass `context.sha`
- Cross-repo dispatch: resolve the target repo's default branch SHA

Update `createWorkflowRun` to accept `sha` in options:

```ts
export type WorkflowDispatchOptions = {
  octokit: TestOctokit;
  owner: string;
  repo: string;
  sha: string;
  workflowId: string;
  label: string;
};
```

And provide a helper for resolving default branch SHA:

```ts
export async function getDefaultBranchSha(
  octokit: TestOctokit,
  owner: string,
  repo: string,
): Promise<string> {
  const { data } = await octokit.rest.repos.get({ owner, repo });
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${data.default_branch}`,
  });

  return ref.object.sha;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: exit code 0

- [ ] **Step 5: Commit**

```bash
git add test/octokit.ts test/gha.ts test/e2e.ts
git commit -m "Generalize E2E helpers for cross-repo dispatch"
```

---

### Task 5: Rewrite E2E spec

**Files:**

- Modify: `test/suite/e2e/run-self.spec.ts`
- Create: `test/suite/e2e/testdata/summary.md`

- [ ] **Step 1: Create empty snapshot placeholder**

Create `test/suite/e2e/testdata/summary.md` with empty content. This file will
be populated after the first CI run.

- [ ] **Step 2: Rewrite `test/suite/e2e/run-self.spec.ts`**

```ts
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  createWorkflowRun,
  E2E_TIMEOUT,
  getDefaultBranchSha,
  waitForWorkflowRunToComplete,
  type WorkflowDispatchOptions,
} from "../../e2e.js";
import { getGhaContext } from "../../gha.js";

const ghaContext = getGhaContext();

const CONSUMER_OWNER = "ghalactic-fixtures";
const CONSUMER_REPO = "provision-github-tokens-ci-consumer";
const CONSUMER_WORKFLOW_ID = "verify-tokens.yml";
const PROVIDER_WORKFLOW_ID = "run-action-for-ci.yml";

const fixturesPath = join(import.meta.dirname, "testdata");

function buildLabel(): string {
  const { headRef, refName, eventName } = ghaContext;
  const [prNumber] = refName.split("/");

  const event = (() => {
    if (eventName === "pull_request") return "pr";
    return eventName.replace(/[^a-z]+/g, "-");
  })();

  if (!headRef) return `${event}-${refName.replace(/\//g, "-")}`;
  if (!prNumber.match(/^[1-9][0-9]*$/)) {
    return `${event}-${headRef.replace(/\//g, "-")}`;
  }
  return `${event}-${prNumber}-${headRef.replace(/\//g, "-")}`;
}

it.sequential(
  "provider workflow produces expected summary",
  async ({ onTestFinished }) => {
    const label = buildLabel();
    const { octokit, owner, repo, sha } = ghaContext;

    const options: WorkflowDispatchOptions = {
      octokit,
      owner,
      repo,
      sha,
      workflowId: PROVIDER_WORKFLOW_ID,
      label: `provider-${label}`,
    };

    const run = await createWorkflowRun(onTestFinished, ghaContext, options);
    const conclusion = await waitForWorkflowRunToComplete(
      octokit,
      owner,
      repo,
      run,
    );

    // The action is expected to fail due to unauthorized consumer requests,
    // but the workflow succeeds due to continue-on-error: true
    expect(conclusion).toBe("success");

    // Download the summary artifact
    const {
      data: { artifacts },
    } = await octokit.rest.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: run.id,
    });

    const summaryArtifact = artifacts.find((a) => a.name === "summary.md");
    expect(summaryArtifact).toBeDefined();

    const { data } = await octokit.rest.actions.downloadArtifact({
      owner,
      repo,
      artifact_id: summaryArtifact!.id,
      archive_format: "zip",
    });

    // Extract summary content from zip (even with archive: false upload,
    // the download API returns a zip)
    const { entries } = await import("unzipper").then((m) =>
      m.Open.buffer(Buffer.from(data as ArrayBuffer)),
    );
    const summaryContent = await entries[0]
      .buffer()
      .then((b) => b.toString("utf-8"));

    await expect(summaryContent).toMatchFileSnapshot(
      join(fixturesPath, "summary.md"),
    );
  },
  E2E_TIMEOUT,
);

it.sequential(
  "consumer can use provisioned token",
  async ({ onTestFinished }) => {
    const label = buildLabel();
    const { fixturesOctokit } = ghaContext;

    const sha = await getDefaultBranchSha(
      fixturesOctokit,
      CONSUMER_OWNER,
      CONSUMER_REPO,
    );

    const options: WorkflowDispatchOptions = {
      octokit: fixturesOctokit,
      owner: CONSUMER_OWNER,
      repo: CONSUMER_REPO,
      sha,
      workflowId: CONSUMER_WORKFLOW_ID,
      label: `consumer-${label}`,
    };

    const run = await createWorkflowRun(onTestFinished, ghaContext, options);
    const conclusion = await waitForWorkflowRunToComplete(
      fixturesOctokit,
      CONSUMER_OWNER,
      CONSUMER_REPO,
      run,
    );

    expect(conclusion).toBe("success");
  },
  E2E_TIMEOUT,
);
```

Note: The artifact download may need adjustment depending on whether
`archive: false` uploads still return zips from the download API. If they do,
`unzipper` is needed as a dev dependency. If they return raw content, the
download response can be used directly. This will be determined during the first
CI run.

- [ ] **Step 3: Add `unzipper` dev dependency (if needed for artifact
      download)**

Run: `npm install --save-dev unzipper @types/unzipper`

This may not be needed if the download API returns raw content for unarchived
artifacts. Determine this during the first CI run and remove if unnecessary.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: exit code 0

- [ ] **Step 5: Run unit tests (E2E won't run locally)**

Run: `npx vitest run`

Expected: all unit tests pass (E2E tests are skipped outside GitHub Actions)

- [ ] **Step 6: Commit**

```bash
git add test/suite/e2e/ package.json package-lock.json
git commit -m "Rewrite E2E tests with summary snapshot and consumer verification"
```

---

### Task 6: Update consumer config

**Files:**

- Modify:
  `/Users/erin/grit/github.com/ghalactic-fixtures/provision-github-tokens-ci-consumer/.github/ghalactic/provision-github-tokens.yml`

- [ ] **Step 1: Replace consumer config with expanded declarations**

```yaml
# yaml-language-server: $schema=https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json

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

- [ ] **Step 2: Commit and push consumer config**

```bash
cd /Users/erin/grit/github.com/ghalactic-fixtures/provision-github-tokens-ci-consumer
git add .github/ghalactic/provision-github-tokens.yml
git commit -m "Add token and provision declarations for E2E testing"
git push
```

---

### Task 7: Create consumer verification workflow

**Files:**

- Create:
  `/Users/erin/grit/github.com/ghalactic-fixtures/provision-github-tokens-ci-consumer/.github/workflows/verify-tokens.yml`

- [ ] **Step 1: Create the workflow file**

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

- [ ] **Step 2: Commit and push**

```bash
cd /Users/erin/grit/github.com/ghalactic-fixtures/provision-github-tokens-ci-consumer
git add .github/workflows/verify-tokens.yml
git commit -m "Add token verification workflow for E2E testing"
git push
```

---

### Task 8: Regenerate, precommit, and push

**Files:**

- Modify: `dist/main.js` (generated)

- [ ] **Step 1: Regenerate generated files**

Run: `make regenerate`

Expected: `dist/main.js` is updated with the new `setOutput` call

- [ ] **Step 2: Stage generated files**

```bash
git add dist/
```

- [ ] **Step 3: Run precommit checks**

Run: `make precommit`

Expected: all checks pass (lint, test, verify-generated)

- [ ] **Step 4: Commit generated files**

```bash
git commit -m "Regenerate dist"
```

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin more-e2e
```

Then open a PR. CI will run and the E2E tests will execute.

---

### Task 9: Manual verification and snapshot population

This task requires human intervention after the first CI run.

- [ ] **Step 1: Inspect the CI run**

After CI runs, check:

- The provider workflow (`run-action-for-ci.yml`) completed
- The `summary.md` artifact was uploaded
- The consumer verification workflow (`verify-tokens.yml`) succeeded

- [ ] **Step 2: Retrieve summary content**

Download the `summary.md` artifact from the CI run (either from the GitHub UI or
via the artifacts API). Save its content to
`test/suite/e2e/testdata/summary.md`.

- [ ] **Step 3: Run Prettier on the snapshot**

Run: `npx prettier --write test/suite/e2e/testdata/summary.md`

- [ ] **Step 4: Commit and push**

```bash
git add test/suite/e2e/testdata/summary.md
git commit -m "Add E2E summary snapshot from CI"
git push
```

- [ ] **Step 5: Verify CI passes**

The next CI run should pass with the snapshot in place.
