import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const [, , outfile] = process.argv;

if (!outfile) {
  console.error("usage: node build.js <outfile>");
  process.exit(1);
}

const addRequire = `// add require()
const require = await (async () => {
	const { createRequire } = await import("node:module");

	return createRequire(import.meta.url);
})();`;

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  packages: "bundle",
  sourcemap: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile,
  banner: {
    js: addRequire,
  },
  plugins: [
    {
      name: "dirname",
      setup: (build) => {
        build.onLoad({ filter: /.*/ }, async ({ path: fn }) => {
          if (extname(fn) !== ".js") return undefined;

          const original = await readFile(fn, "utf8");
          const contents = original
            .replaceAll("__dirname", "import.meta.dirname")
            .replaceAll("__filename", "import.meta.filename");

          return { contents };
        });
      },
    },
  ],
});
