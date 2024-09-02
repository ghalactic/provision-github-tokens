import openapi from "@octokit/openapi";
import { writeFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";

await writeSchema(
  "github.permissions.schema.json",
  ((schema) => {
    return {
      ...schema,
      description:
        "The permissions that the consumer is requesting for the specified repositories.",
      title: undefined,
      example: undefined,
      examples: schema.example ? [schema.example] : undefined,
    };
  })(
    openapi.schemas["api.github.com.deref"].paths[
      "/app/installations/{installation_id}/access_tokens"
    ].post.requestBody.content["application/json"].schema.properties
      .permissions,
  ),
);

async function writeSchema(name, schema) {
  const $id = `https://ghalactic.github.io/provision-github-tokens/schema/${encodeURIComponent(name)}`;

  await writeFile(
    join(fileURLToPath(new URL("../src/schema", import.meta.url)), name),
    JSON.stringify({ $id, ...schema }, null, 2),
  );
}
