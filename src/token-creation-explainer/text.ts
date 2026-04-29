import { maxAccess } from "../access-level.js";
import { errorMessage, errorStack } from "../error.js";
import { FAIL_ICON, icon, PASS_ICON } from "../icon.js";
import { pluralize } from "../pluralize.js";
import { capitalize, prefixLines } from "../text.js";
import type { TokenCreationResult } from "../token-factory.js";
import type { PermissionAccess, Permissions } from "../type/permissions.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";
import type { TokenCreationResultExplainer } from "../type/token-creation-result.js";

export function createTextTokenCreationExplainer(
  results: Map<TokenAuthResult, TokenCreationResult>,
): TokenCreationResultExplainer<string> {
  const resultIndices = new Map<TokenCreationResult, number>();
  const authResultIndices = new Map<TokenAuthResult, number>();

  let index = 0;
  for (const [authResult, result] of results) {
    authResultIndices.set(authResult, index);
    if (!resultIndices.has(result)) resultIndices.set(result, index);

    ++index;
  }

  return (authResult, creationResult) => {
    const currentIndex = authResultIndices.get(authResult);
    const firstIndex = resultIndices.get(creationResult);

    if (
      creationResult.type === "CREATED" &&
      typeof currentIndex !== "undefined" &&
      typeof firstIndex !== "undefined" &&
      firstIndex !== currentIndex
    ) {
      return `${PASS_ICON} Same token as #${firstIndex + 1}`;
    }

    return explainResult(authResult, creationResult);
  };

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

    const subIcon = icon(isSuccess || undefined);
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
    const label = headerAccessLabel(access);

    if (isSuccess) {
      return (
        `${icon(isSuccess)} ${capitalize(label)} token created ` +
        `with access to ${scope}:`
      );
    }

    const prefix = label ? `${label} ` : "";
    const verb = type === "NOT_ALLOWED" ? "Refused" : "Failed";

    return (
      `${icon(isSuccess)} ${verb} to create ${prefix}token ` +
      `with access to ${scope}:`
    );
  }

  function renderErrorLines(result: TokenCreationResult): string[] {
    switch (result.type) {
      case "CREATED":
        return [];

      case "NOT_ALLOWED":
        return [`  ${FAIL_ICON} Token not allowed`];

      case "NO_ISSUER":
        return [`  ${FAIL_ICON} No suitable issuer`];

      case "REQUEST_ERROR": {
        const body = result.error.response?.data;
        const detail =
          typeof body === "undefined"
            ? "(no response data)"
            : JSON.stringify(body, null, 2);

        return [
          `  ${FAIL_ICON} ${result.error.status} - ${result.error.message}`,
          prefixLines("::debug::      ", detail),
        ];
      }

      case "ERROR":
        return [
          `  ${FAIL_ICON} ${errorMessage(result.error)}`,
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

    if (repos.length < 1) return [`  ${icon} ${verb} account-only access`];

    const lines = [
      `  ${icon} ${verb} access ` +
        `to ${pluralize(repos.length, "repo", "repos")} ` +
        `in ${account}:`,
    ];

    for (const repo of repos) lines.push(`    ${icon} ${account}/${repo}`);

    return lines;
  }

  function renderPermissionLines(
    icon: string,
    verb: string,
    permEntries: [string, PermissionAccess][],
  ): string[] {
    if (permEntries.length < 1) {
      return [`  ${FAIL_ICON} No permissions requested`];
    }

    const lines = [
      `  ${icon} ${verb} ` +
        `${pluralize(permEntries.length, "permission", "permissions")}:`,
    ];

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
    }

    return "";
  }

  function repoScopeLabel(repos: "all" | string[], account: string): string {
    if (repos === "all") return `all repos in ${account}`;
    if (repos.length < 1) return account;

    return `${pluralize(repos.length, "repo", "repos")} in ${account}`;
  }

  function effectivePermissions(
    permissions: Permissions,
  ): [string, PermissionAccess][] {
    const entries: [string, PermissionAccess][] = [];

    for (const [name, access = "none"] of Object.entries(permissions)) {
      if (access !== "none") entries.push([name, access]);
    }

    entries.sort(([a], [b]) => a.localeCompare(b));

    return entries;
  }
}
