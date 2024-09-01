import { Octokit } from "@octokit/action";
import { createAppAuth } from "@octokit/auth-app";
import { retry } from "@octokit/plugin-retry";
import type { AppInput } from "./type/input.js";

const CustomOctokit = Octokit.plugin(retry);

export function createAppOctokit({
  appId,
  privateKey,
}: AppInput): InstanceType<typeof CustomOctokit> {
  return new CustomOctokit({
    authStrategy: createAppAuth,
    auth: { appId: parseInt(appId, 10), privateKey },
  });
}

export function createInstallationOctokit(
  { appId, privateKey }: AppInput,
  installationId: number,
): InstanceType<typeof CustomOctokit> {
  return new CustomOctokit({
    authStrategy: createAppAuth,
    auth: { appId: parseInt(appId, 10), privateKey, installationId },
  });
}
