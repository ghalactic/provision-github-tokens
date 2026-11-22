import { expect, it } from "vitest";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
import {
  createTestAccountProvisionRequestTarget,
  createTestProvisionRequest,
  createTestRepoProvisionRequestTarget,
} from "../test/provision-request.js";
import { createTestTokenAuthResult } from "../test/result.js";
import type { RepoReference } from "./github-reference.js";
import { resolveProvisionCollisions } from "./provision-collision.js";
import type {
  AccountSecretVisibility,
  ProvisionRequestTarget,
} from "./provision-request.js";
import type { TokenDeclaration } from "./token-declaration.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";

it("refuses writable requests that write different tokens", () => {
  const target = accountTarget();

  const a = createAuthResult({
    requester: { account: "account-a", repo: "repo-a" },
    tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
    target,
  });
  const b = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    tokenDec: createTestTokenDec({ permissions: { issues: "write" } }),
    target,
  });

  resolveProvisionCollisions([a, b]);

  expect(a.results[0].collision).toEqual({
    isBlocking: true,
    participants: [
      {
        requester: { account: "account-b", repo: "repo-b" },
        name: "SECRET_A",
        token: "account-b/repo-b.token",
      },
    ],
  });
  expect(b.results[0].collision).toEqual({
    isBlocking: true,
    participants: [
      {
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        token: "account-a/repo-a.token",
      },
    ],
  });
});

it("doesn't collide when every writable request writes identical content", () => {
  const target = accountTarget();
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const a = createAuthResult({ target, tokenDec });
  const b = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    target,
    tokenDec,
  });

  resolveProvisionCollisions([a, b]);

  expect(a.results[0].collision).toBeUndefined();
  expect(b.results[0].collision).toBeUndefined();
});

it("collides when account secret visibility differs", () => {
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const a = createAuthResult({
    target: accountTarget("private"),
    tokenDec,
  });
  const b = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    target: accountTarget("all"),
    tokenDec,
  });

  resolveProvisionCollisions([a, b]);

  expect(a.results[0].collision?.isBlocking).toBe(true);
  expect(b.results[0].collision?.isBlocking).toBe(true);
});

it("doesn't collide identical repo targets", () => {
  const target = createTestRepoProvisionRequestTarget(
    "actions",
    "account-a",
    "repo-a",
    "private",
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const a = createAuthResult({ target, tokenDec });
  const b = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    target,
    tokenDec,
  });

  resolveProvisionCollisions([a, b]);

  expect(a.results[0].collision).toBeUndefined();
  expect(b.results[0].collision).toBeUndefined();
});

it("sorts collision participants by requester", () => {
  const target = accountTarget();
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const a = createAuthResult({ name: "SECRET_A", target, tokenDec });
  const b = createAuthResult({ name: "secret_a", target, tokenDec });
  const b2 = createAuthResult({ name: "Secret_A", target, tokenDec });
  const c = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    name: "SECRET_A",
    target,
    tokenDec,
  });

  resolveProvisionCollisions([a, b, b2, c]);

  expect(
    a.results[0].collision?.participants.map(({ requester }) => requester.repo),
  ).toEqual(["repo-a", "repo-a", "repo-b"]);
});

it("compares selected repo IDs order-insensitively", () => {
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const a = createAuthResult({
    target: accountTarget(selectedVisibility([2, 1])),
    tokenDec,
  });
  const b = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    target: accountTarget(selectedVisibility([1, 2])),
    tokenDec,
  });

  resolveProvisionCollisions([a, b]);

  expect(a.results[0].collision).toBeUndefined();
  expect(b.results[0].collision).toBeUndefined();
});

it("collides when selected repo IDs differ", () => {
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const a = createAuthResult({
    target: accountTarget(selectedVisibility([1])),
    tokenDec,
  });
  const b = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    target: accountTarget(selectedVisibility([2])),
    tokenDec,
  });

  resolveProvisionCollisions([a, b]);

  expect(a.results[0].collision?.isBlocking).toBe(true);
  expect(b.results[0].collision?.isBlocking).toBe(true);
});

it("collides when only the secret name casing differs", () => {
  const target = accountTarget();
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const a = createAuthResult({ name: "SECRET_A", target, tokenDec });
  const b = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    name: "secret_a",
    target,
    tokenDec,
  });

  resolveProvisionCollisions([a, b]);

  expect(a.results[0].collision?.participants[0].name).toBe("secret_a");
  expect(b.results[0].collision?.participants[0].name).toBe("SECRET_A");
});

it("matches secret names case-insensitively", () => {
  const target = accountTarget();
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const a = createAuthResult({ name: "SECRET_A", target, tokenDec });
  const b = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    name: "SECRET_B",
    target,
    tokenDec,
  });

  resolveProvisionCollisions([a, b]);

  expect(a.results[0].collision).toBeUndefined();
  expect(b.results[0].collision).toBeUndefined();
});

it("doesn't collide across secret types or targets", () => {
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const a = createAuthResult({
    target: accountTarget(),
    tokenDec,
  });
  const b = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    target: {
      ...accountTarget(),
      type: "agents",
    },
    tokenDec,
  });
  const c = createAuthResult({
    requester: { account: "account-c", repo: "repo-c" },
    target: createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a",
      "private",
    ),
    tokenDec,
  });

  resolveProvisionCollisions([a, b, c]);

  expect(a.results[0].collision).toBeUndefined();
  expect(b.results[0].collision).toBeUndefined();
  expect(c.results[0].collision).toBeUndefined();
});

it("doesn't refuse when fewer than two requests can write", () => {
  const target = accountTarget();

  const writable = createAuthResult({
    tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
    target,
  });
  const denied = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    tokenDec: createTestTokenDec({ permissions: { issues: "write" } }),
    target,
    isAllowed: false,
  });

  resolveProvisionCollisions([writable, denied]);

  expect(writable.results[0].collision).toBeUndefined();
  expect(denied.results[0].collision).toBeUndefined();
});

it("doesn't refuse a single request", () => {
  const result = createAuthResult({
    tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
    target: accountTarget(),
  });

  resolveProvisionCollisions([result]);

  expect(result.results[0].collision).toBeUndefined();
});

it("treats an unknown descriptor as disagreeing", () => {
  const target = accountTarget();

  const known = createAuthResult({
    tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
    target,
  });
  const unknown = createAuthResult({
    requester: { account: "account-b", repo: "repo-b" },
    target,
  });

  resolveProvisionCollisions([known, unknown]);

  expect(known.results[0].collision?.isBlocking).toBe(true);
  expect(unknown.results[0].collision?.isBlocking).toBe(true);
});

function accountTarget(
  visibility: AccountSecretVisibility = "private",
): ProvisionRequestTarget {
  return createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    visibility,
  );
}

function selectedVisibility(ids: number[]): AccountSecretVisibility {
  return {
    patterns: ["*"],
    repos: ids.map((id) => ({
      ref: { account: "account-a", repo: `repo-${id}` },
      id,
      visibility: "private",
    })),
  };
}

function createAuthResult({
  requester = { account: "account-a", repo: "repo-a" },
  name = "SECRET_A",
  target,
  tokenDec,
  isAllowed = true,
}: {
  requester?: RepoReference;
  name?: string;
  target: ProvisionRequestTarget;
  tokenDec?: TokenDeclaration;
  isAllowed?: boolean;
}): ProvisionAuthResult {
  const tokenAuthResult =
    tokenDec == null
      ? undefined
      : createTestTokenAuthResult({
          request: {
            consumer: { account: requester.account },
            repos: "all",
            tokenDec,
          },
          have: tokenDec.permissions,
          maxWant: "read",
        });

  const targetResult: ProvisionAuthTargetResult = {
    target,
    rules: [],
    have: isAllowed ? "allow" : "deny",
    tokenAuthResult,
    isTokenAllowed: tokenAuthResult?.isAllowed ?? false,
    isSecretVisibilityCategoryAllowed: isAllowed,
    isProvisionAllowed: isAllowed,
    isAllowed,
  } as ProvisionAuthTargetResult;

  return {
    request: createTestProvisionRequest({
      requester,
      name,
      tokenDec,
      secretDec: createTestSecretDec({
        token: `${requester.account}/${requester.repo}.token`,
      }),
      to: [target],
    }),
    results: [targetResult],
    isMissingTargets: false,
    isAllowed,
  };
}
