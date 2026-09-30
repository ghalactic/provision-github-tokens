import { expect, it } from "vitest";
import { throws } from "../test/error.js";
import { createTestInstallationAccounts } from "../test/github-api.js";
import { createRepoRegistry } from "./repo-registry.js";

it("finds repos by reference", () => {
  const [[accountA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a", "repo-b"],
  ]);
  const [[, [repoC]]] = createTestInstallationAccounts([
    "User",
    200,
    "account-b",
    ["repo-c"],
  ]);
  const withVisibility = { ...repoA, visibility: "private" };
  const withInternalVisibility = { ...repoB, visibility: "internal" };
  const withPublicVisibility = { ...repoC, visibility: "public" };

  const repoRegistry = createRepoRegistry();
  repoRegistry.register(withVisibility);
  repoRegistry.register(withInternalVisibility);
  repoRegistry.register(withPublicVisibility);

  expect(repoRegistry.find({ account: accountA.login, repo: repoA.name })).toBe(
    withVisibility,
  );
  expect(repoRegistry.find({ account: accountA.login, repo: repoB.name })).toBe(
    withInternalVisibility,
  );
  expect(repoRegistry.find({ account: "account-b", repo: "repo-c" })).toBe(
    withPublicVisibility,
  );
});

it("throws for an unknown repo reference", () => {
  const repoRegistry = createRepoRegistry();

  expect(
    throws(() => repoRegistry.find({ account: "account-a", repo: "repo-a" })),
  ).toMatchInlineSnapshot(
    `"Invariant violation: Repo account-a/repo-a hasn't been registered"`,
  );
});

it("throws when registering a repo without a visibility", () => {
  const [[, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const repoRegistry = createRepoRegistry();

  expect(
    throws(() => {
      repoRegistry.register({ ...repoA, visibility: undefined });
    }),
  ).toMatchInlineSnapshot(
    `"Invariant violation: Repo account-a/repo-a doesn't have a visibility"`,
  );
});
