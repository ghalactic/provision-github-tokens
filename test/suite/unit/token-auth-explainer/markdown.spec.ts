import type { Root, RootContent } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createMarkdownTokenAuthExplainer } from "../../../../src/token-auth-explainer/markdown.js";
import { createTokenAuthorizer } from "../../../../src/token-authorizer.js";

const fixturesPath = join(
  import.meta.dirname,
  "../../../fixture/token-auth-explainer",
);

function render(nodes: RootContent[]): string {
  const root: Root = { type: "root", children: nodes };

  return toMarkdown(root, { bullet: "-" });
}

const explain = createMarkdownTokenAuthExplainer();

describe("ALL_REPOS", () => {
  it("explains an allowed token with a role", async () => {
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
          consumers: ["account-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    });

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "all-repos-allowed-with-role.md"),
    );
  });

  it("explains a denied token", async () => {
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
          consumers: ["account-x"],
          permissions: { contents: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    });

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "all-repos-denied.md"),
    );
  });

  it("explains a token without a role", async () => {
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
          consumers: ["account-x"],
          permissions: { contents: "write" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    });

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "all-repos-allowed-without-role.md"),
    );
  });

  it("explains a token requested by a repo consumer", async () => {
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
          consumers: ["account-x/repo-x"],
          permissions: { contents: "write" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x", repo: "repo-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    });

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "all-repos-repo-consumer.md"),
    );
  });

  it("explains a token with multiple rules", async () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          description: "Read-only access",
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: true,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "read" },
        },
        {
          description: "Write access",
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: true,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    });

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "all-repos-multiple-rules.md"),
    );
  });

  it("explains a token with multiple permissions", async () => {
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
          consumers: ["account-x"],
          permissions: { contents: "write", metadata: "read", issues: "write" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write", metadata: "read", issues: "write" },
      },
      repos: "all",
    });

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "all-repos-multiple-permissions.md"),
    );
  });
});

describe("NO_REPOS", () => {
  it("explains an allowed no-repos token", async () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: true,
              allRepos: false,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { members: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: [],
        permissions: { members: "read" },
      },
      repos: [],
    });

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "no-repos-allowed.md"),
    );
  });

  it("explains a denied no-repos token", async () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: true,
              allRepos: false,
              selectedRepos: [],
            },
          ],
          consumers: ["account-x"],
          permissions: { members: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: [],
        permissions: { members: "write" },
      },
      repos: [],
    });

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "no-repos-denied.md"),
    );
  });
});

describe("SELECTED_REPOS", () => {
  it("explains an allowed selected-repos token", async () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: false,
              selectedRepos: ["repo-*"],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "write" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: ["repo-*"],
        permissions: { contents: "write" },
      },
      repos: ["repo-a", "repo-b"],
    });

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "selected-repos-allowed.md"),
    );
  });

  it("explains a denied selected-repos token", async () => {
    const authorizer = createTokenAuthorizer({
      rules: [
        {
          resources: [
            {
              accounts: ["account-a"],
              noRepos: false,
              allRepos: false,
              selectedRepos: ["repo-a"],
            },
          ],
          consumers: ["account-x"],
          permissions: { contents: "read" },
        },
      ],
    });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: ["repo-*"],
        permissions: { contents: "write" },
      },
      repos: ["repo-a", "repo-b"],
    });

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "selected-repos-denied.md"),
    );
  });

  it("explains a token with no matching rules", async () => {
    const authorizer = createTokenAuthorizer({ rules: [] });

    const result = authorizer.authorizeToken({
      consumer: { account: "account-x" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: ["repo-a"],
        permissions: { contents: "write" },
      },
      repos: ["repo-a"],
    });

    await expect(render(explain(result))).toMatchFileSnapshot(
      join(fixturesPath, "selected-repos-no-rules.md"),
    );
  });
});
