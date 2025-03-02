import { expect, it } from "vitest";
import type { DiscoveredConsumer } from "../../../src/discover-consumers.js";
import { registerTokenDeclarations } from "../../../src/register-token-declarations.js";
import { createTokenDeclarationRegistry } from "../../../src/token-declaration-registry.js";
import type { TokenDeclaration } from "../../../src/type/token-declaration.js";

it("registers token declarations from discovered consumers", async () => {
  const declarationA: TokenDeclaration = {
    shared: false,
    as: undefined,
    account: "org-x",
    repos: "all",
    permissions: { metadata: "read" },
  };
  const declarationB: TokenDeclaration = {
    shared: true,
    as: "role-a",
    account: "org-y",
    repos: ["repo-y", "repo-z"],
    permissions: { contents: "write", repository_projects: "admin" },
  };
  const declarationC: TokenDeclaration = {
    shared: true,
    as: "role-b",
    account: "org-z",
    repos: ["repo-a"],
    permissions: { metadata: "read", contents: "read" },
  };

  const declarationRegistry = createTokenDeclarationRegistry();
  const consumers = new Map<string, DiscoveredConsumer>([
    [
      "org-a/repo-a",
      {
        account: "org-a",
        repo: "repo-a",
        config: {
          $schema:
            "https://ghalactic.github.io/provision-github-tokens/schema/consumer.v1.schema.json",
          tokens: { tokenA: declarationA, tokenB: declarationB },
          provision: { secrets: {} },
        },
      },
    ],
    [
      "org-b/repo-b",
      {
        account: "org-b",
        repo: "repo-b",
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
      "org-a",
      "repo-a",
      "org-a/repo-a.tokenA",
    ),
  ).toEqual([declarationA, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      "org-other",
      "repo-other",
      "org-a/repo-a.tokenA",
    ),
  ).toEqual([undefined, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      "org-a",
      "repo-a",
      "org-a/repo-a.tokenB",
    ),
  ).toEqual([declarationB, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      "org-other",
      "repo-other",
      "org-a/repo-a.tokenB",
    ),
  ).toEqual([declarationB, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      "org-b",
      "repo-b",
      "org-b/repo-b.tokenC",
    ),
  ).toEqual([declarationC, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      "org-other",
      "repo-other",
      "org-b/repo-b.tokenC",
    ),
  ).toEqual([declarationC, true]);
  expect(
    declarationRegistry.findDeclarationForRequester(
      "org-a",
      "repo-a",
      "org-other/repo-other.tokenX",
    ),
  ).toEqual([undefined, false]);
});
