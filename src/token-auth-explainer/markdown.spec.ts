import type { BlockContent } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestTokenDec } from "../../test/declaration.js";
import { createTestTokenAuthResult } from "../../test/result.js";
import { createMarkdownTokenAuthExplainer } from "./markdown.js";

const fixturesPath = join(import.meta.dirname, "../testdata/explainers");

function serialize(children: BlockContent[]): string {
  return toMarkdown({ type: "root", children }, { bullet: "-" });
}

describe("createMarkdownTokenAuthExplainer", () => {
  it("serializes an allowed all-repos token with a described rule", async () => {
    const result = createTestTokenAuthResult({
      type: "ALL_REPOS",
      request: {
        consumer: { account: "account-a" },
        repos: "all",
        tokenDec: createTestTokenDec({
          as: "admin",
          permissions: { metadata: "read", contents: "write" },
        }),
      },
      rules: [
        {
          index: 0,
          rule: {
            description: "An allowed rule",
            resources: [],
            consumers: [],
            permissions: { metadata: "read", contents: "write" },
          },
          have: { metadata: "read", contents: "write" },
          isSufficient: true,
        },
      ],
      have: { metadata: "read", contents: "write" },
    });

    const output = serialize(createMarkdownTokenAuthExplainer()(result));

    await expect(output).toMatchFileSnapshot(
      join(fixturesPath, "token-auth/all-repos-allowed.md"),
    );
  });

  it("serializes a denied repo-consumer all-repos token", async () => {
    const result = createTestTokenAuthResult({
      type: "ALL_REPOS",
      isAllowed: false,
      isMissingRole: true,
      request: {
        consumer: { account: "org-a", repo: "repo-a" },
        repos: "all",
        tokenDec: createTestTokenDec({ permissions: { metadata: "read" } }),
      },
      rules: [],
      have: { metadata: "read" },
    });

    const output = serialize(createMarkdownTokenAuthExplainer()(result));

    await expect(output).toMatchFileSnapshot(
      join(fixturesPath, "token-auth/all-repos-denied.md"),
    );
  });

  it("serializes a no-repos token with described and undescribed rules", async () => {
    const result = createTestTokenAuthResult({
      type: "NO_REPOS",
      request: {
        consumer: { account: "account-a" },
        repos: [],
        tokenDec: createTestTokenDec({
          permissions: { metadata: "read" },
          repos: [],
        }),
      },
      rules: [
        {
          index: 0,
          rule: {
            resources: [],
            consumers: [],
            permissions: { metadata: "read" },
          },
          have: { metadata: "read" },
          isSufficient: true,
        },
        {
          index: 1,
          rule: {
            description: "A denied rule",
            resources: [],
            consumers: [],
            permissions: { metadata: "read" },
          },
          have: {},
          isSufficient: false,
        },
      ],
      have: { metadata: "read" },
    });

    const output = serialize(createMarkdownTokenAuthExplainer()(result));

    await expect(output).toMatchFileSnapshot(
      join(fixturesPath, "token-auth/no-repos.md"),
    );
  });

  it("serializes a selected-repos token with a resource rule", async () => {
    const result = createTestTokenAuthResult({
      type: "SELECTED_REPOS",
      request: {
        consumer: { account: "account-a" },
        repos: ["repo-a", "repo-b"],
        tokenDec: createTestTokenDec({
          permissions: { metadata: "read" },
          repos: ["repo-a", "repo-b"],
        }),
      },
      results: {
        "org-a/repo-b": {
          rules: [],
          have: { metadata: "read" },
          isSufficient: true,
        },
        "account-a/repo-a": {
          rules: [
            {
              index: 0,
              rule: {
                resources: [],
                consumers: [],
                permissions: { metadata: "read" },
              },
              have: { metadata: "read" },
              isSufficient: true,
            },
          ],
          have: { metadata: "read" },
          isSufficient: true,
        },
      },
    });

    const output = serialize(createMarkdownTokenAuthExplainer()(result));

    await expect(output).toMatchFileSnapshot(
      join(fixturesPath, "token-auth/selected-repos.md"),
    );
  });

  it("serializes an unmatched empty selected-repos token", async () => {
    const result = createTestTokenAuthResult({
      type: "SELECTED_REPOS",
      isAllowed: false,
      isMatched: false,
      request: {
        consumer: { account: "account-a" },
        repos: ["repo-1"],
        tokenDec: createTestTokenDec({
          permissions: { contents: "write" },
          repos: [],
        }),
      },
      results: {
        "org-a/repo-a": {
          rules: [],
          have: { contents: "read" },
          isSufficient: false,
        },
      },
    });

    const output = serialize(createMarkdownTokenAuthExplainer()(result));

    await expect(output).toMatchFileSnapshot(
      join(fixturesPath, "token-auth/selected-repos-unmatched.md"),
    );
  });
});
