import type { ListItem, PhrasingContent, RootContent } from "mdast";
import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import { errorMessage, errorStack } from "../error.js";
import {
  accountOrRepoRefToString,
  repoRefToString,
} from "../github-reference.js";
import { FAIL_ICON, PASS_ICON, icon } from "../icon.js";
import {
  code,
  details,
  emphasis,
  inlineCode,
  list,
  listItem,
  paragraph,
  strong,
  text,
} from "../markdown.js";
import type { ProvisionRequestTarget } from "../provision-request.js";
import { secretTypeMdast } from "../secret-type.js";
import type {
  ProvisionResult,
  ProvisionResultExplainer,
} from "../type/provision-result.js";

export function createMarkdownProvisionExplainer(): ProvisionResultExplainer<
  RootContent[]
> {
  return (authResult, targetResults) => {
    if (targetResults.size < 1) {
      return [
        list(
          listItem(
            paragraph(
              text(`${FAIL_ICON} Secret `),
              inlineCode(authResult.request.name),
              text(" "),
              strong(text("wasn't")),
              text(" provisioned for repo "),
              inlineCode(repoRefToString(authResult.request.requester)),
              text(":"),
            ),
            list(
              listItem(
                paragraph(text(`${FAIL_ICON} No targets to provision to`)),
              ),
            ),
          ),
        ),
      ];
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

    const targets = list();

    for (const [targetAuth, result] of sortedTargetResults) {
      targets.children.push(
        listItem(...explainTarget(targetAuth.target, result)),
      );
    }

    return [
      list(
        listItem(
          paragraph(
            text(`${icon(allProvisioned)} Secret `),
            inlineCode(authResult.request.name),
            text(" "),
            ...(allProvisioned
              ? [strong(text("was")), text(" provisioned")]
              : noneProvisioned
                ? [strong(text("wasn't")), text(" provisioned")]
                : [
                    text("was "),
                    strong(text("partially")),
                    text(" provisioned"),
                  ]),
            text(" for repo "),
            inlineCode(repoRefToString(authResult.request.requester)),
            text(":"),
          ),
          targets,
        ),
      ),
    ];
  };

  function explainTarget(
    target: ProvisionRequestTarget,
    result: ProvisionResult,
  ): ListItem["children"] {
    const subject = explainSubject(target);

    switch (result.type) {
      case "PROVISIONED":
        return [
          paragraph(
            text(`${PASS_ICON} `),
            strong(text("Provisioned")),
            text(" to "),
            ...subject,
          ),
        ];

      case "NOT_ALLOWED":
        return [
          paragraph(
            text(`${FAIL_ICON} `),
            strong(text("Not allowed")),
            text(" to provision to "),
            ...subject,
          ),
        ];

      case "NO_TOKEN":
        return [
          paragraph(
            text(`${FAIL_ICON} Token `),
            strong(text("wasn't")),
            text(" created for "),
            ...subject,
          ),
        ];

      case "NO_PROVISIONER":
        return [
          paragraph(
            text(`${FAIL_ICON} No suitable provisioner for `),
            ...subject,
          ),
        ];

      case "REQUEST_ERROR": {
        const body = result.error.response?.data;

        return [
          paragraph(
            text(`${FAIL_ICON} `),
            strong(text("Failed")),
            text(" to provision to "),
            ...subject,
            text(":"),
          ),
          list(
            listItem(
              paragraph(
                text(`${FAIL_ICON} `),
                strong(text(String(result.error.status))),
                text(" - "),
                emphasis(text(result.error.message)),
              ),
              ...details(
                "Response body",
                typeof body === "undefined"
                  ? paragraph(emphasis(text("(no response data)")))
                  : code("json", JSON.stringify(body, null, 2)),
              ),
            ),
          ),
        ];
      }

      case "ERROR":
        return [
          paragraph(
            text(`${FAIL_ICON} `),
            strong(text("Failed")),
            text(" to provision to "),
            ...subject,
            text(":"),
          ),
          list(
            listItem(
              paragraph(text(`${FAIL_ICON} ${errorMessage(result.error)}`)),
              ...details("Error stack", code("text", errorStack(result.error))),
            ),
          ),
        ];
    }
  }

  function explainSubject(target: ProvisionRequestTarget): PhrasingContent[] {
    return [
      ...secretTypeMdast(target),
      text(" secret in "),
      inlineCode(accountOrRepoRefToString(target.target)),
    ];
  }
}
