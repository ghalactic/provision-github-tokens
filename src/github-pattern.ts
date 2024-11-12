import { createNamePattern } from "./name-pattern.js";
import type { Pattern } from "./pattern.js";

export type GitHubPattern = Pattern & {
  readonly account: Pattern;
  readonly repo: Pattern | undefined;
  isAllForAccount: (forAccount: string) => boolean;
};

export function createGitHubPattern(pattern: string): GitHubPattern {
  const [accountPart, repoPart] = splitGitHubPattern(pattern);
  const account = createNamePattern(accountPart);
  const repo = repoPart ? createNamePattern(repoPart) : undefined;

  return {
    get isAll() {
      return repo ? account.isAll && repo.isAll : false;
    },

    get account() {
      return account;
    },

    get repo() {
      return repo;
    },

    test: (string) => {
      const parts = string.split("/");

      if (parts.length === 1) return repo ? false : account.test(parts[0]);
      if (parts.length !== 2 || !repo) return false;

      return account.test(parts[0]) && repo.test(parts[1]);
    },

    toString: () => pattern,

    isAllForAccount: (forAccount: string) => {
      return repo ? account.test(forAccount) && repo.isAll : false;
    },
  };
}

export function normalizeGitHubPattern(
  definingAccount: string,
  pattern: string,
): string {
  const [accountPart, repoPart] = splitGitHubPattern(pattern);

  if (accountPart !== ".") return pattern;
  return repoPart == null ? definingAccount : `${definingAccount}/${repoPart}`;
}

export function gitHubPatternsForAccount(
  account: string,
  patterns: GitHubPattern[],
): GitHubPattern[] {
  const result: GitHubPattern[] = [];
  for (const pattern of patterns) {
    if (pattern.account.test(account)) result.push(pattern);
  }

  return result;
}

export function anyGitHubPatternIsAllRepos(patterns: GitHubPattern[]): boolean {
  for (const pattern of patterns) if (pattern.repo?.isAll) return true;
  return false;
}

function splitGitHubPattern(pattern: string): [string, string | undefined] {
  const parts = pattern.split("/");

  if (parts.length > 2) {
    throw new Error(
      `GitHub pattern ${JSON.stringify(pattern)} cannot have more than one slash`,
    );
  }

  const [accountPart, repoPart] = parts;

  if (!accountPart) {
    throw new Error(
      `GitHub pattern ${JSON.stringify(pattern)} account part cannot be empty`,
    );
  }
  if (repoPart === "") {
    throw new Error(
      `GitHub pattern ${JSON.stringify(pattern)} repo part cannot be empty`,
    );
  }

  return [accountPart, repoPart];
}
