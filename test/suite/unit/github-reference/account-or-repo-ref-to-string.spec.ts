import { expect, it } from "vitest";
import { accountOrRepoRefToString } from "../../../../src/github-reference.js";

it("returns a string representation of an account ref", () => {
  expect(accountOrRepoRefToString({ account: "account-a" })).toBe("account-a");
});

it("returns a string representation of a repo ref", () => {
  expect(
    accountOrRepoRefToString({ account: "account-a", repo: "repo-a" }),
  ).toBe("account-a/repo-a");
});
