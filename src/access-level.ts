import type { PermissionAccess } from "./type/github-api.js";

const ACCESS_RANK = {
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
