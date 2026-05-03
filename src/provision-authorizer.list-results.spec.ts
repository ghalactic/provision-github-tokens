import { expect, it } from "vitest";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
import { createTestProvisionRequestTarget } from "../test/provision-request.js";
import { createTestTokenAuthorizer } from "../test/token-authorizer.js";
import { createTestTokenRequestFactory } from "../test/token-request.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";
import type { ProvisionRequest } from "./provision-request.js";

it("can list all processed requests and their results", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            description: "<description>",
            secrets: ["SECRET_A"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: {
                  "account-a": {
                    actions: "allow",
                  },
                },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  const requestA: ProvisionRequest = {
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [createTestProvisionRequestTarget("actions")],
  };
  const requestB = structuredClone(requestA);

  const resultA = authorizer.authorizeSecret(requestA);
  const resultB = authorizer.authorizeSecret(requestB);

  expect(authorizer.listResults()).toStrictEqual([resultA, resultB]);
});
