# Cloudflare Worker scheduler

[![Deploy to Cloudflare Workers][deploy-badge]][deploy-url]

Use a Worker Cron Trigger to dispatch the token-provider workflow on a fixed
schedule.

## Prerequisites

- Cloudflare account
- [Wrangler CLI][wrangler]

## Configure

Edit `wrangler.toml` and set the non-sensitive values:

```toml
[vars]
GITHUB_APP_ID = "<app-id>"
GITHUB_REPO = "<owner/repo>"
GITHUB_WORKFLOW = "<workflow>"
```

Store the private key as a Wrangler secret:

```sh
wrangler secret put GITHUB_APP_PK
```

The 30-minute cron schedule is already configured in `wrangler.toml`.

## Deploy

Run the deploy from this directory:

```sh
wrangler deploy
```

[deploy-badge]: https://deploy.workers.cloudflare.com/button
[deploy-url]:
  https://deploy.workers.cloudflare.com/?url=https://github.com/ghalactic/provision-github-tokens/tree/main/examples/external-scheduler/cloudflare-worker
[wrangler]: https://developers.cloudflare.com/workers/wrangler/
