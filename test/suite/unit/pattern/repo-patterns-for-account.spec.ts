import { expect, it } from "vitest";
import {
  createRepoPattern,
  repoPatternsForAccount,
} from "../../../../src/repo-pattern.js";

it("filters repo patterns by account", () => {
  const a = createRepoPattern("account-a/repo-a");
  const b = createRepoPattern("account-b/repo-b");
  const c = createRepoPattern("account-a/repo-c");

  expect(repoPatternsForAccount("account-a", [a, b, c])).toEqual([a, c]);
});
