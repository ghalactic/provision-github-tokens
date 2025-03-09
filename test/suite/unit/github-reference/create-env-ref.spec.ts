import { expect, it } from "vitest";
import { createEnvRef } from "../../../../src/github-reference.js";

it("creates environment objects", () => {
  expect(createEnvRef("account-a", "repo-a", "env-a")).toEqual({
    account: "account-a",
    repo: "repo-a",
    environment: "env-a",
  });
});

it("throws for invalid account names", () => {
  expect(() => createEnvRef("account/a", "repo-a", "env-a")).toThrow(
    'Invalid account name "account/a"',
  );
});

it("throws for invalid repo names", () => {
  expect(() => createEnvRef("account-a", "repo/a", "env-a")).toThrow(
    'Invalid repo name "repo/a"',
  );
});

it("throws for invalid environment names", () => {
  expect(() =>
    // @ts-expect-error - Testing invalid environment name
    createEnvRef("account-a", "repo-a", null),
  ).toThrow("Invalid environment name null");
});
