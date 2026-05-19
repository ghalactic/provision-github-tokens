# AWS Lambda scheduler

[![Launch Stack][deploy-badge]][deploy-url]

Use Lambda and EventBridge to dispatch the token-provider workflow on a fixed
schedule.

## Prerequisites

- AWS account
- [SAM CLI][sam-cli]

## Configure

`sam deploy --guided` prompts for `GitHubAppId`, `GitHubAppPk`, `GitHubRepo`,
and `GitHubWorkflow`.

`GitHubAppPk` uses `NoEcho: true`, so CloudFormation does not echo the private
key in command output or stack events.

## Deploy

Run the guided deploy from this directory:

```sh
sam deploy --guided
```

The template already runs every 30 minutes. EventBridge retries failed
invocations up to 3 times.

## Publish to SAR

To make the deploy button work for others, publish the application to the AWS
Serverless Application Repository:

```sh
sam publish --template template.yaml --region <region>
```

After publishing, the deploy button links to the SAR console page where users
can deploy with one click.

[deploy-badge]:
  https://img.shields.io/badge/Deploy-AWS%20Serverless%20App%20Repository-orange?logo=amazonaws
[deploy-url]:
  https://serverlessrepo.aws.amazon.com/applications/provision-github-tokens-scheduler
[sam-cli]:
  https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
