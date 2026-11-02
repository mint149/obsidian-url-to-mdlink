import esbuild from "esbuild";
import { readdirSync } from "fs";

const entryPoints = readdirSync("tests")
	.filter((f) => f.endsWith(".test.ts"))
	.map((f) => `tests/${f}`);

await esbuild.build({
	entryPoints,
	bundle: true,
	platform: "node",
	format: "esm",
	outdir: "test-dist",
	outExtension: { ".js": ".mjs" },
	logLevel: "warning",
});
