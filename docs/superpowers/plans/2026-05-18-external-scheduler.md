# External scheduler implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide ready-to-deploy external scheduler examples for Cloudflare,
AWS, GCP, and Azure that trigger the token-provider workflow via
`workflow_dispatch`.

**Architecture:** A shared dispatch module uses the batteries-included `octokit`
package with GitHub App auth. Each platform has a thin entrypoint (~10 lines)
that reads config and calls dispatch. Built per-platform via esbuild with output
committed under `examples/external-scheduler/`.

**Tech Stack:** TypeScript, esbuild, `octokit` (App auth + built-in retry +
throttling), platform-native serverless runtimes.

---

## File structure

### Source

```
src/external-scheduler/
  dispatch.ts              # Core dispatch logic using octokit App client
  dispatch.spec.ts         # Unit tests for dispatch
  cloudflare/
    index.ts               # Cloudflare Worker scheduled handler
  aws/
    index.ts               # AWS Lambda handler
  gcp/
    index.ts               # GCP Cloud Function handler
  azure/
    index.ts               # Azure Function timer handler
```

### Generated output

```
examples/external-scheduler/
  README.md
  cloudflare-worker/
    wrangler.toml
    dist/index.js
    dist/index.js.map
    package.json
    README.md
  aws-lambda/
    template.yaml
    dist/index.mjs
    dist/index.mjs.map
    README.md
  gcp-cloud-function/
    dist/index.mjs
    dist/index.mjs.map
    package.json
    README.md
  azure-function/
    dist/index.mjs
    dist/index.mjs.map
    function.json
    host.json
    README.md
```

### Build script

```
script/build-external-schedulers.ts
```

---

## Task 1: Core dispatch module

**Files:**

- Create: `src/external-scheduler/dispatch.ts`
- Create: `src/external-scheduler/dispatch.spec.ts`

- [ ] **Step 1: Write failing tests for dispatch**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatch, type DispatchConfig } from "./dispatch.js";

// Mock the octokit module
vi.mock("octokit", () => {
  const mockRequest = vi.fn();
  const mockGetInstallationOctokit = vi.fn().mockResolvedValue({
    request: mockRequest,
  });
  const MockApp = vi.fn().mockImplementation(() => ({
    octokit: {
      request: vi.fn().mockResolvedValue({
        data: { id: 99 },
      }),
    },
    getInstallationOctokit: mockGetInstallationOctokit,
  }));

  return { App: MockApp };
});

import { App } from "octokit";

const config: DispatchConfig = {
  appId: "12345",
  privateKey:
    "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----",
  repo: "owner/repo",
  workflow: "provision-tokens.yml",
};

describe("dispatch()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an App with the configured credentials", async () => {
    await dispatch(config);

    expect(App).toHaveBeenCalledWith({
      appId: "12345",
      privateKey: config.privateKey,
    });
  });

  it("discovers the installation for the target repo", async () => {
    await dispatch(config);

    const appInstance = vi.mocked(App).mock.results[0].value;
    expect(appInstance.octokit.request).toHaveBeenCalledWith(
      "GET /repos/{owner}/{repo}/installation",
      { owner: "owner", repo: "repo" },
    );
  });

  it("dispatches the workflow using the installation octokit", async () => {
    const mockRequest = vi.fn().mockResolvedValue({});
    vi.mocked(App).mockImplementation(
      () =>
        ({
          octokit: {
            request: vi.fn().mockResolvedValue({ data: { id: 99 } }),
          },
          getInstallationOctokit: vi.fn().mockResolvedValue({
            request: mockRequest,
          }),
        }) as unknown as InstanceType<typeof App>,
    );

    await dispatch(config);

    expect(mockRequest).toHaveBeenCalledWith(
      "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
      {
        owner: "owner",
        repo: "repo",
        workflow_id: "provision-tokens.yml",
        ref: "main",
      },
    );
  });

  it("throws when the app is not installed on the repo", async () => {
    vi.mocked(App).mockImplementation(
      () =>
        ({
          octokit: {
            request: vi
              .fn()
              .mockRejectedValue(
                Object.assign(new Error("Not Found"), { status: 404 }),
              ),
          },
          getInstallationOctokit: vi.fn(),
        }) as unknown as InstanceType<typeof App>,
    );

    await expect(dispatch(config)).rejects.toThrow(/not installed/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest --run src/external-scheduler/dispatch.spec.ts` Expected:
FAIL — module `./dispatch.js` not found

- [ ] **Step 3: Implement dispatch**

```ts
import { App } from "octokit";

export interface DispatchConfig {
  appId: string;
  privateKey: string;
  repo: string;
  workflow: string;
}

export async function dispatch(config: DispatchConfig): Promise<void> {
  const { appId, privateKey, repo, workflow } = config;
  const [owner, repoName] = repo.split("/");

  const app = new App({ appId, privateKey });

  let installationId: number;

  try {
    const { data } = await app.octokit.request(
      "GET /repos/{owner}/{repo}/installation",
      { owner, repo: repoName },
    );
    installationId = data.id;
  } catch (error: unknown) {
    if (error instanceof Error && "status" in error && error.status === 404) {
      throw new Error(`App ${appId} is not installed on ${repo}`);
    }
    throw error;
  }

  const octokit = await app.getInstallationOctokit(installationId);

  await octokit.request(
    "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
    {
      owner,
      repo: repoName,
      workflow_id: workflow,
      ref: "main",
    },
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest --run src/external-scheduler/dispatch.spec.ts` Expected:
PASS

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit` Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/external-scheduler/dispatch.ts src/external-scheduler/dispatch.spec.ts
git commit -m "Add core dispatch module for external scheduler

Uses the batteries-included octokit package with App auth. Handles
JWT creation, installation discovery, token exchange, retries, and
throttling transparently."
```

---

## Task 2: Platform entrypoints

**Files:**

- Create: `src/external-scheduler/cloudflare/index.ts`
- Create: `src/external-scheduler/aws/index.ts`
- Create: `src/external-scheduler/gcp/index.ts`
- Create: `src/external-scheduler/azure/index.ts`

- [ ] **Step 1: Create Cloudflare Worker entrypoint**

```ts
import { dispatch } from "../dispatch.js";

export interface Env {
  GITHUB_APP_ID: string;
  GITHUB_APP_PK: string;
  GITHUB_REPO: string;
  GITHUB_WORKFLOW: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await dispatch({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PK,
      repo: env.GITHUB_REPO,
      workflow: env.GITHUB_WORKFLOW,
    });
  },
};
```

- [ ] **Step 2: Create AWS Lambda entrypoint**

```ts
import { dispatch } from "../dispatch.js";

export async function handler(): Promise<void> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PK;
  const repo = process.env.GITHUB_REPO;
  const workflow = process.env.GITHUB_WORKFLOW;

  if (!appId || !privateKey || !repo || !workflow) {
    throw new Error("Missing required environment variables");
  }

  await dispatch({ appId, privateKey, repo, workflow });
}
```

- [ ] **Step 3: Create GCP Cloud Function entrypoint**

```ts
import { dispatch } from "../dispatch.js";

export async function handleSchedule(): Promise<void> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PK;
  const repo = process.env.GITHUB_REPO;
  const workflow = process.env.GITHUB_WORKFLOW;

  if (!appId || !privateKey || !repo || !workflow) {
    throw new Error("Missing required environment variables");
  }

  await dispatch({ appId, privateKey, repo, workflow });
}
```

- [ ] **Step 4: Create Azure Function entrypoint**

```ts
import { dispatch } from "../dispatch.js";

export async function timerTrigger(): Promise<void> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PK;
  const repo = process.env.GITHUB_REPO;
  const workflow = process.env.GITHUB_WORKFLOW;

  if (!appId || !privateKey || !repo || !workflow) {
    throw new Error("Missing required environment variables");
  }

  await dispatch({ appId, privateKey, repo, workflow });
}
```

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit` Expected: PASS (Cloudflare types may need
`@cloudflare/workers-types` — if so, skip the typecheck for that file or add the
dep)

- [ ] **Step 6: Commit**

```bash
git add src/external-scheduler/cloudflare/index.ts \
  src/external-scheduler/aws/index.ts \
  src/external-scheduler/gcp/index.ts \
  src/external-scheduler/azure/index.ts
git commit -m "Add platform entrypoints for external scheduler"
```

---

## Task 3: Build script and Makefile integration

**Files:**

- Create: `script/build-external-schedulers.ts`
- Modify: `Makefile`

- [ ] **Step 1: Create the build script**

```ts
/* eslint-disable no-console */
import { build } from "esbuild";

const platforms = [
  {
    entryPoint: "src/external-scheduler/cloudflare/index.ts",
    outfile: "examples/external-scheduler/cloudflare-worker/dist/index.js",
    format: "esm" as const,
    platform: "browser" as const,
    target: "es2022",
  },
  {
    entryPoint: "src/external-scheduler/aws/index.ts",
    outfile: "examples/external-scheduler/aws-lambda/dist/index.mjs",
    format: "esm" as const,
    platform: "node" as const,
    target: "node20",
  },
  {
    entryPoint: "src/external-scheduler/gcp/index.ts",
    outfile: "examples/external-scheduler/gcp-cloud-function/dist/index.mjs",
    format: "esm" as const,
    platform: "node" as const,
    target: "node20",
  },
  {
    entryPoint: "src/external-scheduler/azure/index.ts",
    outfile: "examples/external-scheduler/azure-function/dist/index.mjs",
    format: "esm" as const,
    platform: "node" as const,
    target: "node20",
  },
];

for (const { entryPoint, outfile, format, platform, target } of platforms) {
  await build({
    entryPoints: [entryPoint],
    bundle: true,
    packages: "bundle",
    sourcemap: true,
    platform,
    target,
    format,
    outfile,
  });

  console.log(`Built ${outfile}`);
}
```

- [ ] **Step 2: Add Makefile entries**

Append a second `GENERATED_FILES +=` line after line 1:

```makefile
GENERATED_FILES += examples/external-scheduler/cloudflare-worker/dist/index.js examples/external-scheduler/cloudflare-worker/dist/index.js.map examples/external-scheduler/aws-lambda/dist/index.mjs examples/external-scheduler/aws-lambda/dist/index.mjs.map examples/external-scheduler/gcp-cloud-function/dist/index.mjs examples/external-scheduler/gcp-cloud-function/dist/index.mjs.map examples/external-scheduler/azure-function/dist/index.mjs examples/external-scheduler/azure-function/dist/index.mjs.map
```

Add a build rule after the existing `dist/main.js` rule:

```makefile
examples/external-scheduler/cloudflare-worker/dist/index.js examples/external-scheduler/cloudflare-worker/dist/index.js.map examples/external-scheduler/aws-lambda/dist/index.mjs examples/external-scheduler/aws-lambda/dist/index.mjs.map examples/external-scheduler/gcp-cloud-function/dist/index.mjs examples/external-scheduler/gcp-cloud-function/dist/index.mjs.map examples/external-scheduler/azure-function/dist/index.mjs examples/external-scheduler/azure-function/dist/index.mjs.map: script/build-external-schedulers.ts artifacts/link-dependencies.touch $(JS_SOURCE_FILES)
	node "$<"
```

- [ ] **Step 3: Create output directories and run build**

Run:
`mkdir -p examples/external-scheduler/{cloudflare-worker,aws-lambda,gcp-cloud-function,azure-function}/dist && make regenerate`
Expected: All 4 bundles + source maps are produced

- [ ] **Step 4: Verify output**

Run: `ls examples/external-scheduler/*/dist/` Expected: `index.js` +
`index.js.map` (Cloudflare), `index.mjs` + `index.mjs.map` (AWS, GCP, Azure)

- [ ] **Step 5: Commit**

```bash
git add script/build-external-schedulers.ts Makefile examples/external-scheduler/*/dist/
git commit -m "Add build script for external scheduler bundles"
```

---

## Task 4: Platform configuration files

**Files:**

- Create: `examples/external-scheduler/cloudflare-worker/wrangler.toml`
- Create: `examples/external-scheduler/cloudflare-worker/package.json`
- Create: `examples/external-scheduler/aws-lambda/template.yaml`
- Create: `examples/external-scheduler/gcp-cloud-function/package.json`
- Create: `examples/external-scheduler/azure-function/function.json`
- Create: `examples/external-scheduler/azure-function/host.json`

- [ ] **Step 1: Create Cloudflare wrangler.toml**

```toml
name = "provision-github-tokens-scheduler"
main = "dist/index.js"
compatibility_date = "2024-01-01"

[triggers]
crons = ["*/30 * * * *"]

[vars]
GITHUB_APP_ID = ""
GITHUB_REPO = ""
GITHUB_WORKFLOW = ""

# GITHUB_APP_PK must be set via: wrangler secret put GITHUB_APP_PK
```

- [ ] **Step 2: Create Cloudflare package.json**

```json
{
  "name": "provision-github-tokens-scheduler",
  "private": true,
  "type": "module"
}
```

- [ ] **Step 3: Create AWS SAM template**

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Description: External scheduler for provision-github-tokens

Parameters:
  GitHubAppId:
    Type: String
    Description: GitHub App numeric ID
  GitHubAppPk:
    Type: String
    NoEcho: true
    Description: GitHub App PEM-encoded private key
  GitHubRepo:
    Type: String
    Description: "owner/repo of the token-provider workflow"
  GitHubWorkflow:
    Type: String
    Description: Workflow filename or numeric ID
    Default: provision-tokens.yml

Resources:
  SchedulerFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: dist/index.handler
      Runtime: nodejs20.x
      Timeout: 30
      Environment:
        Variables:
          GITHUB_APP_ID: !Ref GitHubAppId
          GITHUB_APP_PK: !Ref GitHubAppPk
          GITHUB_REPO: !Ref GitHubRepo
          GITHUB_WORKFLOW: !Ref GitHubWorkflow
      Events:
        Schedule:
          Type: Schedule
          Properties:
            Schedule: rate(30 minutes)
            RetryPolicy:
              MaximumRetryAttempts: 3
```

- [ ] **Step 4: Create GCP package.json**

```json
{
  "name": "provision-github-tokens-scheduler",
  "private": true,
  "type": "module",
  "main": "dist/index.mjs"
}
```

- [ ] **Step 5: Create Azure function.json**

```json
{
  "bindings": [
    {
      "name": "timer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 */30 * * * *"
    }
  ],
  "scriptFile": "dist/index.mjs",
  "entryPoint": "timerTrigger"
}
```

- [ ] **Step 6: Create Azure host.json**

```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add examples/external-scheduler/cloudflare-worker/wrangler.toml \
  examples/external-scheduler/cloudflare-worker/package.json \
  examples/external-scheduler/aws-lambda/template.yaml \
  examples/external-scheduler/gcp-cloud-function/package.json \
  examples/external-scheduler/azure-function/function.json \
  examples/external-scheduler/azure-function/host.json
git commit -m "Add platform configuration files for external schedulers"
```

---

## Task 5: Exclude examples from tsconfig

**Files:**

- Modify: `tsconfig.json`

- [ ] **Step 1: Add examples to tsconfig exclude**

Change the `exclude` array from:

```json
"exclude": ["dist", "artifacts", ".makefiles"]
```

To:

```json
"exclude": ["dist", "artifacts", "examples", ".makefiles"]
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit` Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "Exclude examples from TypeScript type-checking"
```

---

## Task 6: Documentation

**Files:**

- Create: `examples/external-scheduler/README.md`
- Create: `examples/external-scheduler/cloudflare-worker/README.md`
- Create: `examples/external-scheduler/aws-lambda/README.md`
- Create: `examples/external-scheduler/gcp-cloud-function/README.md`
- Create: `examples/external-scheduler/azure-function/README.md`

- [ ] **Step 1: Write the top-level README**

Cover:

- Why an external scheduler is needed (GitHub Actions cron unreliability)
- How it works (fire-and-forget `workflow_dispatch` via GitHub App auth)
- Prerequisites (a GitHub App with `actions:write` permission installed on the
  token-provider repo)
- Configuration variables table (marking `GITHUB_APP_PK` as sensitive)
- Recommended schedule (30 minutes)
- Links to each platform's README

- [ ] **Step 2: Write per-platform READMEs**

Each README covers:

- Prerequisites (platform account, CLI installed)
- How to set secrets (using the platform's native mechanism)
- Step-by-step deploy commands
- Click-to-deploy button/link
- How to verify it works (check workflow runs in GitHub)
- How to tear down

- [ ] **Step 3: Run Prettier on all Markdown files**

Run: `npx prettier --write examples/external-scheduler/**/*.md`

- [ ] **Step 4: Commit**

```bash
git add examples/external-scheduler/
git commit -m "Add documentation for external scheduler examples"
```

---

## Task 7: Click-to-deploy buttons

**Files:**

- Modify: `examples/external-scheduler/cloudflare-worker/README.md`
- Modify: `examples/external-scheduler/aws-lambda/README.md`
- Modify: `examples/external-scheduler/gcp-cloud-function/README.md`
- Modify: `examples/external-scheduler/azure-function/README.md`

- [ ] **Step 1: Add Cloudflare Deploy button**

```markdown
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ghalactic/provision-github-tokens&directory=examples/external-scheduler/cloudflare-worker)
```

- [ ] **Step 2: Add AWS Launch Stack button**

```markdown
[![Launch Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?stackName=provision-github-tokens-scheduler&templateURL=https://raw.githubusercontent.com/ghalactic/provision-github-tokens/main/examples/external-scheduler/aws-lambda/template.yaml)
```

- [ ] **Step 3: Add GCP deploy button**

```markdown
[![Run on Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run/?git_repo=https://github.com/ghalactic/provision-github-tokens&dir=examples/external-scheduler/gcp-cloud-function)
```

- [ ] **Step 4: Add Azure deploy button**

For Azure, an ARM template (`azuredeploy.json`) is required. Create it alongside
`function.json`:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "gitHubAppId": { "type": "string" },
    "gitHubAppPk": { "type": "securestring" },
    "gitHubRepo": { "type": "string" },
    "gitHubWorkflow": {
      "type": "string",
      "defaultValue": "provision-tokens.yml"
    }
  },
  "resources": []
}
```

Note: The full ARM template will need Azure Function App, Storage Account, and
App Service Plan resources. Flesh this out during implementation based on Azure
Function ARM template best practices.

Button:

```markdown
[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fghalactic%2Fprovision-github-tokens%2Fmain%2Fexamples%2Fexternal-scheduler%2Fazure-function%2Fazuredeploy.json)
```

- [ ] **Step 5: Run Prettier and commit**

```bash
npx prettier --write examples/external-scheduler/**/*.md
git add examples/external-scheduler/
git commit -m "Add click-to-deploy buttons to scheduler READMEs"
```

---

## Task 8: Full verification and cleanup

- [ ] **Step 1: Run `make regenerate`**

Run: `make regenerate` Expected: All generated files produced

- [ ] **Step 2: Stage generated files**

Run: `git add examples/external-scheduler/*/dist/`

- [ ] **Step 3: Run `make precommit`**

Run: `make precommit` Expected: PASS — lint, test, and verify-generated all pass

- [ ] **Step 4: Fix any issues and re-run until green**

- [ ] **Step 5: Review git log**

Run: `git --no-pager log --oneline -10`
