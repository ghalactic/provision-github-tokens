import { isSufficientAccess } from "./access-level.js";
import type { InstallationPermissions } from "./type/github-api.js";

export function isSufficientPermissions(
  have: InstallationPermissions,
  want: InstallationPermissions,
): boolean {
  const wantEntries = Object.entries(want);

  if (wantEntries.length < 1) throw new Error("Empty permissions");

  for (const [permission, access] of wantEntries) {
    if (!isSufficientAccess(have[permission], access)) return false;
  }

  return true;
}
