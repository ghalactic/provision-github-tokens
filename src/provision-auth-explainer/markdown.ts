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
import { isRepoProvisionAuthTargetResult } from "../provision-auth-result.js";
import {
  isRepoProvisionRequestTarget,
  type ProvisionRequestTarget,
} from "../provision-request.js";
import { secretTypeMdast } from "../secret-type.js";
import { createSequencer } from "../sequencer.js";
import type {
  ProvisionAuthAccountTargetResult,
  ProvisionAuthResult,
  ProvisionAuthResultExplainer,
  ProvisionAuthSelectedRepoResult,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "../type/provision-auth-result.js";
import type { ProvisionSecretsRule } from "../type/provision-rule.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";
import { accountSecretVisibilityCategoryLabel } from "./account-secret-visibility-category.js";

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
    results,
    isMissingTargets,
  }: ProvisionAuthResult): ListItem[] {
    if (isMissingTargets) {
      return [listItem(paragraph(text(`${FAIL_ICON} No targets specified`)))];
    }

    const sortedResults = [...results];
    sortedResults.sort((a, b) =>
      compareProvisionRequestTarget(a.target, b.target),
    );

    const targets: ListItem[] = [];
    for (const result of sortedResults) {
      targets.push(listItem(...explainTarget(result)));
    }

    return targets;
  }

  function explainTarget(
    result: ProvisionAuthTargetResult,
  ): ListItem["children"] {
    const { isAllowed, target } = result;

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
        listItem(...explainBasedOnRules(target, result)),
        ...(isRepoProvisionAuthTargetResult(result)
          ? []
          : explainSelectedRepositories(target, result)),
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
    return [
      ...secretTypeMdast(target),
      text(" secret in "),
      ...(isRepoProvisionRequestTarget(target)
        ? [strong(text(target.visibility)), text(" repo ")]
        : [text("account ")]),
      inlineCode(accountOrRepoRefToString(target.target)),
    ];
  }

  function explainBasedOnRules(
    target: ProvisionRequestTarget,
    {
      isProvisionAllowed,
      isSecretVisibilityCategoryAllowed,
      rules,
    }: ProvisionAuthTargetResult,
  ): ListItem["children"] {
    const isAllowed = isRepoProvisionRequestTarget(target)
      ? isProvisionAllowed
      : isSecretVisibilityCategoryAllowed;
    const ruleCount = rules.length;
    const summary = paragraph(
      text(`${icon(isAllowed)} `),
      strong(text(isAllowed ? "Can" : "Can't")),
      text(" provision "),
      ...explainProvisionTo(target),
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

  function explainProvisionTo(
    target: ProvisionRequestTarget,
  ): PhrasingContent[] {
    return isRepoProvisionRequestTarget(target)
      ? [text("secret ")]
      : [
          text("to "),
          strong(text(accountSecretVisibilityCategoryLabel(target.visibility))),
          text(" "),
        ];
  }

  function explainSelectedRepositories(
    target: ProvisionRequestTarget,
    result: ProvisionAuthAccountTargetResult,
  ): ListItem[] {
    const { selectedRepos } = result;

    if (!selectedRepos) return [];

    const { visibility } = target;
    const repos = Object.entries(selectedRepos.results);
    repos.sort(([a], [b]) => a.localeCompare(b));

    const items: ListItem[] = [];
    for (const [repo, repoResult] of repos) {
      items.push(listItem(...explainSelectedRepository(repo, repoResult)));
    }

    if (!selectedRepos.isMatched && typeof visibility !== "string") {
      items.push(
        listItem(
          paragraph(
            text(`${FAIL_ICON} No repositories matched the patterns `),
            ...explainPatterns(visibility.patterns),
          ),
        ),
      );
    }

    return items;
  }

  function explainSelectedRepository(
    repo: string,
    { isAllowed, rules, visibility }: ProvisionAuthSelectedRepoResult,
  ): ListItem["children"] {
    const summary = paragraph(
      text(`${icon(isAllowed)} `),
      strong(text(isAllowed ? "Can" : "Can't")),
      text(" provision secret to "),
      strong(text(visibility)),
      text(" repo "),
      inlineCode(repo),
      text(":"),
    );

    if (rules.length < 1) {
      return [
        summary,
        list(
          listItem(
            paragraph(
              text(`${FAIL_ICON} `),
              strong(text("Can't")),
              text(" provision secret (no matching rules)"),
            ),
          ),
        ),
      ];
    }

    const explainedRules: ListItem[] = [];
    for (const ruleResult of rules) {
      explainedRules.push(listItem(...explainRule(ruleResult)));
    }

    return [summary, list(...explainedRules)];
  }

  function explainPatterns(patterns: string[]): PhrasingContent[] {
    const content: PhrasingContent[] = [];

    for (let i = 0; i < patterns.length; ++i) {
      if (i > 0) content.push(text(", "));
      content.push(inlineCode(patterns[i]));
    }

    return content;
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
