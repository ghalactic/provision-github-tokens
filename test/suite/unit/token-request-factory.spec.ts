import { expect, it } from "vitest";
import {
  createTokenRequestFactory,
  type TokenRequest,
} from "../../../src/token-request.js";

it("creates token requests", () => {
  const createTokenRequest = createTokenRequestFactory();
  const params = {
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: ["repo-a", "repo-b"],
      permissions: { metadata: "read", contents: "write" },
    },
    repos: ["repo-a", "repo-b"],
  } satisfies TokenRequest;

  expect(createTokenRequest(params)).toStrictEqual(params);
});

it("creates normalized token requests", () => {
  const createTokenRequest = createTokenRequestFactory();
  const params = {
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: ["repo-b", "repo-a"],
      permissions: { metadata: "read", contents: "write" },
    },
    repos: ["repo-b", "repo-a"],
  } satisfies TokenRequest;

  expect(createTokenRequest(params)).toStrictEqual({
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

it("returns the same request for equivalent parameters", () => {
  const createTokenRequest = createTokenRequestFactory();
  const paramsA = {
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: ["repo-a", "repo-b"],
      permissions: { metadata: "read", contents: "write" },
    },
    repos: ["repo-a", "repo-b"],
  } satisfies TokenRequest;
  const paramsB = {
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: ["repo-b", "repo-a"],
      permissions: { metadata: "read", contents: "write" },
    },
    repos: ["repo-b", "repo-a"],
  } satisfies TokenRequest;

  expect(createTokenRequest(paramsA)).toBe(createTokenRequest(paramsB));
});
