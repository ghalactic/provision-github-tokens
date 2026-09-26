import { debug, info, error as logError, warning } from "@actions/core";
import type { AppRegistry } from "./app-registry.js";
import { parseRequesterConfig } from "./config/requester-config.js";
import { errorCause } from "./error.js";
import { createRepoRef, type RepoReference } from "./github-reference.js";
import { handleRequestError, type OctokitFactory } from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { AppInput } from "./type/input.js";
import type { RequesterConfig } from "./type/requester-config.js";

const CONFIG_PATH = ".github/ghalactic/provision-github-tokens.yml";

export type DiscoveredRequester = {
  requester: RepoReference;
  configPath: string;
  config?: RequesterConfig;
  configError?: Error;
};

export async function discoverRequesters(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): Promise<Map<string, DiscoveredRequester>> {
  const discovered = new Map<string, DiscoveredRequester>();
  let discoverCount = 0;
  let configIssueCount = 0;

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
          path: CONFIG_PATH,
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
            debug(`Repo ${r.full_name} isn't a requester`);
          },
        });

        continue;
      }

      debug(`Discovered requester ${r.full_name}`);

      let config: RequesterConfig;

      try {
        config = parseRequesterConfig(requester, CONFIG_PATH, configYaml);
      } catch (error) {
        logError(`Requester ${r.full_name} has invalid config`);

        const cause = errorCause(error);

        /* istanbul ignore next - parseRequesterConfig always throws with a cause - @preserve */
        if (!cause) {
          throw new Error(
            "Invariant violation: Requester config error has no cause",
            { cause: error },
          );
        }

        ++configIssueCount;
        discovered.set(r.full_name, {
          requester,
          configPath: CONFIG_PATH,
          configError: cause,
        });

        continue;
      }

      const tokenDecNames = Object.keys(config.tokens);
      const tokenDecs = pluralize(
        tokenDecNames.length,
        "token declaration",
        "token declarations",
      );
      debug(
        `Requester ${r.full_name} has ${tokenDecs} ` +
          JSON.stringify(tokenDecNames),
      );

      const secretDecNames = Object.keys(config.provision.secrets);
      const secretDecs = pluralize(
        secretDecNames.length,
        "secret declaration",
        "secret declarations",
      );
      debug(
        `Requester ${r.full_name} has ${secretDecs} ` +
          JSON.stringify(secretDecNames),
      );

      ++discoverCount;
      discovered.set(r.full_name, {
        requester,
        configPath: CONFIG_PATH,
        config,
      });
    }
  }

  info(`Discovered ${pluralize(discoverCount, "requester", "requesters")}`);

  if (configIssueCount > 0) {
    const pluralizedConfigIssues = pluralize(
      configIssueCount,
      "invalid requester config",
      "invalid requester configs",
    );

    warning(`Found ${pluralizedConfigIssues}`);
  }

  return discovered;
}
