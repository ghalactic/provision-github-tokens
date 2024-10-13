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
  for (const rule of Object.values(config.permissions.rules.repositories)) {
    rule.resources = rule.resources.map((resource) =>
      normalizePattern(definingOwner, resource),
    );
    rule.consumers = rule.consumers.map((consumer) =>
      normalizePattern(definingOwner, consumer),
    );
  }

  for (const rule of Object.values(config.provision.rules.secrets)) {
    rule.requesters = rule.requesters.map((requester) =>
      normalizePattern(definingOwner, requester),
    );

    rule.allow.github.repositories = Object.fromEntries(
      Object.entries(rule.allow.github.repositories).map(([k, v]) => [
        normalizePattern(definingOwner, k),
        v,
      ]),
    );
    rule.deny.github.repositories = Object.fromEntries(
      Object.entries(rule.deny.github.repositories).map(([k, v]) => [
        normalizePattern(definingOwner, k),
        v,
      ]),
    );
  }

  return config;
}
