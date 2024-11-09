import { expect, it } from "vitest";
import { normalizeRepoPattern } from "../../../../src/repo-pattern.js";
import { throws } from "../../../error.js";

it("doesn't allow patterns without a slash", () => {
  expect(
    throws(() => normalizeRepoPattern("defining-owner", "a")),
  ).toMatchInlineSnapshot(`"Repo pattern "a" must contain exactly one slash"`);
});

it("doesn't change repo patterns with an owner", () => {
  expect(normalizeRepoPattern("defining-owner", "owner/repo")).toBe(
    "owner/repo",
  );
});

it("adds the defining owner to repo patterns with a dot owner", () => {
  expect(normalizeRepoPattern("defining-owner", "./repo")).toBe(
    "defining-owner/repo",
  );
});
