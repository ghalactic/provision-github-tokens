import type { BlockContent, List, Paragraph } from "mdast";
import { isSufficientAccess } from "../access-level.js";
import { accountOrRepoRefToString, isRepoRef } from "../github-reference.js";
import { icon } from "../icon.js";
import { inlineCode, list, text } from "../markdown.js";
import { permissionAccess } from "../permissions.js";
import { pluralize } from "../pluralize.js";
import type { PermissionAccess, Permissions } from "../type/permissions.js";
import type {
  TokenAuthResourceResult,
  TokenAuthResourceResultRuleResult,
  TokenAuthResult,
  TokenAuthResultAllRepos,
  TokenAuthResultExplainer,
  TokenAuthResultNoRepos,
  TokenAuthResultSelectedRepos,
} from "../type/token-auth-result.js";

const ACCESS_LEVELS: Record<PermissionAccess, string> = {
  none: "No",
  admin: "Admin",
  read: "Read",
  write: "Write",
};

type ListItemSpec = {
  contents: Paragraph["children"];
  nested?: List;
};

export function createMarkdownTokenAuthExplainer(): TokenAuthResultExplainer<
  BlockContent[]
> {
  return (result) => [list(explainTokenAuth(result))];

  function explainTokenAuth(result: TokenAuthResult): ListItemSpec[] {
    if (result.type === "ALL_REPOS") return explainAllRepos(result);
    if (result.type === "NO_REPOS") return explainNoRepos(result);

    return explainSelectedRepos(result);
  }

  function explainAllRepos(result: TokenAuthResultAllRepos): ListItemSpec[] {
    const subject: Paragraph["children"] = [
      text("all repos in "),
      inlineCode(result.request.tokenDec.account),
    ];

    return [
      explainConsumer(result),
      explainAccessAndRole(result, subject),
      explainSufficient(result, subject),
    ];
  }

  function explainNoRepos(result: TokenAuthResultNoRepos): ListItemSpec[] {
    const subject: Paragraph["children"] = [
      inlineCode(result.request.tokenDec.account),
    ];

    return [
      explainConsumer(result),
      explainAccessAndRole(result, subject),
      explainSufficient(result, subject),
    ];
  }

  function explainSelectedRepos(
    result: TokenAuthResultSelectedRepos,
  ): ListItemSpec[] {
    const { request } = result;
    const subject: Paragraph["children"] = [
      text("repos in "),
      inlineCode(request.tokenDec.account),
    ];

    const resourceEntries = Object.entries(result.results).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const resources: ListItemSpec[] = [];

    for (const [resourceRepo, resourceResult] of resourceEntries) {
      resources.push(
        explainResourceRepo(
          resourceRepo,
          request.tokenDec.permissions,
          resourceResult,
        ),
      );
    }

    return [
      explainConsumer(result),
      explainAccessAndRole(result, subject),
      {
        contents: [
          text(
            `${icon(result.isMatched)} ` +
              `${pluralize(request.tokenDec.repos.length, "repo pattern", "repo patterns")} ` +
              `matched ${pluralize(request.repos.length, "repo", "repos")}`,
          ),
        ],
      },
      ...resources,
    ];
  }

  function explainConsumer({
    request,
    isAllowed,
  }: TokenAuthResult): ListItemSpec {
    const name = accountOrRepoRefToString(request.consumer);
    const who = isRepoRef(request.consumer)
      ? [text("Repo "), inlineCode(name)]
      : [text("Account "), inlineCode(name)];

    return {
      contents: [
        text(`${icon(isAllowed)} `),
        ...who,
        text(
          isAllowed
            ? " was allowed access to a token:"
            : " was denied access to a token:",
        ),
      ],
    };
  }

  function explainAccessAndRole(
    { request, maxWant, isMissingRole }: TokenAuthResult,
    subject: Paragraph["children"],
  ): ListItemSpec {
    const { as } = request.tokenDec;

    return {
      contents: [
        text(`${icon(!isMissingRole)} ${ACCESS_LEVELS[maxWant]} access to `),
        ...subject,
        text(as ? " requested with role " : " requested without a role"),
        ...(as ? [inlineCode(as)] : []),
      ],
    };
  }

  function explainSufficient(
    {
      request,
      isSufficient,
      rules,
    }: TokenAuthResultAllRepos | TokenAuthResultNoRepos,
    subject: Paragraph["children"],
  ): ListItemSpec {
    const basedOn = explainBasedOnRules(request.tokenDec.permissions, rules);

    return {
      contents: [
        text(
          `${icon(isSufficient)} ${isSufficient ? "Sufficient" : "Insufficient"} access to `,
        ),
        ...subject,
        ...basedOn.contents,
      ],
      ...(basedOn.nested ? { nested: basedOn.nested } : {}),
    };
  }

  function explainResourceRepo(
    resource: string,
    want: Permissions,
    result: TokenAuthResourceResult,
  ): ListItemSpec {
    const basedOn = explainBasedOnRules(want, result.rules);

    return {
      contents: [
        text(
          `${icon(result.isSufficient)} ${result.isSufficient ? "Sufficient" : "Insufficient"} access to repo `,
        ),
        inlineCode(resource),
        ...basedOn.contents,
      ],
      ...(basedOn.nested ? { nested: basedOn.nested } : {}),
    };
  }

  function explainBasedOnRules(
    want: Permissions,
    rules: TokenAuthResourceResultRuleResult[],
  ): { contents: Paragraph["children"]; nested?: List } {
    const ruleCount = rules.length;

    if (ruleCount < 1) {
      return { contents: [text(" (no matching rules)")] };
    }

    return {
      contents: [
        text(
          ruleCount === 1
            ? " based on 1 rule:"
            : ` based on ${ruleCount} rules:`,
        ),
      ],
      nested: list(rules.map((ruleResult) => explainRule(want, ruleResult))),
    };
  }

  function explainRule(
    want: Permissions,
    { index, rule, have, isSufficient }: TokenAuthResourceResultRuleResult,
  ): ListItemSpec {
    const described = rule.description
      ? `: ${JSON.stringify(rule.description)}`
      : "";

    return {
      contents: [
        text(`${icon(isSufficient)} Rule `),
        inlineCode(`#${index + 1}`),
        text(
          `${described} gave ${isSufficient ? "sufficient" : "insufficient"} access:`,
        ),
      ],
      nested: list(renderPermissionComparison(have, want)),
    };
  }

  function renderPermissionComparison(
    have: Permissions,
    want: Permissions,
  ): ListItemSpec[] {
    const items: ListItemSpec[] = [];

    for (const permission of Object.keys(want).sort((a, b) =>
      a.localeCompare(b),
    )) {
      const haveAccess = permissionAccess(have, permission);
      const wantAccess = permissionAccess(want, permission);

      items.push({
        contents: [
          text(`${icon(isSufficientAccess(haveAccess, wantAccess))} `),
          text(`${permission}: have `),
          inlineCode(haveAccess),
          text(", wanted "),
          inlineCode(wantAccess),
        ],
      });
    }

    return items;
  }
}
