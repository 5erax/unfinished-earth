import { DatabaseSync } from "node:sqlite";
import {
  closeSync,
  fsyncSync,
  openSync,
  linkSync,
  unlinkSync,
  statSync,
  readFileSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { VERSION } from "../src/world.js";

function inspect(db) {
  const integrity = db.prepare("PRAGMA integrity_check").all();
  if (integrity.length !== 1 || Object.values(integrity[0])[0] !== "ok")
    throw Error("SQLite integrity check failed.");
  const tables = new Set(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name),
  );
  const cloud = tables.has("cloud_worlds");
  const required = cloud
    ? ["cloud_worlds", "cloud_receipts", "cloud_sessions"]
    : ["worlds", "commands", "sessions"];
  if (!required.every((t) => tables.has(t)) || (cloud && tables.has("worlds")))
    throw Error("Unsupported or ambiguous database schema.");
  const rows = db.prepare(`SELECT * FROM ${required[0]}`).all();
  if (rows.length !== 1 || rows[0].id !== 1)
    throw Error("Expected exactly one saved world.");
  const world = JSON.parse(rows[0].state);
  if (world.schemaVersion !== VERSION || world.simVersion !== VERSION)
    throw Error("Unsupported save version; use the matching game build.");
  if (
    !world.players ||
    !Array.isArray(world.npcs) ||
    !Array.isArray(world.events) ||
    !Array.isArray(world.villages)
  )
    throw Error("Incomplete world snapshot.");
  if (cloud && world.revision !== rows[0].revision)
    throw Error("World revision does not match storage revision.");
  const inventory = (stock) => {
    if (
      !stock ||
      !["wood", "stone", "food"].every(
        (k) => Number.isSafeInteger(stock[k]) && stock[k] >= 0,
      )
    )
      throw Error("Invalid inventory in snapshot.");
  };
  for (const p of Object.values(world.players)) inventory(p.bag);
  for (const b of world.buildings || []) inventory(b.stock);
  if (new Set(world.npcs.map((n) => n.id)).size !== world.npcs.length)
    throw Error("Duplicate NPC identity.");
  for (const table of required.slice(1)) {
    for (const row of db.prepare(`SELECT DISTINCT player FROM ${table}`).all())
      if (!Object.hasOwn(world.players, row.player))
        throw Error("Orphan session or command receipt.");
  }
  // Parse every receipt now, so a broken receipt cannot hide until its retry.
  for (const row of db
    .prepare(
      cloud
        ? "SELECT payload FROM cloud_receipts"
        : "SELECT result AS payload FROM commands",
    )
    .iterate())
    JSON.parse(row.payload);
  return {
    format: cloud ? "worker-local-d1" : "node-sqlite",
    schemaVersion: world.schemaVersion,
    simVersion: world.simVersion,
    revision: world.revision,
    players: Object.keys(world.players).length,
    npcs: world.npcs.length,
    buildings: (world.buildings || []).length,
    events: world.events.length,
    receipts: db.prepare(`SELECT COUNT(*) AS count FROM ${required[1]}`).get()
      .count,
    sessions: db.prepare(`SELECT COUNT(*) AS count FROM ${required[2]}`).get()
      .count,
  };
}
export function verifyWorld(file) {
  const db = new DatabaseSync(resolve(file), { readOnly: true });
  try {
    db.exec("BEGIN");
    return inspect(db);
  } finally {
    db.close();
  }
}
export function copyWorld(source, destination) {
  source = resolve(source);
  destination = resolve(destination);
  if (source === destination)
    throw Error("Source and destination must differ.");
  const temporary = join(
    dirname(destination),
    `.earth-backup-${randomUUID()}.sqlite`,
  );
  let db;
  try {
    // Reserve with private permissions; VACUUM INTO accepts an empty file.
    closeSync(openSync(temporary, "wx", 0o600));
    db = new DatabaseSync(source, { readOnly: true });
    db.exec("PRAGMA busy_timeout=5000");
    db.exec("BEGIN");
    inspect(db);
    db.exec("COMMIT");
    // SQLite copies one consistent snapshot, including committed WAL pages.
    db.prepare("VACUUM INTO ?").run(temporary);
    db.close();
    db = null;
    const report = verifyWorld(temporary);
    const sha256 = createHash("sha256")
      .update(readFileSync(temporary))
      .digest("hex");
    // Windows FlushFileBuffers requires a writable file handle.
    const fd = openSync(temporary, "r+");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    // Exclusive atomic publication: never replace an existing destination.
    linkSync(temporary, destination);
    // Node cannot open/fsync directory handles on Windows. File contents have
    // already been flushed; POSIX additionally persists the directory entry.
    if (process.platform !== "win32") {
      const directory = openSync(dirname(destination), "r");
      try {
        fsyncSync(directory);
      } finally {
        closeSync(directory);
      }
    }
    return { ...report, bytes: statSync(destination).size, sha256 };
  } finally {
    db?.close();
    try {
      unlinkSync(temporary);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const [operation, source, destination, ...extra] = process.argv.slice(2);
    if (
      extra.length ||
      !source ||
      !["backup", "verify", "restore"].includes(operation) ||
      (operation === "verify" ? !!destination : !destination)
    )
      throw Error(
        "Usage: node scripts/world-backup.mjs verify SOURCE | backup SOURCE NEW_FILE | restore BACKUP NEW_FILE",
      );
    const report =
      operation === "verify"
        ? verifyWorld(source)
        : copyWorld(source, destination);
    console.log(JSON.stringify({ operation, ...report }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
