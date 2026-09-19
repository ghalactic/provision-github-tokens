import type { BlockContent, List, Paragraph } from "mdast";
import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import {
  accountOrRepoRefToString,
  isRepoRef,
  repoRefToString,
} from "../github-reference.js";
import { FAIL_ICON, PASS_ICON, icon } from "../icon.js";
import { inlineCode, list, text } from "../markdown.js";
import type {
  ProvisionRequest,
  ProvisionRequestTarget,
} from "../provision-request.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthResultExplainer,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "../type/provision-auth-result.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";

type ListItemSpec = {
  contents: Paragraph["children"];
  nested?: List;
};

export function createMarkdownProvisionAuthExplainer(
  tokenResults: TokenAuthResult[],
): ProvisionAuthResultExplainer<BlockContent[]> {
  return (result) => [list(explainSummary(result))];

  function explainSummary({
    request,
    isAllowed,
    results,
    isMissingTargets,
  }: ProvisionAuthResult): ListItemSpec[] {
    return [
      {
        contents: [
          text(`${icon(isAllowed)} Repo `),
          inlineCode(repoRefToString(request.requester)),
          text(
            isAllowed
              ? " was allowed to provision secret "
              : " wasn't allowed to provision secret ",
          ),
          inlineCode(request.name),
          text(":"),
        ],
        nested: list([
          explainTokenDec(request),
          ...explainTargets(request, results, isMissingTargets),
        ]),
      },
    ];
  }

  function explainTokenDec(request: ProvisionRequest): ListItemSpec {
    if (request.tokenDec) {
      return {
        contents: [
          text(`${PASS_ICON} Can use token declaration `),
          inlineCode(request.secretDec.token),
        ],
      };
    }

    const reason = request.tokenDecIsRegistered
      ? "it isn't shared"
      : "it doesn't exist";

    return {
      contents: [
        text(`${FAIL_ICON} Can't use token declaration `),
        inlineCode(request.secretDec.token),
        text(` because ${reason}`),
      ],
    };
  }

  function explainTargets(
    request: ProvisionRequest,
    results: ProvisionAuthTargetResult[],
    isMissingTargets: boolean,
  ): ListItemSpec[] {
    if (isMissingTargets) {
      return [{ contents: [text(`${FAIL_ICON} No targets specified`)] }];
    }

    const entries: [
      target: ProvisionRequestTarget,
      result: ProvisionAuthTargetResult,
    ][] = [];

    for (let i = 0; i < results.length; ++i) {
      entries.push([request.to[i], results[i]]);
    }
    entries.sort(([a], [b]) => compareProvisionRequestTarget(a, b));

    return entries.map(([target, result]) => explainTarget(result, target));
  }

  function explainTarget(
    result: ProvisionAuthTargetResult,
    target: ProvisionRequestTarget,
  ): ListItemSpec {
    const { isAllowed } = result;

    return {
      contents: [
        text(`${icon(isAllowed)} ${isAllowed ? "Can" : "Can't"} `),
        text("provision token to "),
        ...explainSubject(target),
        text(":"),
      ],
      nested: list([
        explainTargetToken(result),
        explainTargetProvision(result),
      ]),
    };
  }

  function explainTargetToken({
    isTokenAllowed,
    tokenAuthResult,
  }: ProvisionAuthTargetResult): ListItemSpec {
    if (!tokenAuthResult) {
      return {
        contents: [
          text(`${FAIL_ICON} Token can't be authorized without a declaration`),
        ],
      };
    }

    const name = accountOrRepoRefToString(tokenAuthResult.request.consumer);
    const ref = `#${tokenResults.indexOf(tokenAuthResult) + 1}`;
    const kind = isRepoRef(tokenAuthResult.request.consumer)
      ? "Repo"
      : "Account";
    const verb = isTokenAllowed ? "was allowed" : "was denied";

    return {
      contents: [
        text(`${icon(isTokenAllowed)} ${kind} `),
        inlineCode(name),
        text(` ${verb} access to token `),
        inlineCode(ref),
      ],
    };
  }

  function explainTargetProvision({
    isProvisionAllowed,
    rules,
  }: ProvisionAuthTargetResult): ListItemSpec {
    return {
      contents: [
        text(`${icon(isProvisionAllowed)} `),
        text(`${isProvisionAllowed ? "Can" : "Can't"} provision secret `),
        ...explainBasedOnRules(rules),
      ],
      nested: rules.length > 0 ? list(rules.map(explainRule)) : undefined,
    };
  }

  function explainBasedOnRules(
    rules: ProvisionAuthTargetRuleResult[],
  ): Paragraph["children"] {
    if (rules.length < 1) return [text("(no matching rules)")];

    return [
      text(
        `based on ${rules.length} ${rules.length === 1 ? "rule" : "rules"}:`,
      ),
    ];
  }

  function explainRule({
    index,
    rule,
    have,
  }: ProvisionAuthTargetRuleResult): ListItemSpec {
    const isAllowed = have === "allow";

    return {
      contents: [
        text(`${icon(isAllowed)} ${isAllowed ? "Allowed" : "Denied"} by rule `),
        inlineCode(`#${index + 1}`),
        ...(rule.description
          ? [text(`: ${JSON.stringify(rule.description)}`)]
          : []),
      ],
    };
  }

  function explainSubject(
    target: ProvisionRequestTarget,
  ): Paragraph["children"] {
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
      text(`${type} secret in `),
      inlineCode(accountOrRepoRefToString(target.target)),
    ];
  }
}
