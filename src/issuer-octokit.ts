import type { AppRegistry, InstallationRegistration } from "./app-registry.js";
import type { Octokit, OctokitFactory } from "./octokit.js";
import { orderCandidates } from "./order-candidates.js";
import { tokenShapeKey, type TokenRequest } from "./token-request.js";
import type { AppInput } from "./type/input.js";

export type IssuerCandidate = {
  octokit: Octokit;
  issuer: InstallationRegistration;
};

export type FindIssuerOctokit = (request: TokenRequest) => IssuerCandidate[];

export function createFindIssuerOctokit(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): FindIssuerOctokit {
  return (request) => {
    const regs = orderCandidates(
      tokenShapeKey(request),
      appRegistry.findIssuersForRequest(request),
      (reg) => reg.installation.app_id,
    );
    const candidates: IssuerCandidate[] = [];

    for (const reg of regs) {
      candidates.push({
        octokit: octokitFactory.installationOctokit(
          appsInput,
          reg.installation.app_id,
          reg.installation.id,
        ),
        issuer: reg,
      });
    }

    return candidates;
  };
}
