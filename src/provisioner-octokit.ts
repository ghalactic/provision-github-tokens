import type { AppRegistry, InstallationRegistration } from "./app-registry.js";
import type { AccountOrRepoReference } from "./github-reference.js";
import type { Octokit, OctokitFactory } from "./octokit.js";
import type { AppInput } from "./type/input.js";

export type ProvisionerOctokitFinder = (
  target: AccountOrRepoReference,
) => [octokit: Octokit, reg: InstallationRegistration] | undefined;

export function createProvisionerOctokitFinder(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): ProvisionerOctokitFinder {
  return (target) => {
    const [reg] = appRegistry.findProvisionersForAccountOrRepo(target);

    if (!reg) return undefined;

    return [
      octokitFactory.installationOctokit(
        appsInput,
        reg.installation.app_id,
        reg.installation.id,
      ),
      reg,
    ];
  };
}
