import { mkdirSync, readFileSync, writeFileSync, cpSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  readFileSync(resolve(root, ".openai/hosting.json"), "utf8"),
);
if (manifest.d1 !== "DB")
  throw Error("The cloud runtime requires the logical DB binding.");
const files = {
  "/map2d.js": ["public/map2d.js", "text/javascript; charset=utf-8"],
  "/": ["public/index.html", "text/html; charset=utf-8"],
  "/app.js": ["public/app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["public/style.css", "text/css; charset=utf-8"],
  "/three.js": ["node_modules/three/build/three.module.js", "text/javascript"],
  "/three.core.js": [
    "node_modules/three/build/three.core.js",
    "text/javascript",
  ],
};
const assets = Object.fromEntries(
  Object.entries(files).map(([url, [file, type]]) => [
    url,
    [readFileSync(resolve(root, file), "utf8"), type],
  ]),
);
mkdirSync(resolve(root, "dist/server"), { recursive: true });
mkdirSync(resolve(root, "dist/.openai"), { recursive: true });
await build({
  stdin: {
    contents: `import { createWorker } from './src/cloud-worker.js';export default createWorker(${JSON.stringify(assets)});`,
    resolveDir: root,
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  outfile: resolve(root, "dist/server/index.js"),
});
writeFileSync(
  resolve(root, "dist/.openai/hosting.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
cpSync(resolve(root, "drizzle"), resolve(root, "dist/.openai/drizzle"), {
  recursive: true,
});
console.log("Worker build complete with durable DB binding and migrations.");
