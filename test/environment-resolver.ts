import type { EnvironmentResolver } from "../src/environment-resolver.js";
import {
  repoRefToString,
  type RepoReference,
} from "../src/github-reference.js";
import { anyPatternMatches } from "../src/pattern.js";

export type TestEnvironmentResolver = EnvironmentResolver & {
  registerEnvironments: (repo: RepoReference, environments: string[]) => void;
};

export function createTestEnvironmentResolver(): TestEnvironmentResolver {
  const envsByRepo: Record<string, string[]> = {};

  return {
    registerEnvironments(repo, environments) {
      const repoName = repoRefToString(repo);

      envsByRepo[repoName] ??= [];
      envsByRepo[repoName].push(...environments);
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async resolveEnvironments(repo, patterns) {
      const repoName = repoRefToString(repo);
      const repoEnvs = envsByRepo[repoName] ?? [];

      return repoEnvs.filter((env) => anyPatternMatches(patterns, env));
    },
  };
}
