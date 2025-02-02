import openapi from "@octokit/openapi";
import { writeFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";

const { permissions } =
  openapi.schemas["api.github.com.deref"].paths[
    "/app/installations/{installation_id}/access_tokens"
  ].post.requestBody.content["application/json"].schema.properties;

await writeSchema(
  "generated.consumer-token-permissions.v1.schema.json",
  ((schema) => {
    return {
      ...schema,
      description:
        "The permissions that the consumer is requesting for the specified repos.",
      title: undefined,
      minProperties: 1,
      additionalProperties: {
        type: "string",
        description: "The level of permission to grant the access token.",
        enum: ["read", "write", "admin"],
      },
      example: undefined,
      examples: schema.example ? [schema.example] : undefined,
    };
  })(permissions),
);

await writeSchema(
  "generated.provider-rule-permissions.v1.schema.json",
  ((schema) => {
    return {
      ...schema,
      description: "The permissions that should apply when the rule matches.",
      title: undefined,
      properties: Object.fromEntries(
        Object.entries(schema.properties).map(([key, value]) => {
          if (!("enum" in value)) return [key, value];

          return [key, { ...value, enum: ["none", ...value.enum] }];
        }),
      ),
      additionalProperties: {
        type: "string",
        description: "The level of permission to grant the access token.",
        enum: ["none", "read", "write", "admin"],
      },
      example: undefined,
      examples: schema.example ? [schema.example] : undefined,
    };
  })(permissions),
);

async function writeSchema(name, schema) {
  const $id = `https://ghalactic.github.io/provision-github-tokens/schema/${encodeURIComponent(name)}`;

  await writeFile(
    join(fileURLToPath(new URL("../src/schema", import.meta.url)), name),
    JSON.stringify({ $id, ...schema }, null, 2) + "\n",
  );
}
