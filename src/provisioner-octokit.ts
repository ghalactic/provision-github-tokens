import type { AppRegistry, InstallationRegistration } from "./app-registry.js";
import {
  isEnvRef,
  isRepoRef,
  type AccountOrRepoOrEnvReference,
} from "./github-reference.js";
import type { Octokit, OctokitFactory } from "./octokit.js";
import { orderCandidates } from "./order-candidates.js";
import type { AppInput } from "./type/input.js";

export type ProvisionerCandidate = {
  octokit: Octokit;
  provisioner: InstallationRegistration;
};

export type FindProvisionerOctokit = (
  target: AccountOrRepoOrEnvReference,
) => ProvisionerCandidate[];

export function createFindProvisionerOctokit(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): FindProvisionerOctokit {
  return (target) => {
    const regs = orderCandidates(
      provisionerWorkKey(target),
      appRegistry.findProvisionersForAccountOrRepo(target),
      (reg) => reg.installation.app_id,
    );
    const candidates: ProvisionerCandidate[] = [];

    for (const reg of regs) {
      candidates.push({
        octokit: octokitFactory.installationOctokit(
          appsInput,
          reg.installation.app_id,
          reg.installation.id,
        ),
        provisioner: reg,
      });
    }

    return candidates;
  };
}

function provisionerWorkKey(target: AccountOrRepoOrEnvReference): string {
  return JSON.stringify([
    target.account,
    isRepoRef(target) ? target.repo : undefined,
    isEnvRef(target) ? target.environment : undefined,
  ]);
}
