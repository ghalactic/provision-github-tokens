# Deploy button fixes implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all platform deploy buttons functional — AWS via SAR, GCP via
Cloud Run container, Azure via ARM template.

**Architecture:** AWS adds SAR metadata to template.yaml. GCP is restructured
from a Cloud Function to a Cloud Run HTTP service with a Dockerfile. Azure gets
an ARM template (`azuredeploy.json`) that provisions infrastructure.

**Tech Stack:** esbuild, Node.js `http` module, SAM/CloudFormation YAML, ARM
JSON, Docker

---

### Task 1: AWS — add SAR metadata and fix deploy button

**Files:**

- Modify: `examples/external-scheduler/aws-lambda/template.yaml`
- Modify: `examples/external-scheduler/aws-lambda/README.md`

- [ ] **Step 1: Add SAR metadata to template.yaml**

Add the `Metadata` section at the top of the file (before `Parameters`):

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Description: External scheduler for provision-github-tokens

Metadata:
  AWS::ServerlessRepo::Application:
    Name: provision-github-tokens-scheduler
    Description: >-
      External scheduler that triggers a GitHub Actions workflow via
      workflow_dispatch every 30 minutes using GitHub App auth.
    Author: ghalactic
    SpdxLicenseId: MIT
    HomePageUrl: https://github.com/ghalactic/provision-github-tokens
    SourceCodeUrl: https://github.com/ghalactic/provision-github-tokens
    SemanticVersion: 1.0.0

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

- [ ] **Step 2: Update README deploy button**

Replace the current deploy badge/URL definitions with a link to the SAR
application page. Since SAR requires publishing first, change the button to
reference the SAR deploy pattern. Replace the `[deploy-badge]` and
`[deploy-url]` link references:

```markdown
[deploy-badge]:
  https://img.shields.io/badge/Deploy-AWS%20Serverless%20App%20Repository-orange?logo=amazonaws
[deploy-url]:
  https://serverlessrepo.aws.amazon.com/applications/provision-github-tokens-scheduler
```

Add a note in the README explaining that the SAR app must be published first
(using `sam publish`) before the deploy button works for other users. Add a
"Publish to SAR" section after the Deploy section:

````markdown
## Publish to SAR

To make the deploy button work for others, publish the application to the AWS
Serverless Application Repository:

\```sh sam publish --template template.yaml --region <region> \```

After publishing, the deploy button links to the SAR console page where users
can deploy with one click.
````

- [ ] **Step 3: Run Prettier on modified files**

Run: `npx prettier --write examples/external-scheduler/aws-lambda/README.md`

- [ ] **Step 4: Commit**

```bash
git add examples/external-scheduler/aws-lambda/
git -c commit.gpgsign=false commit -m "Add SAR metadata and fix AWS deploy button

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: GCP — rewrite entrypoint as HTTP server

**Files:**

- Modify: `src/external-scheduler/gcp/index.ts`
- Modify: `src/external-scheduler/gcp/index.spec.ts`

- [ ] **Step 1: Rewrite the GCP entrypoint as an HTTP server**

Replace `src/external-scheduler/gcp/index.ts` with:

```typescript
import { createServer } from "node:http";
import { dispatch } from "../dispatch.js";

const port = Number(process.env.PORT) || 8080;

const server = createServer(async (_req, res) => {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PK;
  const repo = process.env.GITHUB_REPO;
  const workflow = process.env.GITHUB_WORKFLOW;

  if (!appId || !privateKey || !repo || !workflow) {
    res.writeHead(500).end("Missing required environment variables");

    return;
  }

  try {
    await dispatch({ appId, privateKey, repo, workflow });
    res.writeHead(200).end();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.writeHead(500).end(message);
  }
});

server.listen(port);
```

- [ ] **Step 2: Rewrite the GCP tests**

Replace `src/external-scheduler/gcp/index.spec.ts` with tests that exercise the
HTTP server. Use Node's `http` module to make requests:

```typescript
import { createServer, type Server } from "node:http";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../dispatch.js", () => ({
  dispatch: vi.fn().mockResolvedValue(undefined),
}));

// Must mock before importing the module that calls createServer
const mockServer = {
  listen: vi.fn(),
};

vi.mock("node:http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:http")>();

  return {
    ...actual,
    createServer: vi.fn((handler) => {
      mockServer.handler = handler;
      mockServer.listen = vi.fn();

      return mockServer as unknown as Server;
    }),
  };
});

import { dispatch } from "../dispatch.js";
import { createServer as mockedCreateServer } from "node:http";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("GITHUB_APP_ID", "12345");
  vi.stubEnv("GITHUB_APP_PK", "fake-key");
  vi.stubEnv("GITHUB_REPO", "owner/repo");
  vi.stubEnv("GITHUB_WORKFLOW", "provision-tokens.yml");
  vi.stubEnv("PORT", "9999");
});

it("starts an HTTP server on the PORT env var", async () => {
  await import("./index.js");

  expect(mockedCreateServer).toHaveBeenCalled();
  expect(mockServer.listen).toHaveBeenCalledWith(9999);
});

it("calls dispatch and returns 200 on success", async () => {
  await import("./index.js");
  const handler = (mockedCreateServer as any).mock.calls[0][0];
  const res = { writeHead: vi.fn().mockReturnThis(), end: vi.fn() };

  await handler({}, res);

  expect(dispatch).toHaveBeenCalledWith({
    appId: "12345",
    privateKey: "fake-key",
    repo: "owner/repo",
    workflow: "provision-tokens.yml",
  });
  expect(res.writeHead).toHaveBeenCalledWith(200);
});

it("returns 500 when env vars are missing", async () => {
  vi.stubEnv("GITHUB_APP_ID", "");
  await import("./index.js");
  const handler = (mockedCreateServer as any).mock.calls[0][0];
  const res = { writeHead: vi.fn().mockReturnThis(), end: vi.fn() };

  await handler({}, res);

  expect(res.writeHead).toHaveBeenCalledWith(500);
  expect(res.end).toHaveBeenCalledWith(
    "Missing required environment variables",
  );
});

it("returns 500 with error message on dispatch failure", async () => {
  vi.mocked(dispatch).mockRejectedValue(new Error("dispatch failed"));
  await import("./index.js");
  const handler = (mockedCreateServer as any).mock.calls[0][0];
  const res = { writeHead: vi.fn().mockReturnThis(), end: vi.fn() };

  await handler({}, res);

  expect(res.writeHead).toHaveBeenCalledWith(500);
  expect(res.end).toHaveBeenCalledWith("dispatch failed");
});
```

Note: The test approach above is illustrative. The agent should determine the
best way to test an HTTP server module that has side effects at import time.
Using `vi.resetModules()` between tests or extracting the handler into a
testable function are both valid approaches.

- [ ] **Step 3: Run tests**

Run: `pnpm exec vitest --run src/external-scheduler/gcp/` Expected: All tests
pass.

- [ ] **Step 4: Commit**

```bash
git add src/external-scheduler/gcp/
git -c commit.gpgsign=false commit -m "Rewrite GCP entrypoint as HTTP server for Cloud Run

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: GCP — rename directory, add Dockerfile, update build

**Files:**

- Delete: `examples/external-scheduler/gcp-cloud-function/`
- Create: `examples/external-scheduler/gcp-cloud-run/Dockerfile`
- Create: `examples/external-scheduler/gcp-cloud-run/package.json`
- Modify: `script/build-external-schedulers.ts`
- Modify: `Makefile` (line 2)
- Modify: `.prettierignore`

- [ ] **Step 1: Remove old directory and create new one**

```bash
rm -rf examples/external-scheduler/gcp-cloud-function
mkdir -p examples/external-scheduler/gcp-cloud-run/dist
```

- [ ] **Step 2: Create Dockerfile**

Create `examples/external-scheduler/gcp-cloud-run/Dockerfile`:

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY dist/index.mjs .
ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.mjs"]
```

- [ ] **Step 3: Create package.json**

Create `examples/external-scheduler/gcp-cloud-run/package.json`:

```json
{
  "name": "provision-github-tokens-scheduler",
  "private": true,
  "type": "module",
  "main": "dist/index.mjs",
  "scripts": {
    "start": "node dist/index.mjs"
  }
}
```

- [ ] **Step 4: Update build script**

In `script/build-external-schedulers.ts`, change the GCP entry's `outfile` from:

```typescript
outfile: "examples/external-scheduler/gcp-cloud-function/dist/index.mjs",
```

to:

```typescript
outfile: "examples/external-scheduler/gcp-cloud-run/dist/index.mjs",
```

- [ ] **Step 5: Update Makefile GENERATED_FILES**

On line 2 of `Makefile`, replace `gcp-cloud-function` with `gcp-cloud-run` in
both the `.mjs` and `.mjs.map` entries.

- [ ] **Step 6: Update .prettierignore if needed**

The existing `/examples/**/dist/` pattern already covers the renamed path. No
change needed — verify only.

- [ ] **Step 7: Run `make regenerate` to build the bundle**

Run: `make regenerate` Expected:
`Built examples/external-scheduler/gcp-cloud-run/dist/index.mjs`

- [ ] **Step 8: Commit**

```bash
git add -A
git -c commit.gpgsign=false commit -m "Rename GCP example to gcp-cloud-run with Dockerfile

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: GCP — rewrite README for Cloud Run

**Files:**

- Create: `examples/external-scheduler/gcp-cloud-run/README.md`

- [ ] **Step 1: Write the Cloud Run README**

Create `examples/external-scheduler/gcp-cloud-run/README.md`:

````markdown
# Google Cloud Run scheduler

[![Run on Google Cloud][deploy-badge]][deploy-url]

Use Cloud Run and Cloud Scheduler to dispatch the token-provider workflow every
30 minutes.

## Prerequisites

- GCP project
- [gcloud CLI][gcloud]

## Configure

Use environment variables for non-sensitive settings and Secret Manager for
`GITHUB_APP_PK`.

Create the secret:

\```sh gcloud secrets create github-app-pk --replication-policy=automatic gcloud
secrets versions add github-app-pk --data-file=github-app.pem \```

## Deploy

Deploy the Cloud Run service from this directory:

\```sh gcloud run deploy provision-github-tokens-scheduler \
 --source=. \
 --region=<region> \
 --no-allow-unauthenticated \
 --set-env-vars=GITHUB_APP_ID=<app-id>,GITHUB_REPO=<owner/repo>,GITHUB_WORKFLOW=<workflow>
\
 --set-secrets=GITHUB_APP_PK=github-app-pk:latest \```

Create a Cloud Scheduler job that sends an HTTP POST every 30 minutes:

\```sh gcloud scheduler jobs create http provision-github-tokens-scheduler \
 --location=<region> \
 --schedule='_/30 _ \* \* \*' \
 --uri="$(gcloud run services describe provision-github-tokens-scheduler
--region=<region> --format='value(status.url)')" \
 --http-method=POST \
 --oidc-service-account-email=<scheduler-service-account> \
 --max-retry-attempts=3 \```

Use a service account that has the Cloud Run Invoker role.

[deploy-badge]: https://deploy.cloud.run/button.svg
[deploy-url]:
  https://deploy.cloud.run/?git_repo=https://github.com/ghalactic/provision-github-tokens&dir=examples/external-scheduler/gcp-cloud-run
[gcloud]: https://cloud.google.com/sdk/docs/install
````

- [ ] **Step 2: Run Prettier**

Run: `npx prettier --write examples/external-scheduler/gcp-cloud-run/README.md`

- [ ] **Step 3: Commit**

```bash
git add examples/external-scheduler/gcp-cloud-run/README.md
git -c commit.gpgsign=false commit -m "Add Cloud Run README with working deploy button

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Azure — write ARM template and fix deploy button

**Files:**

- Create: `examples/external-scheduler/azure-function/azuredeploy.json`
- Modify: `examples/external-scheduler/azure-function/README.md`

- [ ] **Step 1: Create the ARM template**

Create `examples/external-scheduler/azure-function/azuredeploy.json`:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "functionAppName": {
      "type": "string",
      "metadata": {
        "description": "Name of the Function App"
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]",
      "metadata": {
        "description": "Azure region for resources"
      }
    },
    "gitHubAppId": {
      "type": "string",
      "metadata": {
        "description": "GitHub App numeric ID"
      }
    },
    "gitHubAppPk": {
      "type": "secureString",
      "metadata": {
        "description": "GitHub App PEM-encoded private key"
      }
    },
    "gitHubRepo": {
      "type": "string",
      "metadata": {
        "description": "owner/repo of the token-provider workflow"
      }
    },
    "gitHubWorkflow": {
      "type": "string",
      "defaultValue": "provision-tokens.yml",
      "metadata": {
        "description": "Workflow filename or numeric ID"
      }
    }
  },
  "variables": {
    "storageAccountName": "[concat('fn', uniqueString(resourceGroup().id))]",
    "hostingPlanName": "[concat(parameters('functionAppName'), '-plan')]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-01-01",
      "name": "[variables('storageAccountName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Standard_LRS"
      },
      "kind": "StorageV2"
    },
    {
      "type": "Microsoft.Web/serverfarms",
      "apiVersion": "2023-01-01",
      "name": "[variables('hostingPlanName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Y1",
        "tier": "Dynamic"
      },
      "properties": {
        "reserved": true
      }
    },
    {
      "type": "Microsoft.Web/sites",
      "apiVersion": "2023-01-01",
      "name": "[parameters('functionAppName')]",
      "location": "[parameters('location')]",
      "kind": "functionapp,linux",
      "dependsOn": [
        "[resourceId('Microsoft.Storage/storageAccounts', variables('storageAccountName'))]",
        "[resourceId('Microsoft.Web/serverfarms', variables('hostingPlanName'))]"
      ],
      "properties": {
        "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', variables('hostingPlanName'))]",
        "siteConfig": {
          "linuxFxVersion": "NODE|20",
          "appSettings": [
            {
              "name": "AzureWebJobsStorage",
              "value": "[concat('DefaultEndpointsProtocol=https;AccountName=', variables('storageAccountName'), ';EndpointSuffix=', environment().suffixes.storage, ';AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', variables('storageAccountName')), '2023-01-01').keys[0].value)]"
            },
            {
              "name": "FUNCTIONS_EXTENSION_VERSION",
              "value": "~4"
            },
            {
              "name": "FUNCTIONS_WORKER_RUNTIME",
              "value": "node"
            },
            {
              "name": "WEBSITE_NODE_DEFAULT_VERSION",
              "value": "~20"
            },
            {
              "name": "GITHUB_APP_ID",
              "value": "[parameters('gitHubAppId')]"
            },
            {
              "name": "GITHUB_APP_PK",
              "value": "[parameters('gitHubAppPk')]"
            },
            {
              "name": "GITHUB_REPO",
              "value": "[parameters('gitHubRepo')]"
            },
            {
              "name": "GITHUB_WORKFLOW",
              "value": "[parameters('gitHubWorkflow')]"
            }
          ]
        }
      }
    }
  ]
}
```

- [ ] **Step 2: Update README deploy button URL**

In `examples/external-scheduler/azure-function/README.md`, replace the deploy
URL reference and remove the placeholder note:

Replace:

```markdown
> [!NOTE] The deploy button is a placeholder. Azure deploy buttons expect an ARM
> template. Use the manual CLI flow below as the primary deployment path.
```

With nothing (remove the note entirely).

Replace the `[deploy-url]` link reference:

```markdown
[deploy-url]:
  https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fghalactic%2Fprovision-github-tokens%2Fmain%2Fexamples%2Fexternal-scheduler%2Fazure-function%2Fazuredeploy.json
```

- [ ] **Step 3: Run Prettier**

Run:
`npx prettier --write examples/external-scheduler/azure-function/README.md examples/external-scheduler/azure-function/azuredeploy.json`

- [ ] **Step 4: Commit**

```bash
git add examples/external-scheduler/azure-function/
git -c commit.gpgsign=false commit -m "Add ARM template and fix Azure deploy button

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Update top-level README and run full verification

**Files:**

- Modify: `examples/external-scheduler/README.md` (update GCP link reference)

- [ ] **Step 1: Update GCP link in top-level README**

The top-level `examples/external-scheduler/README.md` has a link to the GCP
example. Update it from `gcp-cloud-function` to `gcp-cloud-run` and change the
label from "Google Cloud Function" to "Google Cloud Run".

- [ ] **Step 2: Run Prettier on modified README**

Run: `npx prettier --write examples/external-scheduler/README.md`

- [ ] **Step 3: Run `make regenerate`**

Run: `make regenerate` Verify: All bundles build successfully, including the
renamed GCP path.

- [ ] **Step 4: Stage all changes and run `make precommit`**

```bash
git add -A
make precommit
```

Expected: All tests pass, lint clean, generated files verified.

- [ ] **Step 5: Commit and push**

```bash
git -c commit.gpgsign=false commit -m "Update top-level README for GCP rename

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push
```
