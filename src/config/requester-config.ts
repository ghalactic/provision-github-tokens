import { debug } from "@actions/core";
import { load } from "js-yaml";
import { errorMessage } from "../error.js";
import { normalizeGitHubPattern } from "../github-pattern.js";
import type { RepoReference } from "../github-reference.js";
import { normalizeTokenReference } from "../token-reference.js";
import type {
  PartialRequesterConfig,
  RequesterConfig,
} from "../type/requester-config.js";
import { validateRequester } from "./validation.js";

export function parseRequesterConfig(
  definingRepo: RepoReference,
  yaml: string,
): RequesterConfig {
  return normalizeRequesterConfig(definingRepo, parseYAML(yaml));
}

function parseYAML(yaml: string): PartialRequesterConfig {
  try {
    const parsed = load(yaml);

    return validateRequester(parsed == null ? {} : parsed);
  } catch (cause) {
    debug(`Parsing of requester configuration failed: ${errorMessage(cause)}`);
    throw new Error("Parsing of requester configuration failed", { cause });
  }
}

function normalizeRequesterConfig(
  definingRepo: RepoReference,
  config: PartialRequesterConfig,
): RequesterConfig {
  for (const name in config.tokens) {
    const token = config.tokens[name];

    token.as ??= undefined;
    token.account ??= definingRepo.account;
  }

  for (const name in config.provision.secrets) {
    const secret = config.provision.secrets[name];

    secret.token = normalizeTokenReference(definingRepo, secret.token);

    const repos: typeof secret.github.repos = {};
    for (const pattern in secret.github.repos) {
      repos[normalizeGitHubPattern(definingRepo, pattern)] =
        secret.github.repos[pattern];
    }
    secret.github.repos = repos;
  }

  return config as RequesterConfig;
}
