import test from "node:test";
import assert from "node:assert/strict";
import { Motion } from "../public/motion.js";
const world = () => ({ you: "a", players: { a: { x: 7, z: 22 } } });
test("prediction responds before acknowledgement without modifying authoritative position", () => {
  const w = world(),
    m = new Motion();
  m.frame(w, 0);
  assert.ok(m.enqueue(w, 8, 22, () => true));
  const v = m.frame(w, 0.05);
  assert.ok(v.players.a.x > 7 && v.players.a.x < 8);
  assert.equal(w.players.a.x, 7);
});
test("prediction preserves corners and reconciles rejection", () => {
  const w = world(),
    m = new Motion();
  m.frame(w, 0);
  m.enqueue(w, 8, 22, () => true);
  m.enqueue(w, 8, 23, () => true);
  const v = m.frame(w, 0.05);
  assert.equal(v.players.a.z, 22);
  m.acknowledge(false);
  assert.equal(m.pending.length, 0);
  for (let i = 0; i < 20; i++) m.frame(w, 0.05);
  assert.equal(m.frame(w, 0).players.a.x, 7);
});
test("prediction is bounded, respects walls and acknowledges only first queued step", () => {
  const w = world(),
    m = new Motion();
  assert.equal(
    m.enqueue(w, 8, 22, () => false),
    false,
  );
  assert.equal(
    m.enqueue(w, 10, 22, () => true),
    false,
  );
  for (let x = 8; x <= 15; x++) assert.ok(m.enqueue(w, x, 22, () => true));
  assert.equal(
    m.enqueue(w, 16, 22, () => true),
    false,
  );
  w.players.a.x = 8;
  m.acknowledge(true);
  assert.equal(m.pending.length, 7);
  assert.equal(m.target("a", w.players.a, "a").x, 15);
});
