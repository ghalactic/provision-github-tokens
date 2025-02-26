import { isSufficientAccess } from "./access-level.js";
import type { PermissionAccess, Permissions } from "./type/permissions.js";

export function permissionAccess(
  permissions: Permissions,
  permission: string,
): PermissionAccess {
  return permissions[permission] ?? "none";
}

export function isEmptyPermissions(permissions: Permissions): boolean {
  for (const access of Object.values(permissions)) {
    switch (access) {
      case "read":
      case "write":
      case "admin":
        return false;
    }
  }

  return true;
}

export function isSufficientPermissions(
  have: Permissions,
  want: Permissions,
): boolean {
  const permissions = Object.keys(want);

  if (isEmptyPermissions(want)) throw new Error("Empty permissions");

  for (const permission of permissions) {
    if (
      !isSufficientAccess(
        permissionAccess(have, permission),
        permissionAccess(want, permission),
      )
    ) {
      return false;
    }
  }

  return true;
}
