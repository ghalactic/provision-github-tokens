import { expect, it } from "vitest";
import {
  createGitHubPattern,
  gitHubPatternsForAccount,
} from "../../../../src/github-pattern.js";

it("filters GitHub patterns by account", () => {
  const a = createGitHubPattern("account-a");
  const b = createGitHubPattern("account-b");
  const c = createGitHubPattern("account-a/repo-c");
  const d = createGitHubPattern("account-b/repo-d");
  const e = createGitHubPattern("account-a/repo-e");

  expect(gitHubPatternsForAccount("account-a", [a, b, c, d, e])).toEqual([
    a,
    c,
    e,
  ]);
});
