import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import { errorMessage, errorStack } from "../error.js";
import {
  accountOrRepoRefToString,
  repoRefToString,
} from "../github-reference.js";
import { FAIL_ICON, PASS_ICON, WARN_ICON, icon } from "../icon.js";
import { pluralize } from "../pluralize.js";
import {
  isRepoProvisionRequestTarget,
  type ProvisionRequestTarget,
} from "../provision-request.js";
import { secretTypeText } from "../secret-type.js";
import { prefixLines } from "../text.js";
import type {
  ProvisionAttempt,
  ProvisionResult,
  ProvisionResultExplainer,
} from "../type/provision-result.js";

export function createTextProvisionExplainer(): ProvisionResultExplainer<string> {
  return (authResult, targetResults) => {
    if (targetResults.size < 1) {
      return (
        `${FAIL_ICON} ` +
        `Secret ${authResult.request.name} wasn't provisioned ` +
        `for repo ${repoRefToString(authResult.request.requester)}:` +
        `\n  ${FAIL_ICON} No targets to provision to`
      );
    }

    const allProvisioned = [...targetResults.values()].every(
      (r) => r.type === "PROVISIONED",
    );
    const noneProvisioned = [...targetResults.values()].every(
      (r) => r.type !== "PROVISIONED",
    );
    const sortedTargetResults = [...targetResults.entries()].sort(([a], [b]) =>
      compareProvisionRequestTarget(a.target, b.target),
    );

    const status = allProvisioned
      ? "was provisioned"
      : noneProvisioned
        ? "wasn't provisioned"
        : "was partially provisioned";
    let output =
      `${icon(allProvisioned)} ` +
      `Secret ${authResult.request.name} ${status} ` +
      `for repo ${repoRefToString(authResult.request.requester)}:`;

    for (const [targetAuth, result] of sortedTargetResults) {
      output += explainTarget(targetAuth.target, result);
    }

    return output;
  };

  // The switch is exhaustive over the ProvisionResult union.
  // eslint-disable-next-line typescript/consistent-return
  function explainTarget(
    target: ProvisionRequestTarget,
    result: ProvisionResult,
  ): string {
    const subject = explainSubject(target);
    const isProvisioned = result.type === "PROVISIONED";
    const visibility = explainVisibility(target, isProvisioned);

    switch (result.type) {
      case "PROVISIONED": {
        const failed = renderFailedAttempts(
          result.failedAttempts,
          isProvisioned,
        );

        return (
          `\n  ${PASS_ICON} Provisioned to ${subject}` +
          `${failed ? ":" : ""}${visibility}${failed}`
        );
      }

      case "NOT_ALLOWED":
        return (
          `\n  ${FAIL_ICON} Not allowed to provision ` +
          `to ${subject}${visibility}`
        );

      case "NO_TOKEN":
        return (
          `\n  ${FAIL_ICON} Token wasn't created ` +
          `for ${subject}${visibility}`
        );

      case "NO_PROVISIONER":
        return (
          `\n  ${FAIL_ICON} No suitable provisioner ` +
          `for ${subject}${visibility}`
        );

      case "FAILED":
        return (
          `\n  ${FAIL_ICON} Failed to provision to ${subject}:` +
          `${visibility}${renderFailedAttempts(result.attempts, isProvisioned)}`
        );
    }
  }

  function renderFailedAttempts(
    attempts: ProvisionAttempt[],
    isProvisioned: boolean,
  ): string {
    if (attempts.length < 1) return "";

    const statusIcon = isProvisioned ? WARN_ICON : FAIL_ICON;
    let output = `\n    ${statusIcon} Failed attempts:`;
    let index = 0;

    for (const attempt of attempts) {
      ++index;
      const label = attempts.length > 1 ? `Attempt ${index}: ` : "";

      if (attempt.type === "REQUEST_ERROR") {
        const body = attempt.error.response?.data;
        const detail =
          typeof body === "undefined"
            ? "(no response data)"
            : JSON.stringify(body, null, 2);

        output +=
          `\n      ${statusIcon} ${label}` +
          `${attempt.error.status} - ${attempt.error.message}`;
        output += `\n${prefixLines("::debug::      ", detail)}`;
      } else {
        output +=
          `\n      ${statusIcon} ${label}` + errorMessage(attempt.error);
        output += `\n${prefixLines("::debug::      ", errorStack(attempt.error))}`;
      }
    }

    return output;
  }

  function explainSubject(target: ProvisionRequestTarget): string {
    return (
      `${secretTypeText(target)} secret in ` +
      accountOrRepoRefToString(target.target)
    );
  }

  function explainVisibility(
    target: ProvisionRequestTarget,
    isProvisioned: boolean,
  ): string {
    if (isRepoProvisionRequestTarget(target)) return "";

    const { visibility } = target;
    const statusIcon = icon(isProvisioned);
    const verb = isProvisioned ? "Readable by" : "Would've been readable by";

    if (visibility === "all" || visibility === "private") {
      return `\n    ${statusIcon} ${verb} ${visibility} repos`;
    }

    const repos: string[] = [];
    for (const { ref } of visibility.repos) repos.push(ref.repo);
    repos.sort((a, b) => a.localeCompare(b));

    if (repos.length < 1) return `\n    ${statusIcon} ${verb} no repos`;

    let output =
      `\n    ${statusIcon} ${verb} ` +
      `${pluralize(repos.length, "repo", "repos")}:`;

    for (const repo of repos) output += `\n      ${statusIcon} ${repo}`;

    return output;
  }
}
