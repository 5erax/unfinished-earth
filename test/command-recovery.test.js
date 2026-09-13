import test from "node:test";
import assert from "node:assert/strict";
import { CommandJournal } from "../public/command-journal.js";
import { createWorker } from "../src/cloud-worker.js";
import { CloudStore } from "../src/cloud-store.js";
import { LocalD1 } from "../scripts/local-d1.js";
const memory = () => {
  const m = new Map();
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i],
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
};
test("lost ACK followed by client reload replays a receipt without duplicate inventory", async () => {
  const db = new LocalD1(),
    storage = memory();
  let now = 10000;
  const worker = createWorker({}, () => now);
  async function request(path, body, cookie) {
    const r = await worker.fetch(
      new Request("https://earth.test" + path, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(body),
      }),
      { DB: db },
    );
    return {
      ok: r.ok,
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  }
  try {
    const joined = await request("/api/join", {}),
      player = joined.data.you;
    await new CloudStore(db).transact(now, (w) => {
      Object.assign(w.players[player], {
        x: 12,
        z: 22,
        bag: { wood: 10, stone: 5, food: 0 },
      });
      return { status: 200, payload: {} };
    });
    const journal = new CommandJournal(storage),
      entry = journal.prepare(
        player,
        { type: "build", kind: "storehouse", x: 10, z: 22 },
        "lost-ack-command",
      );
    await assert.rejects(
      journal.send(entry, async (body) => {
        await request("/api/command", JSON.parse(body), joined.cookie);
        throw Error("ACK lost");
      }),
    );
    assert.equal(journal.entries(player).length, 1);
    now += 1000;
    const reopened = new CommandJournal(storage),
      result = await reopened.send(reopened.entries(player)[0], (body) =>
        request("/api/command", JSON.parse(body), joined.cookie),
      );
    assert.equal(result.data.replayed, true);
    assert.equal(result.data.state.players[player].bag.wood, 6);
    assert.equal(result.data.state.buildings.length, 1);
    assert.equal(result.settled, true);
    assert.equal(reopened.entries(player).length, 0);
  } finally {
    db.close();
  }
});
test("server/auth errors retain receipt; other player never inherits pending commands", async () => {
  const j = new CommandJournal(memory()),
    entry = j.prepare("a", { type: "build" }, "pending-command");
  for (const status of [401, 409, 500, 503]) {
    const r = await j.send(entry, async () => ({ status, data: {} }));
    assert.equal(r.settled, false);
  }
  assert.equal(j.entries("a").length, 1);
  assert.equal(j.entries("b").length, 0);
  const rejected = await j.send(entry, async () => ({
    status: 400,
    data: { state: { you: "a" }, error: "insufficient stock" },
  }));
  assert.equal(rejected.settled, true);
  assert.equal(j.entries("a").length, 0);
});
test("two tabs keep separate receipts and unavailable storage prevents submission preparation", () => {
  const storage = memory(),
    a = new CommandJournal(storage),
    b = new CommandJournal(storage);
  a.prepare("player", { type: "gather" }, "first-command");
  b.prepare("player", { type: "gather" }, "second-command");
  assert.equal(a.entries("player").length, 2);
  assert.throws(() =>
    new CommandJournal({
      setItem() {
        throw Error("quota");
      },
    }).prepare("a", {}, "no-storage"),
  );
});
