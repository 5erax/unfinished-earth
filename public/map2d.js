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
    this.canvas.addEventListener("click", (e) => {
      if (!this.state) return;
      const r = this.canvas.getBoundingClientRect(),
        px = e.clientX - r.left,
        py = e.clientY - r.top;
      const close = this.targets
        .map((t) => ({ ...t, d: Math.hypot(t.px - px, t.py - py) }))
        .sort((a, b) => a.d - b.d)[0];
      if (close && close.d < Math.max(18, this.tile * 1.8)) {
        choose(close.id);
        return;
      }
      const a = (px - this.w / 2) / this.tile,
        b = (py - this.h * 0.48) / (this.tile * 0.5);
      const rx = (a + b) / 2,
        rz = (b - a) / 2;
      const c = Math.cos(this.angle),
        s = Math.sin(this.angle);
      travel({
        x: Math.round(rx * c + rz * s + 16),
        z: Math.round(-rx * s + rz * c + 16),
      });
    });
  }
  project(x, z, height = 0) {
    x -= 16;
    z -= 16;
    const c = Math.cos(this.angle),
      s = Math.sin(this.angle),
      rx = x * c - z * s,
      rz = x * s + z * c;
    return [
      this.w / 2 + (rx - rz) * this.tile,
      this.h * 0.48 + (rx + rz) * this.tile * 0.5 - height * this.tile,
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
        [x - 0.5, z - 0.5],
        [x + 0.5, z - 0.5],
        [x + 0.5, z + 0.5],
        [x - 0.5, z + 0.5],
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
  draw(state, selected, angle = 0) {
    this.state = state;
    this.angle = angle;
    this.w = this.container.clientWidth;
    this.h = this.container.clientHeight;
    this.tile = Math.min(18, this.w / 69, this.h / 43);
    const dpr = Math.min(devicePixelRatio, 2);
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.canvas.style.width = this.w + "px";
    this.canvas.style.height = this.h + "px";
    const c = this.ctx;
    c.scale(dpr, dpr);
    const bg = c.createRadialGradient(
      this.w / 2,
      this.h / 2,
      10,
      this.w / 2,
      this.h / 2,
      this.w * 0.7,
    );
    bg.addColorStop(0, "#668477");
    bg.addColorStop(1, "#213d3e");
    c.fillStyle = bg;
    c.fillRect(0, 0, this.w, this.h);
    this.targets = [];
    for (let x = 0; x < 32; x++)
      for (let z = 0; z < 32; z++)
        this.tileAt(
          x,
          z,
          x >= 15 && x <= 17
            ? z % 3
              ? "#6faeae"
              : "#76b7b5"
            : ["#768959", "#7b8e60", "#728651", "#839263"][
                (x * 13 + z * 7) % 4
              ],
        );
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
    objects.sort(
      (a, b) => this.project(a.x, a.z)[1] - this.project(b.x, b.z)[1],
    );
    for (const o of objects) {
      const [x, y] = this.project(o.x, o.z),
        t = this.tile;
      add(o.id, o.x, o.z);
      if (o.kind === "wood") {
        c.fillStyle = "#665a3f";
        c.fillRect(x - t * 0.1, y - t * 0.8, t * 0.2, t * 0.9);
        this.poly(
          [
            [x, y - t * 2.8],
            [x - t * 0.8, y - t * 0.5],
            [x + t * 0.8, y - t * 0.5],
          ],
          "#345f48",
        );
        this.poly(
          [
            [x, y - t * 2.8],
            [x, y - t * 0.5],
            [x + t * 0.8, y - t * 0.5],
          ],
          "#477552",
        );
      } else if (o.kind === "house") {
        this.poly(
          [
            [x - t, y - t * 0.1],
            [x, y + t * 0.4],
            [x + t, y - t * 0.1],
            [x + t, y - t * 1.3],
            [x, y - t * 0.8],
            [x - t, y - t * 1.3],
          ],
          "#cfc49b",
        );
        this.poly(
          [
            [x, y + t * 0.4],
            [x + t, y - t * 0.1],
            [x + t, y - t * 1.3],
            [x, y - t * 0.8],
          ],
          "#adac8b",
        );
        this.poly(
          [
            [x - t * 1.2, y - t * 1.3],
            [x, y - t * 2.2],
            [x + t * 1.2, y - t * 1.3],
            [x, y - t * 0.7],
          ],
          o.id === "east" ? "#657d78" : "#9f7352",
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
      c.fillStyle = id === state.you ? "#f5d180" : "#97c4cf";
      c.beginPath();
      c.arc(
        x,
        y - this.tile * 0.4,
        Math.max(3, this.tile * 0.3),
        0,
        Math.PI * 2,
      );
      c.fill();
      c.strokeStyle = "#203c35";
      c.lineWidth = 2;
      c.stroke();
      if (id === state.you) this.label("Bạn", x, y - this.tile * 1.5);
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
        (!["gate", "farm", "depot"].includes(t.id) || t.id === selected)
      )
        this.label(t.label, t.px, t.py + this.tile * 1.6);
    c.font = "12px system-ui";
    c.textAlign = "center";
    c.fillStyle = "#d7e2ca";
    c.fillText("CHẾ ĐỘ TƯƠNG THÍCH · BẢN ĐỒ ĐẲNG CỰ", this.w / 2, this.h - 114);
  }
}
