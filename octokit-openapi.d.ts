declare module "@octokit/openapi" {
  import type { JSONSchema7 } from "json-schema";

  export const schemas: {
    "api.github.com": ApiGitHubCom;
    "api.github.com.deref": ApiGitHubCom;
  };

  type ApiGitHubCom = {
    paths: Record<
      string,
      {
        get: {
          responses: {
            "200": {
              content: {
                "application/json": {
                  schema: JSONSchema7;
                };
              };
            };
          };
        };
      }
    >;
  };
}
