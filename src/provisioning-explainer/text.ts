import { debug } from "@actions/core";
import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import { errorMessage, errorStack } from "../error.js";
import {
  accountOrRepoRefToString,
  repoRefToString,
} from "../github-reference.js";
import type { ProvisionRequestTarget } from "../provision-request.js";
import type { ProvisioningResult } from "../provisioner.js";
import { indent } from "../text.js";
import type { ProvisioningResultExplainer } from "../type/provisioning-result.js";

const SUCCESS_ICON = "✅";
const FAILURE_ICON = "❌";

export function createTextProvisioningExplainer(): ProvisioningResultExplainer<string> {
  return (authResult, targetResults) => {
    /* istanbul ignore next - @preserve */
    if (targetResults.size < 1) {
      throw new Error("Invariant violation: targetResults must not be empty");
    }

    const allProvisioned = [...targetResults.values()].every(
      (result) => result.type === "PROVISIONED",
    );

    let output =
      `${allProvisioned ? SUCCESS_ICON : FAILURE_ICON} ` +
      `Repo ${repoRefToString(authResult.request.requester)} ` +
      `${allProvisioned ? "provisioned" : "didn't fully provision"} ` +
      `secret ${authResult.request.name}:`;

    for (const [targetAuth, result] of [...targetResults.entries()].sort(
      ([a], [b]) => compareProvisionRequestTarget(a.target, b.target),
    )) {
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
        return `\n  ${FAILURE_ICON} Not allowed to ${subject}`;

      case "NO_TOKEN":
        return `\n  ${FAILURE_ICON} Token wasn't created for ${subject}`;

      case "NO_PROVISIONER":
        return `\n  ${FAILURE_ICON} No suitable provisioner for ${subject}`;

      case "REQUEST_ERROR": {
        const summary =
          `${FAILURE_ICON} Failed to provision to ${subject}: ` +
          `${result.error.status}: ${result.error.message}`;
        const body = result.error.response?.data;

        if (typeof body === "undefined") {
          debug(`${subject}:`);
          debug(indent("    ", "(no response data)"));
        } else {
          debug(`${subject}:`);
          debug(indent("    ", JSON.stringify(body, null, 2)));
        }

        return `\n  ${summary}`;
      }

      case "ERROR": {
        const summary =
          `${FAILURE_ICON} Failed to provision to ${subject}: ` +
          `${errorMessage(result.error)}`;

        debug(`${subject}:`);
        debug(indent("    ", errorStack(result.error)));

        return `\n  ${summary}`;
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
