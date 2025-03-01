import { expect, it } from "vitest";
import { createTokenDeclarationRegistry } from "../../../src/token-declaration-registry.js";
import type { TokenDeclaration } from "../../../src/type/token-declaration.js";

it("finds local token declarations", () => {
  const declarationA: TokenDeclaration = {
    shared: false,
    repos: ["account-x/repo-x"],
    permissions: { metadata: "read" },
  };
  const declarationB: TokenDeclaration = {
    shared: false,
    repos: ["account-y/repo-y"],
    permissions: { contents: "write" },
  };

  const declarationRegistry = createTokenDeclarationRegistry();
  declarationRegistry.registerDeclaration(
    "account-a",
    "repo-a",
    "token-a",
    declarationA,
  );
  declarationRegistry.registerDeclaration(
    "account-b",
    "repo-b",
    "token-b",
    declarationB,
  );

  expect(
    declarationRegistry.findDeclarationForRequester(
      "account-a",
      "repo-a",
      "account-a/repo-a.token-a",
    ),
  ).toEqual([declarationA, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      "account-b",
      "repo-b",
      "account-b/repo-b.token-b",
    ),
  ).toEqual([declarationB, true]);
});

it("finds shared token declarations", () => {
  const declarationA: TokenDeclaration = {
    shared: true,
    repos: ["account-x/repo-x"],
    permissions: { metadata: "read" },
  };
  const declarationB: TokenDeclaration = {
    shared: true,
    repos: ["account-y/repo-y"],
    permissions: { contents: "write" },
  };

  const declarationRegistry = createTokenDeclarationRegistry();
  declarationRegistry.registerDeclaration(
    "account-a",
    "repo-a",
    "token-a",
    declarationA,
  );
  declarationRegistry.registerDeclaration(
    "account-b",
    "repo-b",
    "token-b",
    declarationB,
  );

  expect(
    declarationRegistry.findDeclarationForRequester(
      "account-b",
      "repo-b",
      "account-a/repo-a.token-a",
    ),
  ).toEqual([declarationA, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      "account-a",
      "repo-a",
      "account-b/repo-b.token-b",
    ),
  ).toEqual([declarationB, true]);
});

it("doesn't find unshared tokens in other repos", () => {
  const declarationA: TokenDeclaration = {
    shared: false,
    repos: ["account-x/repo-x"],
    permissions: { metadata: "read" },
  };
  const declarationB: TokenDeclaration = {
    shared: false,
    repos: ["account-y/repo-y"],
    permissions: { contents: "write" },
  };

  const declarationRegistry = createTokenDeclarationRegistry();
  declarationRegistry.registerDeclaration(
    "account-a",
    "repo-a",
    "token-a",
    declarationA,
  );
  declarationRegistry.registerDeclaration(
    "account-b",
    "repo-b",
    "token-b",
    declarationB,
  );

  expect(
    declarationRegistry.findDeclarationForRequester(
      "account-b",
      "repo-b",
      "account-a/repo-a.token-a",
    ),
  ).toEqual([undefined, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      "account-a",
      "repo-a",
      "account-b/repo-b.token-b",
    ),
  ).toEqual([undefined, true]);
});

it("doesn't find unregistered tokens", () => {
  const declarationRegistry = createTokenDeclarationRegistry();

  expect(
    declarationRegistry.findDeclarationForRequester(
      "account-a",
      "repo-a",
      "account-a/repo-a.token-a",
    ),
  ).toEqual([undefined, false]);
});
