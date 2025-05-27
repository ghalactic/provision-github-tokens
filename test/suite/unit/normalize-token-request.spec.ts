import { expect, it } from "vitest";
import type { EnvironmentReference } from "../../../src/github-reference.js";
import {
  normalizeTokenRequest,
  type TokenRequest,
} from "../../../src/token-request.js";

it("does nothing for already-normalized requests", () => {
  const request: TokenRequest = {
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: "all",
      permissions: { metadata: "read", contents: "write" },
    },
    repos: "all",
  };

  expect(normalizeTokenRequest(request)).toStrictEqual(request);
});

it("sorts repos in selected-repos requests", () => {
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
  ).toMatchObject({ repos: ["repo-a", "repo-b"] });
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
  ).toMatchObject({ repos: "all" });
});

it("supports account consumer requests", () => {
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
  ).toMatchObject({ consumer: { account: "account-x" } });
});

it("supports repo consumer requests", () => {
  expect(
    normalizeTokenRequest({
      consumer: { account: "account-x", repo: "repo-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { metadata: "read", contents: "write" },
      },
      repos: "all",
    }),
  ).toMatchObject({ consumer: { account: "account-x", repo: "repo-x" } });
});

it("strips environments from environment consumer requests", () => {
  const consumer: EnvironmentReference = {
    account: "account-x",
    repo: "repo-x",
    environment: "env-x",
  };

  const actual = normalizeTokenRequest({
    consumer,
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: "all",
      permissions: { metadata: "read", contents: "write" },
    },
    repos: "all",
  });

  expect(actual.consumer).toStrictEqual({
    account: "account-x",
    repo: "repo-x",
  });
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
  ).toMatchObject({
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: ["repo-a", "repo-b"],
      permissions: { metadata: "read", contents: "write" },
    },
  });
});
