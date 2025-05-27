import { expect, it } from "vitest";
import { createTokenAuthorizer } from "../../../../src/token-authorizer.js";
import type { TokenRequest } from "../../../../src/token-request.js";

it("can list all processed results", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x", "account-x/repo-x"],
        permissions: { contents: "write", metadata: "read" },
      },
    ],
  });

  const requestA: TokenRequest = {
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: "all",
      permissions: { contents: "write", metadata: "read" },
    },
    repos: "all",
  };
  const requestB: TokenRequest = {
    consumer: { account: "account-x" },
    tokenDec: {
      shared: false,
      as: "role-a",
      account: "account-a",
      repos: "all",
      permissions: { metadata: "read", contents: "read" },
    },
    repos: "all",
  };

  const resultA = authorizer.authorizeToken(requestA);
  const resultB = authorizer.authorizeToken(requestB);

  expect(authorizer.listResults()).toStrictEqual([resultA, resultB]);
});
