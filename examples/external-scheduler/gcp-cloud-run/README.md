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

```sh
gcloud secrets create github-app-pk --replication-policy=automatic
gcloud secrets versions add github-app-pk --data-file=github-app.pem
```

## Deploy

Deploy the Cloud Run service from this directory:

```sh
gcloud run deploy provision-github-tokens-scheduler \
  --source=. \
  --region=<region> \
  --no-allow-unauthenticated \
  --set-env-vars=GITHUB_APP_ID=<app-id>,GITHUB_REPO=<owner/repo>,GITHUB_WORKFLOW=<workflow> \
  --set-secrets=GITHUB_APP_PK=github-app-pk:latest
```

Create a Cloud Scheduler job that sends an HTTP POST every 30 minutes:

```sh
gcloud scheduler jobs create http provision-github-tokens-scheduler \
  --location=<region> \
  --schedule='*/30 * * * *' \
  --uri="$(gcloud run services describe provision-github-tokens-scheduler --region=<region> --format='value(status.url)')" \
  --http-method=POST \
  --oidc-service-account-email=<scheduler-service-account> \
  --max-retry-attempts=3
```

Use a service account that has the Cloud Run Invoker role.

[deploy-badge]: https://deploy.cloud.run/button.svg
[deploy-url]:
  https://deploy.cloud.run/?git_repo=https://github.com/ghalactic/provision-github-tokens&dir=examples/external-scheduler/gcp-cloud-run
[gcloud]: https://cloud.google.com/sdk/docs/install
