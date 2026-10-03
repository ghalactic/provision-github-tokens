import { repoRefToString, type RepoReference } from "./github-reference.js";
import type { Repo } from "./type/github-api.js";
import { isVisibility } from "./visibility.js";

export type RepoRegistry = {
  register: (repo: Repo) => void;
  find: (reference: RepoReference) => Repo;
};

export function createRepoRegistry(): RepoRegistry {
  const repos = new Map<string, Repo>();

  return {
    register: (repo) => {
      /* istanbul ignore next - GitHub always populates a known visibility - @preserve */
      if (!isVisibility(repo.visibility)) {
        throw new Error(
          "Invariant violation: " +
            `Repo ${repo.full_name} doesn't have a known visibility`,
        );
      }

      repos.set(repo.full_name, repo);
    },

    find: (reference) => {
      const repo = repos.get(repoRefToString(reference));

      /* istanbul ignore next - prevented by discovery - @preserve */
      if (!repo) {
        throw new Error(
          "Invariant violation: " +
            `Repo ${repoRefToString(reference)} hasn't been registered`,
        );
      }

      return repo;
    },
  };
}
