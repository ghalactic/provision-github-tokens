import { expect, it } from "vitest";
import { createTokenDeclarationRegistry } from "../../../src/token-declaration-registry.js";
import type { TokenDeclaration } from "../../../src/token-declaration.js";

it("finds local token declarations", () => {
  const declarationA: TokenDeclaration = {
    shared: false,
    as: undefined,
    account: "account-x",
    repos: ["repo-x"],
    permissions: { metadata: "read" },
  };
  const declarationB: TokenDeclaration = {
    shared: false,
    as: undefined,
    account: "account-y",
    repos: ["repo-y"],
    permissions: { contents: "write" },
  };

  const declarationRegistry = createTokenDeclarationRegistry();
  declarationRegistry.registerDeclaration(
    { account: "account-a", repo: "repo-a" },
    "tokenA",
    declarationA,
  );
  declarationRegistry.registerDeclaration(
    { account: "account-b", repo: "repo-b" },
    "tokenB",
    declarationB,
  );

  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-a", repo: "repo-a" },
      "account-a/repo-a.tokenA",
    ),
  ).toEqual([declarationA, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-b", repo: "repo-b" },
      "account-b/repo-b.tokenB",
    ),
  ).toEqual([declarationB, true]);
});

it("finds shared token declarations", () => {
  const declarationA: TokenDeclaration = {
    shared: true,
    as: undefined,
    account: "account-x",
    repos: ["repo-x"],
    permissions: { metadata: "read" },
  };
  const declarationB: TokenDeclaration = {
    shared: true,
    as: undefined,
    account: "account-y",
    repos: ["repo-y"],
    permissions: { contents: "write" },
  };

  const declarationRegistry = createTokenDeclarationRegistry();
  declarationRegistry.registerDeclaration(
    { account: "account-a", repo: "repo-a" },
    "tokenA",
    declarationA,
  );
  declarationRegistry.registerDeclaration(
    { account: "account-b", repo: "repo-b" },
    "tokenB",
    declarationB,
  );

  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-b", repo: "repo-b" },
      "account-a/repo-a.tokenA",
    ),
  ).toEqual([declarationA, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-a", repo: "repo-a" },
      "account-b/repo-b.tokenB",
    ),
  ).toEqual([declarationB, true]);
});

it("doesn't find unshared tokens in other repos", () => {
  const declarationA: TokenDeclaration = {
    shared: false,
    as: undefined,
    account: "account-x",
    repos: ["repo-x"],
    permissions: { metadata: "read" },
  };
  const declarationB: TokenDeclaration = {
    shared: false,
    as: undefined,
    account: "account-y",
    repos: ["repo-y"],
    permissions: { contents: "write" },
  };

  const declarationRegistry = createTokenDeclarationRegistry();
  declarationRegistry.registerDeclaration(
    { account: "account-a", repo: "repo-a" },
    "tokenA",
    declarationA,
  );
  declarationRegistry.registerDeclaration(
    { account: "account-b", repo: "repo-b" },
    "tokenB",
    declarationB,
  );

  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-b", repo: "repo-b" },
      "account-a/repo-a.tokenA",
    ),
  ).toEqual([undefined, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-a", repo: "repo-a" },
      "account-b/repo-b.tokenB",
    ),
  ).toEqual([undefined, true]);
});

it("doesn't find unregistered tokens", () => {
  const declarationRegistry = createTokenDeclarationRegistry();

  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-a", repo: "repo-a" },
      "account-a/repo-a.tokenA",
    ),
  ).toEqual([undefined, false]);
});
