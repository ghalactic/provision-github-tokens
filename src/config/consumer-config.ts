import { debug } from "@actions/core";
import { load } from "js-yaml";
import { errorMessage } from "../error.js";
import { normalizeGitHubPattern } from "../github-pattern.js";
import { normalizeTokenReference } from "../token-reference.js";
import type {
  ConsumerConfig,
  PartialConsumerConfig,
} from "../type/consumer-config.js";
import { validateConsumer } from "./validation.js";

export function parseConsumerConfig(
  definingAccount: string,
  definingRepo: string,
  yaml: string,
): ConsumerConfig {
  return normalizeConsumerConfig(
    definingAccount,
    definingRepo,
    parseYAML(yaml),
  );
}

function parseYAML(yaml: string): PartialConsumerConfig {
  try {
    const parsed = load(yaml);

    return validateConsumer(parsed == null ? {} : parsed);
  } catch (cause) {
    debug(`Parsing of consumer configuration failed: ${errorMessage(cause)}`);
    throw new Error("Parsing of consumer configuration failed", { cause });
  }
}

function normalizeConsumerConfig(
  definingAccount: string,
  definingRepo: string,
  config: PartialConsumerConfig,
): ConsumerConfig {
  for (const name in config.tokens) {
    const token = config.tokens[name];

    token.as ??= undefined;
    token.account ??= definingAccount;
  }

  for (const name in config.provision.secrets) {
    const secret = config.provision.secrets[name];

    secret.token = normalizeTokenReference(
      definingAccount,
      definingRepo,
      secret.token,
    );

    const repos: typeof secret.github.repos = {};
    for (const pattern in secret.github.repos) {
      repos[normalizeGitHubPattern(definingAccount, pattern)] =
        secret.github.repos[pattern];
    }
    secret.github.repos = repos;
  }

  return config as ConsumerConfig;
}
