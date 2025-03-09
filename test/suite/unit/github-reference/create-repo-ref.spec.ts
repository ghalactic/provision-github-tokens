import { expect, it } from "vitest";
import { createRepoRef } from "../../../../src/github-reference.js";

it("creates repo objects", () => {
  expect(createRepoRef("account-a", "repo-a")).toEqual({
    account: "account-a",
    repo: "repo-a",
  });
});

it("throws for invalid account names", () => {
  expect(() => createRepoRef("account/a", "repo-a")).toThrow(
    'Invalid account name "account/a"',
  );
});

it("throws for invalid repo names", () => {
  expect(() => createRepoRef("account-a", "repo/a")).toThrow(
    'Invalid repo name "repo/a"',
  );
});
