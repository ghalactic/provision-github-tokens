import { Octokit as OctokitAction } from "@octokit/action";
import { createAppAuth } from "@octokit/auth-app";
import { retry } from "@octokit/plugin-retry";
import { RequestError } from "@octokit/request-error";
import type { AppsInputApp } from "./type/input.js";

const CustomOctokit = OctokitAction.plugin(retry);

export type Octokit = InstanceType<typeof CustomOctokit>;

export type OctokitFactory = {
  appOctokit: (input: AppsInputApp) => Octokit;
  installationOctokit: (input: AppsInputApp, installationId: number) => Octokit;
};

export function createOctokitFactory(): OctokitFactory {
  const appOctokits: Record<string, Octokit> = {};
  const installationOctokits: Record<string, Octokit> = {};

  return {
    appOctokit: (appInput) => {
      const { appId, privateKey } = appInput;
      const key = JSON.stringify({ appId, privateKey });
      appOctokits[key] ??= new CustomOctokit({
        authStrategy: createAppAuth,
        auth: { appId: parseInt(appId, 10), privateKey },
      });

      return appOctokits[key];
    },

    installationOctokit: (appInput, installationId) => {
      const { appId, privateKey } = appInput;
      const key = JSON.stringify({ appId, privateKey, installationId });
      installationOctokits[key] ??= new CustomOctokit({
        authStrategy: createAppAuth,
        auth: { appId: parseInt(appId, 10), privateKey, installationId },
      });

      return installationOctokits[key];
    },
  };
}

export function handleRequestError(
  error: unknown,
  handlers: Record<number, () => void> = {},
): void {
  if (!(error instanceof RequestError)) throw error;

  const handler = handlers[error.status];

  if (!handler) {
    throw new Error(
      `Unexpected HTTP status ${error.status} from GitHub API: ` +
        `${error.message}`,
      { cause: error },
    );
  }

  handler();
}
