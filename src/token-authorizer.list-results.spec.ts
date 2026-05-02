import { expect, it } from "vitest";
import { createTestTokenDec } from "../test/declaration.js";
import { createTestTokenRequestFactory } from "../test/token-request.js";
import { createTokenAuthorizer } from "./token-authorizer.js";

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

  const createTokenRequest = createTestTokenRequestFactory();
  const requestA = createTokenRequest(
    createTestTokenDec({
      as: "role-a",
      account: "account-a",
      repos: "all",
      permissions: { contents: "write", metadata: "read" },
    }),
    { account: "account-x" },
  );
  const requestB = createTokenRequest(
    createTestTokenDec({
      as: "role-a",
      account: "account-a",
      repos: "all",
      permissions: { metadata: "read", contents: "read" },
    }),
    { account: "account-x" },
  );

  const resultA = authorizer.authorizeToken(requestA);
  const resultB = authorizer.authorizeToken(requestB);

  expect(authorizer.listResults()).toStrictEqual([resultA, resultB]);
});
