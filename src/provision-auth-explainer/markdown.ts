import type {
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  RootContent,
} from "mdast";
import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import {
  accountOrRepoRefToString,
  isRepoRef,
  repoRefToString,
} from "../github-reference.js";
import type { ProvisionRequestTarget } from "../provision-request.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthResultExplainer,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "../type/provision-auth-result.js";
import type { ProvisionSecretsRule } from "../type/provision-rule.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function createMarkdownProvisionAuthExplainer(
  tokenAnchorMap: Map<TokenAuthResult, string>,
): ProvisionAuthResultExplainer<RootContent[]> {
  return (result) => {
    return [
      bulletList(
        iconItem(icon(result.isAllowed), summaryText(result), [
          tokenDecItem(result),
          ...targetItems(result),
        ]),
      ),
    ];
  };

  function summaryText({ request, isAllowed }: ProvisionAuthResult): string {
    return (
      `Repo ${repoRefToString(request.requester)} ` +
      (isAllowed ? "was allowed" : "wasn't allowed") +
      ` to provision secret ${request.name}:`
    );
  }

  function tokenDecItem(result: ProvisionAuthResult): ListItem {
    const { request } = result;
    const { secretDec, tokenDec, tokenDecIsRegistered } = request;

    if (tokenDec) {
      return iconItem(
        ALLOWED_ICON,
        `Can use token declaration ${secretDec.token}`,
      );
    }

    return iconItem(
      DENIED_ICON,
      `Can't use token declaration ${secretDec.token} because ` +
        (tokenDecIsRegistered ? "it isn't shared" : "it doesn't exist"),
    );
  }

  function targetItems(result: ProvisionAuthResult): ListItem[] {
    const { request, results, isMissingTargets } = result;

    if (isMissingTargets) {
      return [iconItem(DENIED_ICON, "No targets specified")];
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
    return iconItem(
      icon(result.isAllowed),
      `${result.isAllowed ? "Can" : "Can't"} provision token to ${subjectText(target)}:`,
      [tokenAuthItem(result), provisioningItem(result)],
    );
  }

  function tokenAuthItem(result: ProvisionAuthTargetResult): ListItem {
    const { isTokenAllowed, tokenAuthResult } = result;

    if (!tokenAuthResult) {
      return iconItem(
        DENIED_ICON,
        "Token can't be authorized without a declaration",
      );
    }

    const name = accountOrRepoRefToString(tokenAuthResult.request.consumer);
    const kind = isRepoRef(tokenAuthResult.request.consumer)
      ? "Repo"
      : "Account";
    const anchor = tokenAnchorMap.get(tokenAuthResult);

    /* istanbul ignore next - @preserve */
    if (anchor == null) {
      throw new Error("Invariant violation: missing token anchor");
    }

    const tokenIndex = [...tokenAnchorMap.keys()].indexOf(tokenAuthResult) + 1;

    return iconItemWithLink(
      icon(isTokenAllowed),
      `${kind} ${name} was ${isTokenAllowed ? "allowed" : "denied"} access to `,
      `token #${tokenIndex}`,
      `#${anchor}`,
    );
  }

  function provisioningItem(result: ProvisionAuthTargetResult): ListItem {
    const { isProvisionAllowed, rules } = result;

    return iconItem(
      icon(isProvisionAllowed),
      `${isProvisionAllowed ? "Can" : "Can't"} provision secret ${basedOnRulesText(rules)}`,
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

    return bulletList(
      ...rules.map(({ index, rule, have }) => {
        const isAllowed = have === "allow";

        return iconItem(
          icon(isAllowed),
          `${isAllowed ? "Allowed" : "Denied"} by rule ${renderRule(index, rule)}`,
        );
      }),
    );
  }

  function subjectText(target: ProvisionRequestTarget): string {
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

  function renderRule(
    index: number,
    { description }: ProvisionSecretsRule,
  ): string {
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

function iconItemWithLink(
  iconStr: string,
  textBefore: string,
  linkText: string,
  linkUrl: string,
): ListItem {
  const link: Link = {
    type: "link",
    url: linkUrl,
    children: [{ type: "text", value: linkText }],
  };
  const phrasing: PhrasingContent[] = [
    { type: "text", value: `${iconStr} ${textBefore}` },
    link,
  ];
  const paragraph: Paragraph = { type: "paragraph", children: phrasing };

  return { type: "listItem", spread: false, children: [paragraph] };
}

function bulletList(...items: ListItem[]): List {
  return { type: "list", ordered: false, spread: false, children: items };
}
