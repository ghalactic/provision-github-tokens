import { repoRefToString, type RepoReference } from "./github-reference.js";
import type { Repo } from "./type/github-api.js";
import type { Visibility } from "./type/visibility.js";
import { isVisibility } from "./visibility.js";

export type RegisteredRepo = Repo & { visibility: Visibility };

export type RepoRegistry = {
  register: (repo: Repo) => void;
  find: (reference: RepoReference) => RegisteredRepo;
};

export function createRepoRegistry(): RepoRegistry {
  const repos = new Map<string, RegisteredRepo>();

  return {
    register: (repo) => {
      /* istanbul ignore next - GitHub always populates a known visibility - @preserve */
      if (!isVisibility(repo.visibility)) {
        throw new Error(
          "Invariant violation: " +
            `Repo ${repo.full_name} doesn't have a known visibility`,
        );
      }

      // The guard above narrows visibility; preserve object identity.
      repos.set(
        repo.full_name,
        Object.assign(repo, { visibility: repo.visibility }),
      );
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
