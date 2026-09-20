import type {
  AlignType,
  Blockquote,
  Emphasis,
  Heading,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  RootContent,
  Strong,
  Table,
  TableCell,
  TableRow,
  Text,
} from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown as mdastToMarkdown } from "mdast-util-to-markdown";

export function toMarkdown(children: RootContent[]): string {
  return mdastToMarkdown(
    { type: "root", children },
    { bullet: "-", emphasis: "_", extensions: [gfmToMarkdown()] },
  );
}

export function blockquote(...children: Blockquote["children"]): Blockquote {
  return { type: "blockquote", children };
}

export function emphasis(...children: Emphasis["children"]): Emphasis {
  return { type: "emphasis", children };
}

export function gfmAlert(
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

export function list(...children: ListItem[]): List {
  return { type: "list", ordered: false, spread: false, children };
}

export function listItem(...children: ListItem["children"]): ListItem {
  return { type: "listItem", spread: false, checked: null, children };
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

export function strong(...children: Strong["children"]): Strong {
  return { type: "strong", children };
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
        children: headings.map((children): TableCell => ({
          type: "tableCell",
          children,
        })),
      },
      ...rows.map((row): TableRow => ({
        type: "tableRow",
        children: row.map((children): TableCell => ({
          type: "tableCell",
          children,
        })),
      })),
    ],
  };
}

export function text(value: string): Text {
  return { type: "text", value };
}
