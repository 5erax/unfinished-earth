import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { Store } from "../src/store.js";
test("forced process death after committed ACK preserves world and command receipt", async () => {
  const dir = await mkdtemp(join(tmpdir(), "earth-crash-")),
    file = join(dir, "world.sqlite");
  const code = `import {Store} from ${JSON.stringify(new URL("../src/store.js", import.meta.url).href)};import {join,applyCommand} from ${JSON.stringify(new URL("../src/world.js", import.meta.url).href)};const s=new Store(process.argv[1],1000);join(s.world,'player',1000);Object.assign(s.world.players.player,{x:12,z:22,bag:{wood:10,stone:5,food:0}});applyCommand(s.world,'player',{type:'build',kind:'storehouse',x:10,z:22},2000);s.save(s.world,{player:'player',id:'crash-command',result:{status:200,payload:{message:'built'}}});process.stdout.write('ACK');setInterval(()=>{},1000);`;
  const child = spawn(
    process.execPath,
    ["--input-type=module", "-e", code, file],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(
        () => reject(Error("No commit acknowledgement")),
        5000,
      );
      child.stdout.once("data", (data) => {
        clearTimeout(t);
        data.toString() === "ACK" ? resolve() : reject(Error("unexpected ACK"));
      });
      child.once("error", reject);
      child.once("exit", () => {
        clearTimeout(t);
        reject(Error("writer exited before kill"));
      });
    });
    const exited = once(child, "exit");
    child.kill("SIGKILL");
    await exited;
    const reopened = new Store(file, 3000);
    try {
      assert.equal(reopened.world.buildings.length, 1);
      assert.equal(reopened.world.players.player.bag.wood, 6);
      assert.equal(reopened.result("player", "crash-command").status, 200);
    } finally {
      reopened.close();
    }
  } finally {
    child.kill("SIGKILL");
    await rm(dir, { recursive: true, force: true });
  }
});
