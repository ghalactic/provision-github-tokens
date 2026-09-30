import { debug, getInput, info } from "@actions/core";
import { normalizeAccountPattern } from "../account.js";
import type { Context } from "../context.js";
import { errorMessage } from "../error.js";
import { normalizeGitHubPattern } from "../github-pattern.js";
import {
  repoRefFromName,
  repoRefToString,
  type RepoReference,
} from "../github-reference.js";
import type { OctokitFactory } from "../octokit.js";
import type {
  PermissionsRule,
  PermissionsRuleResourceCriteria,
} from "../type/permissions-rule.js";
import type {
  PartialProviderConfig,
  ProviderConfig,
} from "../type/provider-config.js";
import type {
  ProviderConfigGitHubRepoTarget,
  ProvisionSecretsRule,
} from "../type/provision-rule.js";
import { validateProvider } from "./validation.js";
import { parseYaml } from "./yaml.js";

export async function readProviderConfig(
  context: Context,
  octokitFactory: OctokitFactory,
): Promise<ProviderConfig> {
  const provider = repoRefFromName(context.githubRepository);
  const configPath = getInput("configPath");

  info(`Reading from ${context.githubRepository}/${configPath}`);

  const octokit = octokitFactory.actionOctokit();
  const res = await octokit.rest.repos.getContent({
    owner: provider.account,
    repo: provider.repo,
    ref: context.githubRef,
    path: configPath,
    mediaType: { format: "raw" },
  });
  const configYaml = res.data as unknown as string;

  const config = parseProviderConfig(provider, configPath, configYaml);
  debug(`Provider config: ${JSON.stringify(config, null, 2)}`);

  return config;
}

export function parseProviderConfig(
  definingRepo: RepoReference,
  configPath: string,
  configYaml: string,
): ProviderConfig {
  let config: PartialProviderConfig;

  try {
    config = validateProvider(
      parseYaml(
        {},
        configYaml,
        `${repoRefToString(definingRepo)}/${configPath}`,
      ),
    );
  } catch (cause) {
    debug(`Parsing of provider configuration failed: ${errorMessage(cause)}`);
    throw new Error("Parsing of provider configuration failed", { cause });
  }

  return normalizeProviderConfig(definingRepo, config);
}

function normalizeProviderConfig(
  definingRepo: RepoReference,
  config: PartialProviderConfig,
): ProviderConfig {
  const rules: PermissionsRule[] = [];

  for (let i = 0; i < config.permissions.rules.length; ++i) {
    const rule = config.permissions.rules[i];
    const resources: PermissionsRuleResourceCriteria[] = [];

    for (let j = 0; j < rule.resources.length; ++j) {
      const criteria = rule.resources[j];
      const accounts: string[] = [];

      for (let k = 0; k < criteria.accounts.length; ++k) {
        accounts.push(
          normalizeAccountPattern(definingRepo, criteria.accounts[k]),
        );
      }

      resources.push({
        accounts,
        noRepos: criteria.noRepos,
        allRepos: criteria.allRepos,
        selectedRepos: criteria.selectedRepos?.repos ?? [],
      });
    }

    const consumers: string[] = [];

    for (let j = 0; j < rule.consumers.length; ++j) {
      consumers.push(normalizeGitHubPattern(definingRepo, rule.consumers[j]));
    }

    rules.push({
      description: rule.description,
      resources,
      consumers,
      permissions: rule.permissions,
    });
  }

  const secrets: ProvisionSecretsRule[] = [];

  for (let i = 0; i < config.provision.rules.secrets.length; ++i) {
    const rule = config.provision.rules.secrets[i];
    const requesters: string[] = [];

    for (let j = 0; j < rule.requesters.length; ++j) {
      requesters.push(normalizeGitHubPattern(definingRepo, rule.requesters[j]));
    }

    const repos: Record<string, ProviderConfigGitHubRepoTarget> = {};

    for (const pattern in rule.to.github.repos) {
      repos[normalizeGitHubPattern(definingRepo, pattern)] =
        rule.to.github.repos[pattern];
    }

    secrets.push({
      description: rule.description,
      secrets: rule.secrets,
      requesters,
      to: {
        github: {
          account: rule.to.github.account,
          accounts: rule.to.github.accounts,
          repo: rule.to.github.repo,
          repos,
        },
      },
    });
  }

  return {
    $schema: config.$schema,
    dashboards: config.dashboards,
    permissions: { rules },
    provision: { rules: { secrets } },
  };
}
