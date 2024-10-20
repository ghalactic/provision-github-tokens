import { expect, it } from "vitest";
import {
  anyRepoPatternIsAllRepos,
  createRepoPattern,
} from "../../../../src/repo-pattern.js";

it("returns true if any repo pattern matches all repos in any owner", () => {
  expect(
    anyRepoPatternIsAllRepos([
      createRepoPattern("owner-a/repo-a"),
      createRepoPattern("owner-b/*"),
    ]),
  ).toBe(true);
  expect(
    anyRepoPatternIsAllRepos([
      createRepoPattern("owner-a/*"),
      createRepoPattern("owner-b/repo-b"),
    ]),
  ).toBe(true);
  expect(
    anyRepoPatternIsAllRepos([
      createRepoPattern("owner-a/repo-*"),
      createRepoPattern("owner-b/repo-b"),
    ]),
  ).toBe(false);
});
