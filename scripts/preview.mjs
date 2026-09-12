import http from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LocalD1 } from "./local-d1.js";
import { createWorker } from "../src/cloud-worker.js";
const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2),
  flag = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : fallback;
  };
const port = Number(flag("--port", "3000")),
  host = flag("--host", "127.0.0.1");
mkdirSync(resolve(root, ".sites-runtime"), { recursive: true });
const db = new LocalD1(resolve(root, ".sites-runtime/preview.sqlite"));
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
const allowedHosts = new Set(["terminal.local", "localhost", "127.0.0.1"]);
const server = http.createServer(async (req, res) => {
  try {
    const origin = new URL(`http://${req.headers.host}`);
    if (!allowedHosts.has(origin.hostname)) {
      res.writeHead(403);
      res.end("Invalid host");
      return;
    }
    let body = "",
      length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 4096) {
        res.writeHead(413);
        res.end("Request too large");
        return;
      }
      body += chunk;
    }
    // Read current assets per request so a page reload reflects UI source fixes.
    const assets = Object.fromEntries(
      Object.entries(files).map(([url, [file, type]]) => [
        url,
        [readFileSync(resolve(root, file), "utf8"), type],
      ]),
    );
    const worker = createWorker(assets);
    const response = await worker.fetch(
      new Request(new URL(req.url, origin), {
        method: req.method,
        headers: req.headers,
        ...(body ? { body } : {}),
      }),
      { DB: db, SIM_SPEED: process.env.SIM_SPEED || "30" },
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end("Preview request failed");
  }
});
server.listen(port, host, () =>
  console.log(`Game preview listening on ${host}:${port}`),
);
server.on("close", () => db.close());
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
