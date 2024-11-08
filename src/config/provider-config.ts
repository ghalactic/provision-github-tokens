import { load } from "js-yaml";
import { errorMessage } from "../error.js";
import { normalizeRepoPattern } from "../repo-pattern.js";
import type { ProviderConfig } from "../type/provider-config.js";
import { withErrorContext } from "./error-context.js";
import { validateProvider } from "./validation.js";

export function parseProviderConfig(
  definingOwner: string,
  definingRepo: string,
  yaml: string,
): ProviderConfig {
  return normalizeProviderConfig(definingOwner, parseYAML(yaml));
}

function parseYAML(yaml: string): ProviderConfig {
  try {
    const parsed = load(yaml);

    return validateProvider(parsed == null ? {} : parsed);
  } catch (cause) {
    const original = JSON.stringify(yaml);

    throw new Error(
      `Parsing of provider configuration failed with ${errorMessage(cause)}. ` +
        `Provided value: ${original}`,
      { cause },
    );
  }
}

function normalizeProviderConfig(
  definingOwner: string,
  config: ProviderConfig,
): ProviderConfig {
  for (let i = 0; i < config.permissions.rules.repos.length; ++i) {
    const rule = config.permissions.rules.repos[i];

    rule.resources = rule.resources.map((resource, j) =>
      withErrorContext(
        "Provider config has an error at " +
          `$.permissions.rules.repos[${i}].resources[${j}]`,
        () => normalizeRepoPattern(definingOwner, resource),
      ),
    );
    rule.consumers = rule.consumers.map((consumer, j) =>
      withErrorContext(
        "Provider config has an error at " +
          `$.permissions.rules.repos[${i}].consumers[${j}]`,
        () => normalizeRepoPattern(definingOwner, consumer),
      ),
    );
  }

  for (let i = 0; i < config.provision.rules.secrets.length; ++i) {
    const rule = config.provision.rules.secrets[i];

    rule.requesters = rule.requesters.map((requester, j) =>
      withErrorContext(
        "Provider config has an error at " +
          `$.provision.rules.secrets[${i}].requesters[${j}]`,
        () => normalizeRepoPattern(definingOwner, requester),
      ),
    );

    const repos: typeof rule.to.github.repos = {};
    for (const pattern in rule.to.github.repos) {
      repos[
        withErrorContext(
          "Provider config has an error at " +
            `$.provision.rules.secrets[${i}]` +
            `.to.github.repos[${JSON.stringify(pattern)}]`,
          () => normalizeRepoPattern(definingOwner, pattern),
        )
      ] = rule.to.github.repos[pattern];
    }
    rule.to.github.repos = repos;
  }

  return config;
}
