import { expect, it } from "vitest";
import {
  createRepoPattern,
  repoPatternsForOwner,
} from "../../../src/repo-pattern.js";

it("filters repo patterns by owner", () => {
  const a = createRepoPattern("owner-a/repo-a");
  const b = createRepoPattern("owner-b/repo-b");
  const c = createRepoPattern("owner-a/repo-c");

  expect(repoPatternsForOwner("owner-a", [a, b, c])).toEqual([a, c]);
});
