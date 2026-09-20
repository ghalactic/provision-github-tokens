import type { List, ListItem, PhrasingContent, RootContent } from "mdast";
import { isSufficientAccess } from "../access-level.js";
import { accountOrRepoRefToString, isRepoRef } from "../github-reference.js";
import { icon } from "../icon.js";
import {
  emphasis,
  inlineCode,
  list,
  listItem,
  paragraph,
  strong,
  text,
} from "../markdown.js";
import { permissionAccess } from "../permissions.js";
import { pluralize } from "../pluralize.js";
import type { PermissionsRule } from "../type/permissions-rule.js";
import type { Permissions } from "../type/permissions.js";
import type {
  TokenAuthResourceResult,
  TokenAuthResourceResultRuleResult,
  TokenAuthResult,
  TokenAuthResultAllRepos,
  TokenAuthResultExplainer,
  TokenAuthResultNoRepos,
  TokenAuthResultSelectedRepos,
} from "../type/token-auth-result.js";
import { ACCESS_LEVEL_LABELS } from "./access-level.js";

export function createMarkdownTokenAuthExplainer(): TokenAuthResultExplainer<
  RootContent[]
> {
  return (result) => {
    if (result.type === "ALL_REPOS") return [explainAllRepos(result)];
    if (result.type === "NO_REPOS") return [explainNoRepos(result)];

    return [explainSelectedRepos(result)];
  };

  function explainAllRepos(result: TokenAuthResultAllRepos): List {
    const { request, isSufficient, rules } = result;
    const subject: PhrasingContent[] = [
      strong(text("all repos")),
      text(" in "),
      inlineCode(request.tokenDec.account),
    ];

    const summary = listItem(...explainSummary(result));

    const maxAccessAndRole = listItem(
      ...explainMaxAccessAndRole(result, subject),
    );
    summary.children.push(list(maxAccessAndRole));

    const basedOnRules = listItem(
      ...explainBasedOnRules(
        isSufficient,
        subject,
        request.tokenDec.permissions,
        rules,
      ),
    );
    summary.children.push(list(basedOnRules));

    return list(summary);
  }

  function explainNoRepos(result: TokenAuthResultNoRepos): List {
    const { request, isSufficient, rules } = result;
    const subject: PhrasingContent[] = [inlineCode(request.tokenDec.account)];

    const summary = listItem(...explainSummary(result));

    const maxAccessAndRole = listItem(
      ...explainMaxAccessAndRole(result, subject),
    );
    summary.children.push(list(maxAccessAndRole));

    const basedOnRules = listItem(
      ...explainBasedOnRules(
        isSufficient,
        subject,
        request.tokenDec.permissions,
        rules,
      ),
    );
    summary.children.push(list(basedOnRules));

    return list(summary);
  }

  function explainSelectedRepos(result: TokenAuthResultSelectedRepos): List {
    const { request, results } = result;
    const subject: PhrasingContent[] = [
      text("repos in "),
      inlineCode(request.tokenDec.account),
    ];

    const summary = listItem(...explainSummary(result));

    const maxAccessAndRole = listItem(
      ...explainMaxAccessAndRole(result, subject),
    );
    summary.children.push(list(maxAccessAndRole));

    const selectedReposMatch = listItem(...explainSelectedReposMatch(result));
    summary.children.push(list(selectedReposMatch));

    const resourceEntries = Object.entries(results).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const explainedResources = list();

    for (const [resourceRepo, resourceResult] of resourceEntries) {
      explainedResources.children.push(
        listItem(
          ...explainResourceRepo(
            resourceRepo,
            request.tokenDec.permissions,
            resourceResult,
          ),
        ),
      );
    }

    summary.children.push(explainedResources);

    return list(summary);
  }

  function explainSummary({
    request,
    isAllowed,
  }: TokenAuthResult): ListItem["children"] {
    const name = accountOrRepoRefToString(request.consumer);

    if (isRepoRef(request.consumer)) {
      return [
        paragraph(
          text(`${icon(isAllowed)} Repo `),
          inlineCode(name),
          text(" was "),
          strong(text(isAllowed ? "allowed" : "denied")),
          text(" access to a token:"),
        ),
      ];
    }

    return [
      paragraph(
        text(`${icon(isAllowed)} Account `),
        inlineCode(name),
        text(" was "),
        strong(text(isAllowed ? "allowed" : "denied")),
        text(" access to a token:"),
      ),
    ];
  }

  function explainMaxAccessAndRole(
    { request, maxWant, isMissingRole }: TokenAuthResult,
    accessTo: PhrasingContent[],
  ): ListItem["children"] {
    return [
      paragraph(
        text(`${icon(!isMissingRole)} `),
        strong(text(`${ACCESS_LEVEL_LABELS[maxWant]}`)),
        text(" access to "),
        ...accessTo,
        ...(request.tokenDec.as
          ? [text(" requested with role "), inlineCode(request.tokenDec.as)]
          : [text(" requested without a role")]),
      ),
    ];
  }

  function explainSelectedReposMatch({
    request,
    isMatched,
  }: TokenAuthResultSelectedRepos): ListItem["children"] {
    const repoPatterns = pluralize(
      request.tokenDec.repos.length,
      "repo pattern",
      "repo patterns",
    );
    const repos = pluralize(request.repos.length, "repo", "repos");

    return [
      paragraph(text(`${icon(isMatched)} ${repoPatterns} matched ${repos}`)),
    ];
  }

  function explainResourceRepo(
    resource: string,
    want: Permissions,
    { isSufficient, rules }: TokenAuthResourceResult,
  ): ListItem["children"] {
    return explainBasedOnRules(
      isSufficient,
      [text("repo "), inlineCode(resource)],
      want,
      rules,
    );
  }

  function explainBasedOnRules(
    isSufficient: boolean,
    accessTo: PhrasingContent[],
    want: Permissions,
    rules: TokenAuthResourceResultRuleResult[],
  ): ListItem["children"] {
    const ruleCount = rules.length;
    const summary = paragraph(
      text(`${icon(isSufficient)} `),
      strong(text(isSufficient ? "Sufficient" : "Insufficient")),
      text(" access to "),
      ...accessTo,
      ...(ruleCount < 1
        ? [text(" (no matching rules)")]
        : [text(` based on ${pluralize(ruleCount, "rule", "rules")}:`)]),
    );

    if (ruleCount < 1) return [summary];

    const explainedRules: ListItem[] = [];

    for (const ruleResult of rules) {
      explainedRules.push(listItem(...explainRule(want, ruleResult)));
    }

    return [summary, list(...explainedRules)];
  }

  function explainRule(
    want: Permissions,
    { index, rule, have, isSufficient }: TokenAuthResourceResultRuleResult,
  ): ListItem["children"] {
    // return (
    //   `\n    ${icon(isSufficient)} Rule ${renderRule(index, rule)} ` +
    //   `gave ${isSufficient ? "sufficient" : "insufficient"} access:` +
    //   renderPermissionComparison("      ", have, want)
    // );
    return [
      paragraph(
        text(`${icon(isSufficient)} Rule `),
        ...renderRule(index, rule),
        text(` gave ${isSufficient ? "sufficient" : "insufficient"} access:`),
      ),
      list(...renderPermissionComparison(have, want)),
    ];
  }

  function renderRule(
    index: number,
    { description }: PermissionsRule,
  ): PhrasingContent[] {
    const n = inlineCode(`#${index + 1}`);

    return description ? [n, text(": "), emphasis(text(description))] : [n];
  }

  function renderPermissionComparison(
    have: Permissions,
    want: Permissions,
  ): ListItem[] {
    const comparison: ListItem[] = [];

    for (const p of Object.keys(want).sort((a, b) => a.localeCompare(b))) {
      const h = permissionAccess(have, p);
      const w = permissionAccess(want, p);

      comparison.push(
        listItem(
          paragraph(
            text(`${icon(isSufficientAccess(h, w))} `),
            emphasis(text(p)),
            text(": have "),
            inlineCode(h),
            text(", wanted "),
            inlineCode(w),
          ),
        ),
      );
    }

    return comparison;
  }
}
