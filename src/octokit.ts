import { Octokit as OctokitAction } from "@octokit/action";
import { createAppAuth } from "@octokit/auth-app";
import { retry } from "@octokit/plugin-retry";
import { RequestError } from "@octokit/request-error";
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
