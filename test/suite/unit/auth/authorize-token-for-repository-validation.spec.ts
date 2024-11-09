import { expect, it } from "vitest";
import { createTokenAuthorizer } from "../../../../src/token-authorizer.js";
import { throws } from "../../../error.js";

it("throws if the requested repos are empty", () => {
  const authorizer = createTokenAuthorizer({ rules: { repos: [] } });

  expect(
    throws(() =>
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: [],
        permissions: { metadata: "read" },
      }),
    ),
  ).toMatchInlineSnapshot(`"No repos requested"`);
});

it("throws if the requested permissions are empty", () => {
  const authorizer = createTokenAuthorizer({ rules: { repos: [] } });

  expect(
    throws(() =>
      authorizer.authorizeForRepo("owner-x", "repo-x", {
        role: undefined,
        owner: "owner-a",
        repos: ["repo-a"],
        permissions: {},
      }),
    ),
  ).toMatchInlineSnapshot(`"No permissions requested"`);
});
