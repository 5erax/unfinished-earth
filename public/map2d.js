import { CLASSES } from "/world-rules.js";
// A functional isometric map for browsers without WebGL. Uses the same server state.
export class Map2D {
  constructor(container, choose, travel) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute(
      "aria-label",
      "Bản đồ đẳng cự ở chế độ tương thích",
    );
    container.replaceChildren(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.characters = new Image();
    this.characters.src = "/characters-v1.png";
    this.characters.onload = () => { if (this.state) this.draw(this.state, this.selected, this.angle, this.preview); };
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.actorMotion = new Map();
    this.art = new Image();
    this.art.src = "/world-sprites.png";
    this.art.onload = () => {
      if (this.state)
        this.draw(this.state, this.selected, this.angle, this.preview);
    };
    this.canvas.addEventListener("click", (e) => {
      if (!this.state) return;
      const r = this.canvas.getBoundingClientRect(),
        px = e.clientX - r.left,
        py = e.clientY - r.top;
      const hit = (this.hitRects || [])
        .slice()
        .reverse()
        .find(
          (t) => px >= t.left && px <= t.right && py >= t.top && py <= t.bottom,
        );
      if (hit) {
        choose(hit.id);
        return;
      }
      const close = this.targets
        .map((t) => ({ ...t, d: Math.hypot(t.px - px, t.py - py) }))
        .sort((a, b) => a.d - b.d)[0];
      if (close && close.d < Math.max(18, this.tile * 1.8)) {
        choose(close.id);
        return;
      }
      const a = (px - this.w * 0.53) / this.tile,
        b = (py - this.h * 0.51) / (this.tile * 0.5);
      const rx = (a + b) / 2,
        rz = (b - a) / 2;
      const c = Math.cos(this.angle),
        s = Math.sin(this.angle);
      travel({
        x: Math.round(rx * c + rz * s + this.cx),
        z: Math.round(-rx * s + rz * c + this.cz),
      });
    });
  }
  project(x, z, height = 0) {
    x -= this.cx ?? 16;
    z -= this.cz ?? 16;
    const c = Math.cos(this.angle),
      s = Math.sin(this.angle),
      rx = x * c - z * s,
      rz = x * s + z * c;
    return [
      this.w * 0.53 + (rx - rz) * this.tile,
      this.h * 0.51 + (rx + rz) * this.tile * 0.5 - height * this.tile,
    ];
  }
  poly(points, color, stroke) {
    const c = this.ctx;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fillStyle = color;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.stroke();
    }
  }
  tileAt(x, z, color, height = 0) {
    this.poly(
      [
        [x - 0.51, z - 0.51],
        [x + 0.51, z - 0.51],
        [x + 0.51, z + 0.51],
        [x - 0.51, z + 0.51],
      ].map(([a, b]) => this.project(a, b, height)),
      color,
    );
  }
  label(text, x, y) {
    const c = this.ctx;
    c.font = "12px system-ui";
    const width = c.measureText(text).width;
    c.fillStyle = "#122a29e8";
    c.beginPath();
    c.roundRect(x - width / 2 - 7, y - 13, width + 14, 22, 4);
    c.fill();
    c.fillStyle = "#e7edd6";
    c.textAlign = "center";
    c.fillText(text, x, y + 3);
  }
  draw(state, selected, angle = 0, preview = null) {
    this.state = state;
    this.selected = selected;
    this.preview = preview;
    this.angle = angle;
    this.w = this.container.clientWidth;
    this.h = this.container.clientHeight;
    this.tile = this.overview
      ? Math.min(this.w / 66, this.h / 38)
      : this.w < 760
        ? 30
        : 38;
    const focus = state?.players?.[state.you];
    this.cx = this.overview ? 16 : (focus?.x ?? 16);
    this.cz = this.overview ? 16 : (focus?.z ?? 16);
    const dpr = Math.min(devicePixelRatio, 2);
    if (
      this.canvas.width !== this.w * dpr ||
      this.canvas.height !== this.h * dpr
    ) {
      this.canvas.width = this.w * dpr;
      this.canvas.height = this.h * dpr;
    }
    this.canvas.style.width = this.w + "px";
    this.canvas.style.height = this.h + "px";
    const c = this.ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = c.createRadialGradient(
      this.w / 2,
      this.h / 2,
      10,
      this.w / 2,
      this.h / 2,
      this.w * 0.7,
    );
    bg.addColorStop(0, "#3f7152");
    bg.addColorStop(1, "#122e2a");
    c.fillStyle = bg;
    c.fillRect(0, 0, this.w, this.h);
    this.targets = [];
    this.hitRects = [];
    for (let x = 0; x < 32; x++)
      for (let z = 0; z < 32; z++)
        this.tileAt(
          x,
          z,
          x >= 15 && x <= 17
            ? z % 3
              ? "#398d94"
              : "#42999b"
            : ["#678750", "#6c8b53", "#698951", "#63834d"][
                Math.abs(
                  Math.floor(Math.sin(x * 0.48) + Math.cos(z * 0.41) + 2),
                ) % 4
              ],
        );
    for (let i = 0; i < 210; i++) {
      const x = ((i * 17) % 310) / 10,
        z = ((i * 29) % 310) / 10;
      if (x >= 14.6 && x <= 17.6) continue;
      const [px, py] = this.project(x, z);
      c.strokeStyle = i % 2 ? "#9bb26d55" : "#385f3540";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px - 2, py - 4);
      c.moveTo(px, py);
      c.lineTo(px + 3, py - 3);
      c.stroke();
    }
    for (let z = 0; z < 32; z += 0.6) {
      const [x, y] = this.project(15.5 + (z % 1), z);
      c.strokeStyle = "#c1e3cb35";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x - 6, y);
      c.lineTo(x + 9, y + 3);
      c.stroke();
    }
    for (let z = 8; z <= 22; z++) this.tileAt(7, z, "#b8ab79");
    for (let x = 7; x <= 25; x++)
      if (x < 15 || x > 17 || state?.bridge)
        this.tileAt(
          x,
          17,
          state?.bridge && x >= 15 && x <= 17 ? "#d4b784" : "#b8ab79",
        );
    for (let z = 12; z <= 17; z++) this.tileAt(24, z, "#b8ab79");
    for (let x = 9; x <= 11; x++)
      for (let z = 11; z <= 13; z++)
        this.tileAt(x, z, state?.crop >= 1 ? "#c6bd70" : "#789351");
    if (preview && Number.isFinite(preview.x) && Number.isFinite(preview.z))
      this.tileAt(
        preview.x,
        preview.z,
        preview.valid ? "#c3df8b" : "#e19982",
        0.05,
      );
    if (this.route?.length) {
      c.strokeStyle = "#f5d79488";
      c.lineWidth = 3;
      c.setLineDash([3, 7]);
      c.beginPath();
      const p = state.players[state.you];
      [p, ...this.route].forEach((v, i) => {
        const [x, y] = this.project(v.x, v.z);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      });
      c.stroke();
      c.setLineDash([]);
    }
    const add = (id, x, z, label) => {
      const [px, py] = this.project(x, z);
      this.targets.push({ id, x, z, px, py, label });
      return [px, py];
    };
    const objects = [];
    for (const r of state?.resources || [])
      if (r.remaining > 0) objects.push({ ...r, kind: r.type });
    const points = [
      ["home", 7, 22, "Nơi trú ẩn"],
      ["bridge", 16, 17, state?.bridge ? "Cầu đã thông" : "Cầu gãy"],
      ["gate", 14, 10, state?.gate ? "Cống mở" : "Cống tưới"],
      ["farm", 10, 12, "Ruộng chung"],
      ["depot", 11, 19, "Kho chung"],
      ["west", 6, 8, "Làng Thượng"],
      ["east", 24, 12, "Làng Hạ"],
      ["ruin", 25, 25, "Tàn tích"],
    ];
    for (const [id, x, z, label] of points) {
      add(id, x, z, label);
      if (["home", "west", "east", "depot"].includes(id))
        objects.push({ id, x, z, kind: "house" });
      if (id === "ruin" || id === "gate")
        objects.push({ id, x, z, kind: "stone" });
    }
    for (const b of state?.buildings || []) {
      add(b.id, b.x, b.z, b.kind === "house" ? "Nhà nhỏ" : "Kho cá nhân");
      objects.push({ ...b });
    }
    objects.sort(
      (a, b) => this.project(a.x, a.z)[1] - this.project(b.x, b.z)[1],
    );
    for (const o of objects) {
      const [x, y] = this.project(o.x, o.z),
        t = this.tile;
      if (this.art.complete && this.art.naturalWidth) {
        add(o.id, o.x, o.z);
        const col =
          o.kind === "stone" || o.kind === "storehouse" || o.id === "depot"
            ? 1
            : 0;
        const row = o.kind === "house" || o.kind === "storehouse" ? 1 : 0;
        const size =
          t * (o.kind === "wood" ? 4.1 : o.kind === "stone" ? 2.2 : 4.2);
        const sw = this.art.naturalWidth / 2,
          sh = this.art.naturalHeight / 2;
        c.drawImage(
          this.art,
          col * sw,
          row * sh,
          sw,
          sh,
          x - size * 0.5,
          y - size * 0.93,
          size,
          size,
        );
        this.hitRects.push({
          id: o.id,
          left: x - size * 0.38,
          right: x + size * 0.38,
          top: y - size * 0.85,
          bottom: y + size * 0.03,
        });
        continue;
      }
      add(o.id, o.x, o.z);
      c.fillStyle = "#173a2638";
      c.beginPath();
      c.ellipse(
        x + t * 0.35,
        y + t * 0.18,
        t * 0.75,
        t * 0.33,
        -0.3,
        0,
        Math.PI * 2,
      );
      c.fill();
      if (o.kind === "wood") {
        c.fillStyle = "#725635";
        c.fillRect(x - t * 0.09, y - t * 0.85, t * 0.18, t * 0.95);
        for (const [dx, dy, r, color] of [
          [0.05, -1.1, 0.78, "#204d33"],
          [-0.3, -1.7, 0.75, "#2f643e"],
          [0.28, -1.85, 0.7, "#3c7848"],
          [-0.12, -2.25, 0.6, "#60934f"],
        ]) {
          c.fillStyle = color;
          c.beginPath();
          c.arc(x + dx * t, y + dy * t, r * t, 0, Math.PI * 2);
          c.fill();
        }
      } else if (o.kind === "house" || o.kind === "storehouse") {
        this.poly(
          [
            [x - t, y - t * 0.1],
            [x, y + t * 0.4],
            [x + t, y - t * 0.1],
            [x + t, y - t * 1.3],
            [x, y - t * 0.8],
            [x - t, y - t * 1.3],
          ],
          "#e0c79b",
        );
        this.poly(
          [
            [x, y + t * 0.4],
            [x + t, y - t * 0.1],
            [x + t, y - t * 1.3],
            [x, y - t * 0.8],
          ],
          "#b59369",
        );
        this.poly(
          [
            [x - t * 1.2, y - t * 1.3],
            [x, y - t * 2.2],
            [x + t * 1.2, y - t * 1.3],
            [x, y - t * 0.7],
          ],
          o.id === "east" ? "#657d78" : "#a65e3a",
        );
        c.fillStyle = "#425750";
        c.fillRect(x - t * 0.5, y - t * 0.5, t * 0.25, t * 0.5);
      } else
        this.poly(
          [
            [x - t * 0.5, y],
            [x - t * 0.6, y - t * 0.5],
            [x, y - t],
            [x + t * 0.6, y - t * 0.6],
            [x + t * 0.5, y],
          ],
          "#aaaF9c",
        );
    }
    for (const [id, p] of Object.entries(state?.players || {})) {
      const [x, y] = this.project(p.x, p.z);
      const t = this.tile;
      c.fillStyle = "#092c2455";
      c.beginPath();
      c.ellipse(x, y + t * 0.13, t * 0.3, t * 0.14, 0, 0, Math.PI * 2);
      c.fill();
      if (id === state.you) {
        c.strokeStyle = "#f4da89";
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(x, y + t * 0.1, t * 0.42, t * 0.21, 0, 0, Math.PI * 2);
        c.stroke();
      }
      if (this.characters.complete && this.characters.naturalWidth && p.classId && CLASSES[p.classId]) {
        const i = CLASSES[p.classId].art, size = this.characters.naturalWidth / 2;
        const old = this.actorMotion.get(id), now = performance.now();
        const moving = old && (Math.abs(p.x-old.x) + Math.abs(p.z-old.z) > 0.001);
        const face = moving ? (x < old.px ? -1 : 1) : old?.face || 1;
        const reduced = this.reducedMotion.matches;
        const bob = moving && !reduced ? Math.sin(now / 75) * t * 0.045 : 0;
        this.actorMotion.set(id, { x: p.x, z: p.z, px: x, face });
        c.save(); c.translate(x, y + t * 0.12); c.scale(face, 1);
        c.drawImage(this.characters, (i % 2) * size, Math.floor(i/2)*size, size, size,
          -t * 0.82, -t * 1.64 + bob, t * 1.64, t * 1.64);
        c.restore();
        if (p.focusUntil > Date.now()) { c.strokeStyle = "#ffd77a"; c.beginPath(); c.ellipse(x,y,t*.52,t*.26,0,0,Math.PI*2); c.stroke(); }
        continue;
      }
      c.fillStyle = "#263d35";
      c.fillRect(x - t * 0.16, y - t * 0.2, t * 0.12, t * 0.35);
      c.fillRect(x + t * 0.04, y - t * 0.2, t * 0.12, t * 0.35);
      c.fillStyle = id === state.you ? "#df9f48" : "#76aab6";
      c.beginPath();
      c.roundRect(x - t * 0.22, y - t * 0.67, t * 0.44, t * 0.53, t * 0.1);
      c.fill();
      c.fillStyle = "#e9caa0";
      c.beginPath();
      c.arc(x, y - t * 0.87, t * 0.2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#594333";
      c.beginPath();
      c.arc(x, y - t * 0.93, t * 0.22, Math.PI, 2 * Math.PI);
      c.fill();
    }
    for (const n of state?.npcs || []) {
      const village = points.find((p) => p[0] === n.village),
        i = Number(n.id.split("-")[1]);
      const [x, y] = this.project(
        village[1] + Math.cos(i * 2.4) * 2,
        village[2] + Math.sin(i * 2.4) * 2,
      );
      c.fillStyle = "#c1c29a";
      c.fillRect(x - 1.5, y - 4, 3, 5);
    }
    const chosen = this.targets.find((t) => t.id === selected);
    if (chosen) {
      c.strokeStyle = "#ffe2a1";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(
        chosen.px,
        chosen.py,
        this.tile * 1.2,
        this.tile * 0.6,
        0,
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
    for (const t of this.targets)
      if (
        t.label &&
        (t.id === selected ||
          (this.overview && ["east", "west", "bridge"].includes(t.id)))
      )
        this.label(t.label, t.px, t.py + this.tile * 1.6);
    c.font = "12px system-ui";
    c.textAlign = "center";
    c.fillStyle = "#d7e2ca";
  }
}
