import type { Octokit } from "@octokit/action";
import type { AppRegistry } from "./app-registry.js";
import type { AccountOrRepoReference } from "./github-reference.js";
import type { OctokitFactory } from "./octokit.js";
import type { AppInput } from "./type/input.js";

export type ProvisionerOctokitFinder = (
  target: AccountOrRepoReference,
) => Octokit | undefined;

export function createProvisionerOctokitFinder(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): ProvisionerOctokitFinder {
  return (target) => {
    const [reg] = appRegistry.findProvisionersForAccountOrRepo(target);

    return (
      reg &&
      octokitFactory.installationOctokit(
        appsInput,
        reg.installation.app_id,
        reg.installation.id,
      )
    );
  };
}
