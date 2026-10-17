import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import { errorMessage, errorStack } from "../error.js";
import {
  accountOrRepoRefToString,
  repoRefToString,
} from "../github-reference.js";
import { FAIL_ICON, icon, PASS_ICON } from "../icon.js";
import { pluralize } from "../pluralize.js";
import {
  isRepoProvisionRequestTarget,
  type ProvisionRequestTarget,
} from "../provision-request.js";
import { secretTypeText } from "../secret-type.js";
import { prefixLines } from "../text.js";
import type {
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

  function explainTarget(
    target: ProvisionRequestTarget,
    result: ProvisionResult,
  ): string {
    const subject = explainSubject(target);
    const isProvisioned = result.type === "PROVISIONED";
    const visibility = explainVisibility(target, isProvisioned);

    switch (result.type) {
      case "PROVISIONED":
        return `\n  ${PASS_ICON} Provisioned to ${subject}${visibility}`;

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

      case "REQUEST_ERROR": {
        const summary =
          `${FAIL_ICON} Failed to provision to ${subject}: ` +
          `${result.error.status} - ${result.error.message}`;
        const body = result.error.response?.data;

        const detail =
          typeof body === "undefined"
            ? "(no response data)"
            : JSON.stringify(body, null, 2);

        return (
          `\n  ${summary}${visibility}` +
          `\n${prefixLines("::debug::      ", detail)}`
        );
      }

      case "ERROR": {
        return (
          `\n  ${FAIL_ICON} Failed to provision to ${subject}: ` +
          `${errorMessage(result.error)}${visibility}` +
          `\n${prefixLines("::debug::      ", errorStack(result.error))}`
        );
      }
    }
  }

  function explainSubject(target: ProvisionRequestTarget): string {
    return (
      `${secretTypeText(target)} secret in ` +
      `${accountOrRepoRefToString(target.target)}`
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
