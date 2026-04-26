import type {
  AlignType,
  Blockquote,
  Definition,
  Heading,
  InlineCode,
  Link,
  LinkReference,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  Text,
} from "mdast";
import {
  accountOrRepoRefToString,
  type AccountOrRepoReference,
} from "./github-reference.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";
const LINK_REF_PREFIX = "gh/";

export function accountOrRepoDefinition(
  githubServerURL: string,
  accountOrRepo: AccountOrRepoReference,
): Definition {
  const slug = accountOrRepoRefToString(accountOrRepo);
  const identifier = `${LINK_REF_PREFIX}${slug}`.toLowerCase();

  return {
    type: "definition",
    identifier,
    label: identifier,
    url: new URL(slug, githubServerURL).toString(),
    title: null,
  };
}

export function accountOrRepoLinkRef(
  accountOrRepo: AccountOrRepoReference,
): LinkReference {
  const slug = accountOrRepoRefToString(accountOrRepo);
  const identifier = `${LINK_REF_PREFIX}${slug}`.toLowerCase();

  return {
    type: "linkReference",
    identifier,
    label: identifier,
    referenceType: "full",
    children: [text(slug)],
  };
}

export function blockquote(...children: Blockquote["children"]): Blockquote {
  return { type: "blockquote", children };
}

export function GFMAlert(
  type: "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION",
  ...children: Blockquote["children"]
): Blockquote {
  return blockquote(paragraph(text(`[!${type}]`)), ...children);
}

export function heading(
  depth: Heading["depth"],
  ...children: Heading["children"]
): Heading {
  return { type: "heading", depth, children };
}

export function inlineCode(code: string): InlineCode {
  return { type: "inlineCode", value: code };
}

export function link(url: string | URL, ...children: Link["children"]): Link {
  return { type: "link", url: url.toString(), children };
}

export function paragraph(...children: Paragraph["children"]): Paragraph {
  return { type: "paragraph", children };
}

export function renderIcon(isAllowed: boolean): string {
  return isAllowed ? ALLOWED_ICON : DENIED_ICON;
}

export function table(
  align: AlignType[] | undefined,
  headings: TableCell["children"][],
  rows: TableCell["children"][][],
): Table {
  return {
    type: "table",
    align,
    children: [
      {
        type: "tableRow",
        children: headings.map(
          (children): TableCell => ({ type: "tableCell", children }),
        ),
      },
      ...rows.map(
        (row): TableRow => ({
          type: "tableRow",
          children: row.map(
            (children): TableCell => ({ type: "tableCell", children }),
          ),
        }),
      ),
    ],
  };
}

export function text(value: string): Text {
  return { type: "text", value };
}
