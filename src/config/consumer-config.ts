import { load } from "js-yaml";
import { errorMessage } from "../error.js";
import { normalizeRepoPattern } from "../repo-pattern.js";
import type {
  ConsumerConfig,
  PartialConsumerConfig,
} from "../type/consumer-config.js";
import { validateConsumer } from "./validation.js";

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
  } catch (error) {
    const original = JSON.stringify(yaml);

    throw new Error(
      `Parsing of consumer configuration failed with ${errorMessage(error)}. Provided value: ${original}`,
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
      repos[normalizeRepoPattern(definingOwner, pattern)] =
        secret.github.repos[pattern];
    }
    secret.github.repos = repos;
  }

  return config as ConsumerConfig;
}

function normalizeTokenReference(
  definingOwner: string,
  definingRepo: string,
  reference: string,
): string {
  const dotIdx = reference.lastIndexOf(".");

  if (dotIdx === -1) return `${definingOwner}/${definingRepo}.${reference}`;

  const name = reference.slice(dotIdx + 1);
  const referenceOwnerRepo = reference.slice(0, dotIdx);
  const slashIdx = referenceOwnerRepo.indexOf("/");
  const owner =
    slashIdx === -1 ? definingOwner : referenceOwnerRepo.slice(0, slashIdx);
  const repo =
    slashIdx === -1
      ? referenceOwnerRepo
      : referenceOwnerRepo.slice(slashIdx + 1);

  return `${owner}/${repo}.${name}`;
}
