import { CommandJournal } from "/command-journal.js";
const journal = new CommandJournal({
  get length() {
    return localStorage.length;
  },
  key: (i) => localStorage.key(i),
  getItem: (k) => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
  removeItem: (k) => localStorage.removeItem(k),
});
let recovering = false;
import { Motion } from "/motion.js";
const motion = new Motion();
let sendingMove = false,
  nextMoveAt = 0;
const held = new Map();
import {
  BUILDINGS,
  placementProblem,
  housingCapacity,
  walkable as mapWalkable,
} from "/world-rules.js";
import { Map2D } from "/map2d.js";
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
    renderSync();
  }
}
function pendingCommands() {
  if (!state) return [];
  return journal.entries(state.you);
}
function renderSync() {
  try {
    const count = pendingCommands().length;
    $("sync-panel").hidden = !count || (busy && !recovering);
    $("sync-message").textContent = recovering
      ? "Đang xác nhận thao tác trước đó…"
      : `Còn ${count} thao tác đang chờ xác nhận. Game sẽ tự nối lại khi có mạng.`;
    $("sync-retry").disabled = busy || recovering;
    if (count) $("save").textContent = "Đang chờ xác nhận";
  } catch {
    $("sync-panel").hidden = false;
    $("sync-message").textContent =
      "Không đọc được bản ghi đồng bộ trên trình duyệt. Hãy cho phép lưu dữ liệu trang rồi thử lại.";
  }
}
function hasPending() {
  try {
    return pendingCommands().length > 0;
  } catch {
    return true;
  }
}
const sendEntry = (entry) =>
  journal.send(entry, (body) => api("/api/command", { method: "POST", body }));
async function recoverCommands() {
  if (busy || recovering || !state) return;
  recovering = true;
  path = [];
  held.clear();
  renderSync();
  try {
    for (const entry of pendingCommands()) {
      if (entry.player !== state.you) break;
      const result = await sendEntry(entry);
      if (result.data.state) accept(result.data.state);
      if (!result.settled) break;
      toast(
        result.ok
          ? "Đã xác nhận thao tác và khôi phục tiến độ."
          : result.data.error,
      );
    }
  } catch {
    online = false;
  } finally {
    recovering = false;
    renderSync();
  }
}
$("sync-retry").onclick = () => poll();
async function command(cmd) {
  if (
    busy ||
    recovering ||
    !state ||
    (cmd.type !== "move" && motion.pending.length)
  )
    return false;
  if (hasPending()) {
    toast("Đang xác nhận thao tác trước đó. Vui lòng chờ đồng bộ.");
    return false;
  }
  busy = true;
  try {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    // Write before sending: reload or lost ACK must reuse the same receipt ID.
    const entry = journal.prepare(state.you, cmd, id);
    renderSync();
    let result;
    try {
      result = await sendEntry(entry);
    } catch {
      result = await sendEntry(entry);
    }
    if (result.data.state) accept(result.data.state);
    if (!result.settled) {
      toast("Chưa xác nhận được thao tác. Game sẽ tự thử lại.");
      return false;
    }
    toast(result.ok ? result.data.message : result.data.error);
    return result.ok;
  } catch {
    online = false;
    $("connection").textContent = "Chờ kết nối";
    toast(
      "Chưa hoàn tất đồng bộ. Kiểm tra kết nối và quyền lưu dữ liệu trang; thao tác chưa xác nhận sẽ được khôi phục khi kết nối lại.",
    );
    return false;
  } finally {
    busy = false;
    renderSync();
  }
}
async function poll() {
  if (polling || busy || recovering) return;
  polling = true;
  try {
    const r = await api("/api/state");
    if (r.ok) {
      accept(r.data);
      if (hasPending()) await recoverCommands();
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
  if ($("construction").open) {
    const t =
      P[id] ||
      state?.resources.find((r) => r.id === id) ||
      state?.buildings?.find((b) => b.id === id);
    if (t) {
      choosePlot(t);
      return;
    }
  }
  selected = id;
  const select = $("places");
  if (![...select.options].some((o) => o.value === id)) {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = state?.buildings?.find((b) => b.id === id)
      ? BUILDINGS[state.buildings.find((b) => b.id === id).kind].name
      : state?.resources.find((r) => r.id === id)?.type === "wood"
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
  return (
    P[selected] ||
    state?.resources.find((r) => r.id === selected) ||
    state?.buildings?.find((b) => b.id === selected)
  );
}
function canWalk(x, z) {
  return mapWalkable(state, x, z);
}

function travel(destination) {
  if (!state || !online || recovering || (!busy && hasPending())) return;
  path = [];
  const p = motion.target(state.you, state.players[state.you], state.you),
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
async function sendMoves() {
  if (
    sendingMove ||
    busy ||
    !online ||
    !motion.pending.length ||
    performance.now() < nextMoveAt
  )
    return;
  sendingMove = true;
  const next = motion.pending[0];
  const ok = await command({ type: "move", ...next });
  motion.acknowledge(ok);
  if (!ok) {
    path = [];
    held.clear();
  }
  // Space requests after acknowledgement so server-side rate validation remains valid.
  nextMoveAt = performance.now() + 165;
  sendingMove = false;
}
function move(dx, dz) {
  if (!state || !online || recovering || (!busy && hasPending())) return;
  path = [];
  const p = motion.target(state.you, state.players[state.you], state.you);
  if (motion.enqueue(state, p.x + dx, p.z + dz, mapWalkable)) sendMoves();
}
const directions = {
  w: [0, -1],
  a: [-1, 0],
  s: [0, 1],
  d: [1, 0],
  ArrowUp: [0, -1],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowRight: [1, 0],
};
function inputBlocked() {
  return (
    ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName) ||
    $("help-dialog").open ||
    $("welcome").open ||
    document.hidden
  );
}
let lastStep = 0;
window.addEventListener("keydown", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (!directions[key] || inputBlocked()) return;
  e.preventDefault();
  if (!held.has(key)) {
    held.set(key, directions[key]);
    move(...directions[key]);
    lastStep = performance.now();
  }
});
window.addEventListener("keyup", (e) =>
  held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
);
window.addEventListener("blur", () => {
  held.clear();
  path = [];
});
for (const b of document.querySelectorAll("[data-move]")) {
  b.style.touchAction = "none";
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    const d = b.dataset.move.split(",").map(Number);
    held.set("pointer", d);
    move(...d);
    lastStep = performance.now();
  };
  b.onpointerup =
    b.onpointercancel =
    b.onlostpointercapture =
      () => held.delete("pointer");
}
pathTimer = setInterval(() => {
  if (
    !state ||
    !online ||
    recovering ||
    (!busy && hasPending()) ||
    inputBlocked()
  ) {
    held.clear();
    return;
  }
  const now = performance.now();
  if (now - lastStep >= 180) {
    if (held.size) {
      move(...[...held.values()].at(-1));
      lastStep = now;
    } else if (path.length && motion.pending.length < 4) {
      const [x, z] = path[0];
      if (motion.enqueue(state, x, z, mapWalkable)) path.shift();
      else path = [];
      lastStep = now;
    }
  }
  sendMoves();
}, 16);
function plot() {
  return { x: Number($("build-x").value), z: Number($("build-z").value) };
}
function choosePlot(t) {
  $("build-x").value = t.x;
  $("build-z").value = t.z;
  renderConstruction();
  renderWorld();
}
function mapTravel(t) {
  if ($("construction").open) choosePlot(t);
  else travel(t);
}
function plotPreview() {
  if (!state || !$("construction").open) return null;
  const t = plot();
  return {
    ...t,
    valid: !placementProblem(state, state.you, $("build-kind").value, t.x, t.z),
  };
}
function renderConstruction() {
  if (!state) return;
  const p = state.players[state.you],
    kind = $("build-kind").value,
    definition = BUILDINGS[kind],
    t = plot();
  const problem = placementProblem(state, state.you, kind, t.x, t.z);
  const afford =
    p.bag.wood >= definition.wood && p.bag.stone >= definition.stone;
  $("build-benefit").textContent =
    kind === "house"
      ? "Thêm 2 chỗ ở cho làng trong bán kính 6 ô. Dân chỉ chuyển đến khi có thức ăn và đường đi."
      : "Cất tối đa 80 đơn vị. Chỉ chủ kho được cất và lấy hàng.";
  $("build-feedback").textContent =
    problem ||
    (!afford
      ? `Cần ${definition.wood} gỗ và ${definition.stone} đá trong túi.`
      : "Ô đất hợp lệ. Sẵn sàng xây.");
  $("build-feedback").classList.toggle("valid", !problem && afford);
  $("build-confirm").disabled = !!problem || !afford;
  $("build-confirm").textContent =
    `Xây · ${definition.wood} gỗ + ${definition.stone} đá`;
}
$("construction").ontoggle = () => {
  path = [];
  renderConstruction();
  renderWorld();
};
for (const id of ["build-x", "build-z", "build-kind"])
  $(id).addEventListener("input", () => {
    renderConstruction();
    renderWorld();
  });
$("build-travel").onclick = () => travel(plot());
$("build-confirm").onclick = async () => {
  const t = plot();
  if (await command({ type: "build", kind: $("build-kind").value, ...t })) {
    $("construction").open = false;
    const b = state.buildings.find((b) => b.x === t.x && b.z === t.z);
    if (b) select(b.id);
  }
};
for (const [id, direction] of [
  ["deposit", "deposit"],
  ["withdraw", "withdraw"],
])
  $(id).onclick = () =>
    command({
      type: "storage",
      target: selected,
      resource: $("storage-resource").value,
      amount: Number($("storage-amount").value),
      direction,
    });
let actionSpecs = [];
function action(label, cmd, disabled = false) {
  actionSpecs.push({ label, cmd, disabled });
}
function commitActions() {
  const signature = JSON.stringify(actionSpecs);
  if ($("actions").dataset.signature === signature) return;
  $("actions").dataset.signature = signature;
  $("actions").replaceChildren();
  for (const { label, cmd, disabled } of actionSpecs) {
    const b = document.createElement("button");
    b.textContent = label;
    b.disabled = disabled;
    b.onclick = () => command(cmd);
    $("actions").append(b);
  }
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
  $("save").textContent = "Tiến độ đã được lưu";
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
    const capacity = housingCapacity(state, v.id);
    title.textContent = `${v.name} · ${population} dân${capacity !== null ? ` / ${capacity} chỗ` : ""}`;
    const food = document.createElement("strong");
    food.className = v.food < population ? "warning" : "";
    food.textContent = `${v.food} khẩu phần`;
    row.append(title, food);
    $("villages").append(row);
  }
  const r = state.resources.find((r) => r.id === selected);
  const building = state.buildings?.find((b) => b.id === selected);
  const [title, description] = (building
    ? [
        BUILDINGS[building.kind].name,
        `Ô ${building.x}, ${building.z}. ${building.kind === "house" ? "Thêm 2 chỗ ở cho " + state.villages.find((v) => v.id === building.village).name : building.owner === state.you ? "Kho của bạn · sức chứa 80 đơn vị." : "Kho thuộc người chơi khác."}`,
      ]
    : copy[selected]) || [
    r?.type === "wood" ? "Rừng cây" : "Mỏ đá",
    `Còn ${r?.remaining ?? 0} đơn vị. Mỗi lần thu thập lấy một đơn vị, túi tối đa 40.`,
  ];
  $("selection-title").textContent = title;
  $("selection-description").textContent = description;
  actionSpecs = [];
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
  $("storage-panel").hidden = !(
    building?.kind === "storehouse" && building.owner === state.you
  );
  if (building?.kind === "storehouse")
    $("storage-stock").textContent =
      `Trong kho: ${building.stock.wood} gỗ · ${building.stock.stone} đá · ${building.stock.food} thức ăn`;
  for (const b of state.buildings || [])
    if (![...$("places").options].some((o) => o.value === b.id)) {
      const o = document.createElement("option");
      o.value = b.id;
      o.textContent = `${BUILDINGS[b.kind].name} · ${b.x},${b.z}`;
      $("places").append(o);
    }
  renderConstruction();
  commitActions();
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
// The renderer reads snapshots; camera and animation never mutate saved gameplay.
const container = $("world");
const worldMap = new Map2D(container, select, mapTravel);
function renderWorld(dt = 0) {
  const visual = state ? { ...state, players: motion.frame(state, dt).players } : null;
  worldMap.draw(visual, selected, 0, plotPreview());
  const level = $("zoom-level");
  const zoomText = `${Math.round(worldMap.zoom * 100)}%`;
  if (level && level.textContent !== zoomText) level.textContent = zoomText;
}
function cameraAction(id, action) {
  const button = $(id);
  if (button) button.addEventListener("click", () => {
    action();
    renderWorld();
  });
}
cameraAction("zoom-in", () => worldMap.zoomBy(1.25));
cameraAction("zoom-out", () => worldMap.zoomBy(1 / 1.25));
cameraAction("view-reset", () => worldMap.resetView());
cameraAction("view-player", () => {
  const player = state?.players[state.you];
  if (player) worldMap.focus(player.x, player.z);
  else toast("Bước vào thung lũng để tìm nhân vật của bạn.");
});
cameraAction("toggle-labels", () => {
  const visible = worldMap.toggleLabels();
  $("toggle-labels").setAttribute("aria-pressed", String(visible));
});
new ResizeObserver(() => renderWorld()).observe(container);
let lastFrame = performance.now();
function animate(now) {
  if (!document.hidden && now - lastFrame >= 1000 / 30) {
    const dt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    renderWorld(dt);
  }
  requestAnimationFrame(animate);
}
renderWorld();
requestAnimationFrame(animate);
window.addEventListener("online", poll);
document.addEventListener("visibilitychange", () => {
  lastFrame = performance.now();
  if (!document.hidden) poll();
  else {
    path = [];
    held.clear();
  }
});
await poll();
setInterval(() => {
  if (!document.hidden) poll();
}, 2000);
