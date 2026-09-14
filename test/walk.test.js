import test from "node:test";
import assert from "node:assert/strict";
import { createWorld, join, applyCommand } from "../src/world.js";
test("batched walking respects elapsed time, validates full route and confirms prefix", () => {
  const w = createWorld(1000);
  join(w, "a", 1000);
  const p = w.players.a;
  p.lastMove = 1000;
  const steps = [
    { x: 8, z: 22 },
    { x: 9, z: 22 },
    { x: 10, z: 22 },
  ];
  applyCommand(w, "a", { type: "walk", steps }, 1320);
  assert.equal(p.x, 9);
  assert.equal(p.moveSeq, 2);
  applyCommand(w, "a", { type: "walk", steps: [steps[2]] }, 1320);
  assert.equal(p.x, 9);
  applyCommand(w, "a", { type: "walk", steps: [steps[2]] }, 1480);
  assert.equal(p.x, 10);
  assert.throws(() =>
    applyCommand(w, "a", { type: "walk", steps: [{ x: 14, z: 22 }] }, 2000),
  );
  assert.equal(p.x, 10);
});
test("650ms transport cycles carry 4 steps without teleporting or speed advantage", () => {
  const w = createWorld(1000);
  join(w, "a", 1000);
  const p = w.players.a;
  Object.assign(p, { x: 4, z: 5, lastMove: 1000 });
  let steps = 0;
  for (let cycle = 1; cycle <= 3; cycle++) {
    const route = Array.from({ length: 4 }, (_, i) => ({
      x: 4,
      z: p.z + i + 1,
    }));
    applyCommand(w, "a", { type: "walk", steps: route }, 1000 + cycle * 650);
    steps += 4;
  }
  assert.equal(p.moveSeq, 12);
  assert.equal(p.z, 17);
  assert.ok(p.moveSeq <= Math.floor(1950 / 160));
});
