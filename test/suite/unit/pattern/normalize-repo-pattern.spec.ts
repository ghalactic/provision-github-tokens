import { expect, it } from "vitest";
import { normalizeRepoPattern } from "../../../../src/repo-pattern.js";

it("doesn't change repo patterns with an owner", () => {
  expect(normalizeRepoPattern("defining-owner", "owner/repo")).toBe(
    "owner/repo",
  );
});

it("adds the defining owner to repo patterns without an owner", () => {
  expect(normalizeRepoPattern("defining-owner", "repo")).toBe(
    "defining-owner/repo",
  );
});
