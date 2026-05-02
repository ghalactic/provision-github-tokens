import { expect, it } from "vitest";
import { createTestTokenDec } from "../test/declaration.js";
import { createTokenDeclarationRegistry } from "./token-declaration-registry.js";

it("finds local token declarations", () => {
  const declarationA = createTestTokenDec({
    account: "account-x",
    repos: ["repo-x"],
  });
  const declarationB = createTestTokenDec({
    account: "account-y",
    repos: ["repo-y"],
    permissions: { contents: "write" },
  });

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
  const declarationA = createTestTokenDec({
    shared: true,
    account: "account-x",
    repos: ["repo-x"],
  });
  const declarationB = createTestTokenDec({
    shared: true,
    account: "account-y",
    repos: ["repo-y"],
    permissions: { contents: "write" },
  });

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
  const declarationA = createTestTokenDec({
    account: "account-x",
    repos: ["repo-x"],
  });
  const declarationB = createTestTokenDec({
    account: "account-y",
    repos: ["repo-y"],
    permissions: { contents: "write" },
  });

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
