# Deploy button fixes design

## Problem

Three of the four platform deploy buttons don't work:

- **AWS** — CloudFormation "Launch Stack" requires the template on S3. A raw
  GitHub URL won't load. Publishing to the AWS Serverless Application Repository
  (SAR) provides a proper deploy page.
- **GCP** — The "Run on Google Cloud" button is for Cloud Run only. The current
  example is a Cloud Function with no one-click deploy. Restructure as a Cloud
  Run HTTP service so the button works.
- **Azure** — The "Deploy to Azure" button needs an ARM template. Write an
  `azuredeploy.json` that provisions the Function App stack.

Cloudflare's button already works — no changes needed.

## AWS: publish to Serverless Application Repository

Add SAR metadata to `template.yaml`:

```yaml
Metadata:
  AWS::ServerlessRepo::Application:
    Name: provision-github-tokens-scheduler
    Description: >-
      External scheduler that triggers the provision-github-tokens workflow via
      workflow_dispatch every 30 minutes.
    Author: ghalactic
    SpdxLicenseId: MIT
    HomePageUrl: https://github.com/ghalactic/provision-github-tokens
    SourceCodeUrl: https://github.com/ghalactic/provision-github-tokens
    SemanticVersion: 1.0.0
```

Update the README deploy button to link to the SAR application page. The SAR
deploy flow handles parameter input natively. Publishing happens via
`sam publish` (requires AWS credentials — out of scope for this PR).

## GCP: restructure as Cloud Run service

Replace the Cloud Function example with a Cloud Run container service.

### Source entrypoint

Replace `src/external-scheduler/gcp/index.ts` with an HTTP server using Node's
built-in `http` module (no framework). The handler:

- Reads config from env vars (same four variables)
- Listens on the `PORT` env var (Cloud Run sets this; default 8080)
- Calls `dispatch()` on any incoming POST
- Returns 200 on success, 500 on failure

### Example directory

- Rename `examples/external-scheduler/gcp-cloud-function/` to
  `examples/external-scheduler/gcp-cloud-run/`
- Add a `Dockerfile` (node:20-slim, copies bundle, runs `node dist/index.mjs`)
- Update `package.json` with a `start` script
- The "Run on Google Cloud" button detects the Dockerfile and builds + deploys
  automatically

### Build changes

- Update `script/build-external-schedulers.ts` output path
- Update Makefile `GENERATED_FILES` entries

### Cloud Scheduler setup

After deploying the Cloud Run service, users create a Cloud Scheduler job that
sends HTTP POST requests to the service URL every 30 minutes. This is documented
in the README, not automated by the button.

## Azure: ARM template

Create `examples/external-scheduler/azure-function/azuredeploy.json`:

- **Parameters**: `gitHubAppId`, `gitHubAppPk` (secureString), `gitHubRepo`,
  `gitHubWorkflow` (default: "provision-tokens.yml"), `functionAppName`,
  `location` (default: resource group location)
- **Resources**:
  - Storage account (required by Functions runtime)
  - App Service plan (consumption/Y1, Linux)
  - Function App (Node 20) with app settings from parameters
- Timer trigger defined by existing `function.json`

The button provisions infrastructure. Code deploy is a separate step via
`func azure functionapp publish` or zip deploy. README documents both.

Update the deploy button URL to point at:

```
https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fghalactic%2Fprovision-github-tokens%2Fmain%2Fexamples%2Fexternal-scheduler%2Fazure-function%2Fazuredeploy.json
```

## File structure changes

```
examples/external-scheduler/
  aws-lambda/
    template.yaml              # Updated with SAR metadata
    README.md                  # Updated deploy button
  gcp-cloud-run/               # Renamed from gcp-cloud-function
    Dockerfile                 # NEW
    package.json               # Updated with start script
    dist/index.mjs             # Rebuilt (HTTP server)
    README.md                  # Rewritten for Cloud Run
  azure-function/
    azuredeploy.json           # NEW ARM template
    README.md                  # Updated deploy button URL
src/external-scheduler/
  gcp/index.ts                 # Rewritten as HTTP server
  gcp/index.spec.ts            # Updated tests
```

## Not in scope

- Actually publishing to SAR (requires AWS account + credentials)
- Verifying buttons end-to-end (requires cloud accounts)
- Changes to the Cloudflare example (already works)
