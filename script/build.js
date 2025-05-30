import { build } from "esbuild";

const [, , outfile] = process.argv;

if (!outfile) {
  console.error("usage: node build.js <outfile>");
  process.exit(1);
}

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  packages: "bundle",
  sourcemap: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
});
