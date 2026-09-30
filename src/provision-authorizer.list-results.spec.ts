import { expect, it } from "vitest";
import { createTestProvisionRequest } from "../test/provision-request.js";
import { createTestTokenAuthorizer } from "../test/token-authorizer.js";
import { createTestTokenRequestFactory } from "../test/token-request.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";
import { createRepoRegistry } from "./repo-registry.js";

it("can list all processed requests and their results", () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const authorizer = createProvisionAuthorizer(
    createRepoRegistry(),
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
                account: { types: {} },
                accounts: {
                  "account-a": {
                    types: {
                      actions: "allow",
                    },
                  },
                },
                repo: { types: { environments: {} } },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  const requestA = createTestProvisionRequest({
    requester: { account: "account-x", repo: "repo-x" },
  });
  const requestB = structuredClone(requestA);

  const resultA = authorizer.authorizeSecret(requestA);
  const resultB = authorizer.authorizeSecret(requestB);

  expect(authorizer.listResults()).toStrictEqual([resultA, resultB]);
});
