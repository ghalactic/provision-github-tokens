import type { BlockContent } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../../test/declaration.js";
import {
  createTestProvisionRequest,
  createTestProvisionRequestTarget,
} from "../../test/provision-request.js";
import {
  createTestProvisionAuthResult,
  createTestProvisionAuthTargetResult,
  createTestTokenAuthResult,
} from "../../test/result.js";
import { createRepoRef } from "../github-reference.js";
import type { ProvisionAuthTargetRuleResult } from "../type/provision-auth-result.js";
import { createMarkdownProvisionAuthExplainer } from "./markdown.js";

const fixturesPath = join(import.meta.dirname, "../testdata/explainers");

function rule(
  index: number,
  description: string | undefined,
  have: "allow" | "deny",
): ProvisionAuthTargetRuleResult {
  return {
    index,
    rule: {
      description,
      secrets: [],
      requesters: [],
      to: {
        github: {
          account: {},
          accounts: {},
          repo: { environments: {} },
          repos: {},
        },
      },
    },
    have,
  };
}

function serialize(children: BlockContent[]): string {
  return toMarkdown(
    { type: "root", children },
    { bullet: "-", extensions: [gfmToMarkdown()] },
  );
}

it("expresses an allowed secret's summary, token declaration, targets, and rules", async () => {
  const tokenAuthResult = createTestTokenAuthResult();

  const actionsTarget = createTestProvisionRequestTarget("actions");
  const codespacesTarget = createTestProvisionRequestTarget("codespaces");

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-x", "repo-x"),
      tokenDec: createTestTokenDec({ account: "account-a" }),
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true, codespaces: true },
          },
        },
      }),
      to: [actionsTarget, codespacesTarget],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: codespacesTarget,
        tokenAuthResult,
        rules: [rule(0, "A codespaces rule", "allow")],
      }),
      createTestProvisionAuthTargetResult({
        target: actionsTarget,
        tokenAuthResult,
        rules: [
          rule(1, undefined, "allow"),
          rule(2, "An actions rule", "deny"),
        ],
      }),
    ],
  });

  await expect(
    serialize(createMarkdownProvisionAuthExplainer([tokenAuthResult])(secret)),
  ).toMatchFileSnapshot(join(fixturesPath, "provision-auth/allowed.md"));
});

it("explains why a missing token declaration can't be used", async () => {
  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-x", "repo-x"),
      tokenDec: undefined,
      tokenDecIsRegistered: false,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token-a" }),
    }),
    results: [
      createTestProvisionAuthTargetResult({
        tokenAuthResult: undefined,
        isTokenAllowed: false,
      }),
    ],
  });

  await expect(
    serialize(createMarkdownProvisionAuthExplainer([])(secret)),
  ).toMatchFileSnapshot(join(fixturesPath, "provision-auth/unknown-token.md"));
});

it("distinguishes an unshared token declaration from a nonexistent one", async () => {
  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-x", "repo-x"),
      tokenDec: undefined,
      tokenDecIsRegistered: true,
    }),
    results: [
      createTestProvisionAuthTargetResult({
        tokenAuthResult: undefined,
        isTokenAllowed: false,
      }),
    ],
  });

  await expect(
    serialize(createMarkdownProvisionAuthExplainer([])(secret)),
  ).toMatchFileSnapshot(join(fixturesPath, "provision-auth/unshared-token.md"));
});

it("reports a secret with no targets", async () => {
  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-x", "repo-x"),
      tokenDec: createTestTokenDec(),
    }),
    results: [],
    isMissingTargets: true,
  });

  await expect(
    serialize(createMarkdownProvisionAuthExplainer([])(secret)),
  ).toMatchFileSnapshot(join(fixturesPath, "provision-auth/no-targets.md"));
});

it("references repo consumers and later tokens by dashboard-local numbers", async () => {
  const repoToken = createTestTokenAuthResult({
    request: {
      consumer: { account: "org-a", repo: "repo-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
    },
  });
  const accountToken = createTestTokenAuthResult({
    request: {
      consumer: { account: "org-b" },
      repos: "all",
      tokenDec: createTestTokenDec({ account: "org-b" }),
    },
  });

  const tokenResults = [repoToken, accountToken];

  const environmentTarget = createTestProvisionRequestTarget(
    "environment",
    "org-b",
    "repo-b",
    "production",
  );
  const dependabotTarget = createTestProvisionRequestTarget(
    "dependabot",
    "org-b",
    "repo-b",
  );

  const secret = createTestProvisionAuthResult({
    isAllowed: false,
    request: createTestProvisionRequest({
      requester: createRepoRef("org-x", "repo-x"),
      tokenDec: createTestTokenDec({ account: "org-b" }),
      secretDec: createTestSecretDec({
        token: "org-b/repo-b.token-b",
        github: {
          repos: {
            "org-b/repo-b": { dependabot: true, environments: ["production"] },
          },
        },
      }),
      to: [environmentTarget, dependabotTarget],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: environmentTarget,
        tokenAuthResult: accountToken,
        isTokenAllowed: false,
        isProvisionAllowed: false,
      }),
      createTestProvisionAuthTargetResult({
        target: dependabotTarget,
        tokenAuthResult: repoToken,
        isTokenAllowed: false,
      }),
    ],
  });

  await expect(
    serialize(createMarkdownProvisionAuthExplainer(tokenResults)(secret)),
  ).toMatchFileSnapshot(
    join(fixturesPath, "provision-auth/denied-repo-consumer.md"),
  );
});

it("covers a second secret sharing a token", () => {
  const tokenAuthResult = createTestTokenAuthResult();

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-x", "repo-x"),
      name: "SECRET_B",
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token-b" }),
    }),
    results: [createTestProvisionAuthTargetResult({ tokenAuthResult })],
  });

  const output = serialize(
    createMarkdownProvisionAuthExplainer([tokenAuthResult])(secret),
  );

  expect(output).toContain("allowed access to token `#1`");
});

it("serializes an account-consumer token as an account", () => {
  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "org-b" },
      repos: "all",
      tokenDec: createTestTokenDec({ account: "org-b" }),
    },
  });

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-x", "repo-x"),
      tokenDec: createTestTokenDec({ account: "org-b" }),
    }),
    results: [createTestProvisionAuthTargetResult({ tokenAuthResult })],
  });

  const output = serialize(
    createMarkdownProvisionAuthExplainer([tokenAuthResult])(secret),
  );

  expect(output).toContain("Account `org-b` was allowed access to token `#1`");
});
