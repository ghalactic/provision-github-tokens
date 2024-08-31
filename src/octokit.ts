import { Octokit } from "@octokit/action";
import { createAppAuth } from "@octokit/auth-app";
import { retry } from "@octokit/plugin-retry";
import type { AppInput } from "./type/input.js";

export function createAppOctokit({ appId, privateKey }: AppInput) {
  const CustomOctokit = Octokit.plugin(retry);

  return new CustomOctokit({
    authStrategy: createAppAuth,
    auth: { appId: parseInt(appId, 10), privateKey },
  });
}

export function createInstallationOctokit(
  { appId, privateKey }: AppInput,
  installationId: number,
) {
  const CustomOctokit = Octokit.plugin(retry);

  return new CustomOctokit({
    authStrategy: createAppAuth,
    auth: { appId: parseInt(appId, 10), privateKey, installationId },
  });
}
