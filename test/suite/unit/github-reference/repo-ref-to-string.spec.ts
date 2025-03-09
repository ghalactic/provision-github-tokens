import { expect, it } from "vitest";
import { repoRefToString } from "../../../../src/github-reference.js";

it("returns a string representation of a repo ref", () => {
  expect(repoRefToString({ account: "account-a", repo: "repo-a" })).toBe(
    "account-a/repo-a",
  );
});
