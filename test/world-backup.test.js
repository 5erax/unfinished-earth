import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import { Store } from "../src/store.js";
import { join, applyCommand } from "../src/world.js";
import { CloudStore } from "../src/cloud-store.js";
import { LocalD1 } from "../scripts/local-d1.js";
import { copyWorld, verifyWorld } from "../scripts/world-backup.mjs";
function temp(fn) {
  const dir = mkdtempSync(pathJoin(tmpdir(), "earth-backup-"));
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => rmSync(dir, { recursive: true, force: true }));
}
test("online WAL backup restores buildings, stock, sessions and dedupe receipts independently", () =>
  temp((dir) => {
    const source = pathJoin(dir, "source.sqlite"),
      backup = pathJoin(dir, "backup.sqlite"),
      restored = pathJoin(dir, "restored.sqlite");
    const store = new Store(source, 1000);
    try {
      join(store.world, "a", 1000);
      Object.assign(store.world.players.a, {
        x: 12,
        z: 22,
        bag: { wood: 10, stone: 5, food: 0 },
      });
      applyCommand(
        store.world,
        "a",
        { type: "build", kind: "storehouse", x: 10, z: 22 },
        2000,
      );
      store.save(store.world, {
        player: "a",
        id: "saved-build",
        result: { status: 200, payload: { message: "built" } },
      });
      store.db
        .prepare("INSERT INTO sessions VALUES(?,?,?)")
        .run("session-token", "a", 999999);
      const report = copyWorld(source, backup);
      assert.equal(report.buildings, 1);
      assert.equal(report.sessions, 1);
      assert.equal(report.receipts, 1);
      // Windows inherits directory ACLs instead of exposing POSIX mode bits.
      if (process.platform !== "win32")
        assert.equal(statSync(backup).mode & 0o777, 0o600);
      assert.ok(statSync(backup).isFile());
      store.world.players.a.bag.wood = 1;
      store.save(store.world);
      copyWorld(backup, restored);
      const recovered = new Store(restored, 3000);
      try {
        assert.equal(recovered.world.players.a.bag.wood, 6);
        assert.equal(recovered.result("a", "saved-build").status, 200);
        assert.equal(
          recovered.db.prepare("SELECT player FROM sessions").get().player,
          "a",
        );
      } finally {
        recovered.close();
      }
      assert.equal(store.world.players.a.bag.wood, 1);
    } finally {
      store.close();
    }
  }));
test("restore refuses existing destinations, invalid versions and malformed receipts", () =>
  temp((dir) => {
    const source = pathJoin(dir, "source.sqlite"),
      destination = pathJoin(dir, "existing.sqlite");
    const store = new Store(source, 1000);
    try {
      copyWorld(source, destination);
      const before = readFileSync(destination);
      assert.throws(() => copyWorld(source, destination), /exist/i);
      assert.deepEqual(readFileSync(destination), before);
      assert.throws(() => copyWorld(source, source), /differ/);
      store.world.schemaVersion = 999;
      store.save(store.world);
      assert.throws(
        () => copyWorld(source, pathJoin(dir, "bad.sqlite")),
        /version/,
      );
      store.world.schemaVersion = 1;
      join(store.world, "a", 2000);
      store.save(store.world);
      store.db
        .prepare("INSERT INTO commands VALUES(?,?,?)")
        .run("a", "bad", "not json");
      assert.throws(() => verifyWorld(source));
    } finally {
      store.close();
    }
  }));
test("local D1 backup retains snapshot CAS revision, receipt and session records", () =>
  temp(async (dir) => {
    const db = new LocalD1(pathJoin(dir, "d1.sqlite")),
      store = new CloudStore(db);
    try {
      await store.transact(
        1000,
        (w) => {
          join(w, "a", 1000);
          return { status: 200, payload: { message: "joined" } };
        },
        {
          receipt: { player: "a", id: "join-receipt" },
          session: { token: "hash", player: "a", expires: 999999 },
        },
      );
      const target = pathJoin(dir, "d1-restored.sqlite");
      const report = copyWorld(pathJoin(dir, "d1.sqlite"), target);
      assert.equal(report.format, "worker-local-d1");
      const restored = new LocalD1(target),
        s = new CloudStore(restored);
      try {
        assert.equal((await s.read(1000)).revision, 1);
        assert.equal((await s.receipt("a", "join-receipt")).status, 200);
        assert.equal((await s.session("hash", 1000)).player, "a");
      } finally {
        restored.close();
      }
    } finally {
      db.close();
    }
  }));
