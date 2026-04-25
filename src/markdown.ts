import type { Element, ElementContent } from "hast";
import { toHtml } from "hast-util-to-html";
import type {
  Heading,
  Html,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
} from "mdast";

export function bulletList(...items: ListItem[]): List {
  return { type: "list", ordered: false, spread: false, children: items };
}

export function detailsOpen(children: ElementContent[]): Html {
  const summary: Element = {
    type: "element",
    tagName: "summary",
    properties: {},
    children,
  };

  return { type: "html", value: `<details>\n${toHtml(summary)}` };
}

export function detailsClose(): Html {
  return { type: "html", value: "</details>" };
}

export function heading(depth: 1 | 2 | 3 | 4 | 5 | 6, text: string): Heading {
  return {
    type: "heading",
    depth,
    children: [{ type: "text", value: text }],
  };
}

export function headingWithAnchor(
  depth: 1 | 2 | 3 | 4 | 5 | 6,
  text: string,
  anchorId: string,
): Heading {
  const anchor: Element = {
    type: "element",
    tagName: "a",
    properties: { id: anchorId },
    children: [],
  };

  return {
    type: "heading",
    depth,
    children: [
      { type: "text", value: text },
      { type: "html", value: ` ${toHtml(anchor)}` },
    ],
  };
}

export function iconItem(
  iconStr: string,
  text: string,
  sublist?: List,
): ListItem {
  const paragraph: Paragraph = {
    type: "paragraph",
    children: [{ type: "text", value: `${iconStr} ${text}` }],
  };

  return {
    type: "listItem",
    spread: false,
    children: sublist ? [paragraph, sublist] : [paragraph],
  };
}

export function linkItem(
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
