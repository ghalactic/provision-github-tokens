import { compareRef } from "./compare-ref.js";
import type { TokenRequest } from "./token-request.js";
import type { PermissionAccess } from "./type/permissions.js";

const ACCESS_ORDER: Record<PermissionAccess, number> = {
  admin: 0,
  write: 1,
  read: 2,
  none: 3,
};

export function compareTokenRequest(a: TokenRequest, b: TokenRequest): number {
  const targetCompare = compareRef(a.consumer, b.consumer);
  if (targetCompare !== 0) return targetCompare;

  const tokenAccountCompare = a.tokenDec.account.localeCompare(
    b.tokenDec.account,
  );
  if (tokenAccountCompare !== 0) return tokenAccountCompare;

  const aTypeOrder = a.repos === "all" ? 1 : a.repos.length === 0 ? 0 : 2;
  const bTypeOrder = b.repos === "all" ? 1 : b.repos.length === 0 ? 0 : 2;
  const typeCompare = aTypeOrder - bTypeOrder;
  if (typeCompare !== 0) return typeCompare;

  if (Array.isArray(a.repos) && Array.isArray(b.repos)) {
    const aRepos = JSON.stringify(a.repos.toSorted());
    const bRepos = JSON.stringify(b.repos.toSorted());
    const reposCompare = aRepos.localeCompare(bRepos);
    if (reposCompare !== 0) return reposCompare;
  }

  const permissionNames = Array.from(
    new Set([
      ...Object.keys(a.tokenDec.permissions),
      ...Object.keys(b.tokenDec.permissions),
    ]),
  ).sort();

  for (const permission of permissionNames) {
    const aPerm = a.tokenDec.permissions[permission] ?? "none";
    const bPerm = b.tokenDec.permissions[permission] ?? "none";

    const accessCompare = ACCESS_ORDER[aPerm] - ACCESS_ORDER[bPerm];
    if (accessCompare !== 0) return accessCompare;
  }

  return 0;
}
