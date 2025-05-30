import { debug } from "@actions/core";
import { repoRefToString, type RepoReference } from "./github-reference.js";
import { anyPatternMatches, type Pattern } from "./pattern.js";
import type { ProvisionerOctokitFinder } from "./provisioner-octokit.js";
import type { Environment } from "./type/github-api.js";

export type EnvironmentResolver = {
  resolveEnvironments: (
    repo: RepoReference,
    patterns: Pattern[],
  ) => Promise<string[]>;
};

export function createEnvironmentResolver(
  findProvisionerOctokit: ProvisionerOctokitFinder,
): EnvironmentResolver {
  const envsByRepo: Record<string, string[]> = {};

  return {
    async resolveEnvironments(repo, patterns) {
      const repoName = repoRefToString(repo);
      const resolved = (await repoEnvs(repo)).filter((env) =>
        anyPatternMatches(patterns, env),
      );

      const patternStrings = patterns.map((p) => p.toString());
      debug(
        `Environment patterns ${JSON.stringify(patternStrings)} ` +
          `for ${repoName} resolved to ${JSON.stringify(resolved)}`,
      );

      return resolved;
    },
  };

  async function repoEnvs(repo: RepoReference): Promise<string[]> {
    const repoName = repoRefToString(repo);

    if (envsByRepo[repoName]) return envsByRepo[repoName];

    const octokit = findProvisionerOctokit(repo);

    if (!octokit) {
      throw new Error(`No provisioners found for repo ${repoName}`);
    }

    const envPages = octokit.paginate.iterator(
      octokit.rest.repos.getAllEnvironments,
      { owner: repo.account, repo: repo.repo },
    );

    const names: string[] = [];

    for await (const { data: envs } of envPages) {
      for (const env of envs as Environment[]) names.push(env.name);
    }

    debug(`Repo ${repoName} has environments ${JSON.stringify(names)}`);

    return (envsByRepo[repoName] = names);
  }
}
