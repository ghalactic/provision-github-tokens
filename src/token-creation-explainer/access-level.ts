import type { PermissionAccess } from "../type/permissions.js";

export const ACCESS_LEVEL_LABELS: Record<PermissionAccess, string> = {
  admin: "admin",
  none: "no-permission",
  read: "read-only",
  write: "write",
};
