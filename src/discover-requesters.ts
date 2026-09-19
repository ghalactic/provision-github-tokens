import { debug, info, error as logError } from "@actions/core";
import type { ErrorObject } from "ajv";
import type { AppRegistry, InstallationRegistration } from "./app-registry.js";
import { parseRequesterConfig } from "./config/requester-config.js";
import { findValidationErrors } from "./config/validation.js";
import { createRepoRef, type RepoReference } from "./github-reference.js";
import { handleRequestError, type OctokitFactory } from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { AppInput } from "./type/input.js";
import type { RequesterConfig } from "./type/requester-config.js";

export const CONFIG_PATH = ".github/ghalactic/provision-github-tokens.yml";

export type DiscoveredRequester = {
  requester: RepoReference;
  config: RequesterConfig;
};

export type RequesterConfigIssue = {
  requester: RepoReference;
  configPath: string;
  errors: ErrorObject[];
};

export type DiscoverRequestersResult = {
  requesters: Map<string, DiscoveredRequester>;
  configIssues: Map<string, RequesterConfigIssue>;
  installations: Map<string, InstallationRegistration>;
};

export async function discoverRequesters(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): Promise<DiscoverRequestersResult> {
  const requesters = new Map<string, DiscoveredRequester>();
  const configIssues = new Map<string, RequesterConfigIssue>();
  const installations = new Map<string, InstallationRegistration>();

  for (const [, instReg] of appRegistry.provisioners) {
    const { installation, repos } = instReg;
    const octokit = octokitFactory.installationOctokit(
      appsInput,
      installation.app_id,
      installation.id,
    );

    for (const r of repos) {
      if (requesters.has(r.full_name) || configIssues.has(r.full_name)) {
        continue;
      }

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

      installations.set(r.full_name, instReg);

      debug(`Discovered requester ${r.full_name}`);

      let config: RequesterConfig;

      try {
        config = parseRequesterConfig(requester, CONFIG_PATH, configYaml);
      } catch (error) {
        logError(`Requester ${r.full_name} has invalid config`);

        configIssues.set(r.full_name, {
          requester,
          configPath: CONFIG_PATH,
          errors: findValidationErrors(error),
        });

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

      requesters.set(r.full_name, { requester, config });
    }
  }

  info(`Discovered ${pluralize(requesters.size, "requester", "requesters")}`);
  info(
    `Found ${pluralize(configIssues.size, "invalid requester config", "invalid requester configs")}`,
  );

  return { requesters, configIssues, installations };
}
