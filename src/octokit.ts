import { Octokit as OctokitAction } from "@octokit/action";
import { createAppAuth } from "@octokit/auth-app";
import { retry } from "@octokit/plugin-retry";
import type { AppInput } from "./type/input.js";

const CustomOctokit = OctokitAction.plugin(retry);

export type Octokit = InstanceType<typeof CustomOctokit>;

export function createAppOctokit({ appId, privateKey }: AppInput): Octokit {
  return new CustomOctokit({
    authStrategy: createAppAuth,
    auth: { appId: parseInt(appId, 10), privateKey },
  });
}

export function createInstallationOctokit(
  { appId, privateKey }: AppInput,
  installationId: number,
): Octokit {
  return new CustomOctokit({
    authStrategy: createAppAuth,
    auth: { appId: parseInt(appId, 10), privateKey, installationId },
  });
}
