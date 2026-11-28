import { debug, info, warning } from "@actions/core";
import { RequestError } from "@octokit/request-error";
import type { AppRegistry } from "./app-registry.js";
import { compareRef } from "./compare-ref.js";
import { parseRequesterConfig } from "./config/requester-config.js";
import { errorCause, errorMessage } from "./error.js";
import {
  createRepoRef,
  repoRefToString,
  type RepoReference,
} from "./github-reference.js";
import type { Octokit } from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { FindProvisionerOctokit } from "./provisioner-octokit.js";
import { tryEach } from "./try-each.js";
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
  findProvisionerOctokit: FindProvisionerOctokit,
  appRegistry: AppRegistry,
): Promise<DiscoveredRequester[]> {
  const discovered: DiscoveredRequester[] = [];
  let discoverCount = 0;

  for (const requester of requestersForDiscovery(appRegistry)) {
    const repoName = repoRefToString(requester);

    const result = await tryEach(
      async (candidate) => readRequester(candidate.octokit, requester),
      ({ candidate, error }) => {
        const { installation } = candidate.provisioner;

        debug(
          `Provisioner app ${installation.app_id} ` +
            `installation ${installation.id} couldn't discover requester ` +
            `${repoName}: ${errorMessage(error)}`,
        );
        warning(
          `Provisioner couldn't discover requester ${repoName}: ` +
            errorMessage(error),
        );

        return true;
      },
      findProvisionerOctokit(requester),
    );

    if (result.type === "FAILED") {
      const errors: unknown[] = [];
      for (const failure of result.failures) errors.push(failure.error);

      throw new AggregateError(
        errors,
        `No provisioner could discover requester ${repoName}`,
      );
    }

    if (!result.value) {
      debug(`Repo ${repoName} isn't a requester`);

      continue;
    }

    const { configSha, configYaml } = result.value;

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

type RequesterContents = {
  configSha: string;
  configYaml: string;
};

async function readRequester(
  octokit: Octokit,
  requester: RepoReference,
): Promise<RequesterContents | undefined> {
  const commits = await octokit.rest.repos.listCommits({
    owner: requester.account,
    repo: requester.repo,
    path: CONFIG_PATH,
    per_page: 1,
  });

  const head = commits.data[0];

  if (!head) return undefined;

  const configSha = head.sha;

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

    return { configSha, configYaml: res.data };
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) return undefined;

    throw error;
  }
}

function requestersForDiscovery(appRegistry: AppRegistry): RepoReference[] {
  const found = new Map<string, RepoReference>();

  for (const [, { repos }] of appRegistry.provisioners) {
    for (const repo of repos) {
      const requester = createRepoRef(repo.owner.login, repo.name);
      const repoName = repoRefToString(requester);

      if (!found.has(repoName)) found.set(repoName, requester);
    }
  }

  const requesters = Array.from(found.values());
  requesters.sort(compareRef);

  return requesters;
}
