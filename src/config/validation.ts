import ajvModule, { ErrorObject } from "ajv";
import appsSchema from "../schema/apps.v1.schema.json";
import consumerSchema from "../schema/consumer.v1.schema.json";
import consumerTokenPermissionsSchema from "../schema/generated.consumer-token-permissions.v1.schema.json";
import providerRulePermissionsSchema from "../schema/generated.provider-rule-permissions.v1.schema.json";
import providerSchema from "../schema/provider.v1.schema.json";
import type { PartialConsumerConfig } from "../type/consumer-config.js";
import type { AppInput } from "../type/input.js";
import type { ProviderConfig } from "../type/provider-config.js";

// see https://github.com/ajv-validator/ajv/issues/2132
const Ajv = ajvModule.default;

const ajv = new Ajv({
  schemas: [
    appsSchema,
    consumerSchema,
    consumerTokenPermissionsSchema,
    providerSchema,
    providerRulePermissionsSchema,
  ],
  allErrors: true,
  useDefaults: true,
});

export const validateApps = createValidate<AppInput[]>(
  appsSchema.$id,
  "apps input",
);

export const validateConsumer = createValidate<PartialConsumerConfig>(
  consumerSchema.$id,
  "consumer configuration",
);

export const validateProvider = createValidate<ProviderConfig>(
  providerSchema.$id,
  "provider configuration",
);

class ValidateError extends Error {
  public errors: ErrorObject[];

  constructor(message: string, errors: ErrorObject[]) {
    super(message);

    this.errors = errors;
  }
}

function createValidate<T>(
  schemaId: string,
  label: string,
): (value: unknown) => T {
  return function validate(value) {
    const validator = ajv.getSchema(schemaId);

    /* v8 ignore start */
    if (!validator) {
      throw new Error(`Invariant violation: Undefined schema ${schemaId}`);
    }
    /* v8 ignore stop */

    if (validator(value)) return value as T;

    /* v8 ignore start - never seen errors be nullish */
    const errors = validator.errors ?? [];
    /* v8 ignore stop */

    const error = new ValidateError(
      `Invalid ${label}:\n${renderErrors(errors)}`,
      errors,
    );

    throw error;
  };
}

function renderErrors(errors: ErrorObject[]): string {
  return `  - ${errors.map(renderError).join("\n  - ")}\n`;
}

function renderError(error: ErrorObject): string {
  const { instancePath, message } = error;
  const subject = instancePath && ` (${instancePath})`;

  return `${message}${subject}`;
}