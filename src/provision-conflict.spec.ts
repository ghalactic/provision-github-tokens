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
import { resolveProvisionConflicts } from "./provision-conflict.js";

it("refuses allowed requests that declare different tokens", () => {
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

  const auths = [a, b];
  resolveProvisionConflicts(auths);

  expect(a.results[0].conflict).toEqual({
    participants: [
      {
        requester: { account: "account-b", repo: "repo-b" },
        name: "SECRET_A",
        token: "account-b/repo-b.token",
      },
    ],
  });
  expect(b.results[0].conflict).toEqual({
    participants: [
      {
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        token: "account-a/repo-a.token",
      },
    ],
  });
  expect(a.results[0].isAllowed).toBe(false);
  expect(a.isAllowed).toBe(false);
  expect(b.results[0].isAllowed).toBe(false);
  expect(b.isAllowed).toBe(false);
});

it("doesn't report a conflict for identical declarations", () => {
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

  const auths = [a, b];
  resolveProvisionConflicts(auths);

  for (const auth of auths) {
    for (const result of auth.results) {
      expect(result.conflict).toBeUndefined();
    }
  }
});

it("reports a conflict when account secret visibility differs", () => {
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

  const auths = [a, b];
  resolveProvisionConflicts(auths);

  expect(a.results[0].isAllowed).toBe(false);
  expect(a.isAllowed).toBe(false);
  expect(b.results[0].isAllowed).toBe(false);
  expect(b.isAllowed).toBe(false);
});

it("doesn't report a conflict for identical repo targets", () => {
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

  const auths = [a, b];
  resolveProvisionConflicts(auths);

  for (const auth of auths) {
    for (const result of auth.results) {
      expect(result.conflict).toBeUndefined();
    }
  }
});

it("sorts conflict participants by requester", () => {
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

  const auths = [a, a2, a3, b];
  resolveProvisionConflicts(auths);

  const conflict = a.results[0].conflict;
  const repos: string[] = [];

  for (const { requester } of conflict?.participants ?? []) {
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

  const auths = [a, b];
  resolveProvisionConflicts(auths);

  for (const auth of auths) {
    for (const result of auth.results) {
      expect(result.conflict).toBeUndefined();
    }
  }
});

it("reports a conflict when selected repo IDs differ", () => {
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

  const auths = [a, b];
  resolveProvisionConflicts(auths);

  expect(a.results[0].isAllowed).toBe(false);
  expect(a.isAllowed).toBe(false);
  expect(b.results[0].isAllowed).toBe(false);
  expect(b.isAllowed).toBe(false);
});

it("reports a conflict when only the secret name casing differs", () => {
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

  const auths = [a, b];
  resolveProvisionConflicts(auths);

  expect(a.results[0].conflict?.participants[0].name).toBe("secret_a");
  expect(b.results[0].conflict?.participants[0].name).toBe("SECRET_A");
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

  const auths = [a, b];
  resolveProvisionConflicts(auths);

  for (const auth of auths) {
    for (const result of auth.results) {
      expect(result.conflict).toBeUndefined();
    }
  }
});

it("doesn't report a conflict across secret types or targets", () => {
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

  const auths = [a, b, c];
  resolveProvisionConflicts(auths);

  for (const auth of auths) {
    for (const result of auth.results) {
      expect(result.conflict).toBeUndefined();
    }
  }
});

it("reports a conflict to a denied request", () => {
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

  const allowed = createTestProvisionAuthResult({
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

  const auths = [allowed, denied];
  resolveProvisionConflicts(auths);

  expect(allowed.results[0].conflict).toBeUndefined();
  expect(denied.results[0].conflict).toEqual({
    participants: [
      {
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        token: "account-a/repo-a.token",
      },
    ],
  });
});

it("reports a conflict to every denied request", () => {
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
        isAllowed: false,
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
        isAllowed: false,
      }),
    ],
  });

  const auths = [a, b];
  resolveProvisionConflicts(auths);

  expect(a.results[0].conflict).toEqual({
    participants: [
      {
        requester: { account: "account-b", repo: "repo-b" },
        name: "SECRET_A",
        token: "account-b/repo-b.token",
      },
    ],
  });
  expect(b.results[0].conflict).toEqual({
    participants: [
      {
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        token: "account-a/repo-a.token",
      },
    ],
  });
  expect(a.results[0].isAllowed).toBe(false);
  expect(a.isAllowed).toBe(false);
  expect(b.results[0].isAllowed).toBe(false);
  expect(b.isAllowed).toBe(false);
});

it("reports a conflict when allowed requests are already refused", () => {
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenDecA = createTestTokenDec({ permissions: { contents: "read" } });
  const tokenDecB = createTestTokenDec({ permissions: { issues: "write" } });
  const tokenDecC = createTestTokenDec({
    permissions: { pull_requests: "read" },
  });

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
  const tokenAuthResultC = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-c" },
      repos: "all",
      tokenDec: tokenDecC,
    },
    have: tokenDecC.permissions,
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
  const denied = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-c", repo: "repo-c" },
      tokenDec: tokenDecC,
      secretDec: createTestSecretDec({ token: "account-c/repo-c.token" }),
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult: tokenAuthResultC,
        isAllowed: false,
      }),
    ],
  });

  const auths = [a, b, denied];
  resolveProvisionConflicts(auths);

  expect(a.results[0].isAllowed).toBe(false);
  expect(a.isAllowed).toBe(false);
  expect(b.results[0].isAllowed).toBe(false);
  expect(b.isAllowed).toBe(false);
  expect(denied.results[0].conflict).toEqual({
    participants: [
      {
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        token: "account-a/repo-a.token",
      },
      {
        requester: { account: "account-b", repo: "repo-b" },
        name: "SECRET_A",
        token: "account-b/repo-b.token",
      },
    ],
  });
});

it("doesn't report a conflict when denied declarations match", () => {
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

  const allowed = createTestProvisionAuthResult({
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
  const denied = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-b", repo: "repo-b" },
      tokenDec,
      secretDec: createTestSecretDec({ token: "account-b/repo-b.token" }),
      to: [target],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target,
        tokenAuthResult,
        isAllowed: false,
      }),
    ],
  });

  const auths = [allowed, denied];
  resolveProvisionConflicts(auths);

  for (const auth of auths) {
    for (const result of auth.results) {
      expect(result.conflict).toBeUndefined();
    }
  }
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

  const auths = [result];
  resolveProvisionConflicts(auths);

  for (const auth of auths) {
    for (const result of auth.results) {
      expect(result.conflict).toBeUndefined();
    }
  }
});

it("treats an unknown declaration as conflicting", () => {
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
        isTokenAllowed: false,
      }),
    ],
  });

  const auths = [known, unknown];
  resolveProvisionConflicts(auths);

  expect(known.results[0].conflict).toBeUndefined();
  expect(unknown.results[0].conflict).toEqual({
    participants: [
      {
        requester: { account: "account-a", repo: "repo-a" },
        name: "SECRET_A",
        token: "account-a/repo-a.token",
      },
    ],
  });
});
