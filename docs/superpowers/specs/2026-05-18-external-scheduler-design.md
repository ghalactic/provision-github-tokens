# External scheduler design

## Problem

GitHub Actions workflow schedules (`cron`) are unreliable — runs can be delayed
or skipped entirely, especially on free-tier runners. The token-provider
workflow must run at least once per hour to keep provisioned tokens fresh. Users
deploying this action in their own enterprises and organizations need a reliable
external scheduler to trigger the workflow.

## Approach

Provide a set of ready-to-deploy external scheduler examples for major cloud
platforms. Each example is a minimal serverless function that triggers the
token-provider workflow via `workflow_dispatch`. Source lives in TypeScript,
built via esbuild, with deployable output committed to the repo. Click-to-deploy
buttons let users deploy directly from subdirectories.

## Core dispatch logic

A shared TypeScript module that uses the batteries-included `octokit` package
(already a dependency of this project) with GitHub App authentication:

1. Creates an `App` instance with the configured app ID and private key
2. Discovers the installation for the target repo
3. Gets an installation-scoped Octokit client
4. Calls `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches`

The `octokit` package handles JWT creation, installation token exchange, request
retries (via `@octokit/plugin-retry`), and rate limit throttling transparently.
No manual JWT or retry logic is needed.

## Configuration

| Variable          | Sensitive | Description                                 |
| ----------------- | --------- | ------------------------------------------- |
| `GITHUB_APP_ID`   | No        | App's numeric ID                            |
| `GITHUB_APP_PK`   | Yes       | PEM-encoded private key                     |
| `GITHUB_REPO`     | No        | `owner/repo` of the token-provider workflow |
| `GITHUB_WORKFLOW` | No        | Workflow filename or numeric ID             |

Installation ID is discovered at runtime via the GitHub API — not configured
manually.

### Secrets handling

Each platform has a native mechanism for storing sensitive configuration
separately from non-sensitive values. The deploy instructions and
click-to-deploy templates use these mechanisms for `GITHUB_APP_PK`:

| Platform   | Secrets mechanism                | How it works                                                    |
| ---------- | -------------------------------- | --------------------------------------------------------------- |
| Cloudflare | `wrangler secret put`            | Stored encrypted, injected at runtime via `env` binding         |
| AWS        | SSM Parameter Store SecureString | Referenced in SAM template, resolved at deploy time             |
| GCP        | Secret Manager                   | Mounted as env var or accessed via client library at runtime    |
| Azure      | Key Vault references             | App setting references a Key Vault secret URI, resolved at boot |

Non-sensitive variables (`GITHUB_APP_ID`, `GITHUB_REPO`, `GITHUB_WORKFLOW`) are
set as plain environment variables or configuration values in each platform's
standard config format.

## Retry strategy

The `octokit` package includes `@octokit/plugin-retry` which automatically
retries failed requests on 5xx and network errors. No additional retry logic is
needed in the scheduler code itself.

For platforms with native invocation retry (AWS EventBridge, GCP Cloud
Scheduler), the function throws on unrecoverable failure and the platform
retries the entire invocation. For platforms without native retry (Cloudflare
Cron Triggers, Azure Timer trigger), Octokit's built-in retry is sufficient — if
the request still fails after Octokit's retries, the function throws and the
next scheduled invocation (30 minutes later) will try again.

## Schedule

Recommend **30 minutes** as the default interval. With 2 invocations per hour
and Octokit's built-in retry on each invocation, this provides high confidence
of at least one successful dispatch per hour. Users can tighten to 15–20 minutes
if they want extra margin, but it is unnecessary with reliable cloud schedulers.

## Platform examples

| Platform   | Trigger          | Compute             | Deploy            | Click-to-deploy |
| ---------- | ---------------- | ------------------- | ----------------- | --------------- |
| Cloudflare | Cron Triggers    | Worker (TS)         | `wrangler deploy` | Yes (directory) |
| AWS        | EventBridge rule | Lambda (JS)         | `sam deploy`      | Yes (template)  |
| GCP        | Cloud Scheduler  | Cloud Function (JS) | `gcloud` CLI      | Yes (path)      |
| Azure      | Timer trigger    | Azure Function (JS) | `func` CLI        | Yes (template)  |

All implementations use TypeScript source, built to JavaScript for deployment.

### Click-to-deploy

Each platform supports deploying from a subdirectory or template URL:

- **Cloudflare:** Deploy with Workers button using the `directory` parameter
  pointing at the Cloudflare subdirectory.
- **AWS:** "Launch Stack" button pointing at a CloudFormation/SAM template file
  URL within the repo.
- **GCP:** "Run on Google Cloud" button pointing at the Cloud Function
  subdirectory.
- **Azure:** "Deploy to Azure" button pointing at an ARM/Bicep template URL.

Users click the button, authenticate with their cloud provider, fill in
configuration values (app ID, private key, repo, workflow), and the scheduler is
deployed.

## Build and file structure

### Source (TypeScript)

```
src/
  external-scheduler/
    dispatch.ts             # Core dispatch logic using octokit App client
    cloudflare/
      index.ts             # Cloudflare Worker entrypoint
    aws/
      index.ts             # AWS Lambda handler
    gcp/
      index.ts             # GCP Cloud Function handler
    azure/
      index.ts             # Azure Function handler
```

### Generated output (committed)

```
examples/
  external-scheduler/
    README.md                    # Pattern explanation + schedule guidance
    cloudflare-worker/
      wrangler.toml
      dist/index.js              # Built from src/external-scheduler/cloudflare/
      package.json
      README.md                  # Deploy instructions + click-to-deploy button
    aws-lambda/
      template.yaml              # SAM/CloudFormation template
      dist/index.mjs             # Built from src/external-scheduler/aws/
      README.md                  # Deploy instructions + click-to-deploy button
    gcp-cloud-function/
      dist/index.mjs             # Built from src/external-scheduler/gcp/
      package.json
      README.md                  # Deploy instructions + click-to-deploy button
    azure-function/
      dist/index.mjs             # Built from src/external-scheduler/azure/
      function.json
      host.json
      README.md                  # Deploy instructions + click-to-deploy button
```

The build adds entries to the Makefile's `GENERATED_FILES` variable. The
`make regenerate` workflow builds these alongside `dist/main.js`.
`make precommit` verifies they are up to date.

## Not in scope

- Monitoring or alerting (users rely on platform-native logs and metrics)
- Dashboard or UI
- State persistence
- Webhook-based triggers (only cron/timer)
- Non-JavaScript runtimes
