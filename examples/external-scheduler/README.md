# External scheduler examples

GitHub Actions cron can drift, skip runs, or start late enough that token
rotation misses its target window. If you need a more predictable schedule, run
an external scheduler and let it dispatch the provider workflow.

## How it works

Each example runs a scheduled serverless function. On every invocation, it
authenticates as your GitHub App and calls `workflow_dispatch` for the
`GITHUB_WORKFLOW` workflow in `GITHUB_REPO`.

Use the same GitHub App that `provision-github-tokens` uses. Install it on the
provider repository and grant `actions:write` so it can start workflow runs.

## Recommended schedule

Run the scheduler every 30 minutes. That gives you a steady retry loop without
waiting long for the next dispatch.

## Configuration

| Variable          | Required | Sensitive | Description                                           |
| ----------------- | -------- | --------- | ----------------------------------------------------- |
| `GITHUB_APP_ID`   | Yes      | No        | Numeric GitHub App ID.                                |
| `GITHUB_APP_PK`   | Yes      | Yes       | PEM-encoded GitHub App private key.                   |
| `GITHUB_REPO`     | Yes      | No        | Provider repository in `owner/repo` form.             |
| `GITHUB_WORKFLOW` | Yes      | No        | Workflow filename or numeric workflow ID to dispatch. |

## Platform guides

- [Cloudflare Worker scheduler][cloudflare-worker]
- [AWS Lambda scheduler][aws-lambda]
- [Google Cloud Function scheduler][gcp-cloud-function]
- [Azure Function scheduler][azure-function]

[cloudflare-worker]: ./cloudflare-worker/README.md
[aws-lambda]: ./aws-lambda/README.md
[gcp-cloud-function]: ./gcp-cloud-function/README.md
[azure-function]: ./azure-function/README.md
