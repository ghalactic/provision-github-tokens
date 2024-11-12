import { load } from "js-yaml";
import { normalizeGitHubPattern } from "../github-pattern.js";
import type { ProviderConfig } from "../type/provider-config.js";
import { validateProvider } from "./validation.js";

export function parseProviderConfig(
  definingAccount: string,
  definingRepo: string,
  yaml: string,
): ProviderConfig {
  return normalizeProviderConfig(definingAccount, parseYAML(yaml));
}

function parseYAML(yaml: string): ProviderConfig {
  try {
    const parsed = load(yaml);

    return validateProvider(parsed == null ? {} : parsed);
  } catch (cause) {
    const original = JSON.stringify(yaml);

    throw new Error(
      `Parsing of provider configuration failed for ${original}`,
      { cause },
    );
  }
}

function normalizeProviderConfig(
  definingAccount: string,
  config: ProviderConfig,
): ProviderConfig {
  for (let i = 0; i < config.permissions.rules.length; ++i) {
    const rule = config.permissions.rules[i];

    for (let j = 0; j < rule.resources.length; ++j) {
      rule.resources[j] = normalizeGitHubPattern(
        definingAccount,
        rule.resources[j],
      );
    }

    for (let j = 0; j < rule.consumers.length; ++j) {
      rule.consumers[j] = normalizeGitHubPattern(
        definingAccount,
        rule.consumers[j],
      );
    }
  }

  for (let i = 0; i < config.provision.rules.secrets.length; ++i) {
    const rule = config.provision.rules.secrets[i];

    for (let j = 0; j < rule.requesters.length; ++j) {
      rule.requesters[j] = normalizeGitHubPattern(
        definingAccount,
        rule.requesters[j],
      );
    }

    const repos: typeof rule.to.github.repos = {};
    for (const pattern in rule.to.github.repos) {
      repos[normalizeGitHubPattern(definingAccount, pattern)] =
        rule.to.github.repos[pattern];
    }
    rule.to.github.repos = repos;
  }

  return config;
}
