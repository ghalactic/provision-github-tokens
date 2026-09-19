import type { ErrorObject } from "ajv";
import type { Paragraph, RootContent } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { RepoReference } from "./github-reference.js";
import { repoRefToString } from "./github-reference.js";
import {
  heading,
  inlineCode,
  link,
  list,
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
export const FAILURE_DASHBOARD_TITLE = "GitHub tokens couldn't be provisioned";
export const CONFIG_ISSUE_DASHBOARD_TITLE =
  "Token provisioning config is invalid";

export type DashboardIssue = {
  title: string;
  body: string;
};

export type ConfigIssueDashboardInput = {
  requester: RepoReference;
  configPath: string;
  errors: ErrorObject[];
};

export function renderFailureDashboard(
  runUrl: string,
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

  const scopedTokens = findScopedTokens(secrets, tokenResults);
  const scopedCreationResults = new Map<TokenAuthResult, TokenCreationResult>();

  for (const token of scopedTokens) {
    const creationResult = tokenCreationResults.get(token);

    if (creationResult) scopedCreationResults.set(token, creationResult);
  }

  const explainProvision = createMarkdownProvisionExplainer();
  const explainTokenCreation = createMarkdownTokenCreationExplainer(
    scopedCreationResults,
  );
  const explainProvisionAuth =
    createMarkdownProvisionAuthExplainer(scopedTokens);
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
    const creationResult = scopedCreationResults.get(token);

    if (creationResult) {
      tokenCreation.push(
        heading(3, ...tokenHeading),
        ...explainTokenCreation(token, creationResult),
      );
    }

    requestAuthorization.push(
      heading(3, ...tokenHeading),
      ...explainTokenAuth(token),
    );
  }

  const children: RootContent[] = [];

  if (secretProvisioning.length > 0) {
    children.push(
      heading(2, text("Secret provisioning")),
      ...secretProvisioning,
    );
  }

  if (tokenCreation.length > 0) {
    children.push(heading(2, text("Token creation")), ...tokenCreation);
  }

  if (requestAuthorization.length > 0) {
    children.push(
      heading(2, text("Request authorization")),
      ...requestAuthorization,
    );
  }

  children.push(runLink(runUrl));

  return {
    title: FAILURE_DASHBOARD_TITLE,
    body: serialize(children),
  };
}

export function renderConfigIssueDashboard(
  githubServerUrl: string,
  runUrl: string,
  issue: ConfigIssueDashboardInput,
): DashboardIssue {
  const { requester, configPath, errors } = issue;

  const children: RootContent[] = [
    paragraph(
      text("The config file "),
      inlineCode(configPath),
      text(` in ${repoRefToString(requester)} is invalid:`),
    ),
    list(
      errors.map((error) => ({
        contents: [
          ...(error.instancePath.length > 0
            ? [inlineCode(error.instancePath), text(" ")]
            : []),
          text(error.message ?? "is invalid"),
        ],
      })),
    ),
  ];

  const configUrl = new URL(
    `${requester.account}/${requester.repo}/blob/HEAD/${configPath}`,
    githubServerUrl,
  );

  children.push(
    paragraph(
      link(configUrl, text("Open config file")),
      text(" · "),
      link(runUrl, text("Full logs for this run")),
    ),
  );

  return {
    title: CONFIG_ISSUE_DASHBOARD_TITLE,
    body: serialize(children),
  };
}

function findScopedTokens(
  secrets: ProvisionAuthResult[],
  tokenResults: TokenAuthResult[],
): TokenAuthResult[] {
  const requesterTokens = new Set<TokenAuthResult>();

  for (const secret of secrets) {
    for (const { tokenAuthResult } of secret.results) {
      if (tokenAuthResult) requesterTokens.add(tokenAuthResult);
    }
  }

  return tokenResults.filter((token) => requesterTokens.has(token));
}

function runLink(runUrl: string): Paragraph {
  return paragraph(link(runUrl, text("Full logs for this run")));
}

function serialize(children: RootContent[]): string {
  return toMarkdown(
    { type: "root", children },
    { bullet: "-", extensions: [gfmToMarkdown()] },
  );
}
