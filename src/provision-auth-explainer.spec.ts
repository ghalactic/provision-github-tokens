import { expect, it } from "vitest";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
import {
  createTestAccountProvisionRequestTarget,
  createTestProvisionRequest,
} from "../test/provision-request.js";
import {
  createTestProvisionAuthResult,
  createTestProvisionAuthTargetResult,
  createTestTokenAuthResult,
} from "../test/result.js";
import { toMarkdown } from "./markdown.js";
import { createMarkdownProvisionAuthExplainer } from "./provision-auth-explainer/markdown.js";
import { createTextProvisionAuthExplainer } from "./provision-auth-explainer/text.js";
import { resolveProvisionCollisions } from "./provision-collision.js";

it("explains a collision to a request that can't write", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenDecA = createTestTokenDec({ permissions: { contents: "read" } });
  const tokenDecB = createTestTokenDec({ permissions: { issues: "write" } });

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: tokenDecA,
    },
    have: tokenDecA.permissions,
    maxWant: "read",
  });
  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-b" },
      repos: "all",
      tokenDec: tokenDecB,
    },
    have: tokenDecB.permissions,
    maxWant: "read",
  });

  const writable = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token" }),
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });
  const denied = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-b", repo: "repo-b" },
      tokenDec: tokenDecB,
      secretDec: createTestSecretDec({ token: "account-b/repo-b.token" }),
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult: tokenAuthResultB,
        isAllowed: false,
      }),
    ],
  });

  const collisions = resolveProvisionCollisions([writable, denied]);

  const toText = createTextProvisionAuthExplainer(collisions);
  const toMdast = createMarkdownProvisionAuthExplainer(collisions);

  expect(toText(denied)).toMatchInlineSnapshot(`
    "❌ Repo account-b/repo-b wasn't allowed to provision secret SECRET_A:
      ✅ Can use token declaration account-b/repo-b.token
      ❌ Can't provision token to GitHub Actions secret in account account-a:
        ✅ Account account-b was allowed access to token #1
        ❌ Can't provision to private repos (no matching rules)
        ❌ Provision collision for GitHub Actions secret in account account-a
          ❌ Also declared by account-a/repo-a as secret SECRET_A using token declaration account-a/repo-a.token"
  `);
  expect(toMarkdown(toMdast(denied))).toMatchInlineSnapshot(`
    "- ❌ Repo \`account-b/repo-b\` **wasn't allowed** to provision secret \`SECRET_A\`:
      - ✅ **Can** use token declaration \`account-b/repo-b.token\`
      * ❌ **Can't** provision token to **GitHub Actions** secret in account \`account-a\`:
        - ✅ Account \`account-b\` was **allowed** access to token \`#1\`
        - ❌ **Can't** provision to **private repos** (no matching rules)
        - ❌ **Provision collision** for **GitHub Actions** secret in account \`account-a\`:
          - ❌ Also declared by \`account-a/repo-a\` as secret \`SECRET_A\` using token declaration \`account-a/repo-a.token\`
    "
  `);
});

it("doesn't explain a collision to a request that can write", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenDecA = createTestTokenDec({ permissions: { contents: "read" } });
  const tokenDecB = createTestTokenDec({ permissions: { issues: "write" } });

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: tokenDecA,
    },
    have: tokenDecA.permissions,
    maxWant: "read",
  });
  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-b" },
      repos: "all",
      tokenDec: tokenDecB,
    },
    have: tokenDecB.permissions,
    maxWant: "read",
  });

  const a = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token" }),
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });
  const b = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-b", repo: "repo-b" },
      tokenDec: tokenDecB,
      secretDec: createTestSecretDec({ token: "account-b/repo-b.token" }),
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult: tokenAuthResultB,
      }),
    ],
  });

  const collisions = resolveProvisionCollisions([a, b]);

  const toText = createTextProvisionAuthExplainer(collisions);
  const toMdast = createMarkdownProvisionAuthExplainer(collisions);

  expect(toText(a)).not.toContain("Provision collision");
  expect(toMarkdown(toMdast(a))).not.toContain("Provision collision");
});
