import { expect, it } from "vitest";
import { createTokenAuthorizer } from "../../../src/token-authorizer.js";

it("throws if the requested repositories are empty", () => {
  const authorizer = createTokenAuthorizer({ rules: { repositories: [] } });

  expect(() =>
    authorizer.authorizeForRepository("owner-x", "repo-x", {
      role: undefined,
      owner: "owner-a",
      repositories: [],
      permissions: { metadata: "read" },
    }),
  ).toThrow("No repositories requested");
});

it("throws if the requested permissions are empty", () => {
  const authorizer = createTokenAuthorizer({ rules: { repositories: [] } });

  expect(() =>
    authorizer.authorizeForRepository("owner-x", "repo-x", {
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: {},
    }),
  ).toThrow("No permissions requested");
});
