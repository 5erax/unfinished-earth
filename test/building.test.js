import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  join,
  applyCommand,
  walkable,
  placementProblem,
  simulateDay,
  housingCapacity,
} from "../src/world.js";
import { CloudStore } from "../src/cloud-store.js";
import { createWorker } from "../src/cloud-worker.js";
import { LocalD1 } from "../scripts/local-d1.js";
function fixture() {
  const w = createWorld(1000);
  join(w, "a", 1000);
  join(w, "b", 1000);
  Object.assign(w.players.a, {
    x: 12,
    z: 22,
    bag: { wood: 20, stone: 10, food: 0 },
  });
  return w;
}
test("building consumes real stock, persists ownership and blocks its occupied tile", () => {
  const w = fixture();
  applyCommand(
    w,
    "a",
    { type: "build", kind: "storehouse", x: 10, z: 22 },
    2000,
  );
  assert.equal(w.buildings.length, 1);
  assert.equal(w.buildings[0].owner, "a");
  assert.equal(w.players.a.bag.wood, 16);
  assert.equal(w.players.a.bag.stone, 8);
  assert.equal(walkable(w, 10, 22), false);
  assert.throws(() =>
    applyCommand(
      w,
      "a",
      { type: "build", kind: "storehouse", x: 10, z: 22 },
      3000,
    ),
  );
  assert.equal(w.players.a.bag.wood, 16);
});
test("placement rejects water, road, occupied cell, resources and distant building without charging", () => {
  const w = fixture();
  for (const [x, z] of [
    [16, 17],
    [7, 17],
    [7, 22],
    [9, 23],
    [28, 28],
  ]) {
    assert.ok(placementProblem(w, "a", "storehouse", x, z));
    assert.throws(() =>
      applyCommand(w, "a", { type: "build", kind: "storehouse", x, z }, 2000),
    );
  }
  assert.equal(w.players.a.bag.wood, 20);
  assert.equal(w.buildings, undefined);
});
test("placement cannot seal the last exit from a pocket", () => {
  const w = fixture();
  w.players.a.x = 10;
  w.players.a.z = 24;
  w.buildings = [
    { x: 9, z: 22 },
    { x: 10, z: 21 },
    { x: 11, z: 22 },
  ];
  assert.match(placementProblem(w, "a", "storehouse", 10, 23), /bịt lối/);
});
test("storage transfer conserves materials, validates quantities, ownership and capacity", () => {
  const w = fixture();
  applyCommand(
    w,
    "a",
    { type: "build", kind: "storehouse", x: 10, z: 22 },
    2000,
  );
  const b = w.buildings[0];
  applyCommand(
    w,
    "a",
    {
      type: "storage",
      target: b.id,
      resource: "wood",
      amount: 6,
      direction: "deposit",
    },
    3000,
  );
  assert.equal(w.players.a.bag.wood + b.stock.wood, 16);
  assert.equal(b.stock.wood, 6);
  Object.assign(w.players.b, { x: 11, z: 22 });
  assert.throws(
    () =>
      applyCommand(
        w,
        "b",
        {
          type: "storage",
          target: b.id,
          resource: "wood",
          amount: 1,
          direction: "withdraw",
        },
        4000,
      ),
    /chủ kho/,
  );
  assert.throws(() =>
    applyCommand(
      w,
      "a",
      {
        type: "storage",
        target: b.id,
        resource: "wood",
        amount: -1,
        direction: "deposit",
      },
      4000,
    ),
  );
  applyCommand(
    w,
    "a",
    {
      type: "storage",
      target: b.id,
      resource: "wood",
      amount: 6,
      direction: "withdraw",
    },
    5000,
  );
  assert.equal(w.players.a.bag.wood, 16);
  assert.equal(b.stock.wood, 0);
  b.stock.food = 80;
  assert.throws(
    () =>
      applyCommand(
        w,
        "a",
        {
          type: "storage",
          target: b.id,
          resource: "wood",
          amount: 1,
          direction: "deposit",
        },
        6000,
      ),
    /đầy/,
  );
});
test("new house adds exactly two migration slots without duplicating NPC identities", () => {
  const w = fixture();
  Object.assign(w.players.a, { x: 10, z: 8 });
  applyCommand(w, "a", { type: "build", kind: "house", x: 9, z: 8 }, 2000);
  assert.equal(housingCapacity(w, "west"), 14);
  w.bridge = true;
  w.villages[0].food = 100;
  w.villages[1].food = 0;
  w.moisture = 0;
  w.fish = 0;
  for (const n of w.npcs) if (n.village === "east") n.hungryDays = 3;
  simulateDay(w);
  assert.equal(w.npcs.filter((n) => n.village === "west").length, 14);
  assert.equal(new Set(w.npcs.map((n) => n.id)).size, 24);
});
test("legacy worlds remain readable and do not enable housing limits until first house", () => {
  const w = fixture();
  assert.equal(housingCapacity(w, "west"), null);
  const before = JSON.stringify(w.npcs);
  applyCommand(
    w,
    "a",
    { type: "build", kind: "storehouse", x: 10, z: 22 },
    2000,
  );
  assert.equal(housingCapacity(w, "west"), null);
  assert.equal(JSON.stringify(w.npcs), before);
  assert.equal(w.schemaVersion, 1);
});
test("two cloud clients cannot build twice on one plot; receipt retry cannot charge twice", async () => {
  const db = new LocalD1();
  let now = 10000;
  const worker = createWorker({}, () => now);
  async function call(path, cookie, body) {
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
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  }
  try {
    const a = await call("/api/join", null, {}),
      b = await call("/api/join", null, {});
    const store = new CloudStore(db);
    await store.transact(now, (w) => {
      for (const p of Object.values(w.players))
        Object.assign(p, {
          x: 12,
          z: 22,
          bag: { wood: 10, stone: 5, food: 0 },
        });
      return { status: 200, payload: {} };
    });
    const command = {
      type: "build",
      kind: "storehouse",
      x: 10,
      z: 22,
      id: "same-plot-build",
    };
    const results = await Promise.all([
      call("/api/command", a.cookie, command),
      call("/api/command", b.cookie, command),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
    const index = results.findIndex((r) => r.status === 200),
      winner = [a, b][index];
    const retry = await call("/api/command", winner.cookie, command);
    assert.equal(retry.data.replayed, true);
    const w = await store.read(now);
    assert.equal(w.buildings.length, 1);
    assert.equal(w.players[winner.data.you].bag.wood, 6);
  } finally {
    db.close();
  }
});
