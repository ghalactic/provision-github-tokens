import { debug, info, error as logError } from "@actions/core";
import type { AppRegistry } from "./app-registry.js";
import { parseConsumerConfig } from "./config/consumer-config.js";
import { handleRequestError, type OctokitFactory } from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { ConsumerConfig } from "./type/consumer-config.js";
import type { AppInput } from "./type/input.js";

export type DiscoveredConsumer = {
  account: string;
  repo: string;
  config: ConsumerConfig;
};

export async function discoverConsumers(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): Promise<Map<string, DiscoveredConsumer>> {
  const discovered = new Map<string, DiscoveredConsumer>();

  for (const [, instReg] of appRegistry.provisioners) {
    const { installation, repos } = instReg;
    const octokit = octokitFactory.installationOctokit(
      appsInput,
      installation.app_id,
      installation.id,
    );

    for (const { owner, name: repo, full_name } of repos) {
      if (discovered.has(full_name)) continue;

      const { login: account } = owner;
      let configYAML: string;

      try {
        const res = await octokit.rest.repos.getContent({
          owner: account,
          repo,
          path: ".github/ghalactic/provision-github-tokens.yml",
          headers: { accept: "application/vnd.github.raw+json" },
        });

        /* v8 ignore start - Header guarantees string data */
        if (typeof res.data !== "string") {
          throw new Error(
            "Invariant violation: " +
              `Unexpected repo contents type ${typeof res.data}`,
          );
        }
        /* v8 ignore stop */

        configYAML = res.data;
      } catch (error) {
        handleRequestError(error, {
          404: () => {
            debug(`Repo ${full_name} is not a consumer`);
          },
        });

        continue;
      }

      debug(`Discovered consumer ${full_name}`);

      let config: ConsumerConfig;

      try {
        config = parseConsumerConfig(account, repo, configYAML);
      } catch (error) {
        logError(`Consumer ${full_name} has invalid config`);

        continue;
      }

      const tokenDecNames = Object.keys(config.tokens);
      const tokenDecs =
        tokenDecNames.length === 1
          ? "1 token declaration"
          : `${tokenDecNames.length} token declarations`;
      debug(
        `Consumer ${full_name} has ${tokenDecs} ` +
          JSON.stringify(tokenDecNames),
      );

      const secretDecNames = Object.keys(config.provision.secrets);
      const secretDecs =
        secretDecNames.length === 1
          ? "1 secret declaration"
          : `${secretDecNames.length} secret declarations`;
      debug(
        `Consumer ${full_name} has ${secretDecs} ` +
          JSON.stringify(secretDecNames),
      );

      discovered.set(full_name, { account, repo, config });
    }
  }

  info(
    `Discovered ${discovered.size} ` +
      `${pluralize(discovered.size, "consumer", "consumers")}`,
  );

  return discovered;
}
