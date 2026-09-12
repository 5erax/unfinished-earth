import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
/** Local SQLite implementation of the D1 calls used by the Worker, for dev and tests. */
export class LocalD1 {
  constructor(path = ":memory:") {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
    this.db.exec(
      readFileSync(
        new URL("../drizzle/0000_world.sql", import.meta.url),
        "utf8",
      ),
    );
  }
  withSession() {
    return this;
  }
  prepare(sql) {
    const db = this.db;
    const statement = (values = []) => ({
      sql,
      values,
      bind: (...args) => statement(args),
      first: async () => db.prepare(sql).get(...values) || null,
      run: async () => ({
        success: true,
        meta: { changes: Number(db.prepare(sql).run(...values).changes) },
      }),
    });
    return statement();
  }
  async batch(statements) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((s) => ({
        success: true,
        meta: {
          changes: Number(this.db.prepare(s.sql).run(...s.values).changes),
        },
      }));
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  close() {
    this.db.close();
  }
}
