import { expect, it } from "vitest";
import { createTokenAuthorizer } from "../../../src/token-authorizer.js";

it("allows repository tokens that should be allowed", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/repo-a", "owner-a/repo-b"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    },
  });

  expect(
    authorizer.authorizeForRepository("owner-x", "repo-x", {
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { contents: "write" },
    }),
  ).toEqual([true, undefined]);
  expect(
    authorizer.authorizeForRepository("owner-x", "repo-x", {
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-b"],
      permissions: { contents: "write", metadata: "read" },
    }),
  ).toEqual([true, undefined]);
  expect(
    authorizer.authorizeForRepository("owner-x", "repo-x", {
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-a", "repo-b"],
      permissions: { contents: "write", metadata: "read" },
    }),
  ).toEqual([true, undefined]);
});

it("doesn't allow tokens for unauthorized consumer repositories", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/repo-a", "owner-a/repo-b"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    },
  });

  expect(
    authorizer.authorizeForRepository("owner-y", "repo-x", {
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { metadata: "read" },
    }),
  ).toEqual([false, { type: "NO_MATCHING_REPOSITORY_RULE" }]);
  expect(
    authorizer.authorizeForRepository("owner-x", "repo-y", {
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { metadata: "read" },
    }),
  ).toEqual([false, { type: "NO_MATCHING_REPOSITORY_RULE" }]);
  expect(
    authorizer.authorizeForRepository("owner-y", "repo-y", {
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { metadata: "read" },
    }),
  ).toEqual([false, { type: "NO_MATCHING_REPOSITORY_RULE" }]);
});

it("doesn't allow tokens for undefined resource repositories", () => {
  const authorizer = createTokenAuthorizer({
    rules: {
      repositories: [
        {
          resources: ["owner-a/repo-a", "owner-a/repo-b"],
          consumers: ["owner-x/repo-x"],
          permissions: { contents: "write", metadata: "read" },
        },
      ],
    },
  });

  expect(
    authorizer.authorizeForRepository("owner-x", "repo-x", {
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-y"],
      permissions: { contents: "write" },
    }),
  ).toEqual([false, { type: "NO_MATCHING_REPOSITORY_RULE" }]);
  expect(
    authorizer.authorizeForRepository("owner-x", "repo-x", {
      role: undefined,
      owner: "owner-y",
      repositories: ["repo-a"],
      permissions: { contents: "write" },
    }),
  ).toEqual([false, { type: "NO_MATCHING_REPOSITORY_RULE" }]);
});
