import { load } from "js-yaml";
import { errorMessage } from "../error.js";
import { normalizeRepoPattern } from "../repo-pattern.js";
import type { ProviderConfig } from "../type/provider-config.js";
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
  } catch (error) {
    const original = JSON.stringify(yaml);

    throw new Error(
      `Parsing of provider configuration failed with ${errorMessage(error)}. Provided value: ${original}`,
    );
  }
}

function normalizeProviderConfig(
  definingOwner: string,
  config: ProviderConfig,
): ProviderConfig {
  for (const rule of config.permissions.rules.repos) {
    rule.resources = rule.resources.map((resource) =>
      normalizeRepoPattern(definingOwner, resource),
    );
    rule.consumers = rule.consumers.map((consumer) =>
      normalizeRepoPattern(definingOwner, consumer),
    );
  }

  for (const rule of config.provision.rules.secrets) {
    rule.requesters = rule.requesters.map((requester) =>
      normalizeRepoPattern(definingOwner, requester),
    );

    const repos: typeof rule.to.github.repos = {};
    for (const pattern in rule.to.github.repos) {
      repos[normalizeRepoPattern(definingOwner, pattern)] =
        rule.to.github.repos[pattern];
    }
    rule.to.github.repos = repos;
  }

  return config;
}
