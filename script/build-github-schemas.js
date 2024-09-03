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
        "The permissions that the consumer is requesting for the specified repositories.",
      title: undefined,
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

async function writeSchema(name, schema) {
  const $id = `https://ghalactic.github.io/provision-github-tokens/schema/${encodeURIComponent(name)}`;

  await writeFile(
    join(fileURLToPath(new URL("../src/schema", import.meta.url)), name),
    JSON.stringify({ $id, ...schema }, null, 2) + "\n",
  );
}
