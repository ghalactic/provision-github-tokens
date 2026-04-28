import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import { errorMessage, errorStack } from "../error.js";
import {
  accountOrRepoRefToString,
  repoRefToString,
} from "../github-reference.js";
import type { ProvisionRequestTarget } from "../provision-request.js";
import type { ProvisioningResult } from "../provisioner.js";
import { prefixLines } from "../text.js";
import type { ProvisioningResultExplainer } from "../type/provisioning-result.js";

const SUCCESS_ICON = "✅";
const FAILURE_ICON = "❌";

export function createTextProvisioningExplainer(): ProvisioningResultExplainer<string> {
  return (authResult, targetResults) => {
    if (targetResults.size < 1) {
      return (
        `${FAILURE_ICON} ` +
        `Secret ${authResult.request.name} wasn't provisioned ` +
        `for repo ${repoRefToString(authResult.request.requester)}:` +
        `\n  ${FAILURE_ICON} No targets to provision to`
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
    const icon = allProvisioned ? SUCCESS_ICON : FAILURE_ICON;

    let output =
      `${icon} ` +
      `Secret ${authResult.request.name} ${status} ` +
      `for repo ${repoRefToString(authResult.request.requester)}:`;

    for (const [targetAuth, result] of sortedTargetResults) {
      output += explainTarget(targetAuth.target, result);
    }

    return output;
  };

  function explainTarget(
    target: ProvisionRequestTarget,
    result: ProvisioningResult,
  ): string {
    const subject = explainSubject(target);

    switch (result.type) {
      case "PROVISIONED":
        return `\n  ${SUCCESS_ICON} Provisioned to ${subject}`;

      case "NOT_ALLOWED":
        return `\n  ${FAILURE_ICON} Not allowed to provision to ${subject}`;

      case "NO_TOKEN":
        return `\n  ${FAILURE_ICON} Token wasn't created for ${subject}`;

      case "NO_PROVISIONER":
        return `\n  ${FAILURE_ICON} No suitable provisioner for ${subject}`;

      case "REQUEST_ERROR": {
        const summary =
          `${FAILURE_ICON} Failed to provision to ${subject}: ` +
          `${result.error.status} - ${result.error.message}`;
        const body = result.error.response?.data;

        const detail =
          typeof body === "undefined"
            ? "(no response data)"
            : JSON.stringify(body, null, 2);

        return `\n  ${summary}\n${prefixLines("::debug::      ", detail)}`;
      }

      case "ERROR": {
        return (
          `\n  ${FAILURE_ICON} Failed to provision to ${subject}: ` +
          `${errorMessage(result.error)}` +
          `\n${prefixLines("::debug::      ", errorStack(result.error))}`
        );
      }
    }
  }

  function explainSubject(target: ProvisionRequestTarget): string {
    const type = ((r) => {
      const type = r.type;

      switch (type) {
        case "actions":
          return "GitHub Actions";
        case "codespaces":
          return "GitHub Codespaces";
        case "dependabot":
          return "Dependabot";
        case "environment":
          return `GitHub environment ${r.target.environment}`;
      }

      /* istanbul ignore next - @preserve */
      throw new Error(
        `Invariant violation: Unexpected secret type ${JSON.stringify(type)}`,
      );
    })(target);

    return `${type} secret in ${accountOrRepoRefToString(target.target)}`;
  }
}
