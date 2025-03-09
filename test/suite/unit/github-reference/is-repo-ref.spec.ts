import { expect, it } from "vitest";
import { isRepoRef } from "../../../../src/github-reference.js";

it("returns true for repo objects", () => {
  expect(isRepoRef({ account: "account-a", repo: "repo-a" })).toBe(true);
});

it("returns false for non-repo objects", () => {
  expect(isRepoRef({ account: "account-a" })).toBe(false);
  expect(isRepoRef({ account: "account-a", repo: undefined })).toBe(false);
});
