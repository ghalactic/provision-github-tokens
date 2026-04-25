import type { Root, RootContent } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compareTokenRequest } from "../../../../src/compare-token-request.js";
import { createMarkdownProvisionAuthExplainer } from "../../../../src/provision-auth-explainer/markdown.js";
import { createProvisionAuthorizer } from "../../../../src/provision-authorizer.js";
import type { TokenAuthResult } from "../../../../src/type/token-auth-result.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../../../declaration.js";
import { createTestTokenAuthorizer } from "../../../token-authorizer.js";
import { createTestTokenRequestFactory } from "../../../token-request.js";

const fixturesPath = join(
  import.meta.dirname,
  "../../../fixture/provision-auth-explainer",
);

function render(nodes: RootContent[]): string {
  const root: Root = { type: "root", children: nodes };

  return toMarkdown(root, { bullet: "-" });
}

function createAnchorMap(
  tokenResults: TokenAuthResult[],
): Map<TokenAuthResult, string> {
  const map = new Map<TokenAuthResult, string>();
  for (let i = 0; i < tokenResults.length; i++) {
    map.set(tokenResults[i], `pgt-test-token-${i + 1}`);
  }

  return map;
}

describe("allowed secrets", () => {
  it("explains an allowed actions secret", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
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

    const result = authorizer.authorizeSecret({
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

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "actions-allowed/expected.md"),
    );
  });

  it("explains an allowed environment secret", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
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
                      environments: { production: "allow" },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    );

    const result = authorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [
        {
          platform: "github",
          type: "environment",
          target: {
            account: "account-a",
            repo: "repo-a",
            environment: "production",
          },
        },
      ],
    });

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "environment-allowed/expected.md"),
    );
  });
});

describe("denied secrets", () => {
  it("explains a denied secret with insufficient token access", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
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
                  accounts: { "account-a": { actions: "deny" } },
                  repo: { environments: {} },
                  repos: {},
                },
              },
            },
          ],
        },
      },
    );

    const result = authorizer.authorizeSecret({
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

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "actions-denied/expected.md"),
    );
  });

  it("explains a secret with a missing token declaration", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
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

    const result = authorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: undefined,
      tokenDecIsRegistered: false,
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

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "missing-token-dec/expected.md"),
    );
  });

  it("explains a secret with a non-shared token declaration", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
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

    const result = authorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: undefined,
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

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "non-shared-token-dec/expected.md"),
    );
  });

  it("explains a secret with missing targets", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      { rules: { secrets: [] } },
    );

    const result = authorizer.authorizeSecret({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: createTestTokenDec(),
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec(),
      name: "SECRET_A",
      to: [],
    });

    const anchorMap = createAnchorMap([]);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "missing-targets/expected.md"),
    );
  });
});

describe("multiple targets", () => {
  it("explains a secret with multiple target types", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
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
                  repos: {
                    "account-a/repo-a": {
                      actions: "allow",
                      codespaces: "allow",
                      dependabot: "allow",
                      environments: { staging: "allow" },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    );

    const result = authorizer.authorizeSecret({
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
        {
          platform: "github",
          type: "actions",
          target: { account: "account-a", repo: "repo-a" },
        },
        {
          platform: "github",
          type: "codespaces",
          target: { account: "account-a", repo: "repo-a" },
        },
        {
          platform: "github",
          type: "dependabot",
          target: { account: "account-a", repo: "repo-a" },
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

    const tokenResults = tokenAuthorizer
      .listResults()
      .sort((a, b) => compareTokenRequest(a.request, b.request));
    const anchorMap = createAnchorMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(anchorMap);

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "multiple-targets/expected.md"),
    );
  });
});
