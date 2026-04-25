import type { RootContent, TableCell } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { AuthorizeResult } from "./authorizer.js";
import { compareProvisionRequest } from "./compare-provision-request.js";
import {
  accountOrRepoRefToString,
  type AccountOrRepoReference,
} from "./github-reference.js";
import {
  accountOrRepoDefinition,
  accountOrRepoLinkRef,
  emphasis,
  heading,
  inlineCode,
  link,
  paragraph,
  renderIcon,
  table,
  text,
} from "./markdown.js";
import { pluralize } from "./pluralize.js";
import type { ProvisionRequestTarget } from "./provision-request.js";
import type { ProvisionAuthResult } from "./type/provision-auth-result.js";

export function renderSummary(
  githubServerURL: string,
  actionURL: string,
  result: AuthorizeResult,
): string {
  const provisionResults = result.provisionResults.toSorted((a, b) =>
    compareProvisionRequest(a.request, b.request),
  );

  const allowed = provisionResults.filter((r) => r.isAllowed);
  const denied = provisionResults.filter((r) => !r.isAllowed);

  return toMarkdown(
    {
      type: "root",
      children: [
        statsHeading(provisionResults),
        ...emptySection(provisionResults, result, actionURL),
        ...failuresTable(denied),
        ...successesTable(allowed),
        ...definitions(githubServerURL, provisionResults),
      ],
    },
    { bullet: "-", extensions: [gfmToMarkdown()] },
  );
}

function statsHeading(provisionResults: ProvisionAuthResult[]): RootContent {
  const total = provisionResults.length;
  const allowed = provisionResults.filter((r) => r.isAllowed).length;

  const headingText =
    allowed === total
      ? `Provisioned ${pluralize(total, "secret", "secrets")}`
      : `Provisioned ${allowed} of ${pluralize(total, "secret", "secrets")}`;

  return heading(2, text(headingText));
}

function emptySection(
  provisionResults: ProvisionAuthResult[],
  result: AuthorizeResult,
  actionURL: string,
): RootContent[] {
  if (provisionResults.length > 0 || result.tokenResults.length > 0) return [];

  return [
    paragraph(emphasis(text("(no secrets provisioned)"))),
    paragraph(
      text("Need help getting started? See the "),
      link(new URL("#readme", actionURL), text("docs")),
      text("."),
    ),
  ];
}

function failuresTable(denied: ProvisionAuthResult[]): RootContent[] {
  if (denied.length === 0) return [];

  return [
    table(
      ["left", "left", "left", "left"],
      [[], [text("Requester")], [text("Secret")], [text("Targets")]],
      denied.map((r) => secretRow(r)),
    ),
  ];
}

function successesTable(allowed: ProvisionAuthResult[]): RootContent[] {
  if (allowed.length === 0) return [];

  return [
    table(
      ["left", "left", "left", "left"],
      [[], [text("Requester")], [text("Secret")], [text("Targets")]],
      allowed.map((r) => secretRow(r)),
    ),
  ];
}

function secretRow(result: ProvisionAuthResult): TableCell["children"][] {
  return [
    [text(renderIcon(result.isAllowed))],
    [accountOrRepoLinkRef(result.request.requester)],
    [inlineCode(result.request.name)],
    targetCellChildren(result.request.to),
  ];
}

function targetCellChildren(
  targets: ProvisionRequestTarget[],
): TableCell["children"] {
  const seen = new Set<string>();
  const refs: AccountOrRepoReference[] = [];

  for (const t of targets) {
    const key = accountOrRepoRefToString(t.target);

    if (!seen.has(key)) {
      seen.add(key);
      refs.push(t.target);
    }
  }

  refs.sort((a, b) =>
    accountOrRepoRefToString(a).localeCompare(accountOrRepoRefToString(b)),
  );

  const children: TableCell["children"] = [];

  for (let i = 0; i < refs.length; i++) {
    if (i > 0) children.push(text(", "));
    children.push(accountOrRepoLinkRef(refs[i]));
  }

  return children;
}

function definitions(
  githubServerURL: string,
  provisionResults: ProvisionAuthResult[],
): RootContent[] {
  const seen = new Set<string>();
  const defs: RootContent[] = [];

  for (const r of provisionResults) {
    const requesterKey = accountOrRepoRefToString(r.request.requester);

    if (!seen.has(requesterKey)) {
      seen.add(requesterKey);
      defs.push(accountOrRepoDefinition(githubServerURL, r.request.requester));
    }

    for (const t of r.request.to) {
      const targetKey = accountOrRepoRefToString(t.target);

      if (!seen.has(targetKey)) {
        seen.add(targetKey);
        defs.push(accountOrRepoDefinition(githubServerURL, t.target));
      }
    }
  }

  return defs;
}
