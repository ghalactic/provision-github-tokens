import type { RootContent } from "mdast";
import { ValidateError } from "./config/validation.js";
import { ParseYamlError } from "./config/yaml.js";
import type { Context } from "./context.js";
import type { DiscoveredRequester } from "./discover-requesters.js";
import { errorMessage } from "./error.js";
import {
  blockquote,
  code,
  definition,
  emphasis,
  gfmAlert,
  heading,
  inlineCode,
  linkReference,
  paragraph,
  text,
} from "./markdown.js";
import { createMarkdownProvisionAuthExplainer } from "./provision-auth-explainer/markdown.js";
import { createMarkdownProvisionExplainer } from "./provision-explainer/markdown.js";
import { createMarkdownTokenAuthExplainer } from "./token-auth-explainer/markdown.js";
import { createMarkdownTokenCreationExplainer } from "./token-creation-explainer/markdown.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

export const DASHBOARD_LABEL = "gh-token-dashboard";
export const DASHBOARD_LABEL_DESCRIPTION =
  "A summary of GitHub token provisioning";
export const FAILURE_DASHBOARD_TITLE = "GitHub tokens couldn't be provisioned";
export const CONFIG_ISSUE_DASHBOARD_TITLE =
  "Token provisioning config is invalid";

export type DashboardIssue = {
  title: string;
  body: RootContent[];
};

export function renderFailureDashboard(
  context: Context,
  secrets: ProvisionAuthResult[],
  tokenResults: TokenAuthResult[],
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
): DashboardIssue {
  const secretProvisioning: RootContent[] = [];
  const tokenCreation: RootContent[] = [];
  const requestAuthorization: RootContent[] = [];

  const scopedTokens = findScopedTokens();
  const scopedCreationResults = new Map<TokenAuthResult, TokenCreationResult>();

  for (const token of scopedTokens) {
    const creationResult = tokenCreationResults.get(token);

    if (creationResult) scopedCreationResults.set(token, creationResult);
  }

  const explainProvision = createMarkdownProvisionExplainer();
  const explainTokenCreation = createMarkdownTokenCreationExplainer();
  const explainProvisionAuth = createMarkdownProvisionAuthExplainer();
  const explainTokenAuth = createMarkdownTokenAuthExplainer();

  for (let i = 0; i < secrets.length; ++i) {
    const secret = secrets[i];
    const secretHeading = [text("Secret "), inlineCode(`#${i + 1}`)];

    const targetResults = provisionResults.get(secret);

    if (targetResults) {
      secretProvisioning.push(
        heading(3, ...secretHeading),
        ...explainProvision(secret, targetResults),
      );
    }

    requestAuthorization.push(
      heading(3, ...secretHeading),
      ...explainProvisionAuth(secret),
    );
  }

  for (let i = 0; i < scopedTokens.length; ++i) {
    const token = scopedTokens[i];
    const tokenHeading = [text("Token "), inlineCode(`#${i + 1}`)];

    requestAuthorization.push(
      heading(3, ...tokenHeading),
      ...explainTokenAuth(token),
    );
  }

  let creationIndex = 0;

  for (const [token, creationResult] of scopedCreationResults) {
    const tokenHeading = [text("Token "), inlineCode(`#${++creationIndex}`)];

    tokenCreation.push(
      heading(3, ...tokenHeading),
      ...explainTokenCreation(token, creationResult),
    );
  }

  const body: RootContent[] = [
    gfmAlert(
      "WARNING",
      paragraph(
        linkReference(
          "shortcut",
          "Provision GitHub Tokens",
          text("Provision GitHub Tokens"),
        ),
        text(
          " couldn't provision some of the requested tokens. " +
            "The following is a summary of ",
        ),
        linkReference("shortcut", "workflow-run", text("this workflow run")),
        text("."),
      ),
    ),
    definition(
      "provision github tokens",
      "https://github.com/ghalactic/provision-github-tokens",
    ),
    definition("workflow-run", context.githubRunAttemptUrl),
  ];

  if (secretProvisioning.length > 0) {
    body.push(heading(2, text("Secret provisioning")), ...secretProvisioning);
  }

  if (tokenCreation.length > 0) {
    body.push(heading(2, text("Token creation")), ...tokenCreation);
  }

  if (requestAuthorization.length > 0) {
    body.push(
      heading(2, text("Request authorization")),
      ...requestAuthorization,
    );
  }

  return {
    title: FAILURE_DASHBOARD_TITLE,
    body,
  };

  function findScopedTokens(): TokenAuthResult[] {
    const requesterTokens = new Set<TokenAuthResult>();

    for (const secret of secrets) {
      for (const { tokenAuthResult } of secret.results) {
        if (tokenAuthResult) requesterTokens.add(tokenAuthResult);
      }
    }

    return tokenResults.filter((token) => requesterTokens.has(token));
  }
}

export function renderConfigIssueDashboard(
  context: Context,
  discovered: DiscoveredRequester,
): DashboardIssue {
  const { requester, configPath, configSha, configError } = discovered;

  /* istanbul ignore next - only called for requesters with a config error - @preserve */
  if (!configError) {
    throw new Error(
      "Invariant violation: " +
        "Config issue dashboard rendered without a config error",
    );
  }

  const configUrl = new URL(
    `${requester.account}/${requester.repo}/blob/${configSha}/${configPath}`,
    context.githubServerUrl,
  );

  const body: RootContent[] = [
    gfmAlert(
      "WARNING",
      paragraph(
        linkReference(
          "shortcut",
          "Provision GitHub Tokens",
          text("Provision GitHub Tokens"),
        ),
        text(" couldn't parse or validate "),
        linkReference(
          "shortcut",
          "requester-config",
          text("this repo's config"),
        ),
        text("."),
      ),
    ),
    definition(
      "provision github tokens",
      "https://github.com/ghalactic/provision-github-tokens",
    ),
    definition("requester-config", configUrl),
    ...errorDetails(configError),
  ];

  return {
    title: CONFIG_ISSUE_DASHBOARD_TITLE,
    body,
  };

  function errorDetails(error: Error): RootContent[] {
    if (error instanceof ParseYamlError) return parseYamlErrorDetails(error);
    if (error instanceof ValidateError) return validateErrorDetails(error);

    return [
      heading(2, text("Something went wrong")),
      paragraph(text("An unexpected error occurred:")),
      blockquote(paragraph(emphasis(text(errorMessage(error))))),
    ];
  }

  function parseYamlErrorDetails(error: ParseYamlError): RootContent[] {
    return [
      heading(2, text("Invalid YAML")),
      paragraph(
        text("Your "),
        linkReference("shortcut", "requester-config", text("config")),
        text(
          ` contains invalid YAML${error.yamlErrors.length > 0 ? ":" : "."}`,
        ),
      ),
      ...error.yamlErrors.map((error) => code("txt", errorMessage(error))),
    ];
  }

  function validateErrorDetails(error: ValidateError): RootContent[] {
    return [
      heading(2, text("Invalid configuration")),
      paragraph(
        text("Your "),
        linkReference("shortcut", "requester-config", text("config")),
        text(" is not valid:"),
      ),
      code("txt", error.details),
    ];
  }
}
