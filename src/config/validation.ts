import ajvModule, { ErrorObject } from "ajv";
import ajvErrorsModule from "ajv-errors";
import appsSchema from "../schema/apps.v1.schema.json" with { type: "json" };
import providerRulePermissionsSchema from "../schema/generated.provider-rule-permissions.v1.schema.json" with { type: "json" };
import requesterTokenPermissionsSchema from "../schema/generated.requester-token-permissions.v1.schema.json" with { type: "json" };
import providerSchema from "../schema/provider.v1.schema.json" with { type: "json" };
import requesterSchema from "../schema/requester.v1.schema.json" with { type: "json" };
import type { RawAppInput } from "../type/input.js";
import type { ProviderConfig } from "../type/provider-config.js";
import type { PartialRequesterConfig } from "../type/requester-config.js";

// see https://github.com/ajv-validator/ajv/issues/2132
const Ajv = ajvModule.default;
const ajvErrors = ajvErrorsModule.default;

const ajv = new Ajv({
  schemas: [
    appsSchema,
    providerRulePermissionsSchema,
    providerSchema,
    requesterSchema,
    requesterTokenPermissionsSchema,
  ],
  allErrors: true,
  useDefaults: true,
});
ajvErrors(ajv);

export const validateApps = createValidate<RawAppInput[]>(
  appsSchema.$id,
  "apps input",
);

export const validateProvider = createValidate<ProviderConfig>(
  providerSchema.$id,
  "provider configuration",
);

export const validateRequester = createValidate<PartialRequesterConfig>(
  requesterSchema.$id,
  "requester configuration",
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

    /* istanbul ignore next - @preserve */
    if (!validator) {
      throw new Error(`Invariant violation: Undefined schema ${schemaId}`);
    }

    if (validator(value)) return value as T;

    /* istanbul ignore next - never seen errors be nullish - @preserve */
    const errors = validator.errors ?? [];

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
