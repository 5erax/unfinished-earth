import test from "node:test";
import assert from "node:assert/strict";
import { Map2D, projectPoint, unprojectPoint } from "../public/map2d.js";

function camera() {
  return Object.assign(Object.create(Map2D.prototype), {
    w: 800, h: 600, baseTile: 20, tile: 40, zoom: 2,
    center: { x: 16, z: 16 }, state: Object.freeze({}),
    targets: [{ id: "west", x: 6, z: 8 }], spriteTargets: [],
  });
}
test("screen and world coordinates agree across zoom and pan", () => {
  const view = { width: 800, height: 600, x: 16, z: 16, tile: 40 };
  assert.deepEqual(projectPoint(18, 14, view), [480, 220]);
  assert.deepEqual(unprojectPoint(480, 220, view), { x: 18, z: 14 });
  const map = camera(), before = map.unproject(510, 370);
  map.zoomBy(1.25, 510, 370);
  const after = map.unproject(510, 370);
  assert.ok(Math.abs(after.x - before.x) < 1e-9);
  assert.ok(Math.abs(after.z - before.z) < 1e-9);
});
test("clicking a roof outside the landmark radius selects its village", () => {
  const map = camera(), selected = [], walked = [];
  map.choose = id => selected.push(id);
  map.travel = p => walked.push(p);
  map.spriteTargets = [{ id: "west", left: 4.5, right: 5.9, top: 6.1, bottom: 7.7 }];
  map.pick(...map.project(5.2, 6.5));
  assert.deepEqual(selected, ["west"]);
  assert.equal(walked.length, 0);
  map.preview = { x: 5, z: 7 };
  map.pick(...map.project(5.2, 6.5));
  assert.deepEqual(walked, [{ x: 5, z: 7 }]);
  map.pick(...map.project(-5, -5));
  assert.equal(walked.length, 1);
});
test("overlapping sprites select the frontmost visible target", () => {
  const map = camera(); let chosen;
  map.choose = id => { chosen = id; };
  map.spriteTargets = ["tree", "house"].map(id => ({id,left:5,right:7,top:6,bottom:8}));
  map.pick(...map.project(6, 7));
  assert.equal(chosen, "house");
});
