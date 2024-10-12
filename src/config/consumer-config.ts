import { load } from "js-yaml";
import { errorMessage } from "../error.js";
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
  const config = parseYAML(yaml);

  for (const token of Object.values(config.tokens)) {
    token.as ??= undefined;
    token.owner ??= definingOwner;
  }

  for (const [secretName, secret] of Object.entries(config.provision.secrets)) {
    secret.token = normalizeTokenReference(
      definingOwner,
      definingRepo,
      secret.token,
    );
  }

  return config as ConsumerConfig;
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
