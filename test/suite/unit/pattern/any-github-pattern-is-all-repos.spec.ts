import { expect, it } from "vitest";
import {
  anyGitHubPatternIsAllRepos,
  createGitHubPattern,
} from "../../../../src/github-pattern.js";

it("returns true if any GitHub pattern matches all repos in any account", () => {
  expect(
    anyGitHubPatternIsAllRepos([
      createGitHubPattern("account-a/repo-a"),
      createGitHubPattern("account-b/*"),
    ]),
  ).toBe(true);
  expect(
    anyGitHubPatternIsAllRepos([
      createGitHubPattern("account-a/*"),
      createGitHubPattern("account-b/repo-b"),
    ]),
  ).toBe(true);
  expect(
    anyGitHubPatternIsAllRepos([
      createGitHubPattern("account-a"),
      createGitHubPattern("account-a/repo-*"),
      createGitHubPattern("account-b/repo-b"),
    ]),
  ).toBe(false);
});
