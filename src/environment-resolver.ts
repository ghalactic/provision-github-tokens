import { debug } from "@actions/core";
import type { AppRegistry } from "./app-registry.js";
import type { OctokitFactory } from "./octokit.js";
import { anyPatternMatches, type Pattern } from "./pattern.js";
import type { Environment } from "./type/github-api.js";
import type { AppInput } from "./type/input.js";

export type EnvironmentResolver = {
  resolveEnvironments: (repo: string, patterns: Pattern[]) => Promise<string[]>;
};

export function createEnvironmentResolver(
  octokitFactory: OctokitFactory,
  appRegistry: AppRegistry,
  appsInput: AppInput[],
): EnvironmentResolver {
  const envsByRepo: Record<string, string[]> = {};

  return {
    async resolveEnvironments(repo, patterns) {
      const resolved = (await repoEnvs(repo)).filter((env) =>
        anyPatternMatches(patterns, env),
      );

      const patternStrings = patterns.map((p) => p.toString());
      debug(
        `Environment patterns ${JSON.stringify(patternStrings)} ` +
          `for ${repo} resolved to ${JSON.stringify(resolved)}`,
      );

      return resolved;
    },
  };

  async function repoEnvs(fullRepo: string): Promise<string[]> {
    if (envsByRepo[fullRepo]) return envsByRepo[fullRepo];

    const [provisionerReg] = appRegistry.findProvisionersForRepo(fullRepo);

    if (!provisionerReg) {
      throw new Error(`No provisioners found for repo ${fullRepo}`);
    }

    const { installation } = provisionerReg;
    const octokit = octokitFactory.installationOctokit(
      appsInput,
      installation.app_id,
      installation.id,
    );

    const [account, repo] = fullRepo.split("/");
    const envPages = octokit.paginate.iterator(
      octokit.rest.repos.getAllEnvironments,
      { owner: account, repo },
    );

    const names: string[] = [];

    for await (const { data: envs } of envPages) {
      for (const env of envs as Environment[]) names.push(env.name);
    }

    debug(`Repo ${fullRepo} has environments ${JSON.stringify(names)}`);

    return (envsByRepo[fullRepo] = names);
  }
}
