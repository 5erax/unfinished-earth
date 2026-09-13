import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import {
  createWorld,
  join,
  applyCommand,
  simulateDay,
  advance,
  OFFLINE_MS,
  DAY_MS,
  walkable,
} from "../src/world.js";
import { Store } from "../src/store.js";
import { createGameServer } from "../src/server.js";
function setup() {
  const w = createWorld(1000);
  join(w, "a", 1000);
  join(w, "b", 1000);
  return w;
}
test("untrusted movement cannot teleport or cross unrepaired water", () => {
  const w = setup();
  assert.throws(() =>
    applyCommand(w, "a", { type: "move", x: 24, z: 12 }, 2000),
  );
  w.players.a.x = 14;
  w.players.a.z = 17;
  assert.throws(() =>
    applyCommand(w, "a", { type: "move", x: 15, z: 17 }, 2000),
  );
  w.bridge = true;
  applyCommand(w, "a", { type: "move", x: 15, z: 17 }, 2000);
  assert.throws(() =>
    applyCommand(w, "a", { type: "move", x: 16, z: 17 }, 2001),
  );
  assert.equal(walkable(w, 15, 18), false);
});
test("last resource belongs to exactly one player and stocks stay nonnegative", () => {
  const w = setup();
  const r = w.resources.find((r) => r.id === "home-wood");
  r.remaining = 1;
  for (const p of Object.values(w.players)) Object.assign(p, { x: 6, z: 20 });
  applyCommand(w, "a", { type: "gather", target: r.id }, 2000);
  assert.throws(
    () => applyCommand(w, "b", { type: "gather", target: r.id }, 2000),
    /cạn/,
  );
  assert.equal(r.remaining, 0);
  assert.equal(w.players.a.bag.wood + w.players.b.bag.wood, 1);
});
test("bridge consumes material once and cart transfer conserves cargo", () => {
  const w = setup();
  const p = w.players.a;
  Object.assign(p, { x: 14, z: 17, bag: { wood: 16, stone: 8, food: 0 } });
  applyCommand(w, "a", { type: "bridge" }, 2000);
  assert.equal(p.bag.wood, 8);
  assert.throws(() => applyCommand(w, "a", { type: "bridge" }, 3000));
  const stock = w.depot;
  simulateDay(w);
  assert.equal(w.depot, stock - 8);
  assert.equal(w.cart.cargo, 8);
  simulateDay(w);
  assert.equal(w.cart.cargo, 0);
  assert.equal(w.deliveries, 1);
  assert.deepEqual(w.events.at(-1).causes, [w.bridgeCause]);
});
test("same-seed gate intervention affects ecology and preserves all NPC identities", () => {
  const a = setup(),
    b = structuredClone(a);
  b.gate = true;
  const ids = a.npcs.map((n) => n.id).sort();
  for (let i = 0; i < 30; i++) {
    simulateDay(a);
    simulateDay(b);
  }
  assert.ok(a.fish > b.fish);
  assert.ok(b.moisture > a.moisture);
  assert.deepEqual(b.npcs.map((n) => n.id).sort(), ids);
  assert.equal(new Set(b.npcs.map((n) => n.id)).size, 24);
  for (const v of b.villages) assert.ok(v.food >= 0);
});
test("offline horizon starts once and repeated worker wakes never extend it", () => {
  const w = setup();
  advance(w, 1000 + OFFLINE_MS * 2, false, 1);
  const day = w.day,
    deadline = w.offlineUntil;
  assert.equal(deadline, 1000 + OFFLINE_MS);
  advance(w, 1000 + OFFLINE_MS * 3, false, 1);
  assert.equal(w.day, day);
  assert.equal(w.offlineUntil, deadline);
  advance(w, 1000 + OFFLINE_MS * 4, true, 1);
  assert.equal(w.day, day);
  assert.equal(w.absenceStartedAt, null);
  advance(w, 1000 + OFFLINE_MS * 4 + DAY_MS, true, 1);
  assert.equal(w.day, day + 1);
});
test("zero-credit offline operation never transports food", () => {
  const w = setup();
  w.bridge = true;
  advance(w, 1000 + DAY_MS * 4, false, 1);
  assert.equal(w.depot, 24);
  assert.equal(w.deliveries, 0);
  assert.equal(w.cart.status, "resting");
});
test("world and command receipt survive close/reopen as a single transaction", () => {
  const dir = mkdtempSync(pathJoin(tmpdir(), "earth-"));
  try {
    let store = new Store(pathJoin(dir, "test.sqlite"), 1000);
    const w = structuredClone(store.world);
    w.bridge = true;
    w.revision = 7;
    store.save(w, {
      player: "a",
      id: "receipt-123",
      result: { status: 200, payload: { message: "done" } },
    });
    store.close();
    store = new Store(pathJoin(dir, "test.sqlite"), 9000);
    assert.equal(store.world.bridge, true);
    assert.equal(store.world.revision, 7);
    assert.equal(store.result("a", "receipt-123").payload.message, "done");
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("HTTP sessions, concurrent pickup, replay, rejection and restart", async () => {
  const dir = mkdtempSync(pathJoin(tmpdir(), "earth-http-"));
  let now = 10000;
  const dbPath = pathJoin(dir, "world.sqlite");
  let game = createGameServer({ dbPath, clock: () => now });
  async function listen() {
    await new Promise((r) => game.server.listen(0, "127.0.0.1", r));
    return `http://127.0.0.1:${game.server.address().port}`;
  }
  let base = await listen();
  async function request(path, { cookie, body, origin } = {}) {
    const r = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(origin ? { origin } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  }
  try {
    assert.equal((await request("/api/state")).status, 401);
    const a = await request("/api/join", { body: {} }),
      b = await request("/api/join", { body: {} });
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    const w = structuredClone(game.store.world);
    for (const p of Object.values(w.players)) Object.assign(p, { x: 6, z: 20 });
    w.resources.find((r) => r.id === "home-wood").remaining = 1;
    game.store.save(w);
    const [first, second] = await Promise.all([
      request("/api/command", {
        cookie: a.cookie,
        body: { id: "pickup-first", type: "gather", target: "home-wood" },
      }),
      request("/api/command", {
        cookie: b.cookie,
        body: { id: "pickup-second", type: "gather", target: "home-wood" },
      }),
    ]);
    assert.deepEqual([first.status, second.status].sort(), [200, 400]);
    const winner = first.status === 200 ? a : b,
      commandId = first.status === 200 ? "pickup-first" : "pickup-second";
    const replay = await request("/api/command", {
      cookie: winner.cookie,
      body: { id: commandId, type: "gather", target: "home-wood" },
    });
    assert.equal(replay.data.replayed, true);
    assert.equal(replay.data.state.players[winner.data.you].bag.wood, 1);
    assert.equal(
      (
        await request("/api/command", {
          cookie: a.cookie,
          body: { id: "invalid-csrf", type: "move", x: 1, z: 1 },
          origin: "https://evil.example",
        })
      ).status,
      403,
    );
    const other = await request("/api/state", { cookie: b.cookie });
    assert.equal(other.data.players[a.data.you].bag, undefined);
    await new Promise((r) => game.server.close(r));
    now += 5000;
    game = createGameServer({ dbPath, clock: () => now });
    base = await listen();
    const restored = await request("/api/state", { cookie: winner.cookie });
    assert.equal(restored.status, 200);
    assert.equal(restored.data.players[winner.data.you].bag.wood, 1);
    const restoredReplay = await request("/api/command", {
      cookie: winner.cookie,
      body: { id: commandId, type: "gather", target: "home-wood" },
    });
    assert.equal(restoredReplay.data.replayed, true);
  } finally {
    await new Promise((r) => game.server.close(r));
    rmSync(dir, { recursive: true, force: true });
  }
});
test("playable journey: gather, repair, cross, donate, irrigate and harvest through HTTP", async () => {
  let now = 1000;
  const game = createGameServer({ clock: () => now });
  await new Promise((r) => game.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${game.server.address().port}`;
  let cookie, s;
  async function req(path, body) {
    const r = await fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!cookie) cookie = r.headers.get("set-cookie")?.split(";")[0];
    const data = await r.json();
    assert.equal(r.status, 200, JSON.stringify(data.error));
    s = data.state || data;
    return data;
  }
  let seq = 0;
  async function cmd(body) {
    now += 600;
    return req("/api/command", { ...body, id: `journey-${++seq}` });
  }
  async function walkTo(tx, tz) {
    const p = s.players[s.you],
      queue = [[p.x, p.z]],
      prev = new Map([[`${p.x},${p.z}`, null]]);
    let dest;
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i];
      if (x === tx && z === tz) {
        dest = [x, z];
        break;
      }
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const key = `${x + dx},${z + dz}`;
        if (walkable(s, x + dx, z + dz) && !prev.has(key)) {
          prev.set(key, [x, z]);
          queue.push([x + dx, z + dz]);
        }
      }
    }
    assert.ok(dest, "destination reachable");
    const path = [];
    for (let c = dest; prev.get(c.join(",")); c = prev.get(c.join(",")))
      path.unshift(c);
    for (const [x, z] of path) await cmd({ type: "move", x, z });
  }
  try {
    await req("/api/join", {});
    await walkTo(6, 20);
    for (let i = 0; i < 12; i++)
      await cmd({ type: "gather", target: "home-wood" });
    await walkTo(9, 23);
    for (let i = 0; i < 6; i++)
      await cmd({ type: "gather", target: "home-stone" });
    await walkTo(14, 17);
    await cmd({ type: "bridge" });
    assert.equal(s.bridge, true);
    assert.deepEqual(s.players[s.you].bag, { wood: 4, stone: 2, food: 0 });
    await walkTo(11, 19);
    await cmd({ type: "supply" });
    assert.equal(s.players[s.you].bag.food, 8);
    await walkTo(24, 12);
    await cmd({ type: "donate", target: "east" });
    assert.equal(s.players[s.you].bag.food, 0);
    assert.ok(s.events.some((e) => e.kind === "food" && e.place === "east"));
    await walkTo(14, 10);
    await cmd({ type: "gate", open: true });
    assert.equal(s.gate, true);
    assert.deepEqual(s.players[s.you].bag, { wood: 0, stone: 0, food: 0 });
    await walkTo(10, 12);
    for (let i = 0; i < 5; i++) {
      now += 60000;
      game.tick();
    }
    await cmd({ type: "harvest" });
    assert.equal(s.harvests, 1);
    assert.ok(
      s.events.some((e) => e.kind === "food" && e.causes.includes(s.gateCause)),
    );
  } finally {
    await new Promise((r) => game.server.close(r));
  }
});
