import path from "node:path";
import { Conveyer, ESBuild } from "@nesvet/conveyer";


const { NODE_ENV } = process.env;

const distDir = "dist";

const common = {
	external: true,
	format: "esm",
	sourcemap: true
};


new Conveyer([
	
	new ESBuild({
		title: "Node",
		entryPoints: [ "src/node/index.ts" ],
		outfile: path.resolve(distDir, "node", "index.js"),
		platform: "node",
		target: "node20",
		...common
	}),
	
	new ESBuild({
		title: "Browser",
		entryPoints: [ "src/browser/index.ts" ],
		outfile: path.resolve(distDir, "browser", "index.js"),
		platform: "browser",
		target: "es2020",
		define: {
			"process.env.NODE_ENV": JSON.stringify(NODE_ENV)
		},
		...common
	})
	
], {
	initialCleanup: distDir
});
