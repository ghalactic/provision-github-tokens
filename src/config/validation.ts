import ajvModule, { type ErrorObject } from "ajv";
import ajvErrorsModule from "ajv-errors";
import betterAjvErrors from "better-ajv-errors";
import appsSchema from "../schema/apps.v1.schema.json" with { type: "json" };
import providerRulePermissionsSchema from "../schema/generated.provider-rule-permissions.v1.schema.json" with { type: "json" };
import requesterTokenPermissionsSchema from "../schema/generated.requester-token-permissions.v1.schema.json" with { type: "json" };
import providerSchema from "../schema/provider.v1.schema.json" with { type: "json" };
import requesterSchema from "../schema/requester.v1.schema.json" with { type: "json" };
import type { RawAppInput } from "../type/input.js";
import type { ProviderConfig } from "../type/provider-config.js";
import type { PartialRequesterConfig } from "../type/requester-config.js";

// see https://github.com/ajv-validator/ajv/issues/2132
// eslint-disable-next-line @typescript-eslint/naming-convention -- class constructor
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

export class ValidateError extends Error {
  public details: string;

  constructor(message: string, details: string) {
    super(message);

    this.details = details;
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

    // Capture the value before validation so that defaults applied by AJV don't
    // show up in the rendered config.
    const config = structuredClone(value);
    const json = JSON.stringify(config, null, 2);

    if (validator(value)) return value as T;

    /* istanbul ignore next - never seen errors be nullish - @preserve */
    const errors = validator.errors ?? [];

    const error = new ValidateError(
      `Invalid ${label}:\n${renderErrors(errors)}`,
      renderDetails(validator.schema, config, errors, json),
    );

    throw error;
  };
}

function renderDetails(
  schema: unknown,
  config: unknown,
  errors: ErrorObject[],
  json: string,
): string {
  const rendered = betterAjvErrors(schema, config, errors, {
    format: "cli",
    json,
  });

  return rendered.replaceAll(ANSI_SGR_PATTERN, "").trim();
}

// eslint-disable-next-line no-control-regex -- matches ANSI SGR escape sequences
const ANSI_SGR_PATTERN = /\u001B\[[0-9;]*m/g;

function renderErrors(errors: ErrorObject[]): string {
  return `  - ${errors.map(renderError).join("\n  - ")}\n`;
}

function renderError(error: ErrorObject): string {
  const { instancePath, message } = error;
  const subject = instancePath && ` (${instancePath})`;

  return `${message}${subject}`;
}
