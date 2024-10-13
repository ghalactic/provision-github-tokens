import { load } from "js-yaml";
import { errorMessage } from "../error.js";
import { normalizePattern } from "../pattern.js";
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
  for (const rule of config.permissions.rules.repositories) {
    rule.resources = rule.resources.map((resource) =>
      normalizePattern(definingOwner, resource),
    );
    rule.consumers = rule.consumers.map((consumer) =>
      normalizePattern(definingOwner, consumer),
    );
  }

  for (const rule of config.provision.rules.secrets) {
    rule.requesters = rule.requesters.map((requester) =>
      normalizePattern(definingOwner, requester),
    );

    const allowRepositories: typeof rule.allow.github.repositories = {};
    for (const pattern in rule.allow.github.repositories) {
      allowRepositories[normalizePattern(definingOwner, pattern)] =
        rule.allow.github.repositories[pattern];
    }
    rule.allow.github.repositories = allowRepositories;

    const denyRepositories: typeof rule.deny.github.repositories = {};
    for (const pattern in rule.deny.github.repositories) {
      denyRepositories[normalizePattern(definingOwner, pattern)] =
        rule.deny.github.repositories[pattern];
    }
    rule.deny.github.repositories = denyRepositories;
  }

  return config;
}
