import { expect, it } from "vitest";
import {
  anyRepoPatternIsAllRepos,
  createRepoPattern,
} from "../../../../src/repo-pattern.js";

it("returns true if any repo pattern matches all repos in any account", () => {
  expect(
    anyRepoPatternIsAllRepos([
      createRepoPattern("account-a/repo-a"),
      createRepoPattern("account-b/*"),
    ]),
  ).toBe(true);
  expect(
    anyRepoPatternIsAllRepos([
      createRepoPattern("account-a/*"),
      createRepoPattern("account-b/repo-b"),
    ]),
  ).toBe(true);
  expect(
    anyRepoPatternIsAllRepos([
      createRepoPattern("account-a/repo-*"),
      createRepoPattern("account-b/repo-b"),
    ]),
  ).toBe(false);
});
