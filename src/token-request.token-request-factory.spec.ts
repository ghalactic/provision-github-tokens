import { expect, it, vi } from "vitest";
import { createTestAppRegistry } from "../test/app-registry.js";
import { createTestTokenDec } from "../test/declaration.js";
import {
  createTestApps,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import type {
  AccountReference,
  EnvironmentReference,
  RepoReference,
} from "./github-reference.js";
import { createTokenRequestFactory } from "./token-request.js";

vi.mock("@octokit/action");

it("creates token requests from provision targets with token declarations for all repos", () => {
  const appRegistry = createTestAppRegistry();
  const createTokenRequest = createTokenRequestFactory(appRegistry);
  const tokenDec = createTestTokenDec({ repos: "all" });

  expect(createTokenRequest(tokenDec, { account: "account-y" })).toStrictEqual({
    consumer: { account: "account-y" },
    tokenDec,
    repos: "all",
  });
  expect(
    createTokenRequest(tokenDec, { account: "account-z", repo: "repo-z" }),
  ).toStrictEqual({
    consumer: { account: "account-z", repo: "repo-z" },
    tokenDec,
    repos: "all",
  });
});

it("creates token requests from provision targets with token declarations for selected repos", () => {
  const [[accountA, [repoA1, repoA2, repoB, repoC]]] =
    createTestInstallationAccounts([
      "Organization",
      100,
      "account-a",
      ["repo-a-1", "repo-a-2", "repo-b", "repo-c"],
    ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA1, repoA2, repoB, repoC]]],
  });

  const createTokenRequest = createTokenRequestFactory(appRegistry);
  const tokenDec = createTestTokenDec({ repos: ["repo-a-*", "repo-b"] });

  expect(createTokenRequest(tokenDec, { account: "account-y" })).toStrictEqual({
    consumer: { account: "account-y" },
    tokenDec,
    repos: ["repo-a-1", "repo-a-2", "repo-b"],
  });
  expect(
    createTokenRequest(tokenDec, { account: "account-z", repo: "repo-z" }),
  ).toStrictEqual({
    consumer: { account: "account-z", repo: "repo-z" },
    tokenDec,
    repos: ["repo-a-1", "repo-a-2", "repo-b"],
  });
});

it("creates normalized token requests", () => {
  const [[accountA, [repoA1, repoA2, repoB, repoC]]] =
    createTestInstallationAccounts([
      "Organization",
      100,
      "account-a",
      ["repo-a-1", "repo-a-2", "repo-b", "repo-c"],
    ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoC, repoB, repoA2, repoA1]]],
  });

  const createTokenRequest = createTokenRequestFactory(appRegistry);
  const tokenDec = createTestTokenDec({ repos: ["repo-b", "repo-a-*"] });
  const expectedTokenDec = createTestTokenDec({
    repos: ["repo-a-*", "repo-b"],
  });

  const accountY: AccountReference = { account: "account-y" };
  const repoY: RepoReference = { account: "account-y", repo: "repo-y" };
  const envY: EnvironmentReference = {
    account: "account-y",
    repo: "repo-y",
    environment: "env-y",
  };

  expect(createTokenRequest(tokenDec, accountY)).toStrictEqual({
    consumer: accountY,
    tokenDec: expectedTokenDec,
    repos: ["repo-a-1", "repo-a-2", "repo-b"],
  });
  expect(createTokenRequest(tokenDec, repoY)).toStrictEqual({
    consumer: repoY,
    tokenDec: expectedTokenDec,
    repos: ["repo-a-1", "repo-a-2", "repo-b"],
  });
  expect(createTokenRequest(tokenDec, envY)).toStrictEqual({
    consumer: repoY,
    tokenDec: expectedTokenDec,
    repos: ["repo-a-1", "repo-a-2", "repo-b"],
  });
});

it("de-duplicates equivalent token requests", () => {
  const appRegistry = createTestAppRegistry();
  const createTokenRequest = createTokenRequestFactory(appRegistry);
  const tokenDec = createTestTokenDec({ repos: "all" });

  const accountY: AccountReference = { account: "account-y" };
  const repoY: RepoReference = { account: "account-y", repo: "repo-y" };
  const repoZ: RepoReference = { account: "account-z", repo: "repo-z" };
  const envZ: EnvironmentReference = {
    account: "account-z",
    repo: "repo-z",
    environment: "env-z",
  };

  const requestA = createTokenRequest(
    structuredClone(tokenDec),
    structuredClone(accountY),
  );
  const requestB = createTokenRequest(
    structuredClone(tokenDec),
    structuredClone(repoZ),
  );
  const requestC = createTokenRequest(
    structuredClone(tokenDec),
    structuredClone(repoZ),
  );
  const requestD = createTokenRequest(
    structuredClone(tokenDec),
    structuredClone(envZ),
  );
  const requestE = createTokenRequest(
    structuredClone(tokenDec),
    structuredClone(repoY),
  );
  const requestF = createTokenRequest(
    structuredClone(tokenDec),
    structuredClone(accountY),
  );

  expect(requestC).toBe(requestB);
  expect(requestD).toBe(requestB);
  expect(requestE).not.toBe(requestA);
  expect(requestE).not.toBe(requestB);
  expect(requestF).toBe(requestA);
});
