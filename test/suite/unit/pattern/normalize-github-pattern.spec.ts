import { expect, it } from "vitest";
import { normalizeGitHubPattern } from "../../../../src/github-pattern.js";

it("doesn't allow empty patterns", () => {
  expect(() =>
    normalizeGitHubPattern({ account: "defining-account" }, ""),
  ).toThrow('GitHub pattern "" account part cannot be empty');
});

it("doesn't allow patterns with an empty account", () => {
  expect(() =>
    normalizeGitHubPattern({ account: "defining-account" }, "/repo"),
  ).toThrow('GitHub pattern "/repo" account part cannot be empty');
});

it("doesn't allow patterns with an empty repo", () => {
  expect(() =>
    normalizeGitHubPattern({ account: "defining-account" }, "account/"),
  ).toThrow('GitHub pattern "account/" repo part cannot be empty');
});

it("doesn't allow patterns with more than one slash", () => {
  expect(() =>
    normalizeGitHubPattern(
      { account: "defining-account" },
      "account/repo/extra",
    ),
  ).toThrow(
    'GitHub pattern "account/repo/extra" cannot have more than one slash',
  );
});

it("doesn't change account patterns with an account", () => {
  expect(
    normalizeGitHubPattern({ account: "defining-account" }, "account"),
  ).toBe("account");
});

it("doesn't change repo patterns with an account", () => {
  expect(
    normalizeGitHubPattern({ account: "defining-account" }, "account/repo"),
  ).toBe("account/repo");
});

it("adds the defining account to dot account patterns", () => {
  expect(normalizeGitHubPattern({ account: "defining-account" }, ".")).toBe(
    "defining-account",
  );
});

it("adds the defining account to repo patterns with a dot account", () => {
  expect(
    normalizeGitHubPattern({ account: "defining-account" }, "./repo"),
  ).toBe("defining-account/repo");
});
