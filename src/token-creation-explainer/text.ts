import { maxAccess } from "../access-level.js";
import { errorMessage, errorStack } from "../error.js";
import {
  type AccountOrRepoReference,
  isRepoRef,
  repoRefToString,
} from "../github-reference.js";
import { FAIL_ICON, WARN_ICON, icon } from "../icon.js";
import { effectivePermissions } from "../permissions.js";
import { pluralize } from "../pluralize.js";
import { createSequencer } from "../sequencer.js";
import { capitalize, prefixLines } from "../text.js";
import type { PermissionAccess } from "../type/permissions.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";
import type {
  TokenCreationAttempt,
  TokenCreationResult,
  TokenCreationResultExplainer,
} from "../type/token-creation-result.js";
import { ACCESS_LEVEL_LABELS } from "./access-level.js";

export function createTextTokenCreationExplainer(): TokenCreationResultExplainer<string> {
  const tokenSeq = createSequencer<TokenAuthResult>();
  const firstTokenIndex = new Map<TokenCreationResult, number>();

  return (authResult, creationResult) => {
    const currentIndex = tokenSeq(authResult);
    let firstIndex = firstTokenIndex.get(creationResult);

    if (typeof firstIndex === "undefined") {
      firstIndex = currentIndex;
      firstTokenIndex.set(creationResult, firstIndex);
    }

    if (firstIndex !== currentIndex) {
      return (
        `${icon(creationResult.type === "CREATED")} Same result ` +
        `as token #${firstIndex}`
      );
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
    lines.push(...renderErrorLines(result, authResult.request.consumer));

    const subIcon = icon(isSuccess || undefined);
    const verb = isSuccess ? "Has" : "Wanted";

    if (hasPermissions) {
      const roleStr = role ? `with role ${role}` : "without a role";
      lines.push(`  ${subIcon} ${verb} ${access} access ${roleStr}`);
    }

    lines.push(...renderRepoLines(subIcon, verb, repos, account));
    lines.push(...renderPermissionLines(subIcon, verb, permEntries));

    const attempts = resultAttempts(result);
    if (attempts.length > 0) {
      lines.push(...renderFailedAttempts(attempts, isSuccess));
    }

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
    const label = ACCESS_LEVEL_LABELS[access];

    if (isSuccess) {
      return (
        `${icon(isSuccess)} ${capitalize(label)} token created ` +
        `with access to ${scope}:`
      );
    }

    const verb = type === "NOT_ALLOWED" ? "Refused" : "Failed";

    return (
      `${icon(isSuccess)} ${verb} to create ${label} token ` +
      `with access to ${scope}:`
    );
  }

  // The switch is exhaustive over the TokenCreationResult union.
  // eslint-disable-next-line typescript/consistent-return
  function renderErrorLines(
    result: TokenCreationResult,
    consumer: AccountOrRepoReference,
  ): string[] {
    switch (result.type) {
      case "CREATED":
      case "FAILED":
        return [];

      case "NOT_ALLOWED": {
        const suffix = isRepoRef(consumer)
          ? ` for repo ${repoRefToString(consumer)}`
          : ` for account ${consumer.account}`;

        return [`  ${FAIL_ICON} Token not allowed${suffix}`];
      }

      case "NO_ISSUER":
        return [`  ${FAIL_ICON} No suitable issuer`];
    }
  }

  function resultAttempts(result: TokenCreationResult): TokenCreationAttempt[] {
    if (result.type === "CREATED") return result.failedAttempts;
    if (result.type === "FAILED") return result.attempts;

    return [];
  }

  function renderFailedAttempts(
    attempts: TokenCreationAttempt[],
    isSuccess: boolean,
  ): string[] {
    const statusIcon = isSuccess ? WARN_ICON : FAIL_ICON;

    return [
      `  ${statusIcon} Failed attempts:`,
      ...renderAttemptItems(statusIcon, attempts),
    ];
  }

  function renderAttemptItems(
    statusIcon: string,
    attempts: TokenCreationAttempt[],
  ): string[] {
    const lines: string[] = [];

    for (const attempt of attempts) {
      if (attempt.type === "REQUEST_ERROR") {
        const body = attempt.error.response?.data;
        const detail =
          typeof body === "undefined"
            ? "(no response data)"
            : JSON.stringify(body, null, 2);

        lines.push(
          `    ${statusIcon} ` +
            `${attempt.error.status} - ${attempt.error.message}`,
        );
        lines.push(prefixLines("::debug::      ", detail));
      } else {
        lines.push(`    ${statusIcon} ${errorMessage(attempt.error)}`);
        lines.push(prefixLines("::debug::      ", errorStack(attempt.error)));
      }
    }

    return lines;
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

  function repoScopeLabel(repos: "all" | string[], account: string): string {
    if (repos === "all") return `all repos in ${account}`;
    if (repos.length < 1) return account;

    return `${pluralize(repos.length, "repo", "repos")} in ${account}`;
  }
}
