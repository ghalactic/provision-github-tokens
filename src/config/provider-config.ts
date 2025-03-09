import { debug } from "@actions/core";
import { load } from "js-yaml";
import { normalizeAccountPattern } from "../account.js";
import { errorMessage } from "../error.js";
import { normalizeGitHubPattern } from "../github-pattern.js";
import type { RepoReference } from "../github-reference.js";
import type { ProviderConfig } from "../type/provider-config.js";
import { validateProvider } from "./validation.js";

export function parseProviderConfig(
  definingRepo: RepoReference,
  yaml: string,
): ProviderConfig {
  return normalizeProviderConfig(definingRepo, parseYAML(yaml));
}

function parseYAML(yaml: string): ProviderConfig {
  try {
    const parsed = load(yaml);

    return validateProvider(parsed == null ? {} : parsed);
  } catch (cause) {
    debug(`Parsing of provider configuration failed: ${errorMessage(cause)}`);
    throw new Error("Parsing of provider configuration failed", { cause });
  }
}

function normalizeProviderConfig(
  definingRepo: RepoReference,
  config: ProviderConfig,
): ProviderConfig {
  for (let i = 0; i < config.permissions.rules.length; ++i) {
    const rule = config.permissions.rules[i];

    for (let j = 0; j < rule.resources.length; ++j) {
      for (let k = 0; k < rule.resources[j].accounts.length; ++k) {
        rule.resources[j].accounts[k] = normalizeAccountPattern(
          definingRepo,
          rule.resources[j].accounts[k],
        );
      }
    }

    for (let j = 0; j < rule.consumers.length; ++j) {
      rule.consumers[j] = normalizeGitHubPattern(
        definingRepo,
        rule.consumers[j],
      );
    }
  }

  for (let i = 0; i < config.provision.rules.secrets.length; ++i) {
    const rule = config.provision.rules.secrets[i];

    for (let j = 0; j < rule.requesters.length; ++j) {
      rule.requesters[j] = normalizeGitHubPattern(
        definingRepo,
        rule.requesters[j],
      );
    }

    const repos: typeof rule.to.github.repos = {};
    for (const pattern in rule.to.github.repos) {
      repos[normalizeGitHubPattern(definingRepo, pattern)] =
        rule.to.github.repos[pattern];
    }
    rule.to.github.repos = repos;
  }

  return config;
}
