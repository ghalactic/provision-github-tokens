import { load } from "js-yaml";
import { escape } from "../json-pointer.js";
import { normalizeRepoPattern } from "../repo-pattern.js";
import { normalizeTokenReference } from "../token-reference.js";
import type {
  ConsumerConfig,
  PartialConsumerConfig,
} from "../type/consumer-config.js";
import { validateConsumer } from "./validation.js";
import { wrapErrors } from "./wrap-errors.js";

export function parseConsumerConfig(
  definingOwner: string,
  definingRepo: string,
  yaml: string,
): ConsumerConfig {
  return normalizeConsumerConfig(definingOwner, definingRepo, parseYAML(yaml));
}

function parseYAML(yaml: string): PartialConsumerConfig {
  try {
    const parsed = load(yaml);

    return validateConsumer(parsed == null ? {} : parsed);
  } catch (cause) {
    const original = JSON.stringify(yaml);

    throw new Error(
      `Parsing of consumer configuration failed for ${original}`,
      { cause },
    );
  }
}

function normalizeConsumerConfig(
  definingOwner: string,
  definingRepo: string,
  config: PartialConsumerConfig,
): ConsumerConfig {
  for (const name in config.tokens) {
    const token = config.tokens[name];

    token.as ??= undefined;
    token.owner ??= definingOwner;
  }

  for (const name in config.provision.secrets) {
    const secret = config.provision.secrets[name];

    secret.token = normalizeTokenReference(
      definingOwner,
      definingRepo,
      secret.token,
    );

    const repos: typeof secret.github.repos = {};
    for (const pattern in secret.github.repos) {
      repos[
        wrapErrors(
          () => normalizeRepoPattern(definingOwner, pattern),
          (cause) =>
            new Error(
              "Consumer config has an error at " +
                `/provision/secrets/${escape(name)}` +
                `/github/repos/${escape(pattern)}`,
              { cause },
            ),
        )
      ] = secret.github.repos[pattern];
    }
    secret.github.repos = repos;
  }

  return config as ConsumerConfig;
}
