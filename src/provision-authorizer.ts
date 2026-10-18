import { createGitHubPattern } from "./github-pattern.js";
import {
  accountOrRepoRefToString,
  isRepoRef,
  repoRefToString,
} from "./github-reference.js";
import { createNamePattern } from "./name-pattern.js";
import { anyPatternMatches, type Pattern } from "./pattern.js";
import {
  isEnvironmentProvisionRequestTarget,
  isRepoProvisionRequestTarget,
  type AccountSecretVisibility,
  type GitHubAccountProvisionRequestTarget,
  type GitHubEnvironmentProvisionRequestTarget,
  type GitHubRepoProvisionRequestTarget,
  type ProvisionRequest,
} from "./provision-request.js";
import type { TokenAuthorizer } from "./token-authorizer.js";
import type { TokenRequestFactory } from "./token-request.js";
import type { ProviderProvisionConfig } from "./type/provider-config.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthSelectedRepoResult,
  ProvisionAuthSelectedReposResult,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "./type/provision-auth-result.js";
import type {
  ProviderConfigGitHubAccountSecretTypes,
  ProviderConfigGitHubAccountSecretVisibilityDecisions,
  ProviderConfigGitHubSecretTypes,
  ProvisionSecretsRule,
} from "./type/provision-rule.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { Visibility } from "./type/visibility.js";
import { isVisibilityWithin } from "./visibility.js";

export type ProvisionAuthorizer = {
  authorizeSecret: (request: ProvisionRequest) => ProvisionAuthResult;
  listResults: () => ProvisionAuthResult[];
};

export function createProvisionAuthorizer(
  createTokenRequest: TokenRequestFactory,
  tokenAuthorizer: TokenAuthorizer,
  config: ProviderProvisionConfig,
): ProvisionAuthorizer {
  const [namePatterns, targetPatterns, requesterPatterns] = patternsForRules(
    config.rules.secrets,
  );
  const results = new Map<ProvisionRequest, ProvisionAuthResult>();

  return {
    authorizeSecret(request) {
      const targetResults: ProvisionAuthTargetResult[] = [];

      for (const target of request.to) {
        const isSelfAccount =
          request.requester.account === target.target.account;
        const isSelfRepo =
          isRepoRef(target.target) &&
          request.requester.account === target.target.account &&
          request.requester.repo === target.target.repo;
        const requester = repoRefToString(request.requester);
        const targetName = accountOrRepoRefToString(target.target);

        const ruleResults: ProvisionAuthTargetRuleResult[] = [];
        let have: "allow" | "deny" | undefined;

        for (let i = 0; i < config.rules.secrets.length; ++i) {
          if (!anyPatternMatches(namePatterns[i], request.name)) continue;
          if (!anyPatternMatches(requesterPatterns[i], requester)) continue;

          const rule = config.rules.secrets[i];
          let ruleHave: "allow" | "deny" | undefined;

          if (isRepoProvisionRequestTarget(target)) {
            ruleHave = selectRepoRule(i, target, isSelfRepo);
          } else {
            const visibilityCategory = accountSecretVisibilityCategory(
              target.visibility,
            );

            for (let j = 0; j < targetPatterns[i].accounts.length; ++j) {
              const [account, accountPattern] = targetPatterns[i].accounts[j];

              if (!accountPattern.test(targetName)) continue;

              const accountPatternHave = selectAccountVisibilityCategory(
                rule.to.github.accounts[account].types,
                target.type,
                visibilityCategory,
              );

              if (accountPatternHave) ruleHave = accountPatternHave;

              if (ruleHave === "deny") break;
            }

            if (isSelfAccount) {
              const selfHave = selectAccountVisibilityCategory(
                rule.to.github.account.types,
                target.type,
                visibilityCategory,
              );

              if (selfHave) ruleHave = selfHave;
            }
          }

          if (!ruleHave) continue;

          have = ruleHave;
          ruleResults.push({
            index: i,
            rule,
            have: ruleHave,
          });
        }

        const isRepoTarget = isRepoProvisionRequestTarget(target);
        const selectedRepos = isRepoTarget
          ? undefined
          : evaluateSelectedRepos(target, request);

        let tokenAuthResult: TokenAuthResult | undefined;
        let isTokenAllowed: boolean;

        if (request.tokenDec == null) {
          tokenAuthResult = undefined;
          isTokenAllowed = false;
        } else {
          tokenAuthResult = tokenAuthorizer.authorizeToken(
            createTokenRequest(request.tokenDec, target.target),
          );
          isTokenAllowed = tokenAuthResult.isAllowed;
        }

        const isSecretVisibilityCategoryAllowed = have === "allow";
        const isProvisionAllowed =
          isSecretVisibilityCategoryAllowed &&
          (selectedRepos?.isAllowed ?? true);

        const common = {
          rules: ruleResults,
          have,
          tokenAuthResult,
          isTokenAllowed,
          isSecretVisibilityCategoryAllowed,
          isProvisionAllowed,
          isAllowed: isTokenAllowed && isProvisionAllowed,
        };

        if (isRepoTarget) {
          targetResults.push({ ...common, target });
        } else {
          targetResults.push({
            ...common,
            target,
            selectedRepos: selectedRepos?.result,
          });
        }
      }

      const hasTokenDec = request.tokenDec != null;
      const isMissingTargets = targetResults.length < 1;
      const isAllAllowed = targetResults.every((result) => result.isAllowed);
      const isAllowed = hasTokenDec && !isMissingTargets && isAllAllowed;

      const result: ProvisionAuthResult = {
        request,
        results: targetResults,
        isMissingTargets,
        isAllowed,
      };

      results.set(request, result);

      return result;
    },

    listResults() {
      return Array.from(results.values());
    },
  };

  function patternsForRules(
    rules: ProvisionSecretsRule[],
  ): [
    namePatterns: Record<number, Pattern[]>,
    targetPatterns: Record<number, TargetCriteriaPatterns>,
    requesterPatterns: Record<number, Pattern[]>,
  ] {
    const namePatterns: Record<number, Pattern[]> = {};
    const targetPatterns: Record<number, TargetCriteriaPatterns> = {};
    const requesterPatterns: Record<number, Pattern[]> = {};

    for (let i = 0; i < rules.length; ++i) {
      [namePatterns[i], targetPatterns[i], requesterPatterns[i]] =
        patternsForRule(rules[i]);
    }

    return [namePatterns, targetPatterns, requesterPatterns];
  }

  function patternsForRule(
    rule: ProvisionSecretsRule,
  ): [
    namePatterns: Pattern[],
    targetPatterns: TargetCriteriaPatterns,
    requesterPatterns: Pattern[],
  ] {
    const namePatterns: Pattern[] = [];
    const targetPatterns: TargetCriteriaPatterns = {
      accounts: [],
      repos: [],
      selfRepoEnvs: [],
    };
    const requesterPatterns: Pattern[] = [];

    for (const name of rule.secrets) namePatterns.push(createNamePattern(name));

    for (const account of Object.keys(rule.to.github.accounts)) {
      targetPatterns.accounts.push([account, createGitHubPattern(account)]);
    }

    for (const repo of Object.keys(rule.to.github.repos)) {
      const envPatterns: [string, Pattern][] = [];
      for (const env of Object.keys(
        rule.to.github.repos[repo].types.environments,
      )) {
        envPatterns.push([env, createNamePattern(env)]);
      }

      targetPatterns.repos.push([
        repo,
        createGitHubPattern(repo),
        envPatterns,
        rule.to.github.repos[repo].visibility,
      ]);
    }

    for (const env of Object.keys(rule.to.github.repo.types.environments)) {
      targetPatterns.selfRepoEnvs.push([env, createNamePattern(env)]);
    }

    for (const requester of rule.requesters) {
      requesterPatterns.push(createGitHubPattern(requester));
    }

    return [namePatterns, targetPatterns, requesterPatterns];
  }

  function selectBySecretType(
    types: ProviderConfigGitHubSecretTypes,
    type: string,
  ) {
    switch (type) {
      case "actions":
        return types.actions;
      case "agents":
        return types.agents;
      case "codespaces":
        return types.codespaces;
      case "dependabot":
        return types.dependabot;
    }

    /* istanbul ignore next - @preserve */
    throw new Error(
      `Invariant violation: Unexpected secret type ${JSON.stringify(type)}`,
    );
  }

  function selectRepoRule(
    index: number,
    target:
      | GitHubRepoProvisionRequestTarget
      | GitHubEnvironmentProvisionRequestTarget,
    isSelfRepo: boolean,
  ): "allow" | "deny" | undefined {
    const rule = config.rules.secrets[index];
    const targetName = repoRefToString(target.target);
    let ruleHave: "allow" | "deny" | undefined;

    for (let j = 0; j < targetPatterns[index].repos.length; ++j) {
      const [repo, repoPattern, envPatterns, repoVisibility] =
        targetPatterns[index].repos[j];

      if (!repoPattern.test(targetName)) continue;
      if (!isVisibilityWithin(target.visibility, repoVisibility)) continue;

      const repoPatternHave = isEnvironmentProvisionRequestTarget(target)
        ? applyEnvPatterns(
            target.target.environment,
            rule.to.github.repos[repo].types.environments,
            envPatterns,
          )
        : selectBySecretType(rule.to.github.repos[repo].types, target.type);

      if (repoPatternHave) ruleHave = repoPatternHave;

      if (ruleHave === "deny") break;
    }

    if (
      isSelfRepo &&
      isVisibilityWithin(target.visibility, rule.to.github.repo.visibility)
    ) {
      const selfHave = isEnvironmentProvisionRequestTarget(target)
        ? applyEnvPatterns(
            target.target.environment,
            rule.to.github.repo.types.environments,
            targetPatterns[index].selfRepoEnvs,
          )
        : selectBySecretType(rule.to.github.repo.types, target.type);

      if (selfHave) ruleHave = selfHave;
    }

    return ruleHave;
  }

  function accountSecretVisibilityCategory(
    visibility: AccountSecretVisibility,
  ): AccountSecretVisibilityCategory {
    if (visibility === "all") return "allRepos";
    if (visibility === "private") return "privateRepos";

    return visibility.patterns.length > 0 ? "selectedRepos" : "noRepos";
  }

  function selectAccountVisibilityCategory(
    types: ProviderConfigGitHubAccountSecretTypes,
    type: string,
    visibilityCategory: AccountSecretVisibilityCategory,
  ): "allow" | "deny" | undefined {
    return selectAccountSecretType(types, type)?.[visibilityCategory];
  }

  function selectAccountSecretType(
    types: ProviderConfigGitHubAccountSecretTypes,
    type: string,
  ): ProviderConfigGitHubAccountSecretVisibilityDecisions | undefined {
    switch (type) {
      case "actions":
        return types.actions;
      case "agents":
        return types.agents;
      case "codespaces":
        return types.codespaces;
      case "dependabot":
        return types.dependabot;
    }

    /* istanbul ignore next - @preserve */
    throw new Error(
      `Invariant violation: Unexpected secret type ${JSON.stringify(type)}`,
    );
  }

  function evaluateSelectedRepos(
    target: GitHubAccountProvisionRequestTarget,
    request: ProvisionRequest,
  ): SelectedReposEvaluation | undefined {
    const { visibility } = target;

    if (visibility === "all" || visibility === "private") return undefined;
    if (visibility.patterns.length < 1) return undefined;

    const requester = repoRefToString(request.requester);
    const results: Record<string, ProvisionAuthSelectedRepoResult> = {};
    let isAllowed = true;

    for (const { ref, visibility: repoVisibility } of visibility.repos) {
      const repoTarget: GitHubRepoProvisionRequestTarget = {
        platform: "github",
        type: target.type,
        target: ref,
        visibility: repoVisibility,
      };
      const isSelfRepo =
        request.requester.account === ref.account &&
        request.requester.repo === ref.repo;
      const ruleResults: ProvisionAuthTargetRuleResult[] = [];
      let have: "allow" | "deny" | undefined;

      for (let i = 0; i < config.rules.secrets.length; ++i) {
        if (!anyPatternMatches(namePatterns[i], request.name)) continue;
        if (!anyPatternMatches(requesterPatterns[i], requester)) continue;

        const ruleHave = selectRepoRule(i, repoTarget, isSelfRepo);
        if (!ruleHave) continue;

        have = ruleHave;
        ruleResults.push({
          index: i,
          rule: config.rules.secrets[i],
          have: ruleHave,
        });
      }

      const repoAllowed = have === "allow";
      isAllowed &&= repoAllowed;

      results[repoRefToString(ref)] = {
        rules: ruleResults,
        have,
        isAllowed: repoAllowed,
        visibility: repoVisibility,
      };
    }

    const isMatched = visibility.repos.length > 0;

    return {
      isAllowed: isMatched && isAllowed,
      result: { results, isMatched },
    };
  }

  function applyEnvPatterns(
    reqEnv: string,
    environments: Record<string, "allow" | "deny">,
    envPatterns: [env: string, pattern: Pattern][],
  ): "allow" | "deny" | undefined {
    let have: "allow" | undefined;

    for (let i = 0; i < envPatterns.length; ++i) {
      const [env, envPattern] = envPatterns[i];

      if (!envPattern.test(reqEnv)) continue;
      if (environments[env] === "deny") return "deny";

      have = environments[env];
    }

    return have;
  }
}

type TargetCriteriaPatterns = {
  accounts: [account: string, pattern: Pattern][];
  repos: [
    repo: string,
    pattern: Pattern,
    [env: string, pattern: Pattern][],
    visibility: Visibility,
  ][];
  selfRepoEnvs: [env: string, pattern: Pattern][];
};

type AccountSecretVisibilityCategory =
  "allRepos" | "privateRepos" | "selectedRepos" | "noRepos";

type SelectedReposEvaluation = {
  isAllowed: boolean;
  result: ProvisionAuthSelectedReposResult;
};
