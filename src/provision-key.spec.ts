import { expect, it } from "vitest";
import { createTestTokenDec } from "../test/declaration.js";
import {
  createTestAccountProvisionRequestTarget,
  createTestRepoProvisionRequestTarget,
} from "../test/provision-request.js";
import { createTestTokenAuthResult } from "../test/result.js";
import { provisionTargetKey, provisionWriteKey } from "./provision-key.js";

it("compares secret names case-insensitively", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  expect(provisionTargetKey("SECRET_A", target)).toBe(
    provisionTargetKey("secret_a", target),
  );
});

it("distinguishes secret keys by secret type and target", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const otherType = createTestAccountProvisionRequestTarget(
    "codespaces",
    "account-a",
    "private",
  );
  const otherTarget = createTestRepoProvisionRequestTarget(
    "actions",
    "account-a",
    "repo-a",
    "private",
  );

  expect(provisionTargetKey("SECRET_A", target)).not.toBe(
    provisionTargetKey("SECRET_A", otherType),
  );
  expect(provisionTargetKey("SECRET_A", target)).not.toBe(
    provisionTargetKey("SECRET_A", otherTarget),
  );
});

it("treats identical writes as equal", () => {
  const tokenRequest = createTestTokenAuthResult().request;

  expect(
    provisionWriteKey(
      "SECRET_A",
      createTestAccountProvisionRequestTarget(
        "actions",
        "account-a",
        "private",
      ),
      tokenRequest,
    ),
  ).toBe(
    provisionWriteKey(
      "SECRET_A",
      createTestAccountProvisionRequestTarget(
        "actions",
        "account-a",
        "private",
      ),
      tokenRequest,
    ),
  );
});

it("distinguishes writes by secret name casing", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenRequest = createTestTokenAuthResult().request;

  expect(provisionWriteKey("SECRET_A", target, tokenRequest)).not.toBe(
    provisionWriteKey("secret_a", target, tokenRequest),
  );
});

it("distinguishes writes by token shape", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenRequest = createTestTokenAuthResult().request;
  const otherTokenRequest = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
    },
  }).request;

  expect(provisionWriteKey("SECRET_A", target, tokenRequest)).not.toBe(
    provisionWriteKey("SECRET_A", target, otherTokenRequest),
  );
});

it("distinguishes writes by account secret visibility", () => {
  const tokenRequest = createTestTokenAuthResult().request;
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "all",
  );
  const otherTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  expect(provisionWriteKey("SECRET_A", target, tokenRequest)).not.toBe(
    provisionWriteKey("SECRET_A", otherTarget, tokenRequest),
  );
});

it("compares selected repo IDs order-insensitively", () => {
  const tokenRequest = createTestTokenAuthResult().request;
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    {
      patterns: ["repo-*"],
      repos: [
        {
          ref: { account: "account-a", repo: "repo-a" },
          id: 111,
          visibility: "private",
        },
        {
          ref: { account: "account-a", repo: "repo-b" },
          id: 222,
          visibility: "private",
        },
      ],
    },
  );
  const reordered = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    {
      patterns: ["repo-*"],
      repos: [
        {
          ref: { account: "account-a", repo: "repo-b" },
          id: 222,
          visibility: "private",
        },
        {
          ref: { account: "account-a", repo: "repo-a" },
          id: 111,
          visibility: "private",
        },
      ],
    },
  );
  const different = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    {
      patterns: ["repo-*"],
      repos: [
        {
          ref: { account: "account-a", repo: "repo-a" },
          id: 111,
          visibility: "private",
        },
      ],
    },
  );

  expect(provisionWriteKey("SECRET_A", target, tokenRequest)).toBe(
    provisionWriteKey("SECRET_A", reordered, tokenRequest),
  );
  expect(provisionWriteKey("SECRET_A", target, tokenRequest)).not.toBe(
    provisionWriteKey("SECRET_A", different, tokenRequest),
  );
});

it("returns no write key without a token request", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );

  expect(provisionWriteKey("SECRET_A", target, undefined)).toBeUndefined();
});
