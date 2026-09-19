import type { BlockContent, Html, List, Paragraph } from "mdast";
import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import { errorMessage, errorStack } from "../error.js";
import {
  accountOrRepoRefToString,
  repoRefToString,
} from "../github-reference.js";
import { FAIL_ICON, icon, PASS_ICON } from "../icon.js";
import { details, inlineCode, list, text } from "../markdown.js";
import type { ProvisionRequestTarget } from "../provision-request.js";
import type { ProvisionAuthResult } from "../type/provision-auth-result.js";
import type {
  ProvisionResult,
  ProvisionResultExplainer,
} from "../type/provision-result.js";

type ListItemSpec = {
  contents: Paragraph["children"];
  nested?: List;
};

export function createMarkdownProvisionExplainer(): ProvisionResultExplainer<
  BlockContent[]
> {
  return (authResult, targetResults) => {
    if (targetResults.size < 1) {
      return [noTargetsDashboard(authResult)];
    }

    const { request } = authResult;
    const targetEntries = [...targetResults.entries()].sort(([a], [b]) =>
      compareProvisionRequestTarget(a.target, b.target),
    );
    const allProvisioned = targetEntries.every(
      ([, result]) => result.type === "PROVISIONED",
    );
    const noneProvisioned = targetEntries.every(
      ([, result]) => result.type !== "PROVISIONED",
    );
    const status = allProvisioned
      ? "was provisioned"
      : noneProvisioned
        ? "wasn't provisioned"
        : "was partially provisioned";

    const items: ListItemSpec[] = [
      {
        contents: [
          text(`${icon(allProvisioned)} Secret `),
          inlineCode(request.name),
          text(` ${status} for repo `),
          inlineCode(repoRefToString(request.requester)),
          text(":"),
        ],
      },
    ];
    const errorDetails: Html[] = [];

    for (const [targetAuth, result] of targetEntries) {
      const { item, detail } = explainTarget(targetAuth.target, result);

      items.push(item);
      if (detail) errorDetails.push(details(detail));
    }

    return [list(items), ...errorDetails];
  };

  function noTargetsDashboard(authResult: ProvisionAuthResult): BlockContent {
    return list([
      {
        contents: [
          text(`${FAIL_ICON} Secret `),
          inlineCode(authResult.request.name),
          text(" wasn't provisioned for repo "),
          inlineCode(repoRefToString(authResult.request.requester)),
          text(":"),
        ],
        nested: list([
          { contents: [text(`${FAIL_ICON} No targets to provision to`)] },
        ]),
      },
    ]);
  }

  function explainTarget(
    target: ProvisionRequestTarget,
    result: ProvisionResult,
  ): { item: ListItemSpec; detail?: string } {
    const suffix = explainSubject(target);

    switch (result.type) {
      case "PROVISIONED":
        return {
          item: {
            contents: [text(`${PASS_ICON} Provisioned to `), ...suffix],
          },
        };

      case "NOT_ALLOWED":
        return {
          item: {
            contents: [
              text(`${FAIL_ICON} Not allowed to provision to `),
              ...suffix,
            ],
          },
        };

      case "NO_TOKEN":
        return {
          item: {
            contents: [
              text(`${FAIL_ICON} Token wasn't created for `),
              ...suffix,
            ],
          },
        };

      case "NO_PROVISIONER":
        return {
          item: {
            contents: [
              text(`${FAIL_ICON} No suitable provisioner for `),
              ...suffix,
            ],
          },
        };

      case "REQUEST_ERROR": {
        const body = result.error.response?.data;
        const detail =
          typeof body === "undefined"
            ? "(no response data)"
            : JSON.stringify(body, null, 2);

        return {
          item: {
            contents: [
              text(`${FAIL_ICON} Failed to provision to `),
              ...suffix,
              text(`: ${result.error.status} - ${result.error.message}`),
            ],
          },
          detail,
        };
      }

      case "ERROR":
        return {
          item: {
            contents: [
              text(`${FAIL_ICON} Failed to provision to `),
              ...suffix,
              text(`: ${errorMessage(result.error)}`),
            ],
          },
          detail: errorStack(result.error),
        };
    }
  }

  function explainSubject(
    target: ProvisionRequestTarget,
  ): Paragraph["children"] {
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

    return [
      text(`${type} secret in `),
      inlineCode(accountOrRepoRefToString(target.target)),
    ];
  }
}
