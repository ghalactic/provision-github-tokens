import { expect, it } from "vitest";
import { createProvisionAuthorizer } from "../../../../src/provision-authorizer.js";
import type { ProvisionRequest } from "../../../../src/provision-request.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../../../declaration.js";

it("can list all processed requests and their results", () => {
  const authorizer = createProvisionAuthorizer({
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
  });

  const requestA: ProvisionRequest = {
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  };
  const requestB = structuredClone(requestA);

  const resultA = authorizer.authorizeSecret(requestA);
  const resultB = authorizer.authorizeSecret(requestB);

  expect(authorizer.listResults()).toStrictEqual([resultA, resultB]);
});
