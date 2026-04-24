import type { List, ListItem, Paragraph, RootContent } from "mdast";
import { isSufficientAccess } from "../access-level.js";
import { accountOrRepoRefToString, isRepoRef } from "../github-reference.js";
import { permissionAccess } from "../permissions.js";
import { pluralize } from "../pluralize.js";
import type { PermissionsRule } from "../type/permissions-rule.js";
import type { PermissionAccess, Permissions } from "../type/permissions.js";
import type {
  TokenAuthResourceResultRuleResult,
  TokenAuthResult,
  TokenAuthResultAllRepos,
  TokenAuthResultExplainer,
  TokenAuthResultNoRepos,
  TokenAuthResultSelectedRepos,
} from "../type/token-auth-result.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

const ACCESS_LEVELS: Record<PermissionAccess, string> = {
  none: "No",
  admin: "Admin",
  read: "Read",
  write: "Write",
};

export function createMarkdownTokenAuthExplainer(): TokenAuthResultExplainer<
  RootContent[]
> {
  return (result) => {
    if (result.type === "ALL_REPOS") return explainAllRepos(result);
    if (result.type === "NO_REPOS") return explainNoRepos(result);

    return explainSelectedRepos(result);
  };

  function explainAllRepos(result: TokenAuthResultAllRepos): RootContent[] {
    const { request, isSufficient, rules } = result;
    const subject = `all repos in ${request.tokenDec.account}`;

    return [
      bulletList(
        iconItem(icon(result.isAllowed), summaryText(result), [
          iconItem(
            icon(!result.isMissingRole),
            maxAccessAndRoleText(result, subject),
          ),
          iconItem(
            icon(isSufficient),
            `${isSufficient ? "Sufficient" : "Insufficient"} access to ${subject} ${basedOnRulesText(rules)}`,
            rulesSublist(request.tokenDec.permissions, rules),
          ),
        ]),
      ),
    ];
  }

  function explainNoRepos(result: TokenAuthResultNoRepos): RootContent[] {
    const { request, isSufficient, rules } = result;

    return [
      bulletList(
        iconItem(icon(result.isAllowed), summaryText(result), [
          iconItem(
            icon(!result.isMissingRole),
            maxAccessAndRoleText(result, request.tokenDec.account),
          ),
          iconItem(
            icon(isSufficient),
            `${isSufficient ? "Sufficient" : "Insufficient"} access to ${request.tokenDec.account} ${basedOnRulesText(rules)}`,
            rulesSublist(request.tokenDec.permissions, rules),
          ),
        ]),
      ),
    ];
  }

  function explainSelectedRepos(
    result: TokenAuthResultSelectedRepos,
  ): RootContent[] {
    const { request, results } = result;
    const subject = `repos in ${request.tokenDec.account}`;

    const resourceEntries = Object.entries(results).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    const repoItems: ListItem[] = [];
    for (const [resourceRepo, resourceResult] of resourceEntries) {
      repoItems.push(
        iconItem(
          icon(resourceResult.isSufficient),
          `${resourceResult.isSufficient ? "Sufficient" : "Insufficient"} access to repo ${resourceRepo} ${basedOnRulesText(resourceResult.rules)}`,
          rulesSublist(request.tokenDec.permissions, resourceResult.rules),
        ),
      );
    }

    const repoPatterns = pluralize(
      request.tokenDec.repos.length,
      "repo pattern",
      "repo patterns",
    );
    const repos = pluralize(request.repos.length, "repo", "repos");

    return [
      bulletList(
        iconItem(icon(result.isAllowed), summaryText(result), [
          iconItem(
            icon(!result.isMissingRole),
            maxAccessAndRoleText(result, subject),
          ),
          iconItem(icon(result.isMatched), `${repoPatterns} matched ${repos}`),
          ...repoItems,
        ]),
      ),
    ];
  }

  function summaryText({ request, isAllowed }: TokenAuthResult): string {
    const name = accountOrRepoRefToString(request.consumer);
    const kind = isRepoRef(request.consumer) ? "Repo" : "Account";

    return `${kind} ${name} was ${isAllowed ? "allowed" : "denied"} access to a token:`;
  }

  function maxAccessAndRoleText(
    { request, maxWant }: TokenAuthResult,
    accessTo: string,
  ): string {
    return (
      `${ACCESS_LEVELS[maxWant]} access to ${accessTo} ` +
      (request.tokenDec.as
        ? `requested with role ${request.tokenDec.as}`
        : "requested without a role")
    );
  }

  function basedOnRulesText(
    rules: TokenAuthResourceResultRuleResult[],
  ): string {
    const ruleCount = rules.length;
    const ruleOrRules = ruleCount === 1 ? "rule" : "rules";

    if (ruleCount < 1) return "(no matching rules)";

    return `based on ${ruleCount} ${ruleOrRules}:`;
  }

  function rulesSublist(
    want: Permissions,
    rules: TokenAuthResourceResultRuleResult[],
  ): List | undefined {
    if (rules.length < 1) return undefined;

    return bulletList(...rules.map((ruleResult) => ruleItem(want, ruleResult)));
  }

  function ruleItem(
    want: Permissions,
    { index, rule, have, isSufficient }: TokenAuthResourceResultRuleResult,
  ): ListItem {
    const permItems: ListItem[] = [];

    for (const p of Object.keys(want).sort((a, b) => a.localeCompare(b))) {
      const h = permissionAccess(have, p);
      const w = permissionAccess(want, p);
      const sufficient = isSufficientAccess(h, w);

      permItems.push(
        iconItem(icon(sufficient), `${p}: have ${h}, wanted ${w}`),
      );
    }

    return iconItem(
      icon(isSufficient),
      `Rule ${renderRule(index, rule)} gave ${isSufficient ? "sufficient" : "insufficient"} access:`,
      permItems.length > 0 ? bulletList(...permItems) : undefined,
    );
  }

  function renderRule(index: number, { description }: PermissionsRule): string {
    const n = `#${index + 1}`;

    return description ? `${n}: ${JSON.stringify(description)}` : n;
  }

  function icon(isAllowed: boolean): string {
    return isAllowed ? ALLOWED_ICON : DENIED_ICON;
  }
}

function iconItem(
  iconStr: string,
  text: string,
  children?: ListItem[] | List,
): ListItem {
  const paragraph: Paragraph = {
    type: "paragraph",
    children: [{ type: "text", value: `${iconStr} ${text}` }],
  };
  const sublist: List | undefined = children
    ? Array.isArray(children) && !("type" in children)
      ? bulletList(...children)
      : (children as List)
    : undefined;

  return {
    type: "listItem",
    spread: false,
    children: sublist ? [paragraph, sublist] : [paragraph],
  };
}

function bulletList(...items: ListItem[]): List {
  return { type: "list", ordered: false, spread: false, children: items };
}
