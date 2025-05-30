import type { AppRegistry, InstallationRegistration } from "./app-registry.js";
import type { Octokit, OctokitFactory } from "./octokit.js";
import type { TokenRequest } from "./token-request.js";
import type { AppInput } from "./type/input.js";

export type IssuerOctokitFinder = (
  request: TokenRequest,
) => [octokit: Octokit, reg: InstallationRegistration] | undefined;

export function createIssuerOctokitFinder(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): IssuerOctokitFinder {
  return (request) => {
    const [reg] = appRegistry.findIssuersForRequest(request);

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
