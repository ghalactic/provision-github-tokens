import type { ElementContent } from "hast";
import type { List, ListItem, RootContent } from "mdast";
import { isSufficientAccess } from "../access-level.js";
import { isRepoRef, repoRefFromName } from "../github-reference.js";
import {
  accountOrRepoHTMLLink,
  accountOrRepoLink,
  details,
  listItem,
  paragraph,
  renderIcon,
  text,
  unorderedList,
} from "../markdown.js";
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

const ACCESS_LEVELS: Record<PermissionAccess, string> = {
  none: "No",
  admin: "Admin",
  read: "Read",
  write: "Write",
};

export function createMarkdownTokenAuthExplainer(
  githubServerURL: string,
): TokenAuthResultExplainer<RootContent[]> {
  return (result) => {
    if (result.type === "ALL_REPOS") return explainAllRepos(result);
    if (result.type === "NO_REPOS") return explainNoRepos(result);

    return explainSelectedRepos(result);
  };

  function explainAllRepos(result: TokenAuthResultAllRepos): RootContent[] {
    const { request, isSufficient, rules } = result;
    const account = { account: request.tokenDec.account };

    return details(
      summaryChildren(result),
      unorderedList(
        listItem(
          paragraph(
            text(
              `${renderIcon(!result.isMissingRole)} ` +
                `${ACCESS_LEVELS[result.maxWant]} access to all repos in `,
            ),
            accountOrRepoLink(githubServerURL, account),
            text(` ${roleRequestText(request.tokenDec.as)}`),
          ),
        ),
        listItem(
          paragraph(
            text(
              `${renderIcon(isSufficient)} ` +
                `${isSufficient ? "Sufficient" : "Insufficient"} access ` +
                `to all repos in `,
            ),
            accountOrRepoLink(githubServerURL, account),
            text(` ${basedOnRulesText(rules)}`),
          ),
          rulesSublist(request.tokenDec.permissions, rules),
        ),
      ),
    );
  }

  function explainNoRepos(result: TokenAuthResultNoRepos): RootContent[] {
    const { request, isSufficient, rules } = result;
    const account = { account: request.tokenDec.account };

    return details(
      summaryChildren(result),
      unorderedList(
        listItem(
          paragraph(
            text(
              `${renderIcon(!result.isMissingRole)} ` +
                `${ACCESS_LEVELS[result.maxWant]} access to `,
            ),
            accountOrRepoLink(githubServerURL, account),
            text(` ${roleRequestText(request.tokenDec.as)}`),
          ),
        ),
        listItem(
          paragraph(
            text(
              `${renderIcon(isSufficient)} ` +
                `${isSufficient ? "Sufficient" : "Insufficient"} access ` +
                `to `,
            ),
            accountOrRepoLink(githubServerURL, account),
            text(` ${basedOnRulesText(rules)}`),
          ),
          rulesSublist(request.tokenDec.permissions, rules),
        ),
      ),
    );
  }

  function explainSelectedRepos(
    result: TokenAuthResultSelectedRepos,
  ): RootContent[] {
    const { request, results } = result;
    const account = { account: request.tokenDec.account };

    const resourceEntries = Object.entries(results).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    const repoItems: ListItem[] = [];
    for (const [resourceRepo, resourceResult] of resourceEntries) {
      repoItems.push(
        listItem(
          paragraph(
            text(
              `${renderIcon(resourceResult.isSufficient)} ` +
                `${resourceResult.isSufficient ? "Sufficient" : "Insufficient"} ` +
                `access to repo `,
            ),
            accountOrRepoLink(githubServerURL, repoRefFromName(resourceRepo)),
            text(` ${basedOnRulesText(resourceResult.rules)}`),
          ),
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

    return details(
      summaryChildren(result),
      unorderedList(
        listItem(
          paragraph(
            text(
              `${renderIcon(!result.isMissingRole)} ` +
                `${ACCESS_LEVELS[result.maxWant]} access to repos in `,
            ),
            accountOrRepoLink(githubServerURL, account),
            text(` ${roleRequestText(request.tokenDec.as)}`),
          ),
        ),
        listItem(
          paragraph(
            text(
              `${renderIcon(result.isMatched)} ` +
                `${repoPatterns} matched ${repos}`,
            ),
          ),
        ),
        ...repoItems,
      ),
    );
  }

  function summaryChildren({
    request,
    isAllowed,
  }: TokenAuthResult): ElementContent[] {
    return [
      text(
        `${renderIcon(isAllowed)} ` +
          `${isRepoRef(request.consumer) ? "Repo" : "Account"} `,
      ),
      accountOrRepoHTMLLink(githubServerURL, request.consumer),
      text(` was ${isAllowed ? "allowed" : "denied"} access to a token`),
    ];
  }

  function roleRequestText(role: string | undefined): string {
    return role ? `requested with role ${role}` : "requested without a role";
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

    return unorderedList(
      ...rules.map((ruleResult) => ruleItem(want, ruleResult)),
    );
  }

  function ruleItem(
    want: Permissions,
    { index, rule, have, isSufficient }: TokenAuthResourceResultRuleResult,
  ): ListItem {
    const permItems: ListItem[] = [];

    for (const p of Object.keys(want).sort((a, b) => a.localeCompare(b))) {
      const h = permissionAccess(have, p);
      const w = permissionAccess(want, p);

      permItems.push(
        listItem(
          paragraph(
            text(
              `${renderIcon(isSufficientAccess(h, w))} ` +
                `${p}: have ${h}, wanted ${w}`,
            ),
          ),
        ),
      );
    }

    return listItem(
      paragraph(
        text(
          `${renderIcon(isSufficient)} Rule ${renderRule(index, rule)} gave ` +
            `${isSufficient ? "sufficient" : "insufficient"} access:`,
        ),
      ),
      unorderedList(...permItems),
    );
  }

  function renderRule(index: number, { description }: PermissionsRule): string {
    const n = `#${index + 1}`;

    return description ? `${n}: ${JSON.stringify(description)}` : n;
  }
}
