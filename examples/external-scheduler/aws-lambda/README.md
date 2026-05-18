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

[deploy-badge]:
  https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png
[deploy-url]:
  https://console.aws.amazon.com/cloudformation/home#/stacks/new?stackName=provision-github-tokens-scheduler&templateURL=https://raw.githubusercontent.com/ghalactic/provision-github-tokens/main/examples/external-scheduler/aws-lambda/template.yaml
[sam-cli]:
  https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
