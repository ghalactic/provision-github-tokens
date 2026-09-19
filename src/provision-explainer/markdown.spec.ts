import type { BlockContent } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { join } from "node:path";
import { expect, it } from "vitest";
import { TestRequestError } from "../../__mocks__/@octokit/action.js";
import {
  createTestProvisionRequest,
  createTestProvisionRequestTarget,
} from "../../test/provision-request.js";
import {
  createTestProvisionAuthResult,
  createTestProvisionAuthTargetResult,
} from "../../test/result.js";
import { createRepoRef } from "../github-reference.js";
import type { ProvisionAuthTargetResult } from "../type/provision-auth-result.js";
import type { ProvisionResult } from "../type/provision-result.js";
import { createMarkdownProvisionExplainer } from "./markdown.js";

const fixturesPath = join(import.meta.dirname, "../testdata/explainers");

function serialize(children: BlockContent[]): string {
  return toMarkdown({ type: "root", children }, { bullet: "-" });
}

function explain(
  targets: [ProvisionAuthTargetResult, ProvisionResult][],
): string {
  const authResult = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-x", "repo-x"),
    }),
  });

  return serialize(
    createMarkdownProvisionExplainer()(authResult, new Map(targets)),
  );
}

it("serializes a fully provisioned secret across its targets", async () => {
  const output = explain([
    [
      createTestProvisionAuthTargetResult({
        target: createTestProvisionRequestTarget("actions"),
      }),
      { type: "PROVISIONED" },
    ],
    [
      createTestProvisionAuthTargetResult({
        target: createTestProvisionRequestTarget("codespaces"),
      }),
      { type: "PROVISIONED" },
    ],
  ]);

  await expect(output).toMatchFileSnapshot(
    join(fixturesPath, "provision/all-provisioned.md"),
  );
});

it("serializes a secret that failed to provision to any target", async () => {
  const output = explain([
    [
      createTestProvisionAuthTargetResult({
        target: createTestProvisionRequestTarget(
          "dependabot",
          "org-a",
          "repo-a",
        ),
      }),
      { type: "NOT_ALLOWED" },
    ],
    [
      createTestProvisionAuthTargetResult({
        target: createTestProvisionRequestTarget(
          "environment",
          "org-a",
          "repo-a",
          "production",
        ),
      }),
      { type: "NO_TOKEN" },
    ],
    [
      createTestProvisionAuthTargetResult({
        target: createTestProvisionRequestTarget("actions", "org-b"),
      }),
      { type: "NO_PROVISIONER" },
    ],
  ]);

  await expect(output).toMatchFileSnapshot(
    join(fixturesPath, "provision/none-provisioned.md"),
  );
});

it("serializes a partially provisioned secret with a request error", async () => {
  const output = explain([
    [
      createTestProvisionAuthTargetResult({
        target: createTestProvisionRequestTarget("actions"),
      }),
      { type: "PROVISIONED" },
    ],
    [
      createTestProvisionAuthTargetResult({
        target: createTestProvisionRequestTarget("dependabot", "org-b"),
      }),
      {
        type: "REQUEST_ERROR",
        error: new TestRequestError(500, { message: "boom" }),
      },
    ],
  ]);

  await expect(output).toMatchFileSnapshot(
    join(fixturesPath, "provision/partial-request-error.md"),
  );
});

it("serializes a request error without response data", async () => {
  const output = explain([
    [
      createTestProvisionAuthTargetResult({
        target: createTestProvisionRequestTarget("codespaces"),
      }),
      { type: "PROVISIONED" },
    ],
    [
      createTestProvisionAuthTargetResult({
        target: createTestProvisionRequestTarget("actions"),
      }),
      { type: "REQUEST_ERROR", error: new TestRequestError(502) },
    ],
  ]);

  await expect(output).toMatchFileSnapshot(
    join(fixturesPath, "provision/partial-request-error-no-response.md"),
  );
});

it("serializes a generic provisioning error with its stack", () => {
  const output = explain([
    [
      createTestProvisionAuthTargetResult({
        target: createTestProvisionRequestTarget("actions"),
      }),
      { type: "ERROR", error: new Error("boom") },
    ],
  ]);

  expect(output).toContain(
    "- ❌ Failed to provision to GitHub Actions secret in `account-a`: boom",
  );
  expect(output).toContain("<details>");
  expect(output).toContain("Error: boom\n");
});

it("serializes a secret with no targets to provision to", async () => {
  const output = explain([]);

  await expect(output).toMatchFileSnapshot(
    join(fixturesPath, "provision/no-targets.md"),
  );
});
