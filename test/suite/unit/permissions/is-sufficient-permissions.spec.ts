import { expect, it } from "vitest";
import { isSufficientPermissions } from "../../../../src/permissions.js";
import type { PermissionAccess } from "../../../../src/type/permissions.js";
import { throws } from "../../../error.js";

it("throws for empty wanted permissions", () => {
  expect(
    throws(() => isSufficientPermissions({ contents: "read" }, {})),
  ).toMatchInlineSnapshot(`"Empty permissions"`);
  expect(
    throws(() =>
      isSufficientPermissions({ contents: "read" }, { contents: undefined }),
    ),
  ).toMatchInlineSnapshot(`"Empty permissions"`);
  expect(
    throws(() =>
      isSufficientPermissions({ contents: "read" }, { contents: "none" }),
    ),
  ).toMatchInlineSnapshot(`"Empty permissions"`);
});

it.each`
  have       | want
  ${"none"}  | ${"none"}
  ${"read"}  | ${"read"}
  ${"read"}  | ${"read"}
  ${"write"} | ${"read"}
  ${"write"} | ${"write"}
  ${"admin"} | ${"read"}
  ${"admin"} | ${"write"}
  ${"admin"} | ${"admin"}
`(
  "knows that $have is sufficient for $want",
  ({ have, want }: { have: PermissionAccess; want: PermissionAccess }) => {
    expect(
      isSufficientPermissions(
        { metadata: "read", repository_projects: have },
        { metadata: "read", repository_projects: want },
      ),
    ).toBe(true);
  },
);

it.each`
  have       | want
  ${"none"}  | ${"read"}
  ${"none"}  | ${"write"}
  ${"none"}  | ${"admin"}
  ${"read"}  | ${"write"}
  ${"read"}  | ${"admin"}
  ${"write"} | ${"admin"}
`(
  "knows that $have is not sufficient for $want",
  ({ have, want }: { have: PermissionAccess; want: PermissionAccess }) => {
    expect(
      isSufficientPermissions(
        { metadata: "read", repository_projects: have },
        { metadata: "read", repository_projects: want },
      ),
    ).toBe(false);
  },
);

it("checks all permissions", () => {
  expect(
    isSufficientPermissions(
      { contents: "write", metadata: "read" },
      { contents: "write", metadata: "read" },
    ),
  ).toBe(true);
  expect(
    isSufficientPermissions(
      { contents: "write", metadata: "read" },
      { contents: "write", metadata: "write" },
    ),
  ).toBe(false);
  expect(
    isSufficientPermissions(
      { contents: "read", metadata: "write" },
      { contents: "write", metadata: "write" },
    ),
  ).toBe(false);
});
