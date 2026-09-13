// Visual prediction stays separate from the authoritative world snapshot.
export class Motion {
  constructor() {
    this.pending = [];
    this.route = [];
    this.points = new Map();
  }
  target(id, player, you) {
    return id === you && this.pending.length ? this.pending.at(-1) : player;
  }
  enqueue(world, x, z, walkable) {
    const p = this.target(world.you, world.players[world.you], world.you);
    if (
      this.pending.length >= 8 ||
      Math.abs(p.x - x) + Math.abs(p.z - z) !== 1 ||
      !walkable(world, x, z)
    )
      return false;
    this.pending.push({ x, z });
    this.route.push({ x, z });
    return true;
  }
  enqueueContinuous(world, x, z, freeSegment) {
    const p=this.target(world.you,world.players[world.you],world.you);
    if(this.pending.length>=240 || Math.hypot(x-p.x,z-p.z)<1e-8 || !freeSegment(world,p,{x,z})) return false;
    this.pending.push({x,z}); this.route.push({x,z}); return true;
  }
  acknowledge(ok, count = 1) {
    if (ok) this.pending.splice(0, count);
    else {
      this.pending = [];
      this.route = [];
    }
  }
  frame(world, dt) {
    let moving = false;
    const players = {};
    for (const [id, p] of Object.entries(world.players)) {
      let target = this.target(id, p, world.you);
      let v = this.points.get(id);
      if (!v) {
        v = { x: p.x, z: p.z };
        this.points.set(id, v);
      }
      if (id === world.you) {
        while (
          this.route.length &&
          Math.hypot(this.route[0].x - v.x, this.route[0].z - v.z) < 0.001
        )
          this.route.shift();
        target = this.route[0] || target;
      }
      const distance = Math.hypot(target.x - v.x, target.z - v.z);
      if (distance > 0.001) {
        const factor = Math.min(1, (Math.max(0, dt) * (this.continuous ? 5 : 7)) / distance);
        v.x += (target.x - v.x) * factor;
        v.z += (target.z - v.z) * factor;
        moving = true;
      }
      players[id] = { ...p, x: v.x, z: v.z };
    }
    for (const id of this.points.keys())
      if (!world.players[id]) this.points.delete(id);
    return { players, moving };
  }
}
