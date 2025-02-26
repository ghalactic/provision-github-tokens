import type { PermissionAccess, Permissions } from "./type/permissions.js";

const ACCESS_RANK = {
  none: 0,
  read: 1,
  write: 2,
  admin: 3,
} as const;

export function isSufficientAccess(
  have: PermissionAccess,
  want: PermissionAccess,
): boolean {
  return ACCESS_RANK[have] >= ACCESS_RANK[want];
}

export function isWriteAccess(access: PermissionAccess): boolean {
  return ACCESS_RANK[access] > ACCESS_RANK.read;
}

export function maxAccess(permissions: Permissions): PermissionAccess {
  let max: PermissionAccess = "none";
  let maxRank = 0;

  for (const access of Object.values(permissions)) {
    const definedAccess = access ?? "none";
    const rank = ACCESS_RANK[definedAccess];

    if (rank > maxRank) {
      max = definedAccess;
      maxRank = rank;
    }
  }

  return max;
}
