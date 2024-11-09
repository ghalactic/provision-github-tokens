import { expect, it } from "vitest";
import { normalizeRepoPattern } from "../../../../src/repo-pattern.js";
import { throws } from "../../../error.js";

it("doesn't allow patterns without a slash", () => {
  expect(
    throws(() => normalizeRepoPattern("defining-account", "a")),
  ).toMatchInlineSnapshot(`"Repo pattern "a" must contain exactly one slash"`);
});

it("doesn't change repo patterns with an account", () => {
  expect(normalizeRepoPattern("defining-account", "account/repo")).toBe(
    "account/repo",
  );
});

it("adds the defining account to repo patterns with a dot account", () => {
  expect(normalizeRepoPattern("defining-account", "./repo")).toBe(
    "defining-account/repo",
  );
});
