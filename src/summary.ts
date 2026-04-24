import GithubSlugger from "github-slugger";
import type {
  Heading,
  Html,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
} from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { AuthorizeResult } from "./authorizer.js";
import { compareProvisionRequest } from "./compare-provision-request.js";
import { compareTokenRequest } from "./compare-token-request.js";
import { repoRefToString } from "./github-reference.js";
import { pluralize } from "./pluralize.js";
import { createMarkdownProvisionAuthExplainer } from "./provision-auth-explainer/markdown.js";
import { createMarkdownTokenAuthExplainer } from "./token-auth-explainer/markdown.js";
import type { ProvisionAuthResult } from "./type/provision-auth-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";

type UsedByEntry = {
  secretName: string;
  secretAnchor: string;
  requesterName: string;
};

export function renderSummary(result: AuthorizeResult, prefix: string): string {
  const slugger = new GithubSlugger();

  const provisionResults = [...result.provisionResults].sort((a, b) =>
    compareProvisionRequest(a.request, b.request),
  );
  const tokenResults = [...result.tokenResults].sort((a, b) =>
    compareTokenRequest(a.request, b.request),
  );

  const tokenAnchorMap = buildTokenAnchorMap(tokenResults, prefix);
  const usedByMap = buildUsedByMap(provisionResults, prefix, slugger);

  const explainToken = createMarkdownTokenAuthExplainer();
  const explainProvision = createMarkdownProvisionAuthExplainer(tokenAnchorMap);

  const children: RootContent[] = [
    statsHeading(provisionResults),
    ...failuresSection(provisionResults, prefix, slugger),
    ...secretProvisioningSection(
      provisionResults,
      explainProvision,
      prefix,
      slugger,
    ),
    ...tokenIssuingSection(
      tokenResults,
      explainToken,
      tokenAnchorMap,
      usedByMap,
    ),
  ];

  const root: Root = { type: "root", children };

  return toMarkdown(root, { extensions: [gfmToMarkdown()] });
}

function statsHeading(provisionResults: ProvisionAuthResult[]): Heading {
  const total = provisionResults.length;
  const allowed = provisionResults.filter((r) => r.isAllowed).length;

  const text =
    allowed === total
      ? `Provisioned ${pluralize(total, "secret", "secrets")}`
      : `Provisioned ${allowed} of ${pluralize(total, "secret", "secrets")}`;

  return heading(3, text);
}

function failuresSection(
  provisionResults: ProvisionAuthResult[],
  prefix: string,
  slugger: GithubSlugger,
): RootContent[] {
  const failures = provisionResults.filter((r) => !r.isAllowed);
  if (failures.length === 0) return [];

  const nodes: RootContent[] = [heading(3, "Failures")];

  for (const [requesterName, group] of groupBy(failures, (r) =>
    repoRefToString(r.request.requester),
  )) {
    nodes.push(heading(4, requesterName));
    nodes.push(
      bulletList(
        ...group.map((r) => {
          const anchor = secretAnchorId(
            prefix,
            requesterName,
            r.request.name,
            slugger,
          );

          return linkItem(`❌ `, r.request.name, `#${anchor}`);
        }),
      ),
    );
  }

  return nodes;
}

function secretProvisioningSection(
  provisionResults: ProvisionAuthResult[],
  explainProvision: (result: ProvisionAuthResult) => RootContent[],
  prefix: string,
  slugger: GithubSlugger,
): RootContent[] {
  if (provisionResults.length === 0) return [];

  const nodes: RootContent[] = [heading(3, "Secret provisioning")];

  for (const [requesterName, group] of groupBy(provisionResults, (r) =>
    repoRefToString(r.request.requester),
  )) {
    nodes.push(heading(4, requesterName));

    for (const result of group) {
      const anchor = secretAnchorId(
        prefix,
        requesterName,
        result.request.name,
        slugger,
      );

      nodes.push(heading(5, result.request.name));
      nodes.push(html(`<a id="${anchor}"></a>`));
      nodes.push(
        html(`<details>\n<summary>${secretDetailsSummary(result)}</summary>`),
      );
      nodes.push(...explainProvision(result));
      nodes.push(html("</details>"));
    }
  }

  return nodes;
}

function tokenIssuingSection(
  tokenResults: TokenAuthResult[],
  explainToken: (result: TokenAuthResult) => RootContent[],
  tokenAnchorMap: Map<TokenAuthResult, string>,
  usedByMap: Map<TokenAuthResult, UsedByEntry[]>,
): RootContent[] {
  if (tokenResults.length === 0) return [];

  const nodes: RootContent[] = [heading(3, "Token issuing")];

  for (const [consumerName, group] of groupBy(tokenResults, (r) =>
    consumerRefToString(r),
  )) {
    nodes.push(heading(4, consumerName));

    for (const result of group) {
      const anchor = tokenAnchorMap.get(result) ?? "";

      nodes.push(heading(5, tokenHeadingText(result)));
      nodes.push(html(`<a id="${anchor}"></a>`));

      const usedBy = usedByMap.get(result) ?? [];
      if (usedBy.length > 0) {
        nodes.push(paragraph("Used by:"));
        nodes.push(bulletList(...usedBy.map((entry) => usedByItem(entry))));
      }

      nodes.push(
        html(`<details>\n<summary>${tokenDetailsSummary(result)}</summary>`),
      );
      nodes.push(...explainToken(result));
      nodes.push(html("</details>"));
    }
  }

  return nodes;
}

function secretDetailsSummary(result: ProvisionAuthResult): string {
  const { results, isAllowed, isMissingTargets } = result;

  if (isMissingTargets) return "❌ Not provisioned — no targets";

  const totalTargets = results.length;
  const deniedTargets = results.filter((r) => !r.isAllowed).length;

  if (isAllowed) {
    return `✅ Provisioned to ${pluralize(totalTargets, "target", "targets")}`;
  }

  return `❌ Not provisioned — ${pluralize(deniedTargets, "target", "targets")} denied`;
}

function tokenDetailsSummary(result: TokenAuthResult): string {
  if (result.isAllowed) {
    const level =
      result.maxWant === "admin"
        ? "admin"
        : result.maxWant === "write"
          ? "write"
          : "read";

    return `✅ Allowed — ${level} access`;
  }

  return "❌ Denied";
}

function tokenHeadingText(result: TokenAuthResult): string {
  const account = result.request.tokenDec.account;

  if (result.request.repos === "all") {
    return `Token for ${account} (all repos)`;
  }

  if (result.request.repos.length === 0) {
    return `Token for ${account} (no repos)`;
  }

  return `Token for ${account} (${pluralize(result.request.repos.length, "repo", "repos")})`;
}

function consumerRefToString(result: TokenAuthResult): string {
  const { consumer } = result.request;

  return "repo" in consumer
    ? `${consumer.account}/${consumer.repo}`
    : consumer.account;
}

function buildTokenAnchorMap(
  tokenResults: TokenAuthResult[],
  prefix: string,
): Map<TokenAuthResult, string> {
  const map = new Map<TokenAuthResult, string>();

  for (let i = 0; i < tokenResults.length; i++) {
    map.set(tokenResults[i], `${prefix}-token-${i + 1}`);
  }

  return map;
}

function buildUsedByMap(
  provisionResults: ProvisionAuthResult[],
  prefix: string,
  slugger: GithubSlugger,
): Map<TokenAuthResult, UsedByEntry[]> {
  const map = new Map<TokenAuthResult, UsedByEntry[]>();

  for (const provResult of provisionResults) {
    const requesterName = repoRefToString(provResult.request.requester);

    for (const targetResult of provResult.results) {
      if (!targetResult.tokenAuthResult) continue;

      let entries = map.get(targetResult.tokenAuthResult);
      if (!entries) {
        entries = [];
        map.set(targetResult.tokenAuthResult, entries);
      }

      const anchor = secretAnchorId(
        prefix,
        requesterName,
        provResult.request.name,
        slugger,
      );

      if (!entries.some((e) => e.secretAnchor === anchor)) {
        entries.push({
          secretName: provResult.request.name,
          secretAnchor: anchor,
          requesterName,
        });
      }
    }
  }

  return map;
}

function secretAnchorId(
  prefix: string,
  requesterName: string,
  secretName: string,
  slugger: GithubSlugger,
): string {
  slugger.reset();

  return `${prefix}-${slugger.slug(`${requesterName}--${secretName}`)}`;
}

function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups: [string, T[]][] = [];
  let currentKey = "";
  let currentGroup: T[] = [];

  for (const item of items) {
    const k = key(item);

    if (k !== currentKey) {
      if (currentGroup.length > 0) groups.push([currentKey, currentGroup]);
      currentKey = k;
      currentGroup = [item];
    } else {
      currentGroup.push(item);
    }
  }

  if (currentGroup.length > 0) groups.push([currentKey, currentGroup]);

  return groups;
}

function heading(depth: 1 | 2 | 3 | 4 | 5 | 6, text: string): Heading {
  return {
    type: "heading",
    depth,
    children: [{ type: "text", value: text }],
  };
}

function paragraph(text: string): Paragraph {
  return { type: "paragraph", children: [{ type: "text", value: text }] };
}

function html(value: string): Html {
  return { type: "html", value };
}

function bulletList(...items: ListItem[]): List {
  return { type: "list", ordered: false, spread: false, children: items };
}

function linkItem(
  textBefore: string,
  linkText: string,
  linkUrl: string,
): ListItem {
  const link: Link = {
    type: "link",
    url: linkUrl,
    children: [{ type: "inlineCode", value: linkText }],
  };
  const phrasing: PhrasingContent[] = [
    { type: "text", value: textBefore },
    link,
  ];

  return {
    type: "listItem",
    spread: false,
    children: [{ type: "paragraph", children: phrasing }],
  };
}

function usedByItem(entry: UsedByEntry): ListItem {
  const link: Link = {
    type: "link",
    url: `#${entry.secretAnchor}`,
    children: [{ type: "inlineCode", value: entry.secretName }],
  };
  const phrasing: PhrasingContent[] = [
    link,
    { type: "text", value: ` (${entry.requesterName})` },
  ];

  return {
    type: "listItem",
    spread: false,
    children: [{ type: "paragraph", children: phrasing }],
  };
}
