import { load } from "js-yaml";
import { errorMessage } from "../error.js";
import type {
  ConsumerConfig,
  PartialConsumerConfig,
} from "../type/consumer-config.js";
import { validateConsumer } from "./validation.js";

export function parseConsumerConfig(
  owner: string,
  yaml: string,
): ConsumerConfig {
  const config = parseYAML(yaml);

  for (const token of Object.values(config.tokens)) {
    token.as ??= undefined;
    token.owner ??= owner;
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
