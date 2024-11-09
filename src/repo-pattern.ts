import { createNamePattern } from "./name-pattern.js";
import type { Pattern } from "./pattern.js";

export type RepoPattern = Pattern & {
  readonly account: Pattern;
  readonly repo: Pattern;
};

export function createRepoPattern(pattern: string): RepoPattern {
  const [accountPart, repoPart] = splitRepoPattern(pattern);
  const account = createNamePattern(accountPart);
  const repo = createNamePattern(repoPart);

  return {
    get isAll() {
      return account.isAll && repo.isAll;
    },

    get account() {
      return account;
    },

    get repo() {
      return repo;
    },

    test: (string) => {
      const parts = string.split("/");

      return parts.length === 2
        ? account.test(parts[0]) && repo.test(parts[1])
        : false;
    },

    toString: () => pattern,
  };
}

export function normalizeRepoPattern(
  definingAccount: string,
  pattern: string,
): string {
  const [accountPart, repoPart] = splitRepoPattern(pattern);

  return accountPart === "." ? `${definingAccount}/${repoPart}` : pattern;
}

export function repoPatternsForAccount(
  account: string,
  patterns: RepoPattern[],
): RepoPattern[] {
  const result: RepoPattern[] = [];
  for (const pattern of patterns) {
    if (pattern.account.test(account)) result.push(pattern);
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

  const [accountPart, repoPart] = parts;

  if (!accountPart) {
    throw new Error(
      `Repo pattern ${JSON.stringify(pattern)} account part cannot be empty`,
    );
  }
  if (!repoPart) {
    throw new Error(
      `Repo pattern ${JSON.stringify(pattern)} repo part cannot be empty`,
    );
  }

  return [accountPart, repoPart];
}
