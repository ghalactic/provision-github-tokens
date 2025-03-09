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
  expect(() => createEnvRef("", "repo-a", "env-a")).toThrow(
    'Invalid account name ""',
  );
});

it("throws for invalid repo names", () => {
  expect(() => createEnvRef("account-a", "repo/a", "env-a")).toThrow(
    'Invalid repo name "repo/a"',
  );
  expect(() => createEnvRef("account-a", "", "env-a")).toThrow(
    'Invalid repo name ""',
  );
});

it("throws for invalid environment names", () => {
  expect(() => createEnvRef("account-a", "repo-a", "")).toThrow(
    'Invalid environment name ""',
  );
});
