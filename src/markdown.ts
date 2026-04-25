import GithubSlugger from "github-slugger";
import type { ElementContent } from "hast";
import { toHtml } from "hast-util-to-html";
import type {
  Emphasis,
  Heading,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  RootContent,
  Text,
} from "mdast";
import { toString } from "mdast-util-to-string";
import { createHash } from "node:crypto";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function anchorLink(
  anchor: string,
  ...children: Link["children"]
): Link {
  return link(`#user-content-${anchor}`, ...children);
}

export type HeadingFactory = (
  depth: Heading["depth"],
  ...children: Heading["children"]
) => [heading: Heading, id: string];

export function createHeadingFactory(
  stepSummaryPath: string,
  slugger: GithubSlugger,
): HeadingFactory {
  const prefix = createHash("sha256")
    .update(stepSummaryPath)
    .digest("hex")
    .slice(0, 8);

  return (depth, ...children) => {
    const heading: Heading = { type: "heading", depth, children };
    const id = `${prefix}-${slugger.slug(toString(heading))}`;
    const anchorHTML = toHtml({
      type: "element",
      tagName: "a",
      properties: { id },
      children: [],
    });
    heading.children.push({ type: "html", value: ` ${anchorHTML}` });

    return [heading, id];
  };
}

export function details(
  summary: ElementContent[],
  ...children: RootContent[]
): RootContent[] {
  const summaryHTML = toHtml({
    type: "element",
    tagName: "summary",
    properties: {},
    children: summary,
  });

  return [
    { type: "html", value: `<details>\n${summaryHTML}` },
    ...children,
    { type: "html", value: "</details>" },
  ];
}

export function emphasis(...children: Emphasis["children"]): Emphasis {
  return { type: "emphasis", children };
}

export function inlineCode(code: string): InlineCode {
  return { type: "inlineCode", value: code };
}

export function link(url: string | URL, ...children: Link["children"]): Link {
  return { type: "link", url: url.toString(), children };
}

export function listItem(
  ...children: (ListItem["children"][number] | undefined)[]
): ListItem {
  const definedChildren: ListItem["children"] = [];
  for (const c of children) if (c) definedChildren.push(c);

  return {
    type: "listItem",
    spread: false,
    children: definedChildren,
  };
}

export function paragraph(...children: Paragraph["children"]): Paragraph {
  return { type: "paragraph", children };
}

export function renderIcon(isAllowed: boolean): string {
  return isAllowed ? ALLOWED_ICON : DENIED_ICON;
}

export function text(value: string): Text {
  return { type: "text", value };
}

export function unorderedList(...children: ListItem[]): List {
  return { type: "list", ordered: false, spread: false, children };
}
