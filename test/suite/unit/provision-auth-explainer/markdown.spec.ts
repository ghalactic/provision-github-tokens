import GithubSlugger from "github-slugger";
import type { Root, RootContent } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compareTokenRequest } from "../../../../src/compare-token-request.js";
import { createHeadingFactory, text } from "../../../../src/markdown.js";
import { createMarkdownProvisionAuthExplainer } from "../../../../src/provision-auth-explainer/markdown.js";
import { createProvisionAuthorizer } from "../../../../src/provision-authorizer.js";
import type { TokenAuthResult } from "../../../../src/type/token-auth-result.js";
import type { TokenHeadingReference } from "../../../../src/type/token-heading-reference.js";
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
const githubServerURL = "https://github.com";

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
    const tokenReferenceMap = createTokenReferenceMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(
      githubServerURL,
      tokenReferenceMap,
    );

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "actions-allowed.md"),
    );
  });

  it("explains an allowed actions secret with a rule description", async () => {
    const createTokenRequest = createTestTokenRequestFactory();
    const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
    const authorizer = createProvisionAuthorizer(
      createTokenRequest,
      tokenAuthorizer,
      {
        rules: {
          secrets: [
            {
              description: "Allow CI secrets",
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
    const tokenReferenceMap = createTokenReferenceMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(
      githubServerURL,
      tokenReferenceMap,
    );

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "actions-allowed-with-description.md"),
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
    const tokenReferenceMap = createTokenReferenceMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(
      githubServerURL,
      tokenReferenceMap,
    );

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "environment-allowed.md"),
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
    const tokenReferenceMap = createTokenReferenceMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(
      githubServerURL,
      tokenReferenceMap,
    );

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "actions-denied.md"),
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
    const tokenReferenceMap = createTokenReferenceMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(
      githubServerURL,
      tokenReferenceMap,
    );

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "missing-token-dec.md"),
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
    const tokenReferenceMap = createTokenReferenceMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(
      githubServerURL,
      tokenReferenceMap,
    );

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "non-shared-token-dec.md"),
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

    const tokenReferenceMap = createTokenReferenceMap([]);
    const explain = createMarkdownProvisionAuthExplainer(
      githubServerURL,
      tokenReferenceMap,
    );

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "missing-targets.md"),
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
    const tokenReferenceMap = createTokenReferenceMap(tokenResults);
    const explain = createMarkdownProvisionAuthExplainer(
      githubServerURL,
      tokenReferenceMap,
    );

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "multiple-targets.md"),
    );
  });
});

function createTokenReferenceMap(
  tokenResults: TokenAuthResult[],
): Map<TokenAuthResult, TokenHeadingReference> {
  const map = new Map<TokenAuthResult, TokenHeadingReference>();
  const createHeading = createHeadingFactory(
    "/tmp/test-step-summary",
    new GithubSlugger(),
  );

  for (let i = 0; i < tokenResults.length; i++) {
    const [, headingId] = createHeading(5, text(`Token #${i + 1}`));
    map.set(tokenResults[i], { headingId, index: i + 1 });
  }

  return map;
}

function render(nodes: RootContent[]): string {
  const root: Root = { type: "root", children: nodes };

  return toMarkdown(root, { bullet: "-" });
}
