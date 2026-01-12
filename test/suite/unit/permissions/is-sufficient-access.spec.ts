import { expect, it } from "vitest";
import { isSufficientAccess } from "../../../../src/access-level.js";
import type { PermissionAccess } from "../../../../src/type/permissions.js";

it.each`
  have       | want
  ${"none"}  | ${"none"}
  ${"read"}  | ${"read"}
  ${"write"} | ${"read"}
  ${"write"} | ${"write"}
  ${"admin"} | ${"read"}
  ${"admin"} | ${"write"}
  ${"admin"} | ${"admin"}
`(
  "knows that $have is sufficient for $want",
  ({ have, want }: { have: PermissionAccess; want: PermissionAccess }) => {
    expect(isSufficientAccess(have, want)).toBe(true);
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
    expect(isSufficientAccess(have, want)).toBe(false);
  },
);
