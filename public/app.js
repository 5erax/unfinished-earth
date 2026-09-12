import * as THREE from "/three.js";
const $ = (id) => document.getElementById(id);
const P = {
  home: { x: 7, z: 22 },
  bridge: { x: 16, z: 17 },
  gate: { x: 14, z: 10 },
  farm: { x: 10, z: 12 },
  west: { x: 6, z: 8 },
  east: { x: 24, z: 12 },
  ruin: { x: 25, z: 25 },
  depot: { x: 11, z: 19 },
};
const copy = {
  home: [
    "Nơi trú ẩn",
    "Nhà của bạn được bảo hộ. Hãy tìm gỗ và đá gần đây để sửa cầu.",
  ],
  bridge: [
    "Cầu đá cũ",
    "Tuyến duy nhất nối hai bờ. Sửa bằng 8 gỗ + 4 đá để người và xe có thể qua sông.",
  ],
  gate: [
    "Cống tưới",
    "Mở lần đầu cần 4 gỗ + 2 đá. Nước tưới giúp ruộng xanh nhưng làm giảm đàn cá hạ lưu.",
  ],
  farm: [
    "Ruộng chung",
    "Độ ẩm quyết định tốc độ sinh trưởng. Thu hoạch sẽ đưa thức ăn vào kho chung.",
  ],
  west: [
    "Làng Thượng",
    "Cộng đồng ở thượng nguồn. NPC chọn nghề và nơi sống dựa trên thức ăn, nước và đường đi.",
  ],
  east: [
    "Làng Hạ",
    "Cầu gãy làm đứt tuyến xe. Bạn có thể tự mang thức ăn từ kho hoặc sửa cầu cho xe kéo.",
  ],
  ruin: [
    "Tàn tích đài đo nước",
    "Một dấu tích của thế giới cũ. Đến gần để khám phá tri thức về dòng sông.",
  ],
  depot: [
    "Kho và xe kéo",
    "Kho chung cấp thức ăn cho xe và người chơi. Xe giao 8 khẩu phần sau hai ngày game nếu cầu thông.",
  ],
};
let state = null,
  selected = "home",
  busy = false,
  path = [],
  pathTimer = null,
  toastTimer,
  angle = 0,
  polling = false,
  online = false;
function toast(message) {
  if (!message) return;
  $("toast").textContent = message;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 4000);
}
async function api(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    return { ok: r.ok, status: r.status, data: await r.json() };
  } finally {
    clearTimeout(timer);
  }
}
function accept(next) {
  if (!state || next.revision >= state.revision) {
    state = next;
    online = true;
    renderUI();
    renderWorld();
  }
}
async function command(cmd) {
  if (busy || !state) return false;
  busy = true;
  const body = JSON.stringify({ ...cmd, id: crypto.randomUUID() });
  try {
    let result;
    try {
      result = await api("/api/command", { method: "POST", body });
    } catch {
      result = await api("/api/command", { method: "POST", body });
    }
    if (result.data.state) accept(result.data.state);
    if (!result.ok) {
      toast(result.data.error);
      return false;
    }
    toast(result.data.message);
    return true;
  } catch {
    online = false;
    $("connection").textContent = "Mất kết nối";
    toast(
      "Chưa nhận xác nhận. Đang kết nối lại; đừng lặp thao tác cho đến khi trạng thái được cập nhật.",
    );
    return false;
  } finally {
    busy = false;
  }
}
async function poll() {
  if (polling || busy) return;
  polling = true;
  try {
    const r = await api("/api/state");
    if (r.ok) {
      accept(r.data);
      if ($("welcome").open) $("welcome").close();
    } else if (r.status === 401) {
      online = false;
      state = null;
      $("code-label").hidden = !r.data.locked;
      if (!$("welcome").open) $("welcome").showModal();
    } else {
      online = false;
      $("connection").textContent = "Chưa kết nối";
      toast(r.data.error);
    }
  } catch {
    online = false;
    $("connection").textContent = "Mất kết nối";
    $("save").textContent = "Đang chờ máy chủ…";
  } finally {
    polling = false;
  }
}
$("join-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const b = e.submitter;
  b.disabled = true;
  try {
    const r = await api("/api/join", {
      method: "POST",
      body: JSON.stringify({ code: $("access-code").value }),
    });
    if (r.ok) {
      accept(r.data);
      $("welcome").close();
    } else $("join-error").textContent = r.data.error;
  } catch {
    $("join-error").textContent = "Không kết nối được máy chủ. Hãy thử lại.";
  } finally {
    b.disabled = false;
  }
});
$("welcome").addEventListener("cancel", (e) => e.preventDefault());
$("help").onclick = () => $("help-dialog").showModal();
$("close-help").onclick = () => $("help-dialog").close();
$("chronicle-toggle").onclick = () => {
  const hidden = ($("events").hidden = !$("events").hidden);
  $("chronicle-toggle").setAttribute("aria-expanded", String(!hidden));
};
function select(id) {
  selected = id;
  const select = $("places");
  if (![...select.options].some((o) => o.value === id)) {
    const o = document.createElement("option");
    o.value = id;
    o.textContent =
      state?.resources.find((r) => r.id === id)?.type === "wood"
        ? "Rừng cây"
        : "Mỏ đá";
    select.append(o);
  }
  select.value = id;
  renderUI();
  renderWorld();
}
$("places").onchange = (e) => select(e.target.value);
function target() {
  return P[selected] || state?.resources.find((r) => r.id === selected);
}
function canWalk(x, z) {
  return (
    x >= 1 &&
    x < 31 &&
    z >= 1 &&
    z < 31 &&
    (x < 15 || x > 17 || (state.bridge && z === 17))
  );
}
function travel(destination) {
  if (!state || !online) return;
  path = [];
  const p = state.players[state.you],
    queue = [[p.x, p.z]],
    prev = new Map([[`${p.x},${p.z}`, null]]);
  let found;
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i];
    if (Math.hypot(x - destination.x, z - destination.z) <= 2) {
      found = [x, z];
      break;
    }
    for (const [dx, dz] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        key = `${nx},${nz}`;
      if (canWalk(nx, nz) && !prev.has(key)) {
        prev.set(key, [x, z]);
        queue.push([nx, nz]);
      }
    }
  }
  if (!found) {
    toast("Không có đường đến đây. Cần sửa cầu trước.");
    return;
  }
  let cursor = found;
  while (prev.get(cursor.join(","))) {
    path.unshift(cursor);
    cursor = prev.get(cursor.join(","));
  }
  if (!path.length) toast("Bạn đã ở gần địa điểm.");
}
$("travel").onclick = () => {
  const t = target();
  if (t) travel(selected === "bridge" ? { x: 14, z: 17 } : t);
};
pathTimer = setInterval(async () => {
  if (path.length && !busy && online && !$("help-dialog").open) {
    const [x, z] = path.shift();
    if (!(await command({ type: "move", x, z }))) path = [];
  }
}, 210);
async function move(dx, dz) {
  if (!state || busy || !online) return;
  path = [];
  const p = state.players[state.you];
  await command({ type: "move", x: p.x + dx, z: p.z + dz });
}
window.addEventListener("keydown", (e) => {
  if (
    ["INPUT", "SELECT", "BUTTON", "TEXTAREA"].includes(
      document.activeElement?.tagName,
    ) ||
    $("help-dialog").open ||
    $("welcome").open
  )
    return;
  const m = {
    w: [0, -1],
    a: [-1, 0],
    s: [0, 1],
    d: [1, 0],
    ArrowUp: [0, -1],
    ArrowLeft: [-1, 0],
    ArrowDown: [0, 1],
    ArrowRight: [1, 0],
  }[e.key];
  if (m) {
    e.preventDefault();
    move(...m);
  }
});
for (const b of document.querySelectorAll("[data-move]"))
  b.onclick = () => move(...b.dataset.move.split(",").map(Number));
function action(label, cmd, disabled = false) {
  const b = document.createElement("button");
  b.textContent = label;
  b.disabled = disabled;
  b.onclick = () => command(cmd);
  $("actions").append(b);
}
function renderUI() {
  if (!state) return;
  const p = state.players[state.you];
  if (!p) return;
  $("clock").textContent =
    `Ngày ${state.day} · ${state.weather} · ×${state.speed}`;
  $("connection").textContent = `${state.online} người kết nối`;
  $("coordinates").textContent = `${p.x * 16} / ${p.z * 16} m`;
  for (const kind of ["wood", "stone", "food"])
    $(kind).textContent = p.bag[kind];
  $("save").textContent = `Đã lưu · phiên bản ${state.revision}`;
  $("credit").textContent =
    `Tín dụng offline: ${Math.floor(state.creditMs / 60000)} / 480 phút`;
  const complete = [
    state.bridge || (p.bag.wood >= 8 && p.bag.stone >= 4),
    state.bridge,
    state.deliveries > 0 ||
      state.events.some((e) => e.kind === "food" && e.place === "east"),
  ];
  [...$("objectives").children].forEach((li, i) =>
    li.classList.toggle("done", complete[i]),
  );
  $("villages").replaceChildren();
  for (const v of state.villages) {
    const population = state.npcs.filter((n) => n.village === v.id).length;
    const row = document.createElement("div");
    row.className = "village";
    const title = document.createElement("span");
    title.textContent = `${v.name} · ${population} dân`;
    const food = document.createElement("strong");
    food.className = v.food < population ? "warning" : "";
    food.textContent = `${v.food} khẩu phần`;
    row.append(title, food);
    $("villages").append(row);
  }
  const r = state.resources.find((r) => r.id === selected);
  const [title, description] = copy[selected] || [
    r?.type === "wood" ? "Rừng cây" : "Mỏ đá",
    `Còn ${r?.remaining ?? 0} đơn vị. Mỗi lần thu thập lấy một đơn vị, túi tối đa 40.`,
  ];
  $("selection-title").textContent = title;
  $("selection-description").textContent = description;
  $("actions").replaceChildren();
  if (r)
    action(
      `Thu thập ${r.type === "wood" ? "gỗ" : "đá"} · còn ${r.remaining}`,
      { type: "gather", target: r.id },
      r.remaining === 0,
    );
  if (selected === "bridge")
    action(
      state.bridge ? "Cầu đã thông" : "Sửa cầu · 8 gỗ + 4 đá",
      { type: "bridge" },
      state.bridge,
    );
  if (selected === "gate")
    action(
      state.gate
        ? "Đóng cống tưới"
        : state.gateCause
          ? "Mở cống tưới"
          : "Lắp và mở · 4 gỗ + 2 đá",
      { type: "gate", open: !state.gate },
    );
  if (selected === "farm")
    action(
      `Thu hoạch · cây ${Math.floor(state.crop * 100)}%`,
      { type: "harvest" },
      state.crop < 1,
    );
  if (selected === "depot") {
    action(
      `Lấy thức ăn · kho còn ${state.depot}`,
      { type: "supply" },
      state.depot === 0,
    );
    $("selection-description").textContent +=
      ` Xe: ${{ blocked: "bị chặn bởi cầu gãy", resting: "hết tín dụng offline", transit: "đang vận chuyển", ready: "sẵn sàng", empty: "chờ bổ sung kho" }[state.cart.status]}; chở ${state.cart.cargo} khẩu phần.`;
  }
  if (selected === "east" || selected === "west") {
    action(
      `Giao ${p.bag.food} khẩu phần`,
      { type: "donate", target: selected },
      !p.bag.food,
    );
    const people = state.npcs.filter((n) => n.village === selected);
    $("selection-description").textContent += ` ${people
      .slice(0, 4)
      .map((n) => `${n.name}: ${n.job}`)
      .join(" · ")}.`;
  }
  if (selected === "ruin")
    action(
      p.discoveries.includes("ruin")
        ? "Đã ghi nhận tri thức"
        : "Khám phá dấu tích",
      { type: "explore" },
      p.discoveries.includes("ruin"),
    );
  $("moisture").value = state.moisture;
  $("fish").value = state.fish;
  $("moisture-value").textContent = `${Math.round(state.moisture * 100)}%`;
  $("fish-value").textContent = `${Math.round(state.fish)} / 100`;
  $("ecology-note").textContent = state.gate
    ? "Cống đang mở: ruộng nhận nước, đàn cá có thể giảm."
    : "Cống đang đóng: dòng hạ lưu được phục hồi.";
  $("event-count").textContent = `${state.eventSeq} sự kiện`;
  const ids = state.events.map((e) => e.id).join(",");
  if ($("events").dataset.ids !== ids) {
    $("events").dataset.ids = ids;
    $("events").replaceChildren();
    for (const e of [...state.events].reverse().slice(0, 15)) {
      const article = document.createElement("article"),
        small = document.createElement("small"),
        text = document.createElement("p");
      small.textContent = `NGÀY ${e.day} · #${e.id}`;
      text.textContent = e.text;
      article.append(small, text);
      for (const id of e.causes) {
        const b = document.createElement("button");
        b.textContent = `Nguyên nhân #${id}`;
        b.onclick = async () => {
          try {
            const r = await api(`/api/event?id=${id}`);
            toast(r.ok ? r.data.text : r.data.error);
          } catch {
            toast("Chưa tải được nguyên nhân.");
          }
        };
        article.append(b);
      }
      $("events").append(article);
    }
  }
}
// Low-poly orthographic greybox: all geometry represents interactive simulation objects.
const container = $("world"),
  scene = new THREE.Scene();
scene.background = new THREE.Color("#41635e");
scene.fog = new THREE.Fog("#41635e", 65, 135);
const camera = new THREE.OrthographicCamera(-24, 24, 24, -24, 0.1, 200);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.append(renderer.domElement);
} catch {
  container.textContent =
    "Thiết bị chưa hỗ trợ WebGL. Bạn vẫn có thể chọn địa điểm và chơi bằng bảng điều khiển.";
}
scene.add(new THREE.HemisphereLight(0xdff4df, 0x354c44, 2.5));
const sun = new THREE.DirectionalLight(0xffe1a9, 3.4);
sun.position.set(-18, 40, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -28,
  right: 28,
  top: 28,
  bottom: -28,
  far: 100,
});
sun.shadow.bias = -0.001;
scene.add(sun);
const materials = new Map();
function mat(color) {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 1,
        flatShading: true,
      }),
    );
  return materials.get(color);
}
function box(w, h, d, color, x, y, z, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cone(r, h, color, x, y, z, parent = scene, segments = 5) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const terrain = new THREE.Group();
scene.add(terrain);
box(34, 1.2, 34, "#6d8254", 16, -0.9, 16, terrain);
box(3, 0.17, 34, "#66acb1", 16, -0.13, 16, terrain);
box(3.4, 0.13, 34, "#477c79", 16, -0.28, 16, terrain);
for (let x = 1; x < 32; x++)
  for (let z = 1; z < 32; z++) {
    if (x >= 15 && x <= 17) continue;
    const color = ["#748b57", "#788d58", "#6d8452", "#7d925c"][
      (x * 13 + z * 7) % 4
    ];
    box(1, 0.08, 1, color, x, -0.26, z, terrain);
  }
// Paths connect real homes, farm, depot and bridge approaches.
for (let z = 8; z <= 22; z++)
  box(0.65, 0.04, 1, "#b6ac78", 7, -0.19, z, terrain);
for (let x = 7; x <= 25; x++) {
  if (x >= 15 && x <= 17) continue;
  box(1, 0.04, 0.65, "#b6ac78", x, -0.19, 17, terrain);
}
for (let z = 12; z <= 17; z++)
  box(0.65, 0.04, 1, "#b6ac78", 24, -0.19, z, terrain);
const clickables = [],
  fixed = new THREE.Group(),
  dynamic = new THREE.Group();
scene.add(fixed, dynamic);
function mark(group, id) {
  group.userData.target = id;
  group.traverse((o) => {
    if (o.isMesh) {
      o.userData.target = id;
      clickables.push(o);
    }
  });
}
function house(x, z, color, id, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  box(1.7, 1.25, 1.45, "#e1d1a4", 0, 0.48, 0, g);
  const roof = cone(1.6, 1.1, color, 0, 1.58, 0, g, 4);
  roof.rotation.y = Math.PI / 4;
  box(0.35, 0.7, 0.04, "#4c5545", 0, 0.2, 0.75, g);
  box(0.3, 0.3, 0.05, "#efc57a", -0.5, 0.7, 0.75, g);
  box(0.23, 1, 0.3, "#afab91", 0.5, 1.5, -0.3, g);
  fixed.add(g);
  mark(g, id);
}
house(7, 22, "#7a614b", "home", 1.2);
for (const [cx, cz, id] of [
  [6, 8, "west"],
  [24, 12, "east"],
])
  for (const [dx, dz] of [
    [-1.6, -1.5],
    [1.5, -1],
    [0, 1.5],
  ])
    house(cx + dx, cz + dz, id === "west" ? "#925d42" : "#586e70", id, 0.85);
house(11, 19, "#6b6550", "depot", 0.9);
const ruin = new THREE.Group();
ruin.position.set(25, 0, 25);
for (const [x, z, h] of [
  [-1, -1, 2.5],
  [1, -1, 1.6],
  [-1, 1, 1.2],
  [1, 1, 2],
])
  box(0.65, h, 0.65, "#a3aaa0", x, h / 2, z, ruin);
box(2.7, 0.25, 0.8, "#b0b5a2", 0, 2.35, -1, ruin);
fixed.add(ruin);
mark(ruin, "ruin");
const farm = new THREE.Group();
farm.position.set(10, 0, 12);
box(3.3, 0.08, 3, "#776645", 0, -0.1, 0, farm);
for (let i = 0; i < 5; i++)
  box(0.18, 0.12, 2.8, "#b3a169", -1.2 + i * 0.6, 0, 0, farm);
fixed.add(farm);
mark(farm, "farm");
const gate = new THREE.Group();
gate.position.set(14, 0, 10);
box(0.4, 1.4, 1.8, "#ada88a", 0, 0.4, 0, gate);
box(0.2, 1.6, 0.2, "#755c42", -0.25, 0.8, 0.8, gate);
box(0.2, 1.6, 0.2, "#755c42", -0.25, 0.8, -0.8, gate);
fixed.add(gate);
mark(gate, "gate");
const bridgeGroup = new THREE.Group();
scene.add(bridgeGroup);
for (const x of [14, 18]) {
  box(0.7, 1, 0.8, "#a2a590", x, 0.05, 16.5, bridgeGroup);
  box(0.7, 1, 0.8, "#a2a590", x, 0.05, 17.5, bridgeGroup);
}
mark(bridgeGroup, "bridge");
const deck = box(4.3, 0.22, 1.1, "#c1aa79", 16, 0.08, 17, bridgeGroup);
deck.userData.target = "bridge";
clickables.push(deck);
deck.visible = false;
const crops = new THREE.Group();
scene.add(crops);
for (let i = 0; i < 20; i++) {
  const m = cone(
    0.16,
    0.5,
    "#cad47a",
    8.8 + (i % 5) * 0.6,
    0.18,
    10.9 + Math.floor(i / 5) * 0.65,
    crops,
    4,
  );
  m.userData.target = "farm";
  clickables.push(m);
}
const waterChannel = box(3, 0.03, 0.45, "#70b1b2", 12, -0.11, 10.7);
waterChannel.visible = false;
const resourceMeshes = new Map(),
  playerMeshes = new Map(),
  npcMeshes = new Map();
function person(color) {
  const g = new THREE.Group();
  cone(0.23, 0.65, color, 0, 0.45, 0, g, 5);
  box(0.28, 0.3, 0.28, "#deb788", 0, 0.94, 0, g);
  cone(0.28, 0.2, "#e2cc91", 0, 1.18, 0, g, 6);
  box(0.13, 0.35, 0.14, "#394d49", -0.1, 0.07, 0, g);
  box(0.13, 0.35, 0.14, "#394d49", 0.1, 0.07, 0, g);
  scene.add(g);
  return g;
}
const cursor = new THREE.Mesh(
  new THREE.RingGeometry(0.6, 0.72, 40),
  new THREE.MeshBasicMaterial({ color: "#f9da87", side: THREE.DoubleSide }),
);
cursor.rotation.x = -Math.PI / 2;
cursor.position.y = 0.05;
scene.add(cursor);
const cart = new THREE.Group();
box(0.75, 0.4, 1, "#a58b56", 0, 0.45, 0, cart);
for (const x of [-0.5, 0.5]) {
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.13, 8),
    mat("#394139"),
  );
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, 0.25, 0);
  cart.add(wheel);
}
scene.add(cart);
function renderWorld() {
  if (!state) return;
  deck.visible = state.bridge;
  waterChannel.visible = state.gate;
  crops.scale.y = 0.15 + state.crop;
  for (const r of state.resources) {
    let g = resourceMeshes.get(r.id);
    if (!g) {
      g = new THREE.Group();
      g.position.set(r.x, 0, r.z);
      if (r.type === "wood") {
        box(0.22, 1.7, 0.22, "#725b40", 0, 0.65, 0, g);
        cone(
          0.9,
          2.1,
          ["#2f6652", "#3f7750", "#4d7045"][r.x % 3],
          0,
          1.7,
          0,
          g,
        );
        cone(0.65, 1.7, "#568052", 0, 2.4, 0, g);
      } else {
        const stone = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.6, 0),
          mat("#a2aaa2"),
        );
        stone.position.y = 0.3;
        stone.scale.set(1, 0.75, 1);
        stone.castShadow = true;
        g.add(stone);
      }
      scene.add(g);
      mark(g, r.id);
      resourceMeshes.set(r.id, g);
    }
    g.visible = r.remaining > 0;
  }
  for (const [id, p] of Object.entries(state.players)) {
    let g = playerMeshes.get(id);
    if (!g) {
      g = person(id === state.you ? "#efbd66" : "#77b8c5");
      playerMeshes.set(id, g);
    }
    g.visible = true;
    g.userData.destination = new THREE.Vector3(p.x, 0, p.z);
  }
  for (const [id, g] of playerMeshes) if (!state.players[id]) g.visible = false;
  state.npcs.forEach((n, i) => {
    let g = npcMeshes.get(n.id);
    if (!g) {
      g = person(n.job === "Đánh cá" ? "#577e92" : "#b68d66");
      g.scale.setScalar(0.65);
      npcMeshes.set(n.id, g);
    }
    const v = P[n.village];
    g.position.set(
      v.x + Math.cos(i * 2.4) * (2 + (i % 3) * 0.3),
      0,
      v.z + Math.sin(i * 2.4) * (2 + (i % 3) * 0.3),
    );
  });
  const t = target();
  if (t) cursor.position.set(t.x, 0.06, t.z);
  cart.position.set(
    state.cart.cargo ? 18 : 12,
    0.1,
    state.cart.cargo ? 16.8 : 18.2,
  );
}
function positionCamera() {
  const r = 43;
  camera.position.set(
    16 + Math.sin(angle + Math.PI / 4) * r,
    38,
    16 + Math.cos(angle + Math.PI / 4) * r,
  );
  camera.lookAt(16, 0, 16);
}
function resize() {
  if (!renderer) return;
  const w = container.clientWidth,
    h = container.clientHeight;
  renderer.setSize(w, h);
  const aspect = w / h;
  const span = w < 760 ? 20 : 23;
  camera.left = -span * aspect;
  camera.right = span * aspect;
  camera.top = span;
  camera.bottom = -span;
  camera.updateProjectionMatrix();
  positionCamera();
}
$("rotate-left").onclick = () => {
  angle -= Math.PI / 2;
  positionCamera();
};
$("rotate-right").onclick = () => {
  angle += Math.PI / 2;
  positionCamera();
};
const raycaster = new THREE.Raycaster();
container.addEventListener("click", (e) => {
  if (!renderer || !state) return;
  const rect = container.getBoundingClientRect();
  raycaster.setFromCamera(
    new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    ),
    camera,
  );
  const hits = raycaster.intersectObjects(clickables).filter((hit) => {
    let o = hit.object;
    while (o) {
      if (!o.visible) return false;
      o = o.parent;
    }
    return true;
  });
  if (hits.length) {
    select(hits[0].object.userData.target);
    return;
  }
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    v = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(ground, v))
    travel({ x: Math.round(v.x), z: Math.round(v.z) });
});
new ResizeObserver(resize).observe(container);
resize();
function animate() {
  if (renderer) {
    for (const g of playerMeshes.values())
      if (g.userData.destination) g.position.lerp(g.userData.destination, 0.22);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}
animate();
window.addEventListener("online", poll);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) poll();
  else path = [];
});
await poll();
setInterval(() => {
  if (!document.hidden) poll();
}, 2000);
