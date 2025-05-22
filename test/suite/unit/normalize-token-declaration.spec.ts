import { expect, it } from "vitest";
import {
  normalizeTokenDeclaration,
  type TokenDeclaration,
} from "../../../src/token-declaration.js";

it("sorts the repo patterns", () => {
  expect(
    normalizeTokenDeclaration({
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: ["repo-b", "repo-a"],
      permissions: { contents: "write" },
    }),
  ).toStrictEqual({
    shared: false,
    as: "role-a",
    account: "account-a",
    repos: ["repo-a", "repo-b"],
    permissions: { contents: "write" },
  } satisfies TokenDeclaration);
});

it("supports all-repos declarations", () => {
  expect(
    normalizeTokenDeclaration({
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: "all",
      permissions: { contents: "write" },
    }),
  ).toStrictEqual({
    shared: false,
    as: "role-a",
    account: "account-a",
    repos: "all",
    permissions: { contents: "write" },
  } satisfies TokenDeclaration);
});
