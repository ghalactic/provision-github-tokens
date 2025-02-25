import { isSufficientAccess } from "./access-level.js";
import type {
  PermissionAccess,
  PermissionName,
  Permissions,
} from "./type/github-api.js";

export function isSufficientPermissions(
  have: Permissions,
  want: Permissions,
): boolean {
  const wantEntries = Object.entries(want) as [
    PermissionName,
    PermissionAccess,
  ][];

  if (wantEntries.length < 1) throw new Error("Empty permissions");

  for (const [permission, access] of wantEntries) {
    if (!isSufficientAccess(have[permission] ?? "none", access)) return false;
  }

  return true;
}
