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
import {
  createTestProvisionAuthResult,
  createTestProvisionAuthTargetResult,
  createTestTokenAuthResult,
} from "../test/result.js";
import { resolveProvisionCollisions } from "./provision-collision.js";

it("refuses writable requests that write different tokens", () => {
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

  expect(collisions.get(a.results[0])).toEqual({
    isBlocking: true,
    participants: [
      {
        requester: { account: "account-b", repo: "repo-b" },
        name: "SECRET_A",
        token: "account-b/repo-b.token",
      },
    ],
  });
  expect(collisions.get(b.results[0])).toEqual({
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
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-b" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });

  const a = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
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
      tokenDec,
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

  expect(collisions.size).toBe(0);
});

it("collides when account secret visibility differs", () => {
  const targetA = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const targetB = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "all",
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-b" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });

  const a = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token" }),
      to: [targetA],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: targetA,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });
  const b = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-b", repo: "repo-b" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-b/repo-b.token" }),
      to: [targetB],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: targetB,
        tokenAuthResult: tokenAuthResultB,
      }),
    ],
  });

  const collisions = resolveProvisionCollisions([a, b]);

  expect(collisions.get(a.results[0])?.isBlocking).toBe(true);
  expect(collisions.get(b.results[0])?.isBlocking).toBe(true);
});

it("doesn't collide identical repo targets", () => {
  const target = createTestRepoProvisionRequestTarget(
    "actions",
    "account-a",
    "repo-a",
    "private",
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-b" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });

  const a = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
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
      tokenDec,
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

  expect(collisions.size).toBe(0);
});

it("sorts collision participants by requester", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultA2 = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultA3 = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-b" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });

  const a = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token-a" }),
      name: "SECRET_A",
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });
  const a2 = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token-a2" }),
      name: "secret_a",
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult: tokenAuthResultA2,
      }),
    ],
  });
  const a3 = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token-a3" }),
      name: "Secret_A",
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult: tokenAuthResultA3,
      }),
    ],
  });
  const b = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-b", repo: "repo-b" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-b/repo-b.token" }),
      name: "SECRET_A",
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult: tokenAuthResultB,
      }),
    ],
  });

  const collisions = resolveProvisionCollisions([a, a2, a3, b]);

  const collision = collisions.get(a.results[0]);
  const repos: string[] = [];

  for (const { requester } of collision?.participants ?? []) {
    repos.push(requester.repo);
  }

  expect(repos).toEqual(["repo-a", "repo-a", "repo-b"]);
});

it("compares selected repo IDs order-insensitively", () => {
  const targetA = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    {
      patterns: ["*"],
      repos: [
        {
          ref: { account: "account-a", repo: "repo-2" },
          id: 2,
          visibility: "private",
        },
        {
          ref: { account: "account-a", repo: "repo-1" },
          id: 1,
          visibility: "private",
        },
      ],
    },
  );
  const targetB = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    {
      patterns: ["*"],
      repos: [
        {
          ref: { account: "account-a", repo: "repo-1" },
          id: 1,
          visibility: "private",
        },
        {
          ref: { account: "account-a", repo: "repo-2" },
          id: 2,
          visibility: "private",
        },
      ],
    },
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-b" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });

  const a = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token" }),
      to: [targetA],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: targetA,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });
  const b = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-b", repo: "repo-b" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-b/repo-b.token" }),
      to: [targetB],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: targetB,
        tokenAuthResult: tokenAuthResultB,
      }),
    ],
  });

  const collisions = resolveProvisionCollisions([a, b]);

  expect(collisions.size).toBe(0);
});

it("collides when selected repo IDs differ", () => {
  const targetA = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    {
      patterns: ["*"],
      repos: [
        {
          ref: { account: "account-a", repo: "repo-1" },
          id: 1,
          visibility: "private",
        },
      ],
    },
  );
  const targetB = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    {
      patterns: ["*"],
      repos: [
        {
          ref: { account: "account-a", repo: "repo-2" },
          id: 2,
          visibility: "private",
        },
      ],
    },
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-b" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });

  const a = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token" }),
      to: [targetA],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: targetA,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });
  const b = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-b", repo: "repo-b" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-b/repo-b.token" }),
      to: [targetB],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: targetB,
        tokenAuthResult: tokenAuthResultB,
      }),
    ],
  });

  const collisions = resolveProvisionCollisions([a, b]);

  expect(collisions.get(a.results[0])?.isBlocking).toBe(true);
  expect(collisions.get(b.results[0])?.isBlocking).toBe(true);
});

it("collides when only the secret name casing differs", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-b" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });

  const a = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token" }),
      name: "SECRET_A",
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
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-b/repo-b.token" }),
      name: "secret_a",
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

  expect(collisions.get(a.results[0])?.participants[0].name).toBe("secret_a");
  expect(collisions.get(b.results[0])?.participants[0].name).toBe("SECRET_A");
});

it("matches secret names case-insensitively", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-b" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });

  const a = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token" }),
      name: "SECRET_A",
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
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-b/repo-b.token" }),
      name: "SECRET_B",
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

  expect(collisions.size).toBe(0);
});

it("doesn't collide across secret types or targets", () => {
  const accountTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const agentsTarget = createTestAccountProvisionRequestTarget(
    "agents",
    "account-a",
    "private",
  );
  const repoTarget = createTestRepoProvisionRequestTarget(
    "actions",
    "account-a",
    "repo-a",
    "private",
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const tokenAuthResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-b" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });
  const tokenAuthResultC = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-c" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });

  const a = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token" }),
      to: [accountTarget],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
  });
  const b = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-b", repo: "repo-b" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-b/repo-b.token" }),
      to: [agentsTarget],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: agentsTarget,
        tokenAuthResult: tokenAuthResultB,
      }),
    ],
  });
  const c = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-c", repo: "repo-c" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-c/repo-c.token" }),
      to: [repoTarget],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: repoTarget,
        tokenAuthResult: tokenAuthResultC,
      }),
    ],
  });

  const collisions = resolveProvisionCollisions([a, b, c]);

  expect(collisions.size).toBe(0);
});

it("doesn't refuse when fewer than two requests can write", () => {
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

  expect(collisions.size).toBe(0);
});

it("doesn't refuse a single request", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });

  const result = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token" }),
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult,
      }),
    ],
  });

  const collisions = resolveProvisionCollisions([result]);

  expect(collisions.size).toBe(0);
});

it("treats an unknown descriptor as disagreeing", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenDec = createTestTokenDec({ permissions: { contents: "read" } });

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec,
    },
    have: tokenDec.permissions,
    maxWant: "read",
  });

  const known = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-a/repo-a.token" }),
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult,
      }),
    ],
  });
  const unknown = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-b", repo: "repo-b" },
      secretDec: createTestSecretDec({ token: "account-b/repo-b.token" }),
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult: undefined,
      }),
    ],
  });

  const collisions = resolveProvisionCollisions([known, unknown]);

  expect(collisions.get(known.results[0])?.isBlocking).toBe(true);
  expect(collisions.get(unknown.results[0])?.isBlocking).toBe(true);
});
