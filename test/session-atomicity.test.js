import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import { once } from "node:events";
import { Store } from "../src/store.js";
import { join } from "../src/world.js";
import { createGameServer } from "../src/server.js";

test("failed session insert rolls back world and receipts; successful session survives restart", () => {
  const dir = mkdtempSync(pathJoin(tmpdir(), "earth-session-"));
  const file = pathJoin(dir, "world.sqlite");
  let store = new Store(file, 1000);
  try {
    const before = structuredClone(store.world);
    const next = structuredClone(before);
    join(next, "player", 1000);
    next.revision++;
    store.db.exec("CREATE TRIGGER reject_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'injected session failure'); END;");
    assert.throws(() => store.save(next, {player:"player",id:"cmd",result:{ok:true}},
      {token:"hashed-token",player:"player",expires:10000}), /injected session failure/);
    assert.deepEqual(store.world, before);
    assert.deepEqual(JSON.parse(store.db.prepare("SELECT state FROM worlds WHERE id=1").get().state), before);
    assert.equal(store.result("player", "cmd"), null);
    store.db.exec("DROP TRIGGER reject_session");
    store.save(next, undefined, {token:"hashed-token",player:"player",expires:10000});
    store.close();
    store = new Store(file, 2000);
    assert.equal(store.world.players.player.id, "player");
    assert.equal(store.db.prepare("SELECT player FROM sessions WHERE token=? AND expires>?").get("hashed-token", 2000).player, "player");
  } finally { store.close(); rmSync(dir, {recursive:true,force:true}); }
});

test("join failure sends no cookie and leaves no orphan; retry creates a usable session", async () => {
  const {server,store} = createGameServer({clock:()=>1000});
  server.listen(0,"127.0.0.1");
  await once(server,"listening");
  const url = `http://127.0.0.1:${server.address().port}`;
  const enter = () => fetch(url+"/api/join", {method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
  try {
    store.db.exec("CREATE TRIGGER reject_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'injected session failure'); END;");
    const failed = await enter();
    assert.equal(failed.status,500);
    assert.equal(failed.headers.get("set-cookie"),null);
    await failed.text();
    assert.equal(Object.keys(store.world.players).length,0);
    assert.equal(store.db.prepare("SELECT count(*) AS n FROM sessions").get().n,0);
    store.db.exec("DROP TRIGGER reject_session");
    const joined = await enter();
    assert.equal(joined.status,200);
    const cookie=joined.headers.get("set-cookie").split(";")[0];
    const state=await joined.json();
    const restored=await fetch(url+"/api/state",{headers:{cookie}});
    assert.equal(restored.status,200);
    assert.equal((await restored.json()).you,state.you);
    assert.equal(Object.keys(store.world.players).length,1);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
