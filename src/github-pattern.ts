import { createNamePattern } from "./name-pattern.js";
import type { Pattern } from "./pattern.js";

export function createGitHubPattern(pattern: string): Pattern {
  const [accountPart, repoPart] = splitGitHubPattern(pattern);
  const account = createNamePattern(accountPart);
  const repo = repoPart ? createNamePattern(repoPart) : undefined;

  return {
    test: (string) => {
      const parts = string.split("/");

      if (parts.length === 1) return repo ? false : account.test(parts[0]);
      if (parts.length !== 2 || !repo) return false;

      return account.test(parts[0]) && repo.test(parts[1]);
    },

    toString: () => pattern,
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
