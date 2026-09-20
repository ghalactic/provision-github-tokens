import type { PermissionAccess } from "../type/permissions.js";

export const ACCESS_LEVEL_LABELS: Record<PermissionAccess, string> = {
  none: "No",
  admin: "Admin",
  read: "Read",
  write: "Write",
};
