# Google Cloud Function scheduler

[![Run on Google Cloud][deploy-badge]][deploy-url]

Use Cloud Functions for the dispatch endpoint and Cloud Scheduler for the
30-minute trigger.

## Prerequisites

- GCP project
- [gcloud CLI][gcloud]

## Configure

Use environment variables for non-sensitive settings and Secret Manager for
`GITHUB_APP_PK`.

Create the secret first:

```sh
gcloud secrets create github-app-pk --replication-policy=automatic
gcloud secrets versions add github-app-pk --data-file=github-app.pem
```

## Deploy

Deploy the function from this directory:

```sh
gcloud functions deploy provision-github-tokens-scheduler \
  --gen2 \
  --runtime=nodejs20 \
  --region=<region> \
  --source=. \
  --entry-point=handleSchedule \
  --trigger-http \
  --no-allow-unauthenticated \
  --set-env-vars=GITHUB_APP_ID=<app-id>,GITHUB_REPO=<owner/repo>,GITHUB_WORKFLOW=<workflow> \
  --set-secrets=GITHUB_APP_PK=github-app-pk:latest
```

Create a Cloud Scheduler job that runs every 30 minutes and retries up to 3
times:

```sh
gcloud scheduler jobs create http provision-github-tokens-scheduler \
  --location=<region> \
  --schedule='*/30 * * * *' \
  --uri="$(gcloud functions describe provision-github-tokens-scheduler --gen2 --region=<region> --format='value(serviceConfig.uri)')" \
  --http-method=POST \
  --oidc-service-account-email=<scheduler-service-account> \
  --max-retry-attempts=3
```

Use a service account that can invoke the function.

[deploy-badge]: https://deploy.cloud.run/button.svg
[deploy-url]:
  https://deploy.cloud.run/?git_repo=https://github.com/ghalactic/provision-github-tokens&dir=examples/external-scheduler/gcp-cloud-function
[gcloud]: https://cloud.google.com/sdk/docs/install
