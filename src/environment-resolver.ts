import { debug } from "@actions/core";
import type { AppRegistry } from "./app-registry.js";
import { repoRefToString, type RepoReference } from "./github-reference.js";
import type { OctokitFactory } from "./octokit.js";
import { anyPatternMatches, type Pattern } from "./pattern.js";
import type { Environment } from "./type/github-api.js";
import type { AppInput } from "./type/input.js";

export type EnvironmentResolver = {
  resolveEnvironments: (
    repo: RepoReference,
    patterns: Pattern[],
  ) => Promise<string[]>;
};

export function createEnvironmentResolver(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
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

    const [provisionerReg] = appRegistry.findProvisionersForRepo(repo);

    if (!provisionerReg) {
      throw new Error(`No provisioners found for repo ${repoName}`);
    }

    const { installation } = provisionerReg;
    const octokit = octokitFactory.installationOctokit(
      appsInput,
      installation.app_id,
      installation.id,
    );

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
