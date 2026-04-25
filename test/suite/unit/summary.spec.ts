import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compareProvisionRequest } from "../../../src/compare-provision-request.js";
import { compareTokenRequest } from "../../../src/compare-token-request.js";
import { createProvisionAuthorizer } from "../../../src/provision-authorizer.js";
import { renderSummary } from "../../../src/summary.js";
import { createTestSecretDec, createTestTokenDec } from "../../declaration.js";
import { createTestTokenAuthorizer } from "../../token-authorizer.js";
import { createTestTokenRequestFactory } from "../../token-request.js";

const fixturesPath = join(import.meta.dirname, "../../fixture/summary");

describe("renderSummary", () => {
  it("renders a summary with all secrets provisioned", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_*"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
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
    });
    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_B",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    await expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot(join(fixturesPath, "all-provisioned/expected.md"));
  });

  it("renders a summary with some secrets denied", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
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
    });
    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_B",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    await expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot(join(fixturesPath, "some-denied/expected.md"));
  });

  it("renders a summary with all secrets denied", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      { rules: { secrets: [] } },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({ permissions: { contents: "admin" } }),
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
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    await expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot(join(fixturesPath, "all-denied/expected.md"));
  });

  it("renders a summary with no secrets requested", async () => {
    await expect(
      renderSummary({ provisionResults: [], tokenResults: [] }, "pgt-test"),
    ).toMatchFileSnapshot(join(fixturesPath, "empty/expected.md"));
  });

  it("renders a summary with a single secret", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
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
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    await expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot(join(fixturesPath, "single-secret/expected.md"));
  });

  it("renders a summary with environment targets", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: {},
                  repo: { environments: {} },
                  repos: {
                    "account-a/repo-a": {
                      actions: "allow",
                      environments: { production: "allow", staging: "allow" },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a", repo: "repo-a" },
        },
        {
          platform: "github",
          type: "environment",
          target: {
            account: "account-a",
            repo: "repo-a",
            environment: "production",
          },
        },
        {
          platform: "github",
          type: "environment",
          target: {
            account: "account-a",
            repo: "repo-a",
            environment: "staging",
          },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    await expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot(
      join(fixturesPath, "environment-targets/expected.md"),
    );
  });

  it("renders a summary with multiple requesters and consumers", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_*"],
              requesters: ["account-x/*", "account-y/*"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
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
    });
    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-y", repo: "repo-y" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_B",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    await expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot(
      join(fixturesPath, "multiple-requesters/expected.md"),
    );
  });

  it("renders a summary with selected-repos and no-repos tokens", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
      members: "read",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_*"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({
        repos: ["repo-*"],
        permissions: { contents: "write" },
      }),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_SELECTED",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });
    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({
        repos: [],
        permissions: { members: "read" },
      }),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_NO_REPOS",
      to: [
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a" },
        },
      ],
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    await expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot(
      join(fixturesPath, "selected-and-no-repos/expected.md"),
    );
  });

  it("renders a summary with a token with a role", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({
      metadata: "read",
      contents: "write",
    });
    const provisionAuthorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              secrets: ["SECRET_A"],
              requesters: ["account-x/repo-x"],
              to: {
                github: {
                  account: {},
                  accounts: { "account-a": { actions: "allow" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    provisionAuthorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec({ as: "deployer" }),
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
    });

    const provisionResults = provisionAuthorizer
      .listResults()
      .sort((a, b) => compareProvisionRequest(a.request, b.request));
    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));

    await expect(
      renderSummary({ provisionResults, tokenResults }, "pgt-test"),
    ).toMatchFileSnapshot(join(fixturesPath, "token-with-role/expected.md"));
  });
});
