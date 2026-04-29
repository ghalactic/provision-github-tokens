import { maxAccess } from "../access-level.js";
import { errorMessage, errorStack } from "../error.js";
import { prefixLines } from "../text.js";
import type { TokenCreationResult } from "../token-factory.js";
import type { PermissionAccess, Permissions } from "../type/permissions.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";
import type { TokenCreationResultExplainer } from "../type/token-creation-result.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";
const INFO_ICON = "ℹ️";

export function createTextTokenCreationExplainer(
  results: Map<TokenAuthResult, TokenCreationResult>,
): TokenCreationResultExplainer<string> {
  const resultIndexes = new Map<TokenCreationResult, number>();
  const authResultIndexes = new Map<TokenAuthResult, number>();

  let index = 0;
  for (const [authResult, result] of results) {
    authResultIndexes.set(authResult, index);
    if (!resultIndexes.has(result)) resultIndexes.set(result, index);

    ++index;
  }

  return (authResult, creationResult) => {
    const currentIndex = authResultIndexes.get(authResult);
    const firstIndex = resultIndexes.get(creationResult);

    if (
      creationResult.type === "CREATED" &&
      typeof currentIndex !== "undefined" &&
      typeof firstIndex !== "undefined" &&
      firstIndex !== currentIndex
    ) {
      return `${ALLOWED_ICON} Same token as #${firstIndex + 1}`;
    }

    return explainResult(authResult, creationResult);
  };
}

function explainResult(
  authResult: TokenAuthResult,
  result: TokenCreationResult,
): string {
  const { account, permissions, as: role } = authResult.request.tokenDec;
  const { repos } = authResult.request;
  const access = maxAccess(permissions);
  const isSuccess = result.type === "CREATED";
  const permEntries = effectivePermissions(permissions);
  const hasPermissions = permEntries.length > 0;

  const lines: string[] = [];

  lines.push(renderHeader(result.type, access, repos, account));
  lines.push(...renderErrorLines(result));

  const subIcon = isSuccess ? ALLOWED_ICON : INFO_ICON;
  const verb = isSuccess ? "Has" : "Wanted";

  if (hasPermissions) {
    const roleStr = role ? `with role ${role}` : "without a role";
    lines.push(`  ${subIcon} ${verb} ${access} access ${roleStr}`);
  }

  lines.push(...renderRepoLines(subIcon, verb, repos, account));
  lines.push(...renderPermissionLines(subIcon, verb, permEntries));

  return lines.join("\n");
}

function renderHeader(
  type: TokenCreationResult["type"],
  access: PermissionAccess,
  repos: "all" | string[],
  account: string,
): string {
  const scope = repoScopeLabel(repos, account);
  const isSuccess = type === "CREATED";
  const icon = isSuccess ? ALLOWED_ICON : DENIED_ICON;
  const label = headerAccessLabel(access);

  if (isSuccess) {
    const prefix = label ? `${capitalize(label)} ` : "";

    return `${icon} ${prefix}token created with access to ${scope}:`;
  }

  const prefix = label ? `${label} ` : "";
  const verb = type === "NOT_ALLOWED" ? "Refused" : "Failed";

  return `${icon} ${verb} to create ${prefix}token with access to ${scope}:`;
}

function renderErrorLines(result: TokenCreationResult): string[] {
  switch (result.type) {
    case "CREATED":
      return [];

    case "NOT_ALLOWED":
      return [`  ${DENIED_ICON} Token not allowed`];

    case "NO_ISSUER":
      return [`  ${DENIED_ICON} No suitable issuer`];

    case "REQUEST_ERROR": {
      const body = result.error.response?.data;
      const detail =
        typeof body === "undefined"
          ? "(no response data)"
          : JSON.stringify(body, null, 2);

      return [
        `  ${DENIED_ICON} ${result.error.status} - ${result.error.message}`,
        prefixLines("::debug::      ", detail),
      ];
    }

    case "ERROR":
      return [
        `  ${DENIED_ICON} ${errorMessage(result.error)}`,
        prefixLines("::debug::      ", errorStack(result.error)),
      ];
  }
}

function renderRepoLines(
  icon: string,
  verb: string,
  repos: "all" | string[],
  account: string,
): string[] {
  if (repos === "all") {
    return [`  ${icon} ${verb} access to all repos in ${account}`];
  }

  if (repos.length === 0) {
    return [`  ${icon} ${verb} account-only access`];
  }

  const repoWord = repos.length === 1 ? "repo" : "repos";
  const lines = [
    `  ${icon} ${verb} access to ${repos.length} ${repoWord} in ${account}:`,
  ];

  for (const repo of repos) {
    lines.push(`    ${icon} ${account}/${repo}`);
  }

  return lines;
}

function renderPermissionLines(
  icon: string,
  verb: string,
  permEntries: [string, PermissionAccess][],
): string[] {
  if (permEntries.length === 0) {
    return [`  ${DENIED_ICON} No permissions requested`];
  }

  const permWord = permEntries.length === 1 ? "permission" : "permissions";
  const lines = [`  ${icon} ${verb} ${permEntries.length} ${permWord}:`];

  for (const [name, access] of permEntries) {
    lines.push(`    ${icon} ${name}: ${access}`);
  }

  return lines;
}

function headerAccessLabel(access: PermissionAccess): string {
  switch (access) {
    case "read":
      return "read-only";
    case "write":
      return "write";
    case "admin":
      return "admin";
    case "none":
      return "";
  }
}

function repoScopeLabel(repos: "all" | string[], account: string): string {
  if (repos === "all") return `all repos in ${account}`;
  if (repos.length === 0) return account;

  const repoWord = repos.length === 1 ? "repo" : "repos";

  return `${repos.length} ${repoWord} in ${account}`;
}

function effectivePermissions(
  permissions: Permissions,
): [string, PermissionAccess][] {
  return (
    Object.entries(permissions).filter(
      ([, access]) => access != null && access !== "none",
    ) as [string, PermissionAccess][]
  ).sort(([a], [b]) => a.localeCompare(b));
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
