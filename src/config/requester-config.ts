import { debug } from "@actions/core";
import { errorMessage } from "../error.js";
import { normalizeGitHubPattern } from "../github-pattern.js";
import { repoRefToString, type RepoReference } from "../github-reference.js";
import { normalizeTokenReference } from "../token-reference.js";
import type {
  PartialRequesterConfig,
  RequesterConfig,
} from "../type/requester-config.js";
import { validateRequester } from "./validation.js";
import { parseYaml } from "./yaml.js";

export function parseRequesterConfig(
  definingRepo: RepoReference,
  configPath: string,
  configYaml: string,
): RequesterConfig {
  let config: PartialRequesterConfig;

  try {
    config = validateRequester(
      parseYaml(
        {},
        configYaml,
        `${repoRefToString(definingRepo)}/${configPath}`,
      ),
    );
  } catch (cause) {
    debug(`Parsing of requester configuration failed: ${errorMessage(cause)}`);
    throw new Error("Parsing of requester configuration failed", { cause });
  }

  return normalizeRequesterConfig(definingRepo, config);
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

  return config;
}
