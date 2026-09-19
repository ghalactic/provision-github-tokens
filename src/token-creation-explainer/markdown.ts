import type { BlockContent, List, Paragraph } from "mdast";
import { maxAccess } from "../access-level.js";
import { errorMessage, errorStack } from "../error.js";
import {
  type AccountOrRepoReference,
  isRepoRef,
  repoRefToString,
} from "../github-reference.js";
import { FAIL_ICON, icon } from "../icon.js";
import { details, inlineCode, list, paragraph, text } from "../markdown.js";
import { pluralize } from "../pluralize.js";
import { capitalize } from "../text.js";
import type { PermissionAccess, Permissions } from "../type/permissions.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";
import type {
  TokenCreationResult,
  TokenCreationResultExplainer,
} from "../type/token-creation-result.js";

const HEADER_ACCESS_LABELS: Record<PermissionAccess, string> = {
  admin: "admin",
  none: "",
  read: "read-only",
  write: "write",
};

type ListItemSpec = {
  contents: Paragraph["children"];
  nested?: List;
};

export function createMarkdownTokenCreationExplainer(
  results: Map<TokenAuthResult, TokenCreationResult>,
): TokenCreationResultExplainer<BlockContent[]> {
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
      typeof currentIndex !== "undefined" &&
      typeof firstIndex !== "undefined" &&
      firstIndex !== currentIndex
    ) {
      return [
        paragraph(
          text(
            `${icon(creationResult.type === "CREATED")} Same result as token `,
          ),
          inlineCode(`#${firstIndex + 1}`),
        ),
      ];
    }

    const { items, detail } = explainResult(authResult, creationResult);

    return detail ? [list(items), details(detail)] : [list(items)];
  };

  function explainResult(
    authResult: TokenAuthResult,
    result: TokenCreationResult,
  ): { items: ListItemSpec[]; detail?: string } {
    const { account, permissions, as: role } = authResult.request.tokenDec;
    const { repos } = authResult.request;
    const access = maxAccess(permissions);
    const isSuccess = result.type === "CREATED";
    const permEntries = effectivePermissions(permissions);
    const hasPermissions = permEntries.length > 0;

    const items: ListItemSpec[] = [
      renderHeader(result.type, access, repos, account),
    ];
    const errorLines = renderErrorLines(result, authResult.request.consumer);
    items.push(...errorLines.items);

    const subIcon = icon(isSuccess || undefined);
    const verb = isSuccess ? "Has" : "Wanted";

    if (hasPermissions) {
      items.push({
        contents: [
          text(`${subIcon} ${verb} ${access} access `),
          text(role ? "with role " : "without a role"),
          ...(role ? [inlineCode(role)] : []),
        ],
      });
    }

    items.push(...renderRepoLines(subIcon, verb, repos, account));
    items.push(...renderPermissionLines(subIcon, verb, permEntries));

    return {
      items,
      detail: errorLines.detail,
    };
  }

  function renderHeader(
    type: TokenCreationResult["type"],
    access: PermissionAccess,
    repos: "all" | string[],
    account: string,
  ): ListItemSpec {
    const label = HEADER_ACCESS_LABELS[access];
    const isSuccess = type === "CREATED";

    return {
      contents: [
        text(`${icon(isSuccess)} `),
        text(
          isSuccess
            ? `${capitalize(label)} token created with access to `
            : `${type === "NOT_ALLOWED" ? "Refused" : "Failed"} to create ` +
                `${label ? `${label} ` : ""}token with access to `,
        ),
        ...repoScopeLabel(repos, account),
        text(":"),
      ],
    };
  }

  function renderErrorLines(
    result: TokenCreationResult,
    consumer: AccountOrRepoReference,
  ): { items: ListItemSpec[]; detail?: string } {
    switch (result.type) {
      case "CREATED":
        return { items: [] };

      case "NOT_ALLOWED": {
        const suffix = isRepoRef(consumer)
          ? [text(" for repo "), inlineCode(repoRefToString(consumer))]
          : [text(" for account "), inlineCode(consumer.account)];

        return {
          items: [
            { contents: [text(`${FAIL_ICON} Token not allowed`), ...suffix] },
          ],
        };
      }

      case "NO_ISSUER":
        return {
          items: [{ contents: [text(`${FAIL_ICON} No suitable issuer`)] }],
        };

      case "REQUEST_ERROR": {
        const body = result.error.response?.data;
        const detail =
          typeof body === "undefined"
            ? "(no response data)"
            : JSON.stringify(body, null, 2);

        return {
          items: [
            {
              contents: [
                text(
                  `${FAIL_ICON} ${result.error.status} - ${result.error.message}`,
                ),
              ],
            },
          ],
          detail,
        };
      }

      case "ERROR":
        return {
          items: [
            { contents: [text(`${FAIL_ICON} ${errorMessage(result.error)}`)] },
          ],
          detail: errorStack(result.error),
        };
    }
  }

  function renderRepoLines(
    subIcon: string,
    verb: string,
    repos: "all" | string[],
    account: string,
  ): ListItemSpec[] {
    if (repos === "all") {
      return [
        {
          contents: [
            text(`${subIcon} ${verb} access to all repos in `),
            inlineCode(account),
          ],
        },
      ];
    }

    if (repos.length < 1) {
      return [{ contents: [text(`${subIcon} ${verb} account-only access`)] }];
    }

    return [
      {
        contents: [
          text(`${subIcon} ${verb} access to `),
          text(`${pluralize(repos.length, "repo", "repos")} in `),
          inlineCode(account),
          text(":"),
        ],
        nested: list(
          repos.map((repo) => ({
            contents: [text(`${subIcon} `), inlineCode(`${account}/${repo}`)],
          })),
        ),
      },
    ];
  }

  function renderPermissionLines(
    subIcon: string,
    verb: string,
    permEntries: [string, PermissionAccess][],
  ): ListItemSpec[] {
    if (permEntries.length < 1) {
      return [{ contents: [text(`${FAIL_ICON} No permissions requested`)] }];
    }

    return [
      {
        contents: [
          text(`${subIcon} ${verb} `),
          text(
            `${pluralize(permEntries.length, "permission", "permissions")}:`,
          ),
        ],
        nested: list(
          permEntries.map(([name, access]) => ({
            contents: [
              text(`${subIcon} `),
              text(`${name}: `),
              inlineCode(access),
            ],
          })),
        ),
      },
    ];
  }

  function repoScopeLabel(
    repos: "all" | string[],
    account: string,
  ): Paragraph["children"] {
    if (repos === "all") {
      return [text("all repos in "), inlineCode(account)];
    }

    if (repos.length < 1) {
      return [inlineCode(account)];
    }

    return [
      text(`${pluralize(repos.length, "repo", "repos")} in `),
      inlineCode(account),
    ];
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
