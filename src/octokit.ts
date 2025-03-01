import { Octokit as OctokitAction } from "@octokit/action";
import { createAppAuth } from "@octokit/auth-app";
import { retry } from "@octokit/plugin-retry";
import { RequestError } from "@octokit/request-error";
import type { AppInput } from "./type/input.js";

const CustomOctokit = OctokitAction.plugin(retry);

export type Octokit = InstanceType<typeof CustomOctokit>;

export type OctokitFactory = {
  appOctokit: (appsInput: AppInput[], appId: number) => Octokit;
  installationOctokit: (
    appsInput: AppInput[],
    appId: number,
    installationId: number,
  ) => Octokit;
};

export function createOctokitFactory(): OctokitFactory {
  const appOctokits: Record<string, Octokit> = {};
  const installationOctokits: Record<string, Octokit> = {};

  return {
    appOctokit: (appsInput, appId) => {
      const key = JSON.stringify({ appId });
      appOctokits[key] ??= new CustomOctokit({
        authStrategy: createAppAuth,
        auth: { appId, privateKey: findPrivateKey(appsInput, appId) },
      });

      return appOctokits[key];
    },

    installationOctokit: (appsInput, appId, installationId) => {
      const key = JSON.stringify({ appId, installationId });
      installationOctokits[key] ??= new CustomOctokit({
        authStrategy: createAppAuth,
        auth: {
          appId,
          installationId,
          privateKey: findPrivateKey(appsInput, appId),
        },
      });

      return installationOctokits[key];
    },
  };

  function findPrivateKey(appsInput: AppInput[], appId: number): string {
    for (const i of appsInput) {
      if (i.appId === appId) return i.privateKey;
    }

    throw new Error(`Unable to find app input for ID ${appId}`);
  }
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
