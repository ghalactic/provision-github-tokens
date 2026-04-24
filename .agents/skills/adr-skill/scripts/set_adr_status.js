#!/usr/bin/env node
/**
 * Update an ADR's YAML front matter status in-place.
 */

import fs from "node:fs";
import path from "node:path";

/**
 * @param {string} msg
 * @returns {never}
 */
function die(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

/**
 * @param {string} p
 * @returns {string}
 */
function toPosix(p) {
  return p.split(path.sep).join("/");
}

/**
 * @param {string[]} argv
 * @returns {{file: string, status: string, json: boolean}}
 */
function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(
      [
        "Usage: node set_adr_status.js <path> --status <value> [--json]",
        "",
        "Example:",
        "  node set_adr_status.js adr/0001-foo.md --status accepted",
        "",
      ].join("\n"),
    );
    process.exit(0);
  }

  if (argv.length < 3) die("Missing <path>");
  const file = argv[2];

  /** @type {string | null} */
  let status = null;
  let json = false;
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--status") {
      if (i + 1 >= argv.length) die("Missing value for --status");
      status = argv[++i];
    } else if (a === "--json") {
      json = true;
    } else {
      die(`Unknown arg: ${a}`);
    }
  }
  if (!status) die("Missing required --status");
  return { file, status: String(status).trim(), json };
}

/**
 * @param {string[]} lines
 * @param {string} newStatus
 * @returns {{lines: string[], changed: boolean}}
 */
function setYamlFrontMatterStatus(lines, newStatus) {
  if (lines.length < 2 || lines[0].trim() !== "---")
    return { lines, changed: false };

  let changed = false;
  const out = [];
  let inFrontMatter = true;
  let passedOpening = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i === 0 && line.trim() === "---") {
      passedOpening = true;
      out.push(line);
      continue;
    }

    if (passedOpening && inFrontMatter && line.trim() === "---") {
      inFrontMatter = false;
      out.push(line);
      continue;
    }

    if (passedOpening && inFrontMatter && /^status\s*:/.test(line)) {
      out.push(`status: ${newStatus}`);
      changed = true;
      continue;
    }

    out.push(line);
  }

  return { lines: out, changed };
}

function main() {
  const args = parseArgs(process.argv);
  const filePath = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(filePath)) die(`File not found: ${filePath}`);

  const content = fs.readFileSync(filePath, "utf8");
  const hadTrailingNewline = content.endsWith("\n");
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  const r = setYamlFrontMatterStatus(lines, args.status);
  if (!r.changed) {
    die(
      "Could not find a status to update. Expected YAML front matter 'status:' field.",
    );
  }

  const newContent = r.lines.join("\n") + (hadTrailingNewline ? "\n" : "");
  fs.writeFileSync(filePath, newContent, "utf8");

  if (args.json) {
    process.stdout.write(
      `${JSON.stringify({
        filePath,
        fileRelPath: toPosix(path.relative(process.cwd(), filePath)),
        status: args.status,
        changed: true,
      })}\n`,
    );
  } else {
    process.stdout.write(`${filePath}\n`);
  }
}

main();
