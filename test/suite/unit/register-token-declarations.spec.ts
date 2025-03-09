import { expect, it } from "vitest";
import type { DiscoveredConsumer } from "../../../src/discover-consumers.js";
import { registerTokenDeclarations } from "../../../src/register-token-declarations.js";
import { createTokenDeclarationRegistry } from "../../../src/token-declaration-registry.js";
import type { TokenDeclaration } from "../../../src/type/token-declaration.js";

it("registers token declarations from discovered consumers", async () => {
  const declarationA: TokenDeclaration = {
    shared: false,
    as: undefined,
    account: "account-x",
    repos: "all",
    permissions: { metadata: "read" },
  };
  const declarationB: TokenDeclaration = {
    shared: true,
    as: "role-a",
    account: "account-y",
    repos: ["repo-y", "repo-z"],
    permissions: { contents: "write", repository_projects: "admin" },
  };
  const declarationC: TokenDeclaration = {
    shared: true,
    as: "role-b",
    account: "account-z",
    repos: ["repo-a"],
    permissions: { metadata: "read", contents: "read" },
  };

  const declarationRegistry = createTokenDeclarationRegistry();
  const consumers = new Map<string, DiscoveredConsumer>([
    [
      "account-a/repo-a",
      {
        consumer: { account: "account-a", repo: "repo-a" },
        config: {
          $schema:
            "https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json",
          tokens: { tokenA: declarationA, tokenB: declarationB },
          provision: { secrets: {} },
        },
      },
    ],
    [
      "account-b/repo-b",
      {
        consumer: { account: "account-b", repo: "repo-b" },
        config: {
          $schema:
            "https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json",
          tokens: { tokenC: declarationC },
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  registerTokenDeclarations(declarationRegistry, consumers);

  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-a", repo: "repo-a" },
      "account-a/repo-a.tokenA",
    ),
  ).toEqual([declarationA, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-other", repo: "repo-other" },
      "account-a/repo-a.tokenA",
    ),
  ).toEqual([undefined, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-a", repo: "repo-a" },
      "account-a/repo-a.tokenB",
    ),
  ).toEqual([declarationB, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-other", repo: "repo-other" },
      "account-a/repo-a.tokenB",
    ),
  ).toEqual([declarationB, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-b", repo: "repo-b" },
      "account-b/repo-b.tokenC",
    ),
  ).toEqual([declarationC, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-other", repo: "repo-other" },
      "account-b/repo-b.tokenC",
    ),
  ).toEqual([declarationC, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      { account: "account-a", repo: "repo-a" },
      "account-other/repo-other.tokenX",
    ),
  ).toEqual([undefined, false]);
});
