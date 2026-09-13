import { createWorld, VERSION } from "./world.js";
export class CloudStore {
  constructor(db) {
    this.db = db.withSession ? db.withSession("first-primary") : db;
  }
  async read(now) {
    let row = await this.db
      .prepare("SELECT * FROM cloud_worlds WHERE id=1")
      .first();
    if (!row) {
      await this.db
        .prepare("INSERT OR IGNORE INTO cloud_worlds VALUES(1,0,?,?)")
        .bind(JSON.stringify(createWorld(now)), crypto.randomUUID())
        .run();
      row = await this.db
        .prepare("SELECT * FROM cloud_worlds WHERE id=1")
        .first();
    }
    const world = JSON.parse(row.state);
    if (world.schemaVersion !== VERSION || world.simVersion !== VERSION)
      throw new Error("Save version is unsupported.");
    return world;
  }
  async receipt(player, id) {
    const row = await this.db
      .prepare(
        "SELECT status,payload FROM cloud_receipts WHERE player=? AND id=?",
      )
      .bind(player, id)
      .first();
    return row
      ? { status: row.status, payload: JSON.parse(row.payload) }
      : null;
  }
  async session(token, now) {
    return this.db
      .prepare("SELECT player FROM cloud_sessions WHERE token=? AND expires>?")
      .bind(token, now)
      .first();
  }
  async transact(now, mutate, { receipt, session } = {}) {
    // D1 batch is atomic; revision CAS serializes writers across Worker instances.
    for (let attempt = 0; attempt < 12; attempt++) {
      const w = await this.read(now);
      if (receipt) {
        const old = await this.receipt(receipt.player, receipt.id);
        if (old) return { ...old, world: w, replayed: true };
      }
      const revision = w.revision;
      const outcome = mutate(w);
      w.revision = revision + 1;
      const stamp = crypto.randomUUID();
      const statements = [];
      const guard = receipt
        ? " AND NOT EXISTS (SELECT 1 FROM cloud_receipts WHERE player=? AND id=?)"
        : "";
      statements.push(
        this.db
          .prepare(
            "UPDATE cloud_worlds SET revision=?,state=?,stamp=? WHERE id=1 AND revision=?" +
              guard,
          )
          .bind(
            w.revision,
            JSON.stringify(w),
            stamp,
            revision,
            ...(receipt ? [receipt.player, receipt.id] : []),
          ),
      );
      if (receipt)
        statements.push(
          this.db
            .prepare(
              "INSERT OR IGNORE INTO cloud_receipts SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM cloud_worlds WHERE id=1 AND stamp=?)",
            )
            .bind(
              receipt.player,
              receipt.id,
              outcome.status,
              JSON.stringify(outcome.payload),
              now,
              stamp,
            ),
        );
      if (session)
        statements.push(
          this.db
            .prepare(
              "INSERT INTO cloud_sessions SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM cloud_worlds WHERE id=1 AND stamp=?)",
            )
            .bind(session.token, session.player, session.expires, stamp),
        );
      const results = await this.db.batch(statements);
      if (results[0].meta.changes === 1)
        return { ...outcome, world: w, replayed: false };
    }
    throw Object.assign(new Error("Thế giới đang bận. Vui lòng thử lại."), {
      status: 503,
    });
  }
}
