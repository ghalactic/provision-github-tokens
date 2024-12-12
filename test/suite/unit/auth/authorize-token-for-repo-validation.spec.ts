import { expect, it } from "vitest";
import { createTokenAuthorizer } from "../../../../src/token-authorizer.js";
import { throws } from "../../../error.js";

it("throws if the requested permissions are empty", () => {
  const authorizer = createTokenAuthorizer({ rules: [] });

  expect(
    throws(() =>
      authorizer.authorizeForRepo("account-x/repo-x", {
        role: undefined,
        account: "account-a",
        repos: ["repo-a"],
        permissions: {},
      }),
    ),
  ).toMatchInlineSnapshot(`"No permissions requested"`);
});
