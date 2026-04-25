import type { ElementContent } from "hast";
import type { List, ListItem, Paragraph, RootContent } from "mdast";
import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import { isRepoRef } from "../github-reference.js";
import {
  accountOrRepoHTMLLink,
  accountOrRepoLink,
  anchorLink,
  details,
  listItem,
  paragraph,
  renderIcon,
  text,
  unorderedList,
} from "../markdown.js";
import type { ProvisionRequestTarget } from "../provision-request.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthResultExplainer,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "../type/provision-auth-result.js";
import type { ProvisionSecretsRule } from "../type/provision-rule.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";
import type { TokenHeadingReference } from "../type/token-heading-reference.js";

export function createMarkdownProvisionAuthExplainer(
  githubServerURL: string,
  tokenReferenceMap: Map<TokenAuthResult, TokenHeadingReference>,
): ProvisionAuthResultExplainer<RootContent[]> {
  return (result) => {
    return details(
      summaryChildren(result),
      unorderedList(tokenDecItem(result), ...targetItems(result)),
    );
  };

  function summaryChildren({
    request,
    isAllowed,
  }: ProvisionAuthResult): ElementContent[] {
    return [
      text(`${renderIcon(isAllowed)} Repo `),
      accountOrRepoHTMLLink(githubServerURL, request.requester),
      text(
        ` ${isAllowed ? "was allowed" : "wasn't allowed"}` +
          ` to provision secret ${request.name}`,
      ),
    ];
  }

  function tokenDecItem(result: ProvisionAuthResult): ListItem {
    const { request } = result;
    const { secretDec, tokenDec, tokenDecIsRegistered } = request;

    if (tokenDec) {
      return listItem(
        paragraph(
          text(
            `${renderIcon(true)} Can use token declaration ${secretDec.token}`,
          ),
        ),
      );
    }

    return listItem(
      paragraph(
        text(
          `${renderIcon(false)} Can't use ` +
            `token declaration ${secretDec.token} because ` +
            (tokenDecIsRegistered ? "it isn't shared" : "it doesn't exist"),
        ),
      ),
    );
  }

  function targetItems(result: ProvisionAuthResult): ListItem[] {
    const { request, results, isMissingTargets } = result;

    if (isMissingTargets) {
      return [
        listItem(paragraph(text(`${renderIcon(false)} No targets specified`))),
      ];
    }

    const entries: [ProvisionRequestTarget, ProvisionAuthTargetResult][] = [];
    for (let i = 0; i < results.length; ++i) {
      entries.push([request.to[i], results[i]]);
    }
    entries.sort(([a], [b]) => compareProvisionRequestTarget(a, b));

    return entries.map(([target, targetResult]) =>
      targetItem(target, targetResult),
    );
  }

  function targetItem(
    target: ProvisionRequestTarget,
    result: ProvisionAuthTargetResult,
  ): ListItem {
    return listItem(
      paragraph(
        text(
          `${renderIcon(result.isAllowed)} ` +
            `${result.isAllowed ? "Can" : "Can't"} provision token to `,
        ),
        ...subjectChildren(target),
        text(":"),
      ),
      unorderedList(tokenAuthItem(result), provisioningItem(result)),
    );
  }

  function tokenAuthItem(result: ProvisionAuthTargetResult): ListItem {
    const { isTokenAllowed, tokenAuthResult } = result;

    if (!tokenAuthResult) {
      return listItem(
        paragraph(
          text(
            `${renderIcon(false)} Token can't be authorized ` +
              `without a declaration`,
          ),
        ),
      );
    }

    const { consumer } = tokenAuthResult.request;
    const kind = isRepoRef(consumer) ? "Repo" : "Account";
    const tokenReference = tokenReferenceMap.get(tokenAuthResult);

    /* istanbul ignore next - @preserve */
    if (tokenReference == null) {
      throw new Error("Invariant violation: missing token reference");
    }

    return listItem(
      paragraph(
        text(`${renderIcon(isTokenAllowed)} ${kind} `),
        accountOrRepoLink(githubServerURL, consumer),
        text(` was ${isTokenAllowed ? "allowed" : "denied"} access to `),
        anchorLink(
          tokenReference.headingId,
          text(`token #${tokenReference.index}`),
        ),
      ),
    );
  }

  function provisioningItem(result: ProvisionAuthTargetResult): ListItem {
    const { isProvisionAllowed, rules } = result;

    return listItem(
      paragraph(
        text(
          `${renderIcon(isProvisionAllowed)} ` +
            `${isProvisionAllowed ? "Can" : "Can't"} provision secret ` +
            `${basedOnRulesText(rules)}`,
        ),
      ),
      rulesSublist(rules),
    );
  }

  function basedOnRulesText(rules: ProvisionAuthTargetRuleResult[]): string {
    const ruleCount = rules.length;
    const ruleOrRules = ruleCount === 1 ? "rule" : "rules";

    if (ruleCount < 1) return "(no matching rules)";

    return `based on ${ruleCount} ${ruleOrRules}:`;
  }

  function rulesSublist(
    rules: ProvisionAuthTargetRuleResult[],
  ): List | undefined {
    if (rules.length < 1) return undefined;

    return unorderedList(
      ...rules.map(({ index, rule, have }) => {
        const isAllowed = have === "allow";

        return listItem(
          paragraph(
            text(
              `${renderIcon(isAllowed)} ${isAllowed ? "Allowed" : "Denied"} ` +
                `by rule ${renderRule(index, rule)}`,
            ),
          ),
        );
      }),
    );
  }

  function subjectChildren(
    target: ProvisionRequestTarget,
  ): Paragraph["children"] {
    switch (target.type) {
      case "actions":
        return [
          text("GitHub Actions secret in "),
          accountOrRepoLink(githubServerURL, target.target),
        ];
      case "codespaces":
        return [
          text("GitHub Codespaces secret in "),
          accountOrRepoLink(githubServerURL, target.target),
        ];
      case "dependabot":
        return [
          text("Dependabot secret in "),
          accountOrRepoLink(githubServerURL, target.target),
        ];
      case "environment":
        return [
          text(`GitHub environment ${target.target.environment} secret in `),
          accountOrRepoLink(githubServerURL, target.target),
        ];
    }

    /* istanbul ignore next - @preserve */
    throw new Error(
      `Invariant violation: Unexpected secret type ${JSON.stringify(target)}`,
    );
  }

  function renderRule(
    index: number,
    { description }: ProvisionSecretsRule,
  ): string {
    const n = `#${index + 1}`;

    return description ? `${n}: ${JSON.stringify(description)}` : n;
  }
}
