import { expect, it } from "vitest";
import {
  normalizeTokenRequest,
  type TokenRequest,
} from "../../../src/token-request.js";

it("sorts the repos", () => {
  expect(
    normalizeTokenRequest({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: ["repo-a", "repo-b"],
        permissions: { metadata: "read", contents: "write" },
      },
      repos: ["repo-b", "repo-a"],
    }),
  ).toStrictEqual({
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: ["repo-a", "repo-b"],
      permissions: { metadata: "read", contents: "write" },
    },
    repos: ["repo-a", "repo-b"],
  } satisfies TokenRequest);
});

it("supports all-repos requests", () => {
  expect(
    normalizeTokenRequest({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { metadata: "read", contents: "write" },
      },
      repos: "all",
    }),
  ).toStrictEqual({
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: "all",
      permissions: { metadata: "read", contents: "write" },
    },
    repos: "all",
  } satisfies TokenRequest);
});

it("normalizes the token declaration", () => {
  expect(
    normalizeTokenRequest({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: ["repo-b", "repo-a"],
        permissions: { metadata: "read", contents: "write" },
      },
      repos: "all",
    }),
  ).toStrictEqual({
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: ["repo-a", "repo-b"],
      permissions: { metadata: "read", contents: "write" },
    },
    repos: "all",
  } satisfies TokenRequest);
});
