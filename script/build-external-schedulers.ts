/* eslint-disable no-console */
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const platforms = [
  {
    entryPoint: "src/external-scheduler/cloudflare/index.ts",
    outfile: "examples/external-scheduler/cloudflare-worker/dist/index.js",
    format: "esm" as const,
    platform: "browser" as const,
    target: "es2022",
  },
  {
    entryPoint: "src/external-scheduler/aws/index.ts",
    outfile: "examples/external-scheduler/aws-lambda/dist/index.mjs",
    format: "esm" as const,
    platform: "node" as const,
    target: "node20",
  },
  {
    entryPoint: "src/external-scheduler/gcp/index.ts",
    outfile: "examples/external-scheduler/gcp-cloud-run/dist/index.mjs",
    format: "esm" as const,
    platform: "node" as const,
    target: "node20",
  },
  {
    entryPoint: "src/external-scheduler/azure/index.ts",
    outfile: "examples/external-scheduler/azure-function/dist/index.mjs",
    format: "esm" as const,
    platform: "node" as const,
    target: "node20",
  },
];

for (const { entryPoint, outfile, format, platform, target } of platforms) {
  mkdirSync(dirname(outfile), { recursive: true });

  await build({
    entryPoints: [entryPoint],
    bundle: true,
    packages: "bundle",
    sourcemap: true,
    platform,
    target,
    format,
    outfile,
  });

  console.log(`Built ${outfile}`);
}
