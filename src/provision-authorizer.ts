import { createGitHubPattern } from "./github-pattern.js";
import {
  accountOrRepoRefToString,
  isEnvRef,
  isRepoRef,
  repoRefToString,
} from "./github-reference.js";
import { createNamePattern } from "./name-pattern.js";
import { anyPatternMatches, type Pattern } from "./pattern.js";
import type { ProviderProvisionConfig } from "./type/provider-config.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthRuleResult,
} from "./type/provision-auth-result.js";
import type { ProvisionRequest } from "./type/provision-request.js";
import type {
  ProviderConfigGitHubSecretTypes,
  ProvisionSecretsRule,
} from "./type/provision-rule.js";

export type ProvisionAuthorizer = {
  /**
   * Authorize provisioning of a secret.
   */
  authorizeSecret: (request: ProvisionRequest) => ProvisionAuthResult;
};

export function createProvisionAuthorizer(
  config: ProviderProvisionConfig,
): ProvisionAuthorizer {
  const [namePatterns, targetPatterns, requesterPatterns] = patternsForRules(
    config.rules.secrets,
  );

  return {
    authorizeSecret(request) {
      const isSelfAccount =
        request.requester.account === request.target.account;
      const isSelfRepo =
        isRepoRef(request.target) &&
        request.requester.account === request.target.account &&
        request.requester.repo === request.target.repo;
      const requester = repoRefToString(request.requester);
      const target = accountOrRepoRefToString(request.target);

      const ruleResults: ProvisionAuthRuleResult[] = [];
      let have: "allow" | "deny" | undefined;

      for (let i = 0; i < config.rules.secrets.length; ++i) {
        if (!anyPatternMatches(namePatterns[i], request.name)) continue;
        if (!anyPatternMatches(requesterPatterns[i], requester)) continue;

        const rule = config.rules.secrets[i];
        let ruleHave: "allow" | "deny" | undefined;
        let isRelevant = false;

        if (isRepoRef(request.target)) {
          for (let j = 0; j < targetPatterns[i].repos.length; ++j) {
            const [repo, repoPattern, envPatterns] = targetPatterns[i].repos[j];

            if (!repoPattern.test(target)) continue;

            const repoPatternHave =
              request.type === "environment" && isEnvRef(request.target)
                ? applyEnvPatterns(
                    request.target.environment,
                    rule.to.github.repos[repo].environments,
                    envPatterns,
                  )
                : selectBySecretType(rule.to.github.repos[repo], request.type);

            if (repoPatternHave) {
              isRelevant = true;
              ruleHave = repoPatternHave;
            }

            if (ruleHave === "deny") break;
          }

          if (isSelfRepo) {
            const selfHave =
              request.type === "environment" && isEnvRef(request.target)
                ? applyEnvPatterns(
                    request.target.environment,
                    rule.to.github.repo.environments,
                    targetPatterns[i].selfRepoEnvs,
                  )
                : selectBySecretType(rule.to.github.repo, request.type);

            if (selfHave) {
              isRelevant = true;
              ruleHave = selfHave;
            }
          }
        } else {
          for (let j = 0; j < targetPatterns[i].accounts.length; ++j) {
            const [account, accountPattern] = targetPatterns[i].accounts[j];

            if (!accountPattern.test(target)) continue;

            const accountPatternHave = selectBySecretType(
              rule.to.github.accounts[account],
              request.type,
            );

            if (accountPatternHave) {
              isRelevant = true;
              ruleHave = accountPatternHave;
            }

            if (ruleHave === "deny") break;
          }

          if (isSelfAccount) {
            const selfHave = selectBySecretType(
              rule.to.github.account,
              request.type,
            );

            if (selfHave) {
              isRelevant = true;
              ruleHave = selfHave;
            }
          }
        }

        if (!isRelevant) continue;

        if (ruleHave) have = ruleHave;
        ruleResults.push({
          index: i,
          rule,
          have: ruleHave,
        });
      }

      return {
        request,
        rules: ruleResults,
        have,
        isAllowed: have === "allow",
      };
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
      for (const env of Object.keys(rule.to.github.repos[repo].environments)) {
        envPatterns.push([env, createNamePattern(env)]);
      }

      targetPatterns.repos.push([repo, createGitHubPattern(repo), envPatterns]);
    }

    for (const env of Object.keys(rule.to.github.repo.environments)) {
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
      case "codespaces":
        return types.codespaces;
      case "dependabot":
        return types.dependabot;
      /* v8 ignore start */
    }

    throw new Error(
      `Invariant violation: Unexpected secret type ${JSON.stringify(type)}`,
    );
    /* v8 ignore stop */
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
  repos: [repo: string, pattern: Pattern, [env: string, pattern: Pattern][]][];
  selfRepoEnvs: [env: string, pattern: Pattern][];
};
