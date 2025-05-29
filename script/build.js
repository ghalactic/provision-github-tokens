import { build } from "esbuild";
import filelocPluginModule from "esbuild-plugin-fileloc";

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
  plugins: [filelocPluginModule.filelocPlugin()],
});
