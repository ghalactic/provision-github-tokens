import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { dirname, extname } from "node:path";

const [, , outfile] = process.argv;

if (!outfile) {
  console.error("usage: node build.js <outfile>");
  process.exit(1);
}

const NODE_MODULES_PATTERN = /^(?:.*[\\\/])?node_modules(?:[\\\/].*)?$/;

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
      setup: async (build) => {
        build.onLoad({ filter: /.*/ }, ({ path: fn }) => {
          if (fn.match(NODE_MODULES_PATTERN)) return undefined;

          let contents = readFileSync(fn, "utf8");
          const loader = extname(fn).substring(1);
          const dn = dirname(fn);

          contents = contents
            .replaceAll("__dirname", JSON.stringify(dn))
            .replaceAll("__filename", JSON.stringify(fn));

          return { contents, loader };
        });
      },
    },
  ],
});
