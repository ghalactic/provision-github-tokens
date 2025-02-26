import { expect, it } from "vitest";
import { permissionAccess } from "../../../../src/permissions.js";
import type { Permissions } from "../../../../src/type/permissions.js";

it("returns defined permission access levels", () => {
  const permissions: Permissions = {
    contents: "none",
    metadata: "read",
    issues: "write",
    repository_projects: "admin",
  };

  expect(permissionAccess(permissions, "contents")).toBe("none");
  expect(permissionAccess(permissions, "metadata")).toBe("read");
  expect(permissionAccess(permissions, "issues")).toBe("write");
  expect(permissionAccess(permissions, "repository_projects")).toBe("admin");
});

it('returns "none" for undefined permission access levels', () => {
  const permissions: Permissions = {
    contents: undefined,
  };

  expect(permissionAccess(permissions, "contents")).toBe("none");
  expect(permissionAccess(permissions, "metadata")).toBe("none");
});
