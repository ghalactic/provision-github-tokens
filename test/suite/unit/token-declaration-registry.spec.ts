import { expect, it } from "vitest";
import { createTokenDeclarationRegistry } from "../../../src/token-declaration-registry.js";
import type { TokenDeclaration } from "../../../src/type/token-declaration.js";

it("finds local token declarations", () => {
  const declarationA: TokenDeclaration = {
    shared: false,
    repositories: ["owner-x/repo-x"],
    permissions: { metadata: "read" },
  };
  const declarationB: TokenDeclaration = {
    shared: false,
    repositories: ["owner-y/repo-y"],
    permissions: { contents: "write" },
  };

  const registry = createTokenDeclarationRegistry();
  registry.registerDeclaration("owner-a", "repo-a", "token-a", declarationA);
  registry.registerDeclaration("owner-b", "repo-b", "token-b", declarationB);

  expect(
    registry.findDeclarationForRequester(
      "owner-a",
      "repo-a",
      "owner-a/repo-a.token-a",
    ),
  ).toEqual([declarationA, true]);
  expect(
    registry.findDeclarationForRequester(
      "owner-b",
      "repo-b",
      "owner-b/repo-b.token-b",
    ),
  ).toEqual([declarationB, true]);
});

it("finds shared token declarations", () => {
  const declarationA: TokenDeclaration = {
    shared: true,
    repositories: ["owner-x/repo-x"],
    permissions: { metadata: "read" },
  };
  const declarationB: TokenDeclaration = {
    shared: true,
    repositories: ["owner-y/repo-y"],
    permissions: { contents: "write" },
  };

  const registry = createTokenDeclarationRegistry();
  registry.registerDeclaration("owner-a", "repo-a", "token-a", declarationA);
  registry.registerDeclaration("owner-b", "repo-b", "token-b", declarationB);

  expect(
    registry.findDeclarationForRequester(
      "owner-b",
      "repo-b",
      "owner-a/repo-a.token-a",
    ),
  ).toEqual([declarationA, true]);
  expect(
    registry.findDeclarationForRequester(
      "owner-a",
      "repo-a",
      "owner-b/repo-b.token-b",
    ),
  ).toEqual([declarationB, true]);
});

it("doesn't find unshared tokens in other repositories", () => {
  const declarationA: TokenDeclaration = {
    shared: false,
    repositories: ["owner-x/repo-x"],
    permissions: { metadata: "read" },
  };
  const declarationB: TokenDeclaration = {
    shared: false,
    repositories: ["owner-y/repo-y"],
    permissions: { contents: "write" },
  };

  const registry = createTokenDeclarationRegistry();
  registry.registerDeclaration("owner-a", "repo-a", "token-a", declarationA);
  registry.registerDeclaration("owner-b", "repo-b", "token-b", declarationB);

  expect(
    registry.findDeclarationForRequester(
      "owner-b",
      "repo-b",
      "owner-a/repo-a.token-a",
    ),
  ).toEqual([undefined, true]);
  expect(
    registry.findDeclarationForRequester(
      "owner-a",
      "repo-a",
      "owner-b/repo-b.token-b",
    ),
  ).toEqual([undefined, true]);
});

it("doesn't find unregistered tokens", () => {
  const registry = createTokenDeclarationRegistry();

  expect(
    registry.findDeclarationForRequester(
      "owner-a",
      "repo-a",
      "owner-a/repo-a.token-a",
    ),
  ).toEqual([undefined, false]);
});
