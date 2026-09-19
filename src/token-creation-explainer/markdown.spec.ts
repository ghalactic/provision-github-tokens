import type { BlockContent } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { join } from "node:path";
import { expect, it } from "vitest";
import { TestRequestError } from "../../__mocks__/@octokit/action.js";
import { createTestTokenDec } from "../../test/declaration.js";
import { createTestInstallationToken } from "../../test/github-api.js";
import { createTestTokenAuthResult } from "../../test/result.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";
import type { TokenCreationResult } from "../type/token-creation-result.js";
import { createMarkdownTokenCreationExplainer } from "./markdown.js";

const fixturesPath = join(import.meta.dirname, "../testdata/explainers");

function serialize(children: BlockContent[]): string {
  return toMarkdown({ type: "root", children }, { bullet: "-" });
}

function explain(
  results: Map<TokenAuthResult, TokenCreationResult>,
): BlockContent[][] {
  const explainer = createMarkdownTokenCreationExplainer(results);

  return [...results.entries()].map(([authResult, creationResult]) =>
    explainer(authResult, creationResult),
  );
}

it("serializes a created token with role, repo, and permission lines", async () => {
  const authResult = createTestTokenAuthResult({
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({
        account: "account-b",
        as: "admin",
        permissions: { contents: "write", metadata: "read" },
      }),
    },
  });
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [
      authResult,
      {
        type: "CREATED",
        token: createTestInstallationToken("key-a", "all", {
          metadata: "read",
        }),
      },
    ],
  ]);

  const output = serialize(explain(results)[0]);

  await expect(output).toMatchFileSnapshot(
    join(fixturesPath, "token-creation/created.md"),
  );
});

it("serializes a refused account-consumer token", async () => {
  const accountConsumer = createTestTokenAuthResult({
    type: "NO_REPOS",
    request: {
      consumer: { account: "org-a" },
      repos: [],
      tokenDec: createTestTokenDec({
        account: "account-b",
        permissions: { contents: "none" },
        repos: [],
      }),
    },
  });
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [accountConsumer, { type: "NOT_ALLOWED" }],
  ]);

  const output = serialize(explain(results)[0]);

  await expect(output).toMatchFileSnapshot(
    join(fixturesPath, "token-creation/refused-account-consumer.md"),
  );
});

it("serializes a refused repo-consumer token", () => {
  const repoConsumer = createTestTokenAuthResult({
    type: "NO_REPOS",
    request: {
      consumer: { account: "org-a", repo: "repo-a" },
      repos: [],
      tokenDec: createTestTokenDec({
        account: "account-b",
        permissions: { metadata: "read" },
        repos: [],
      }),
    },
  });
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [repoConsumer, { type: "NOT_ALLOWED" }],
  ]);

  expect(serialize(explain(results)[0])).toContain(
    "❌ Token not allowed for repo `org-a/repo-a`",
  );
});

it("serializes a failed repo-consumer token without a suitable issuer", async () => {
  const repoConsumer = createTestTokenAuthResult({
    type: "NO_REPOS",
    request: {
      consumer: { account: "org-a", repo: "repo-a" },
      repos: [],
      tokenDec: createTestTokenDec({
        account: "account-b",
        permissions: { metadata: "read" },
        repos: [],
      }),
    },
  });
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [repoConsumer, { type: "NO_ISSUER" }],
  ]);

  const output = serialize(explain(results)[0]);

  await expect(output).toMatchFileSnapshot(
    join(fixturesPath, "token-creation/failed-no-issuer.md"),
  );
});

it("serializes a request error with response data", async () => {
  const authResult = createTestTokenAuthResult();
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [
      authResult,
      {
        type: "REQUEST_ERROR",
        error: new TestRequestError(500, { message: "boom" }),
      },
    ],
  ]);

  const output = serialize(explain(results)[0]);

  await expect(output).toMatchFileSnapshot(
    join(fixturesPath, "token-creation/request-error-with-response.md"),
  );
});

it("serializes a request error without response data", async () => {
  const authResult = createTestTokenAuthResult();
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [authResult, { type: "REQUEST_ERROR", error: new TestRequestError(502) }],
  ]);

  const output = serialize(explain(results)[0]);

  await expect(output).toMatchFileSnapshot(
    join(fixturesPath, "token-creation/request-error-no-response.md"),
  );
});

it("serializes a generic creation error with its stack", () => {
  const authResult = createTestTokenAuthResult();
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [authResult, { type: "ERROR", error: new Error("boom") }],
  ]);

  const output = serialize(explain(results)[0]);

  expect(output).toContain("- ❌ boom");
  expect(output).toContain("<details>");
  expect(output).toContain("Error: boom\n");
});

it("deduplicates a repeated result as a shorter same-result line", () => {
  const firstAuth = createTestTokenAuthResult();
  const secondAuth = createTestTokenAuthResult();
  const sharedCreation = {
    type: "CREATED",
    token: createTestInstallationToken("key-a", "all", { metadata: "read" }),
  } as const;
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [firstAuth, sharedCreation],
    [secondAuth, sharedCreation],
  ]);

  const output = explain(results);

  expect(serialize(output[1])).toBe("✅ Same result as token `#1`\n");
});

it("serializes a created token without permissions or repos", async () => {
  const authResult = createTestTokenAuthResult({
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({
        account: "account-b",
        permissions: { contents: "none" },
      }),
    },
  });
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [
      authResult,
      {
        type: "CREATED",
        token: createTestInstallationToken("key-a", "all", {
          metadata: "read",
        }),
      },
    ],
  ]);

  const output = serialize(explain(results)[0]);

  await expect(output).toMatchFileSnapshot(
    join(fixturesPath, "token-creation/created-no-permissions.md"),
  );
});

it("serializes a created token for selected repos", () => {
  const authResult = createTestTokenAuthResult({
    type: "SELECTED_REPOS",
    request: {
      consumer: { account: "account-a" },
      repos: ["repo-b", "repo-a"],
      tokenDec: createTestTokenDec({
        account: "account-b",
        permissions: { contents: "write" },
        repos: ["repo-b", "repo-a"],
      }),
    },
  });
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [
      authResult,
      {
        type: "CREATED",
        token: createTestInstallationToken("key-a", ["repo-b", "repo-a"], {
          contents: "write",
        }),
      },
    ],
  ]);

  const output = serialize(explain(results)[0]);

  expect(output).toContain(
    "Write token created with access to 2 repos in `account-b`",
  );
  expect(output).toContain("- ✅ `account-b/repo-b`");
  expect(output).toContain("- ✅ `account-b/repo-a`");
});
