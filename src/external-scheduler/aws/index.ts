import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { dispatch } from "../dispatch.js";

export async function handler(): Promise<void> {
  const appId = process.env.GITHUB_APP_ID;
  const secretArn = process.env.GITHUB_APP_PK_SECRET_ARN;
  const repo = process.env.GITHUB_REPO;
  const workflow = process.env.GITHUB_WORKFLOW;

  if (!appId || !secretArn || !repo || !workflow) {
    throw new Error("Missing required environment variables");
  }

  const client = new SecretsManagerClient({});
  const secret = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );

  const privateKey = secret.SecretString;

  if (!privateKey) {
    throw new Error("Secret value is empty");
  }

  await dispatch({ appId, privateKey, repo, workflow });
}
