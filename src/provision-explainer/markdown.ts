import type { List, ListItem, PhrasingContent, RootContent } from "mdast";
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
import { pluralize } from "../pluralize.js";
import {
  isRepoProvisionRequestTarget,
  type ProvisionRequestTarget,
} from "../provision-request.js";
import { secretTypeMdast } from "../secret-type.js";
import type {
  ProvisionAttempt,
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

  // The switch is exhaustive over the ProvisionResult union.
  // eslint-disable-next-line typescript/consistent-return
  function explainTarget(
    target: ProvisionRequestTarget,
    result: ProvisionResult,
  ): ListItem["children"] {
    const subject = explainSubject(target);
    const isProvisioned = result.type === "PROVISIONED";
    const visibility = explainVisibility(target, isProvisioned);

    switch (result.type) {
      case "PROVISIONED": {
        const failed = renderAttempts(result.failedAttempts);

        return [
          paragraph(
            text(`${PASS_ICON} `),
            strong(text("Provisioned")),
            text(" to "),
            ...subject,
            ...(failed.length > 0 ? [text(":")] : []),
          ),
          ...nestedList(...failed, ...visibility),
        ];
      }

      case "NOT_ALLOWED":
        return [
          paragraph(
            text(`${FAIL_ICON} `),
            strong(text("Not allowed")),
            text(" to provision to "),
            ...subject,
          ),
          ...nestedList(...visibility),
        ];

      case "NO_TOKEN":
        return [
          paragraph(
            text(`${FAIL_ICON} Token `),
            strong(text("wasn't")),
            text(" created for "),
            ...subject,
          ),
          ...nestedList(...visibility),
        ];

      case "NO_PROVISIONER":
        return [
          paragraph(
            text(`${FAIL_ICON} No suitable provisioner for `),
            ...subject,
          ),
          ...nestedList(...visibility),
        ];

      case "FAILED":
        return [
          paragraph(
            text(`${FAIL_ICON} `),
            strong(text("Failed")),
            text(" to provision to "),
            ...subject,
            text(":"),
          ),
          list(...visibility, ...renderAttempts(result.attempts)),
        ];
    }
  }

  function renderAttempts(attempts: ProvisionAttempt[]): ListItem[] {
    const items: ListItem[] = [];
    let index = 0;

    for (const attempt of attempts) {
      ++index;
      const label = attempts.length > 1 ? `Attempt ${index}: ` : "";

      if (attempt.type === "REQUEST_ERROR") {
        const body = attempt.error.response?.data;

        items.push(
          listItem(
            paragraph(
              text(`${FAIL_ICON} ${label}`),
              strong(text(String(attempt.error.status))),
              text(" - "),
              emphasis(text(attempt.error.message)),
            ),
            ...details(
              "Response body",
              typeof body === "undefined"
                ? paragraph(emphasis(text("(no response data)")))
                : code("json", JSON.stringify(body, null, 2)),
            ),
          ),
        );
      } else {
        items.push(
          listItem(
            paragraph(
              text(`${FAIL_ICON} ${label}${errorMessage(attempt.error)}`),
            ),
            ...details("Error stack", code("text", errorStack(attempt.error))),
          ),
        );
      }
    }

    return items;
  }

  function explainSubject(target: ProvisionRequestTarget): PhrasingContent[] {
    return [
      ...secretTypeMdast(target),
      text(" secret in "),
      inlineCode(accountOrRepoRefToString(target.target)),
    ];
  }

  function explainVisibility(
    target: ProvisionRequestTarget,
    isProvisioned: boolean,
  ): ListItem[] {
    if (isRepoProvisionRequestTarget(target)) return [];

    const { visibility } = target;
    const statusIcon = icon(isProvisioned);
    const verb = isProvisioned ? "Readable by" : "Would've been readable by";

    if (visibility === "all" || visibility === "private") {
      return [
        listItem(
          paragraph(
            text(`${statusIcon} ${verb} `),
            strong(text(`${visibility} repos`)),
          ),
        ),
      ];
    }

    const repos: string[] = [];
    for (const { ref } of visibility.repos) repos.push(ref.repo);
    repos.sort((a, b) => a.localeCompare(b));

    if (repos.length < 1) {
      return [
        listItem(
          paragraph(text(`${statusIcon} ${verb} `), strong(text("no repos"))),
        ),
      ];
    }

    const repoItems: ListItem[] = [];
    for (const repo of repos) {
      repoItems.push(
        listItem(paragraph(text(`${statusIcon} `), inlineCode(repo))),
      );
    }

    return [
      listItem(
        paragraph(
          text(`${statusIcon} ${verb} `),
          strong(text(pluralize(repos.length, "repo", "repos"))),
          text(":"),
        ),
        list(...repoItems),
      ),
    ];
  }

  function nestedList(...children: ListItem[]): List[] {
    return children.length > 0 ? [list(...children)] : [];
  }
}
