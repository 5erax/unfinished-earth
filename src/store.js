import { DatabaseSync } from "node:sqlite";
import { createWorld, VERSION } from "./world.js";
export class Store {
  constructor(path, now = Date.now()) {
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS worlds (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS commands (player TEXT, id TEXT, result TEXT NOT NULL, PRIMARY KEY(player,id)); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, player TEXT NOT NULL, expires INTEGER NOT NULL);",
    );
    const row = this.db.prepare("SELECT state FROM worlds WHERE id=1").get();
    this.world = row ? JSON.parse(row.state) : createWorld(now);
    if (
      this.world.schemaVersion !== VERSION ||
      this.world.simVersion !== VERSION
    )
      throw new Error(
        "Unsupported save version. Restore with the matching build; never silently replay another simulation version.",
      );
    if (!row) this.save(this.world);
  }
  save(world, command) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare(
          "INSERT INTO worlds(id,state) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state",
        )
        .run(JSON.stringify(world));
      if (command)
        this.db
          .prepare("INSERT INTO commands(player,id,result) VALUES(?,?,?)")
          .run(command.player, command.id, JSON.stringify(command.result));
      this.db.exec("COMMIT");
      this.world = world;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  result(player, id) {
    const row = this.db
      .prepare("SELECT result FROM commands WHERE player=? AND id=?")
      .get(player, id);
    return row ? JSON.parse(row.result) : null;
  }
  close() {
    this.db.close();
  }
}
