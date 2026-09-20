import type { ListItem, PhrasingContent, RootContent } from "mdast";
import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import {
  accountOrRepoRefToString,
  isRepoRef,
  repoRefToString,
} from "../github-reference.js";
import { FAIL_ICON, PASS_ICON, icon } from "../icon.js";
import {
  emphasis,
  inlineCode,
  list,
  listItem,
  paragraph,
  strong,
  text,
} from "../markdown.js";
import { pluralize } from "../pluralize.js";
import type { ProvisionRequestTarget } from "../provision-request.js";
import { createSequencer } from "../sequencer.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthResultExplainer,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "../type/provision-auth-result.js";
import type { ProvisionSecretsRule } from "../type/provision-rule.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";

export function createMarkdownProvisionAuthExplainer(): ProvisionAuthResultExplainer<
  RootContent[]
> {
  const tokenSeq = createSequencer<TokenAuthResult>();

  return (result) => {
    const summary = listItem(...explainSummary(result));

    summary.children.push(list(listItem(...explainTokenDec(result))));
    summary.children.push(list(...explainTargets(result)));

    return [list(summary)];
  };

  function explainSummary({
    request,
    isAllowed,
  }: ProvisionAuthResult): ListItem["children"] {
    return [
      paragraph(
        text(`${icon(isAllowed)} Repo `),
        inlineCode(repoRefToString(request.requester)),
        text(" "),
        strong(text(isAllowed ? "was allowed" : "wasn't allowed")),
        text(" to provision secret "),
        inlineCode(request.name),
        text(":"),
      ),
    ];
  }

  function explainTokenDec({
    request,
  }: ProvisionAuthResult): ListItem["children"] {
    const { secretDec, tokenDec, tokenDecIsRegistered } = request;

    if (tokenDec) {
      return [
        paragraph(
          text(`${PASS_ICON} `),
          strong(text("Can")),
          text(" use token declaration "),
          inlineCode(secretDec.token),
        ),
      ];
    }

    return [
      paragraph(
        text(`${PASS_ICON} `),
        strong(text("Can't")),
        text(" use token declaration "),
        inlineCode(secretDec.token),
        text(" because "),
        text(tokenDecIsRegistered ? "it isn't shared" : "it doesn't exist"),
      ),
    ];
  }

  function explainTargets({
    request,
    results,
    isMissingTargets,
  }: ProvisionAuthResult): ListItem[] {
    if (isMissingTargets) {
      return [listItem(paragraph(text(`${FAIL_ICON} No targets specified`)))];
    }

    const entries: [
      target: ProvisionRequestTarget,
      result: ProvisionAuthTargetResult,
    ][] = [];
    for (let i = 0; i < results.length; ++i) {
      entries.push([request.to[i], results[i]]);
    }
    entries.sort(([a], [b]) => compareProvisionRequestTarget(a, b));

    const targets: ListItem[] = [];
    for (const [target, result] of entries) {
      targets.push(listItem(...explainTarget(target, result)));
    }

    return targets;
  }

  function explainTarget(
    target: ProvisionRequestTarget,
    result: ProvisionAuthTargetResult,
  ): ListItem["children"] {
    const { isAllowed } = result;

    return [
      paragraph(
        text(`${icon(isAllowed)} `),
        strong(text(isAllowed ? "Can" : "Can't")),
        text(" provision token to "),
        ...explainSubject(target),
        text(":"),
      ),
      list(
        listItem(...explainTargetToken(result)),
        listItem(...explainBasedOnRules(result)),
      ),
    ];
  }

  function explainTargetToken({
    isTokenAllowed,
    tokenAuthResult,
  }: ProvisionAuthTargetResult): ListItem["children"] {
    if (!tokenAuthResult) {
      return [
        paragraph(
          text(`${FAIL_ICON} Token can't be authorized without a declaration`),
        ),
      ];
    }

    const name = accountOrRepoRefToString(tokenAuthResult.request.consumer);
    const ref = `#${tokenSeq(tokenAuthResult)}`;
    const kind = isRepoRef(tokenAuthResult.request.consumer)
      ? "Repo"
      : "Account";

    return [
      paragraph(
        text(`${icon(isTokenAllowed)} ${kind} `),
        inlineCode(name),
        text(" was "),
        strong(text(isTokenAllowed ? "allowed" : "denied")),
        text(" access to token "),
        inlineCode(ref),
      ),
    ];
  }

  function explainSubject(target: ProvisionRequestTarget): PhrasingContent[] {
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
      strong(text(type)),
      text(" secret in "),
      inlineCode(accountOrRepoRefToString(target.target)),
    ];
  }

  function explainBasedOnRules({
    isProvisionAllowed,
    rules,
  }: ProvisionAuthTargetResult): ListItem["children"] {
    const ruleCount = rules.length;
    const summary = paragraph(
      text(`${icon(isProvisionAllowed)}  `),
      strong(text(isProvisionAllowed ? "Can" : "Can't")),
      text(" provision secret "),
      ...(ruleCount < 1
        ? [text("(no matching rules)")]
        : [text(`based on ${pluralize(ruleCount, "rule", "rules")}:`)]),
    );

    if (ruleCount < 1) return [summary];

    const explainedRules: ListItem[] = [];

    for (const ruleResult of rules) {
      explainedRules.push(listItem(...explainRule(ruleResult)));
    }

    return [summary, list(...explainedRules)];
  }

  function explainRule({
    index,
    rule,
    have,
  }: ProvisionAuthTargetRuleResult): ListItem["children"] {
    const isAllowed = have === "allow";

    return [
      paragraph(
        text(`${icon(isAllowed)} `),
        strong(text(isAllowed ? "Allowed" : "Denied")),
        text(" by rule "),
        ...renderRule(index, rule),
      ),
    ];
  }

  function renderRule(
    index: number,
    { description }: ProvisionSecretsRule,
  ): PhrasingContent[] {
    const n = inlineCode(`#${index + 1}`);

    return description ? [n, text(": "), emphasis(text(description))] : [n];
  }
}
