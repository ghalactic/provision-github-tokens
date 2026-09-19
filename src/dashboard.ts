import type { ErrorObject } from "ajv";
import type { List, ListItem, Paragraph, RootContent } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { RepoReference } from "./github-reference.js";
import { repoRefToString } from "./github-reference.js";
import { heading, inlineCode, link, paragraph, text } from "./markdown.js";
import { createTextProvisionAuthExplainer } from "./provision-auth-explainer/text.js";
import { createTextProvisionExplainer } from "./provision-explainer/text.js";
import { createTextTokenCreationExplainer } from "./token-creation-explainer/text.js";
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
  const explainProvisionAuth = createTextProvisionAuthExplainer(tokenResults);
  const explainTokenCreation =
    createTextTokenCreationExplainer(tokenCreationResults);
  const explainProvision = createTextProvisionExplainer();

  const children: RootContent[] = [];

  for (const secret of secrets) {
    children.push(heading(2, inlineCode(secret.request.name)));

    const explanation = explainSecret(
      secret,
      explainProvisionAuth,
      explainTokenCreation,
      explainProvision,
      tokenCreationResults,
      provisionResults,
    );

    children.push(indentedTextToList(explanation));
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
      errors.map((error) => [
        ...(error.instancePath.length > 0
          ? [inlineCode(error.instancePath), text(" ")]
          : []),
        text(error.message ?? "is invalid"),
      ]),
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

function explainSecret(
  secret: ProvisionAuthResult,
  explainProvisionAuth: ReturnType<typeof createTextProvisionAuthExplainer>,
  explainTokenCreation: ReturnType<typeof createTextTokenCreationExplainer>,
  explainProvision: ReturnType<typeof createTextProvisionExplainer>,
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
): string {
  const explanations: string[] = [];
  explanations.push(explainProvisionAuth(secret));

  const explainedTokenAuths = new Set<TokenAuthResult>();

  for (const target of secret.results) {
    const tokenAuthResult = target.tokenAuthResult;

    if (!tokenAuthResult || explainedTokenAuths.has(tokenAuthResult)) continue;

    explainedTokenAuths.add(tokenAuthResult);
    const creationResult = tokenCreationResults.get(tokenAuthResult);

    if (!creationResult) continue;

    explanations.push(explainTokenCreation(tokenAuthResult, creationResult));
  }

  const targetResults = provisionResults.get(secret);

  if (targetResults) explanations.push(explainProvision(secret, targetResults));

  return explanations.join("\n");
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

function list(items: Paragraph["children"][]): List {
  return {
    type: "list",
    ordered: false,
    spread: false,
    children: items.map((children): ListItem => ({
      type: "listItem",
      spread: false,
      checked: null,
      children: [{ type: "paragraph", children }],
    })),
  };
}

function indentedTextToList(input: string): List {
  return nodesToList(parseIndentedLines(input));
}

type IndentedTextNode = {
  content: string;
  children: IndentedTextNode[];
};

function parseIndentedLines(input: string): IndentedTextNode[] {
  const roots: IndentedTextNode[] = [];
  const stack: { depth: number; node: IndentedTextNode }[] = [];

  for (const rawLine of input.split("\n")) {
    const line = rawLine.trimEnd();

    /* istanbul ignore next - defensive vs empty explainer lines - @preserve */
    if (line.length < 1) continue;

    const indent = line.length - line.trimStart().length;
    const content = line.slice(indent);

    /* istanbul ignore next - never seen in explainer output - @preserve */
    if (content.startsWith("::debug::")) continue;

    const depth = Math.floor(indent / 2);
    const node: IndentedTextNode = { content, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].node.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push({ depth, node });
  }

  return roots;
}

function nodesToList(nodes: IndentedTextNode[]): List {
  return {
    type: "list",
    ordered: false,
    spread: false,
    children: nodes.map((node): ListItem => ({
      type: "listItem",
      spread: false,
      checked: null,
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", value: node.content }],
        },
        ...(node.children.length > 0 ? [nodesToList(node.children)] : []),
      ],
    })),
  };
}
