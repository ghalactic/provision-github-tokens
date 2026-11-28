import { debug } from "@actions/core";
import { errorMessage } from "./error.js";
import { repoRefToString, type RepoReference } from "./github-reference.js";
import { anyPatternMatches, type Pattern } from "./pattern.js";
import type { FindProvisionerOctokit } from "./provisioner-octokit.js";
import { tryEach } from "./try-each.js";
import type { Environment } from "./type/github-api.js";

export type EnvironmentResolver = {
  resolveEnvironments: (
    repo: RepoReference,
    patterns: Pattern[],
  ) => Promise<string[]>;
};

export function createEnvironmentResolver(
  findProvisionerOctokit: FindProvisionerOctokit,
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

    const found = findProvisionerOctokit(repo);
    if (found.length < 1) {
      throw new Error(`No provisioners found for repo ${repoName}`);
    }

    const result = await tryEach(
      async (candidate) => {
        const envPages = candidate.octokit.paginate.iterator(
          candidate.octokit.rest.repos.getAllEnvironments,
          { owner: repo.account, repo: repo.repo },
        );

        const names: string[] = [];

        for await (const { data: envs } of envPages) {
          // Octokit normalizes list responses to arrays at runtime.
          // eslint-disable-next-line typescript/no-unsafe-type-assertion
          for (const env of envs as Environment[]) names.push(env.name);
        }

        return names;
      },
      () => true,
      found,
    );

    for (const { candidate, error } of result.failures) {
      const { installation } = candidate.provisioner;
      debug(
        `Provisioner app ${installation.app_id} ` +
          `installation ${installation.id} couldn't list environments ` +
          `for ${repoName}: ${errorMessage(error)}`,
      );
    }

    if (result.type === "FAILED") {
      const errors: unknown[] = [];
      for (const failure of result.failures) errors.push(failure.error);

      throw new AggregateError(
        errors,
        `No provisioner could list environments for repo ${repoName}`,
      );
    }

    debug(`Repo ${repoName} has environments ${JSON.stringify(result.value)}`);

    return (envsByRepo[repoName] = result.value);
  }
}
