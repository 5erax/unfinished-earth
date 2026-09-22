import { copyFile, mkdir } from "node:fs/promises";
await mkdir("public", { recursive: true });
await copyFile("src/world.js", "public/world-rules.js");
await copyFile("node_modules/three/build/three.module.js", "public/three.js");
console.log("Vercel static assets prepared.");
