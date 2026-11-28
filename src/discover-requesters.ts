import { debug, info, warning } from "@actions/core";
import type { AppRegistry } from "./app-registry.js";
import { compareRef } from "./compare-ref.js";
import { parseRequesterConfig } from "./config/requester-config.js";
import { errorCause } from "./error.js";
import {
  createRepoRef,
  repoRefToString,
  type RepoReference,
} from "./github-reference.js";
import { handleRequestError, type OctokitFactory } from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { Installation } from "./type/github-api.js";
import type { AppInput } from "./type/input.js";
import type { RequesterConfig } from "./type/requester-config.js";

const CONFIG_PATH = ".github/ghalactic/provision-github-tokens.yml";

export type DiscoveredRequester = {
  requester: RepoReference;
  configPath: string;
  configSha: string;
  config?: RequesterConfig;
  configError?: Error;
};

export async function discoverRequesters(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): Promise<DiscoveredRequester[]> {
  const discovered: DiscoveredRequester[] = [];
  let discoverCount = 0;

  for (const { installation, requester } of reposForDiscovery(appRegistry)) {
    const repoName = repoRefToString(requester);
    const octokit = octokitFactory.installationOctokit(
      appsInput,
      installation.app_id,
      installation.id,
    );

    const commits = await octokit.rest.repos.listCommits({
      owner: requester.account,
      repo: requester.repo,
      path: CONFIG_PATH,
      per_page: 1,
    });

    const head = commits.data[0];

    if (!head) {
      debug(`Repo ${repoName} isn't a requester`);

      continue;
    }

    const configSha = head.sha;
    let configYaml: string;

    try {
      const res = await octokit.rest.repos.getContent({
        owner: requester.account,
        repo: requester.repo,
        path: CONFIG_PATH,
        ref: configSha,
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
          debug(`Repo ${repoName} isn't a requester`);
        },
      });

      continue;
    }

    debug(`Discovered requester ${repoName}`);

    let config: RequesterConfig;

    try {
      config = parseRequesterConfig(requester, CONFIG_PATH, configYaml);
    } catch (error) {
      warning(`Requester ${repoName} has invalid config`);

      const cause = errorCause(error);

      /* istanbul ignore next - parseRequesterConfig always throws with a cause - @preserve */
      if (!cause) {
        throw new Error(
          "Invariant violation: Requester config error has no cause",
          {
            cause: error,
          },
        );
      }

      discovered.push({
        requester,
        configPath: CONFIG_PATH,
        configSha,
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
      `Requester ${repoName} has ${tokenDecs} ` + JSON.stringify(tokenDecNames),
    );

    const secretDecNames = Object.keys(config.provision.secrets);
    const secretDecs = pluralize(
      secretDecNames.length,
      "secret declaration",
      "secret declarations",
    );
    debug(
      `Requester ${repoName} has ${secretDecs} ` +
        JSON.stringify(secretDecNames),
    );

    ++discoverCount;
    discovered.push({
      requester,
      configPath: CONFIG_PATH,
      config,
      configSha,
    });
  }

  info(`Discovered ${pluralize(discoverCount, "requester", "requesters")}`);

  return discovered;
}

type DiscoverableRepo = {
  installation: Installation;
  requester: RepoReference;
};

function reposForDiscovery(appRegistry: AppRegistry): DiscoverableRepo[] {
  const found = new Map<string, DiscoverableRepo>();

  for (const [, { installation, repos }] of appRegistry.provisioners) {
    for (const repo of repos) {
      const requester = createRepoRef(repo.owner.login, repo.name);
      const repoName = repoRefToString(requester);

      if (!found.has(repoName)) {
        found.set(repoName, { installation, requester });
      }
    }
  }

  const repos = Array.from(found.values());
  repos.sort((a, b) => compareRef(a.requester, b.requester));

  return repos;
}
