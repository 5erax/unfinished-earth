import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalD1 } from "../scripts/local-d1.js";
import { CloudStore } from "../src/cloud-store.js";
import { createWorker, catchUp } from "../src/cloud-worker.js";
import { createWorld, join as joinPlayer, OFFLINE_MS } from "../src/world.js";
function request(url, cookie, data) {
  return new Request("https://earth.test" + url, {
    method: data ? "POST" : "GET",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}
test("Worker: two clients, atomic last-item race, duplicate race, and durable restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "earth-cloud-"));
  const path = join(dir, "save.sqlite");
  let db = new LocalD1(path),
    now = 10000,
    worker = createWorker({}, () => now);
  async function call(path, cookie, data) {
    const r = await worker.fetch(request(path, cookie, data), { DB: db });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  }
  try {
    const a = await call("/api/join", null, {}),
      b = await call("/api/join", null, {});
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    const store = new CloudStore(db);
    await store.transact(now, (w) => {
      for (const p of Object.values(w.players)) {
        p.x = 6;
        p.z = 20;
      }
      w.resources.find((r) => r.id === "home-wood").remaining = 1;
      return { status: 200, payload: {} };
    });
    const results = await Promise.all([
      call("/api/command", a.cookie, {
        type: "gather",
        target: "home-wood",
        id: "race-command-a",
      }),
      call("/api/command", b.cookie, {
        type: "gather",
        target: "home-wood",
        id: "race-command-b",
      }),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
    const ix = results.findIndex((r) => r.status === 200),
      winner = [a, b][ix],
      id = ["race-command-a", "race-command-b"][ix];
    const dup = await Promise.all([
      call("/api/command", winner.cookie, {
        type: "gather",
        target: "home-wood",
        id,
      }),
      call("/api/command", winner.cookie, {
        type: "gather",
        target: "home-wood",
        id,
      }),
    ]);
    for (const r of dup) {
      assert.equal(r.data.replayed, true);
      assert.equal(r.data.state.players[winner.data.you].bag.wood, 1);
    }
    // Restart both process-local worker state and database connection.
    db.close();
    db = new LocalD1(path);
    worker = createWorker({}, () => now);
    const reload = await call("/api/state", winner.cookie);
    assert.equal(reload.status, 200);
    assert.equal(reload.data.players[winner.data.you].bag.wood, 1);
    const repeated = await call("/api/command", winner.cookie, {
      type: "gather",
      target: "home-wood",
      id,
    });
    assert.equal(repeated.data.replayed, true);
    const other = await call("/api/state", [a, b][1 - ix].cookie);
    assert.equal(other.data.players[winner.data.you].bag, undefined);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("revision CAS retries two simultaneous updates without losing either", async () => {
  const db = new LocalD1();
  try {
    const a = new CloudStore(db),
      b = new CloudStore(db);
    await a.read(1000);
    await Promise.all([
      a.transact(1000, (w) => {
        w.depot++;
        return { status: 200, payload: {} };
      }),
      b.transact(1000, (w) => {
        w.depot++;
        return { status: 200, payload: {} };
      }),
    ]);
    assert.equal((await a.read(1000)).depot, 26);
  } finally {
    db.close();
  }
});
test("receipt guard prevents same command applying even when stale receipt read races newer world", async () => {
  const db = new LocalD1();
  try {
    const a = new CloudStore(db),
      b = new CloudStore(db);
    await a.read(1000);
    const originalReceipt = b.receipt.bind(b);
    let first = true;
    b.receipt = async (...args) => {
      if (first) {
        first = false;
        return null;
      }
      return originalReceipt(...args);
    };
    const opts = { receipt: { player: "p", id: "same-command" } };
    await a.transact(
      1000,
      (w) => {
        w.depot++;
        return { status: 200, payload: {} };
      },
      opts,
    );
    const r = await b.transact(
      1000,
      (w) => {
        w.depot++;
        return { status: 200, payload: {} };
      },
      opts,
    );
    assert.equal(r.replayed, true);
    assert.equal((await a.read(1000)).depot, 25);
  } finally {
    db.close();
  }
});
test("catch-up after inactivity and repeated cold starts never extend 72-hour horizon", () => {
  const w = createWorld(1000);
  joinPlayer(w, "p", 1000);
  catchUp(w, 1000 + OFFLINE_MS * 2, 1);
  const day = w.day,
    deadline = w.offlineUntil;
  assert.equal(deadline, 16000 + OFFLINE_MS);
  catchUp(w, 1000 + OFFLINE_MS * 5, 1);
  assert.equal(w.day, day);
  assert.equal(w.offlineUntil, deadline);
});
test("Worker rejects cross-origin and malformed payloads, and public health checks DB", async () => {
  const db = new LocalD1();
  try {
    const worker = createWorker();
    assert.equal(
      (await worker.fetch(new Request("https://earth.test/health"), { DB: db }))
        .status,
      200,
    );
    const r = await worker.fetch(
      new Request("https://earth.test/api/join", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.test",
        },
        body: "{}",
      }),
      { DB: db },
    );
    assert.equal(r.status, 403);
    const bad = await worker.fetch(
      new Request("https://earth.test/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "null",
      }),
      { DB: db },
    );
    assert.equal(bad.status, 400);
  } finally {
    db.close();
  }
});
