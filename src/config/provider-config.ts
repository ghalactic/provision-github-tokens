import { load } from "js-yaml";
import { escape } from "../json-pointer.js";
import { normalizeRepoPattern } from "../repo-pattern.js";
import type { ProviderConfig } from "../type/provider-config.js";
import { validateProvider } from "./validation.js";
import { wrapErrors } from "./wrap-errors.js";

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
      `Parsing of provider configuration failed for ${original}`,
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
      wrapErrors(
        () => normalizeRepoPattern(definingOwner, resource),
        (cause) =>
          new Error(
            "Provider config has an error at " +
              `/permissions/rules/repos/${escape(i)}/resources/${escape(j)}`,
            { cause },
          ),
      ),
    );
    rule.consumers = rule.consumers.map((consumer, j) =>
      wrapErrors(
        () => normalizeRepoPattern(definingOwner, consumer),
        (cause) =>
          new Error(
            "Provider config has an error at " +
              `/permissions/rules/repos/${escape(i)}/consumers/${escape(j)}`,
            { cause },
          ),
      ),
    );
  }

  for (let i = 0; i < config.provision.rules.secrets.length; ++i) {
    const rule = config.provision.rules.secrets[i];

    rule.requesters = rule.requesters.map((requester, j) =>
      wrapErrors(
        () => normalizeRepoPattern(definingOwner, requester),
        (cause) =>
          new Error(
            "Provider config has an error at " +
              `/provision/rules/secrets/${escape(i)}/requesters/${escape(j)}`,
            { cause },
          ),
      ),
    );

    const repos: typeof rule.to.github.repos = {};
    for (const pattern in rule.to.github.repos) {
      repos[
        wrapErrors(
          () => normalizeRepoPattern(definingOwner, pattern),
          (cause) =>
            new Error(
              "Provider config has an error at " +
                `/provision/rules/secrets/${escape(i)}` +
                `/to/github/repos/${escape(pattern)}`,
              { cause },
            ),
        )
      ] = rule.to.github.repos[pattern];
    }
    rule.to.github.repos = repos;
  }

  return config;
}
