import { createNamePattern } from "./name-pattern.js";
import type { Pattern } from "./pattern.js";

export type RepoPattern = Pattern & {
  readonly owner: Pattern;
  readonly repo: Pattern;
};

export function createRepoPattern(pattern: string): RepoPattern {
  const [ownerPart, repoPart] = splitRepoPattern(pattern);
  const owner = createNamePattern(ownerPart);
  const repo = createNamePattern(repoPart);

  return {
    get isAll() {
      return owner.isAll && repo.isAll;
    },

    get owner() {
      return owner;
    },

    get repo() {
      return repo;
    },

    test: (string) => {
      const parts = string.split("/");

      return parts.length === 2
        ? owner.test(parts[0]) && repo.test(parts[1])
        : false;
    },

    toString: () => pattern,
  };
}

export function normalizeRepoPattern(
  definingOwner: string,
  pattern: string,
): string {
  const [ownerPart, repoPart] = splitRepoPattern(pattern);

  return ownerPart === "." ? `${definingOwner}/${repoPart}` : pattern;
}

export function repoPatternsForOwner(
  owner: string,
  patterns: RepoPattern[],
): RepoPattern[] {
  const result: RepoPattern[] = [];
  for (const pattern of patterns) {
    if (pattern.owner.test(owner)) result.push(pattern);
  }

  return result;
}

export function anyRepoPatternIsAllRepos(patterns: RepoPattern[]): boolean {
  for (const pattern of patterns) if (pattern.repo.isAll) return true;

  return false;
}

function splitRepoPattern(pattern: string): [string, string] {
  const parts = pattern.split("/");

  if (parts.length !== 2) {
    throw new Error(
      `Repo pattern ${JSON.stringify(pattern)} must contain exactly one slash`,
    );
  }

  const [ownerPart, repoPart] = parts;

  if (!ownerPart) {
    throw new Error(
      `Repo pattern ${JSON.stringify(pattern)} owner part cannot be empty`,
    );
  }
  if (!repoPart) {
    throw new Error(
      `Repo pattern ${JSON.stringify(pattern)} repo part cannot be empty`,
    );
  }

  return [ownerPart, repoPart];
}
