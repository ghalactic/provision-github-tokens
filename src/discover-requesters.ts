import { debug, info, error as logError } from "@actions/core";
import type { AppRegistry } from "./app-registry.js";
import { parseRequesterConfig } from "./config/requester-config.js";
import { createRepoRef, type RepoReference } from "./github-reference.js";
import { handleRequestError, type OctokitFactory } from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { AppInput } from "./type/input.js";
import type { RequesterConfig } from "./type/requester-config.js";

export type DiscoveredRequester = {
  requester: RepoReference;
  config: RequesterConfig;
};

export async function discoverRequesters(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): Promise<Map<string, DiscoveredRequester>> {
  const discovered = new Map<string, DiscoveredRequester>();

  for (const [, instReg] of appRegistry.provisioners) {
    const { installation, repos } = instReg;
    const octokit = octokitFactory.installationOctokit(
      appsInput,
      installation.app_id,
      installation.id,
    );

    for (const r of repos) {
      if (discovered.has(r.full_name)) continue;

      const requester = createRepoRef(r.owner.login, r.name);
      let configYaml: string;

      try {
        const res = await octokit.rest.repos.getContent({
          owner: requester.account,
          repo: requester.repo,
          path: ".github/ghalactic/provision-github-tokens.yml",
          mediaType: { format: "raw" },
        });

        /* istanbul ignore next - Header guarantees string data - @preserve */
        if (typeof res.data !== "string") {
          throw new Error(
            "Invariant violation: " +
              `Unexpected repo contents type ${typeof res.data}`,
          );
        }

        configYaml = res.data;
      } catch (error) {
        handleRequestError(error, {
          404: () => {
            debug(`Repo ${r.full_name} is not a requester`);
          },
        });

        continue;
      }

      debug(`Discovered requester ${r.full_name}`);

      let config: RequesterConfig;

      try {
        config = parseRequesterConfig(requester, configYaml);
      } catch {
        logError(`Requester ${r.full_name} has invalid config`);

        continue;
      }

      const tokenDecNames = Object.keys(config.tokens);
      const tokenDecs =
        tokenDecNames.length === 1
          ? "1 token declaration"
          : `${tokenDecNames.length} token declarations`;
      debug(
        `Requester ${r.full_name} has ${tokenDecs} ` +
          JSON.stringify(tokenDecNames),
      );

      const secretDecNames = Object.keys(config.provision.secrets);
      const secretDecs =
        secretDecNames.length === 1
          ? "1 secret declaration"
          : `${secretDecNames.length} secret declarations`;
      debug(
        `Requester ${r.full_name} has ${secretDecs} ` +
          JSON.stringify(secretDecNames),
      );

      discovered.set(r.full_name, { requester: requester, config });
    }
  }

  info(`Discovered ${pluralize(discovered.size, "requester", "requesters")}`);

  return discovered;
}
