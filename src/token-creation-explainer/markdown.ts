import type { ListItem, Paragraph, PhrasingContent, RootContent } from "mdast";
import { maxAccess } from "../access-level.js";
import { errorMessage, errorStack } from "../error.js";
import {
  type AccountOrRepoReference,
  isRepoRef,
  repoRefToString,
} from "../github-reference.js";
import { FAIL_ICON, WARN_ICON, icon } from "../icon.js";
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
import { effectivePermissions } from "../permissions.js";
import { pluralize } from "../pluralize.js";
import { createSequencer } from "../sequencer.js";
import { capitalize } from "../text.js";
import type { PermissionAccess } from "../type/permissions.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";
import type {
  TokenCreationAttempt,
  TokenCreationResult,
  TokenCreationResultExplainer,
} from "../type/token-creation-result.js";
import { ACCESS_LEVEL_LABELS } from "./access-level.js";

export function createMarkdownTokenCreationExplainer(): TokenCreationResultExplainer<
  RootContent[]
> {
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
      return [
        paragraph(
          text(
            `${icon(creationResult.type === "CREATED")} Same result as token `,
          ),
          inlineCode(`#${firstIndex}`),
        ),
      ];
    }

    return explainResult(authResult, creationResult);
  };

  function explainResult(
    authResult: TokenAuthResult,
    result: TokenCreationResult,
  ): RootContent[] {
    const { account, permissions, as: role } = authResult.request.tokenDec;
    const { repos } = authResult.request;
    const access = maxAccess(permissions);
    const isSuccess = result.type === "CREATED";
    const permEntries = effectivePermissions(permissions);
    const hasPermissions = permEntries.length > 0;

    const summary = listItem(renderHeader(result.type, access, repos, account));

    const subIcon = icon(isSuccess || undefined);
    const verb = isSuccess ? "Has" : "Wanted";

    const nested = list(
      ...renderErrorLines(result, authResult.request.consumer),
    );

    if (hasPermissions) {
      const accessLine = paragraph(
        text(`${subIcon} ${verb} `),
        strong(text(access)),
        ...(role
          ? [text(" access with role "), inlineCode(role)]
          : [text(" access "), emphasis(text("without")), text(" a role")]),
      );

      nested.children.push(listItem(accessLine));
    }

    nested.children.push(...renderRepoLines(subIcon, verb, repos, account));
    nested.children.push(...renderPermissionLines(subIcon, verb, permEntries));

    const attempts = resultAttempts(result);
    if (attempts.length > 0) {
      nested.children.push(renderFailedAttempts(attempts, isSuccess));
    }

    summary.children.push(nested);

    return [list(summary)];
  }

  function renderHeader(
    type: TokenCreationResult["type"],
    access: PermissionAccess,
    repos: "all" | string[],
    account: string,
  ): Paragraph {
    const scope = repoScopeLabel(repos, account);
    const isSuccess = type === "CREATED";
    const label = ACCESS_LEVEL_LABELS[access];

    if (isSuccess) {
      return paragraph(
        text(`${icon(isSuccess)} `),
        strong(text(capitalize(label))),
        text(" token created with access to "),
        ...scope,
        text(":"),
      );
    }

    const verb = type === "NOT_ALLOWED" ? "Refused" : "Failed";

    return paragraph(
      text(`${icon(isSuccess)} `),
      strong(text(verb)),
      text(" to create "),
      strong(text(label)),
      text(" token with access to "),
      ...scope,
      text(":"),
    );
  }

  // The switch is exhaustive over the TokenCreationResult union.
  // eslint-disable-next-line typescript/consistent-return
  function renderErrorLines(
    result: TokenCreationResult,
    consumer: AccountOrRepoReference,
  ): ListItem[] {
    switch (result.type) {
      case "CREATED":
      case "FAILED":
        return [];

      case "NOT_ALLOWED": {
        return [
          listItem(
            paragraph(
              text(`${FAIL_ICON} Token `),
              strong(text("not allowed")),
              ...(isRepoRef(consumer)
                ? [text(" for repo "), inlineCode(repoRefToString(consumer))]
                : [text(" for account "), inlineCode(consumer.account)]),
            ),
          ),
        ];
      }

      case "NO_ISSUER":
        return [listItem(paragraph(text(`${FAIL_ICON} No suitable issuer`)))];
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
  ): ListItem {
    const statusIcon = isSuccess ? WARN_ICON : FAIL_ICON;

    return listItem(
      paragraph(
        text(`${statusIcon} `),
        strong(text("Failed attempts")),
        text(":"),
      ),
      list(...renderAttemptItems(statusIcon, attempts)),
    );
  }

  function renderAttemptItems(
    statusIcon: string,
    attempts: TokenCreationAttempt[],
  ): ListItem[] {
    const items: ListItem[] = [];

    for (const attempt of attempts) {
      if (attempt.type === "REQUEST_ERROR") {
        const body = attempt.error.response?.data;

        items.push(
          listItem(
            paragraph(
              text(`${statusIcon} `),
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
            paragraph(text(`${statusIcon} ${errorMessage(attempt.error)}`)),
            ...details("Error stack", code("text", errorStack(attempt.error))),
          ),
        );
      }
    }

    return items;
  }

  function renderRepoLines(
    icon: string,
    verb: string,
    repos: "all" | string[],
    account: string,
  ): ListItem[] {
    if (repos === "all") {
      return [
        listItem(
          paragraph(
            text(`${icon} ${verb} access to `),
            strong(text("all repos")),
            text(" in "),
            inlineCode(account),
          ),
        ),
      ];
    }

    if (repos.length < 1) {
      return [
        listItem(
          paragraph(
            text(`${icon} ${verb} `),
            strong(text("account-only")),
            text(" access"),
          ),
        ),
      ];
    }

    const repoItems = repos.map((repo) =>
      listItem(paragraph(text(`${icon} `), inlineCode(`${account}/${repo}`))),
    );

    return [
      listItem(
        paragraph(
          text(`${icon} ${verb} access to `),
          strong(text(pluralize(repos.length, "repo", "repos"))),
          text(" in "),
          inlineCode(account),
        ),
        list(...repoItems),
      ),
    ];
  }

  function renderPermissionLines(
    icon: string,
    verb: string,
    permEntries: [string, PermissionAccess][],
  ): ListItem[] {
    if (permEntries.length < 1) {
      return [
        listItem(
          paragraph(
            text(`${FAIL_ICON} `),
            strong(text("No permissions")),
            text(" requested"),
          ),
        ),
      ];
    }

    const permItems = permEntries.map(([name, access]) =>
      listItem(
        paragraph(
          text(`${icon} `),
          emphasis(text(name)),
          text(": "),
          inlineCode(access),
        ),
      ),
    );

    return [
      listItem(
        paragraph(
          text(`${icon} ${verb} `),
          strong(
            text(pluralize(permEntries.length, "permission", "permissions")),
          ),
          text(":"),
        ),
        list(...permItems),
      ),
    ];
  }

  function repoScopeLabel(
    repos: "all" | string[],
    account: string,
  ): PhrasingContent[] {
    if (repos === "all") {
      return [strong(text("all repos")), text(" in "), inlineCode(account)];
    }
    if (repos.length < 1) {
      return [inlineCode(account)];
    }

    return [
      strong(text(pluralize(repos.length, "repo", "repos"))),
      text(" in "),
      inlineCode(account),
    ];
  }
}
