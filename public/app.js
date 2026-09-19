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
motion.continuous = true;
let sendingMove = false,
  nextMoveAt = 0;
const held = new Map();
import {
  BUILDINGS,
  BAG_CAPACITY,
  ITEMS,
  CLASSES,
  cartPosition, settlementSummary, DAY_MS,
  freeSegment, findRoute, MOVE_SPEED,
  placementProblem,
  housingCapacity,
  walkable as mapWalkable,
} from "/world-rules.js";
import { Map2D } from "/map2d.js";
import { createValleyUI } from "/valley-ui.js";
import { createChronicleUI } from "/chronicle-ui.js";
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
  market: { x: 36, z: 10 },
  mistwood: { x: 8, z: 40 },
  highland: { x: 40, z: 32 },
  farreach: { x: 54, z: 48 },
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
    "Xe lấy tối đa 8 khẩu phần từ kho, đi đến làng rồi quay về lấy chuyến tiếp theo. Bạn có thể chọn làng nhận, tạm dừng hoặc bổ sung thức ăn vào kho.",
  ],
  market: [
    "Chợ Phiên cao nguyên",
    "Các làng đổi vật liệu theo lô. Giá được niêm yết rõ và mọi trao đổi diễn ra ngay trong túi của bạn.",
  ],
  mistwood: [
    "Rừng Sương",
    "Một vùng rừng ẩm phía nam. Gỗ và sợi cỏ phục hồi nhanh khi đất đủ ẩm; khai thác cạn sẽ để lại gốc non cần thời gian lớn lên.",
  ],
  highland: [
    "Cao nguyên Đỏ",
    "Vùng đất rộng cho trang trại và chăn nuôi. Đá cùng đất sét hình thành chậm hơn cây cỏ, đặc biệt trong mùa hạn.",
  ],
  farreach: [
    "Biên Viễn",
    "Vùng đất xa nhất của bản đồ 64×64. Tài nguyên thưa nhưng trữ lượng lớn, thích hợp mở khu sản xuất quy mô rộng.",
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
let valleyUI, chronicleUI;
function stopMovement() {
  held.clear();
  path = [];
  queuedAction = null;
}
function canAct() {
  return !!state && online && !busy && !recovering && !motion.pending.length && !hasPending();
}
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
    if (state?.you !== next.you) {
      motion.acknowledge(false);
      motion.points.clear();
      held.clear();
      path = [];
      queuedAction = null;
    }
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
  valleyUI?.render(state, selected);
  if (state) commitActions();
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
    (!["move", "walk", "glide"].includes(cmd.type) && motion.pending.length)
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
      stopMovement();
      motion.acknowledge(false);
      motion.points.clear();
      valleyUI?.close();
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
      body: JSON.stringify({ code: $("access-code").value, character: { name: $("character-name").value, classId: document.querySelector('[name="join-class"]:checked').value } }),
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
$("help").onclick = () => { stopMovement(); $("help-dialog").showModal(); };
$("close-help").onclick = () => $("help-dialog").close();
$("chronicle-toggle").onclick = () => {
  const hidden = ($("events").hidden = !$("events").hidden);
  $("chronicle-toggle").setAttribute("aria-expanded", String(!hidden));
  document.querySelector(".chronicle-filters").hidden = hidden;
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
  document.querySelector(".inspect").classList.add("open");
  const select = $("places");
  if (![...select.options].some((o) => o.value === id)) {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = state?.npcs?.find(n => n.id === id)?.name || (state?.buildings?.find((b) => b.id === id)
      ? BUILDINGS[state.buildings.find((b) => b.id === id).kind].name
      : ({ wood: "Rừng cây", stone: "Mỏ đá", fiber: "Bãi sợi cỏ", clay: "Bãi đất sét" }[state?.resources.find((r) => r.id === id)?.type] || "Tài nguyên"));
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
    state?.buildings?.find((b) => b.id === selected) ||
    worldMap?.targets?.find(t => t.id === selected) ||
    P[state?.npcs?.find(n => n.id === selected)?.village]
  );
}
function canWalk(x, z) {
  return mapWalkable(state, x, z);
}

function travel(destination, radius = 2) {
  if (!state || !online || recovering || (!busy && hasPending())) return;
  queuedAction = null;
  const p = motion.target(state.you, state.players[state.you], state.you);
  const route = findRoute(state,p,destination,radius);
  path = route || [];
  worldMap.destination = route?.length ? { x:route.at(-1)[0], z:route.at(-1)[1] } : null;
  if (!route) { toast("Không có đường tới điểm này. Hãy chọn đất trống hoặc kiểm tra cầu và vật cản."); return false; }
  return true;
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
  const steps = motion.pending.slice(0, 64);
  const before = state.players[state.you].moveSeq || 0,
    sent = performance.now();
  const ok = await command({ type: "glide", steps });
  const accepted = Math.max(
    0,
    Math.min(steps.length, (state.players[state.you].moveSeq || 0) - before),
  );
  motion.acknowledge(ok, accepted);
  $("latency").textContent =
    `Đồng bộ ${Math.round(performance.now() - sent)} ms`;
  if (!ok) {
    path = [];
    held.clear();
  }
  // Space requests after acknowledgement so server-side rate validation remains valid.
  nextMoveAt = sent + 180;
  sendingMove = false;
}
function move(dx, dz, dt) {
  queuedAction = null; path = [];
  worldMap.destination = null;
  const p = motion.target(state.you, state.players[state.you], state.you);
  const length = Math.hypot(dx,dz); if(!length) return;
  dx/=length; dz/=length;
  const x=dx*MOVE_SPEED*dt;
  const z=dz*MOVE_SPEED*dt;
  if(!motion.enqueueContinuous(state,p.x+x,p.z+z,freeSegment)) {
    // Slide along a bank/wall without stepping through it.
    if(!motion.enqueueContinuous(state,p.x+x,p.z,freeSegment)) motion.enqueueContinuous(state,p.x,p.z+z,freeSegment);
  }
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
    !!document.querySelector("dialog[open]") ||
    document.hidden
  );
}
let lastStep = 0;
let queuedAction = null;
window.addEventListener("keydown", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (!directions[key] || inputBlocked()) return;
  e.preventDefault();
  if (!held.has(key)) {
    held.set(key, directions[key]);
    path = []; queuedAction = null;
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
    path = []; queuedAction = null;
    lastStep = performance.now();
  };
  b.onpointerup =
    b.onpointercancel =
    b.onlostpointercapture =
      () => held.delete("pointer");
}
pathTimer = setInterval(() => {
  // Finish sending already-requested steps even when a dialog takes focus.
  if (state && online && !recovering && motion.pending.length && !hasPending()) sendMoves();
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
  const now = performance.now(), dt=Math.min(.05,Math.max(0,(now-lastStep)/1000));
  lastStep=now;
  if (held.size) {
    const input=[...held.values()].reduce((a,b)=>[a[0]+b[0],a[1]+b[1]],[0,0]);
    move(input[0],input[1],dt);
  } else if (path.length && motion.pending.length < 240) {
    const p=motion.target(state.you,state.players[state.you],state.you), [x,z]=path[0];
    const distance=Math.hypot(x-p.x,z-p.z), fraction=Math.min(1,MOVE_SPEED*dt/distance);
    if(distance<1e-6) path.shift();
    else if(motion.enqueueContinuous(state,p.x+(x-p.x)*fraction,p.z+(z-p.z)*fraction,freeSegment)) {
      if(fraction===1) path.shift();
    } else { path=[]; queuedAction=null; toast("Đường đi đã thay đổi. Hãy chọn lại điểm đến."); }
  }
  sendMoves();
  if (
    queuedAction &&
    !path.length &&
    !motion.pending.length &&
    !busy &&
    !recovering
  ) {
    const a = queuedAction;
    queuedAction = null;
    const p = state.players[state.you];
    if (Math.hypot(p.x - a.destination.x, p.z - a.destination.z) <= 2.5)
      command(a.cmd);
  }
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
  if ($("construction").open) choosePlot({x:Math.round(t.x),z:Math.round(t.z)});
  else travel(t, 0);
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
  const costs = Object.entries(definition).filter(([key, amount]) => Object.hasOwn(ITEMS, key) && amount > 0);
  const afford = costs.every(([key, amount]) => (p.bag[key] || 0) >= amount);
  $("build-benefit").textContent =
    kind === "house"
      ? "Thêm 2 chỗ ở cho làng trong bán kính 6 ô. Dân chỉ chuyển đến khi có thức ăn và đường đi."
      : kind === "storehouse" ? "Cất tối đa 80 đơn vị. Chỉ chủ kho được cất và lấy hàng."
      : kind === "field" ? "Ruộng lớn lên theo độ ẩm. NPC trồng trọt được phân công tới đây sẽ tăng sản lượng."
      : "Đàn vật nuôi sinh sản khi đồng cỏ khỏe. Người chăm nuôi giúp tạo thức ăn đều đặn.";
  $("build-feedback").textContent =
    problem ||
    (!afford
      ? `Cần ${costs.map(([key, amount]) => `${amount} ${ITEMS[key]}`).join(" + ")} trong túi.`
      : "Ô đất hợp lệ. Sẵn sàng xây.");
  $("build-feedback").classList.toggle("valid", !problem && afford);
  $("build-confirm").disabled = !!problem || !afford;
  $("build-confirm").textContent =
    `Xây · ${costs.map(([key, amount]) => `${amount} ${ITEMS[key]}`).join(" + ")}`;
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
let questTarget = "home-wood", questBuildKind = null;
function updateQuest() {
  const p = state.players[state.you];
  const events = state.events || [];
  const ownBuildings = (state.buildings || []).filter(b => b.owner === state.you);
  const delivered = (state.eastDeliveries || 0) > 0 || events.some(e => e.kind === "food" && e.place === "east");
  const hasHouse = ownBuildings.some(b => b.kind === "house");
  const hasStorehouse = ownBuildings.some(b => b.kind === "storehouse");
  const hasField = ownBuildings.some(b => b.kind === "field");
  const hasPasture = ownBuildings.some(b => b.kind === "pasture");
  const foundRuin = p.discoveries.includes("ruin");
  const foundMistwood = p.discoveries.includes("mistwood");
  const foundHighland = p.discoveries.includes("highland");
  const foundFarreach = p.discoveries.includes("farreach");
  const milestones = [
    { label: "Thu thập 8 gỗ và 4 đá", done: state.bridge || (p.bag.wood >= 8 && p.bag.stone >= 4) },
    { label: "Sửa cầu qua sông", done: state.bridge },
    { label: "Đưa thức ăn đến Làng Hạ", done: delivered },
    { label: "Điều tiết cống tưới", done: Boolean(state.gateCause) },
    { label: "Dựng một căn nhà", done: hasHouse },
    { label: "Xây kho cá nhân", done: hasStorehouse },
    { label: "Khám phá tàn tích", done: foundRuin },
    { label: "Khảo sát Rừng Sương", done: foundMistwood },
    { label: "Khảo sát Cao nguyên Đỏ", done: foundHighland },
    { label: "Mở bản đồ Biên Viễn", done: foundFarreach },
    { label: "Xây ruộng canh tác", done: hasField },
    { label: "Dựng chuồng chăn nuôi", done: hasPasture },
    { label: "Trao đổi tại Chợ Phiên", done: (p.trades || 0) > 0 },
  ];
  const chapters = [
    {
      id: "01",
      title: "NỐI LẠI HAI BỜ",
      summary: "Cầu gãy khiến lương thực không đến được Làng Hạ. Hãy mở lại tuyến đường và tiếp tế cho cộng đồng bên kia sông.",
      objectives: milestones.slice(0, 3),
    },
    {
      id: "02",
      title: "GÂY DỰNG THUNG LŨNG",
      summary: "Hai làng đã nối lại. Khơi dòng nước, dựng chỗ ở và chuẩn bị kho dự trữ để cộng đồng có thể lớn lên.",
      objectives: milestones.slice(3, 6),
    },
    {
      id: "03",
      title: "DẤU VẾT CỦA DÒNG SÔNG",
      summary: "Thung lũng đã đứng vững. Hãy tìm câu chuyện còn nằm lại bên kia sông rồi chăm lo cho đời sống của hai làng.",
      objectives: milestones.slice(6, 7),
    },
    {
      id: "04",
      title: "MỞ RỘNG BIÊN CƯƠNG",
      summary: "Những con đường mới dẫn tới rừng ẩm và cao nguyên. Khảo sát đất, mở rộng sản xuất rồi nối các vùng bằng trao đổi hàng hóa.",
      objectives: milestones.slice(7),
    },
  ];
  const chapter = !milestones[2].done ? chapters[0] : !milestones[5].done ? chapters[1] : !milestones[6].done ? chapters[2] : chapters[3];
  questBuildKind = null;
  let title, hint;
  if (!state.bridge) {
    if (p.bag.wood < 8) {
      title = "Gom gỗ cho cây cầu";
      hint = `Còn ${8 - p.bag.wood} gỗ. Đến rừng, chọn cây rồi thu thập.`;
      questTarget = state.resources
        .filter((r) => r.type === "wood" && r.remaining > 0 && r.x < 15)
        .sort(
          (a, b) =>
            Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
        )[0]?.id;
    } else if (p.bag.stone < 4) {
      title = "Tìm đá gia cố";
      hint = `Còn ${4 - p.bag.stone} đá để dựng lại trụ cầu.`;
      questTarget = state.resources
        .filter((r) => r.type === "stone" && r.remaining > 0 && r.x < 15)
        .sort(
          (a, b) =>
            Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
        )[0]?.id;
    } else {
      title = "Dựng lại cây cầu";
      hint = "Đủ 8 gỗ và 4 đá. Đến bờ tây, sửa cầu để nối hai làng.";
      questTarget = "bridge";
    }
  } else if (!delivered) {
    title = p.bag.food ? "Mang thức ăn qua sông" : "Lấy lương thực";
    hint = p.bag.food
      ? "Đến Làng Hạ và giao khẩu phần. Cây cầu đã mở một đường sống mới."
      : "Đến kho chung lấy thức ăn rồi giao cho Làng Hạ.";
    questTarget = p.bag.food ? "east" : state.depot > 0 ? "depot" : "farm";
    if (!p.bag.food && state.depot === 0) {
      title = "Bổ sung lương thực";
      hint =
        "Kho chung đã hết hàng. Đến ruộng thu hoạch để tiếp tục chuyến giao thức ăn.";
    }
  } else if (!state.gateCause) {
    title = "Đưa nước về ruộng";
    hint =
      "Gom thêm 4 gỗ, 2 đá để mở cống. Ruộng lớn nhanh hơn, nhưng cá hạ lưu sẽ giảm.";
    questTarget = "gate";
    const needed=p.bag.wood<4?"wood":p.bag.stone<2?"stone":null;
    if(needed){questTarget=state.resources.filter(r=>r.type===needed&&r.remaining>0).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]?.id;hint=`Cần thêm ${needed==="wood"?4-p.bag.wood:2-p.bag.stone} ${needed==="wood"?"gỗ":"đá"} để mở cống. Dẫn đường sẽ đưa bạn tới nguồn còn hàng.`;}
  } else if (!hasHouse) {
    title = "Dựng một nơi để ở lại";
    hint =
      "Một căn nhà cần 6 gỗ và 2 đá, thêm 2 chỗ ở. Xây gần làng có đủ thức ăn để đón người đến.";
    const needed = p.bag.wood < 6 ? "wood" : p.bag.stone < 2 ? "stone" : null;
    questTarget = needed
      ? state.resources.filter(r => r.type === needed && r.remaining > 0).sort((a,b) => Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]?.id
      : null;
    if (needed) hint = `Cần thêm ${needed === "wood" ? 6 - p.bag.wood : 2 - p.bag.stone} ${needed === "wood" ? "gỗ" : "đá"}. Dẫn đường sẽ tìm nguồn gần nhất còn vật liệu.`;
  } else if (!hasStorehouse) {
    title = "Dành dụm cho ngày mai";
    hint = "Xây kho với 4 gỗ và 2 đá. Cất bớt vật liệu để túi còn chỗ cho chuyến tiếp tế.";
    const needed = p.bag.wood < 4 ? "wood" : p.bag.stone < 2 ? "stone" : null;
    questTarget = needed
      ? state.resources.filter(r => r.type === needed && r.remaining > 0).sort((a,b) => Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]?.id
      : null;
    if (needed) hint = `Cần thêm ${needed === "wood" ? 4 - p.bag.wood : 2 - p.bag.stone} ${needed === "wood" ? "gỗ" : "đá"} để dựng kho.`;
  } else if (!foundRuin) {
    title = "Đọc dấu tích bên kia sông";
    hint = "Đến tàn tích để tìm hiểu mực nước cũ. Những quyết định hôm nay sẽ trở thành câu chuyện của thung lũng.";
    questTarget = "ruin";
  } else if (!foundMistwood) {
    title = "Mở đường vào Rừng Sương";
    hint = "Theo con đường phía nam, khảo sát vùng rừng ẩm và tìm nguồn sợi cỏ đầu tiên.";
    questTarget = "mistwood";
  } else if (!foundHighland) {
    title = "Vượt sang Cao nguyên Đỏ";
    hint = "Qua cầu rồi đi về phía đông nam. Cao nguyên có đất rộng, đá và đất sét cho khu sản xuất mới.";
    questTarget = "highland";
  } else if (!foundFarreach) {
    title = "Chạm tới Biên Viễn";
    hint = "Theo đường cao nguyên về phía đông nam để mở vùng đất xa nhất của thế giới 64×64.";
    questTarget = "farreach";
  } else if (!hasField) {
    title = "Mở rộng mùa vụ";
    hint = "Xây ruộng canh tác với 4 gỗ, 1 đá và 2 sợi cỏ. NPC trồng trọt sẽ tự đến làm việc.";
    const needed = p.bag.wood < 4 ? "wood" : p.bag.stone < 1 ? "stone" : p.bag.fiber < 2 ? "fiber" : null;
    questTarget = needed ? state.resources.filter(r => r.type === needed && r.remaining > 0).sort((a,b) => Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]?.id : null;
    questBuildKind = "field";
  } else if (!hasPasture) {
    title = "Gầy dựng đàn vật nuôi";
    hint = "Dựng chuồng bằng 6 gỗ, 2 đá và 4 sợi cỏ. Đàn lớn lên khi đồng cỏ khỏe và có người chăm.";
    const needed = p.bag.wood < 6 ? "wood" : p.bag.stone < 2 ? "stone" : p.bag.fiber < 4 ? "fiber" : null;
    questTarget = needed ? state.resources.filter(r => r.type === needed && r.remaining > 0).sort((a,b) => Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]?.id : null;
    questBuildKind = "pasture";
  } else if (!(p.trades || 0)) {
    title = "Nối các vùng bằng hàng hóa";
    hint = "Đến Chợ Phiên trên cao nguyên và thực hiện một lượt trao đổi vật liệu.";
    questTarget = "market";
  } else {
    const village = state.villages.map(v => settlementSummary(state,v.id)).sort((a,b) => a.foodDays-b.foodDays)[0];
    title = village.foodDays < 2 ? `Tiếp sức ${village.name}` : "Thung lũng trong tay bạn";
    hint = village.foodDays < 2
      ? "Mang khẩu phần đến làng, hoặc chọn làng này làm điểm nhận của xe. Mở Thung lũng để xem nhu cầu từng cộng đồng."
      : "Giữ nguồn nước, lương thực và chỗ ở cân bằng. Mỗi thay đổi của bạn đều để lại dấu vết trong biên niên sử.";
    questTarget = village.foodDays < 2 ? (p.bag.food ? village.id : "depot") : "overview";
  }
  const missionPanel = document.querySelector(".mission");
  const previousChapter = missionPanel.dataset.chapter;
  if (previousChapter && previousChapter !== chapter.id) {
    missionPanel.classList.remove("chapter-changed");
    void missionPanel.offsetWidth;
    missionPanel.classList.add("chapter-changed");
    toast(`Chương ${chapter.id} đã mở: ${chapter.title.toLowerCase()}.`);
  }
  missionPanel.dataset.chapter = chapter.id;
  $("chapter-label").textContent = `CHƯƠNG ${chapter.id}`;
  $("quest-summary").textContent = chapter.summary;
  $("quest-title").textContent = title;
  $("quest-hint").textContent = hint;
  $("quest-go").textContent = questTarget === "overview" ? "Quan sát thung lũng →" : questTarget
    ? "Dẫn đường đến mục tiêu →"
    : "Mở xây dựng →";
  const chapterDone = chapter.objectives.filter(objective => objective.done).length;
  const totalDone = milestones.filter(milestone => milestone.done).length;
  $("quest-progress").textContent = chapterDone === chapter.objectives.length
    ? "Chương đã hoàn thành"
    : `${chapterDone} / ${chapter.objectives.length} nhiệm vụ chương`;
  $("quest-journey").textContent = `Hành trình ${totalDone} / ${milestones.length}`;
  const firstOpen = chapter.objectives.findIndex(objective => !objective.done);
  $("objectives").replaceChildren(...chapter.objectives.map((objective, index) => {
    const item = document.createElement("li");
    item.className = objective.done ? "done" : index === firstOpen ? "current" : "pending";
    if (index === firstOpen) item.setAttribute("aria-current", "step");
    const copy = document.createElement("span");
    copy.className = "objective-copy";
    copy.textContent = objective.label;
    const status = document.createElement("small");
    status.textContent = objective.done ? "HOÀN THÀNH" : index === firstOpen ? "ĐANG LÀM" : "TIẾP THEO";
    item.append(copy, status);
    return item;
  }));
}
$("quest-go").onclick = () => {
  if (questTarget === "overview") { valleyUI.open(); return; }
  if (questTarget) {
    select(questTarget);
    const t = target();
    travel(questTarget === "bridge" ? { x: 14, z: 17 } : t);
  } else {
    $("build-kind").value = questBuildKind || (state.buildings?.some(b => b.owner === state.you && b.kind === "house") ? "storehouse" : "house");
    $("build-toggle").click();
    renderConstruction();
  }
};
$("close-inspect").onclick = () =>
  document.querySelector(".inspect").classList.remove("open");
$("build-toggle").onclick = () => {
  document.querySelector(".inspect").classList.add("open");
  $("construction").open = true;
};
$("map-overview").onclick = () => { worldMap.resetView(); renderWorld(); };
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "e" && !inputBlocked()) {
    $("actions").querySelector("button:not(:disabled)")?.click();
  }
  if (e.key === "Escape") {
    document.querySelector(".inspect").classList.remove("open");
    path = [];
    held.clear();
  }
});
let actionSpecs = [];
function action(label, cmd, disabled = false) {
  actionSpecs.push({ label, cmd, disabled });
}
function commitActions() {
  const enabled = canAct();
  const signature = JSON.stringify([actionSpecs, enabled]);
  if ($("actions").dataset.signature === signature) return;
  $("actions").dataset.signature = signature;
  $("actions").replaceChildren();
  for (const { label, cmd, disabled } of actionSpecs) {
    const b = document.createElement("button");
    b.textContent = label;
    b.disabled = disabled || !enabled;
    b.onclick = () => {
      const t = target(),
        p = state.players[state.you];
      const destination = selected === "bridge" ? { x: 14, z: 17 } : t;
      if (
        destination &&
        Math.hypot(p.x - destination.x, p.z - destination.z) > 2.5
      ) {
        if (!travel(destination)) return;
        queuedAction = { cmd, destination };
        toast("Đang đến gần để thực hiện thao tác…");
        return;
      }
      command(cmd);
    };
    $("actions").append(b);
  }
}

function renderUI() {
  if (!state) return;
  const p = state.players[state.you];
  if (!p) return;
  $("clock").textContent =
    `Ngày ${state.day} · ${String(Math.floor(state.dayProgress / DAY_MS * 24)).padStart(2, "0")}:00 · ${state.weather}`;
  $("connection").textContent = `${state.online} người kết nối`;
  $("coordinates").textContent = `${Math.round(p.x * 16)} / ${Math.round(p.z * 16)} m`;
  for (const kind of Object.keys(ITEMS))
    $(kind).textContent = p.bag[kind] || 0;
  $("bag-capacity").textContent = `${Object.values(p.bag).reduce((sum, amount) => sum + amount, 0)}/${BAG_CAPACITY}`;
  $("save").textContent = !online ? "Đang chờ kết nối" : busy || recovering || hasPending() ? "Đang lưu thay đổi…" : "Tiến độ đã được lưu";
  $("credit").textContent =
    `Tín dụng offline: ${Math.floor(state.creditMs / 60000)} / 480 phút`;
  updateQuest();
  $("villages").replaceChildren();
  for (const v of state.villages) {
    const summary = settlementSummary(state,v.id);
    const population = summary.population;
    const row = document.createElement("div");
    row.className = "village";
    const title = document.createElement("span");
    const capacity = housingCapacity(state, v.id);
    title.textContent = `${v.name} · ${population} dân${capacity !== null ? ` / ${capacity} chỗ` : ""}`;
    const food = document.createElement("strong");
    food.className = v.food < population ? "warning" : "";
    food.textContent = `${v.food} · ${summary.foodDays.toFixed(1)} ngày`;
    row.title = "Lương thực dự trữ chia cho nhu cầu một ngày, chưa tính sản xuất mới.";
    row.append(title, food);
    $("villages").append(row);
  }
  const r = state.resources.find((r) => r.id === selected);
  const building = state.buildings?.find((b) => b.id === selected);
  const npc = state.npcs.find(n => n.id === selected);
  const village = npc && state.villages.find(v => v.id === npc.village);
  const [title, description] = (npc ? [npc.name,
    `${village.name} · ${npc.job}. ${npc.activity || "Đang cùng dân làng duy trì sinh kế."} ${npc.hungryDays ? `Đã thiếu ăn ${npc.hungryDays} ngày.` : "Đã có khẩu phần trong ngày gần nhất."} ${npc.lastDecisionReason || ""}`] : building
    ? [
        BUILDINGS[building.kind].name,
        `Ô ${building.x}, ${building.z}. ${building.kind === "house" ? "Thêm 2 chỗ ở cho " + state.villages.find((v) => v.id === building.village).name : building.kind === "storehouse" ? building.owner === state.you ? "Kho của bạn · sức chứa 80 đơn vị." : "Kho thuộc người chơi khác." : building.kind === "field" ? `Tiến độ vụ mới ${Math.round((building.progress || 0) * 100)}% · đang có ${building.stock.food} thức ăn chờ thu.` : `Đàn ${building.animals || 0} con · đang có ${building.stock.food} thức ăn chờ thu.`}`,
      ]
    : copy[selected]) || [
    ({ wood: "Rừng cây", stone: "Mỏ đá", fiber: "Bãi sợi cỏ", clay: "Bãi đất sét" }[r?.type] || "Nguồn tài nguyên"),
    `Còn ${r?.remaining ?? 0}/${r?.capacity ?? 0} đơn vị. ${r?.remaining ? "Nguồn phục hồi theo thời tiết và sức khỏe môi trường." : `Đang tái tạo tự nhiên ${Math.round((r?.regrowth || 0) * 100)}%.`} Túi tối đa ${BAG_CAPACITY}.`,
  ];
  $("selection-title").textContent = title;
  const focus = selected === "bridge" ? { x: 14, z: 17 } : target();
  const distance = focus ? Math.hypot(p.x - focus.x, p.z - focus.z) : 0;
  $("world-hint").textContent =
    distance > 2.5
      ? `${title} · ${Math.round(distance * 16)} m · Chọn thao tác để đi tới`
      : npc ? `${title} · ${npc.job}` : `${title} · E để tương tác`;
  $("selection-description").textContent = description;
  actionSpecs = [];
  if (r)
    action(
      `Thu thập ${ITEMS[r.type] || r.type} · còn ${r.remaining}`,
      { type: "gather", target: r.id },
      r.remaining === 0,
    );
  if (building && ["field", "pasture"].includes(building.kind))
    action(
      `Thu sản phẩm · ${building.stock.food} thức ăn`,
      { type: "collect-building", target: building.id },
      building.stock.food <= 0,
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
      ` Xe: ${{ blocked: "đường đi bị chặn", resting: "đợi tín dụng làm việc", transit: "đang vận chuyển", returning: "đang quay về kho", paused: "đang tạm dừng", ready: "sẵn sàng", empty: "chờ bổ sung kho" }[state.cart.status] || "đang chuẩn bị"}; chở ${state.cart.cargo} khẩu phần.`;
  }
  if (selected === "market") {
    action("Đổi 3 sợi cỏ → 2 gỗ", { type: "trade", recipe: "fiber_wood" }, p.bag.fiber < 3);
    action("Đổi 3 đất sét → 2 đá", { type: "trade", recipe: "clay_stone" }, p.bag.clay < 3);
    action("Đổi 2 thức ăn → 3 sợi cỏ", { type: "trade", recipe: "food_fiber" }, p.bag.food < 2);
    action("Đổi 2 gỗ → 2 đất sét", { type: "trade", recipe: "wood_clay" }, p.bag.wood < 2);
  }
  if (npc && p.bag.food)
    action(`Góp ${p.bag.food} khẩu phần cho ${village.name}`, {type:"donate",target:village.id});
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
  if (["mistwood", "highland", "farreach"].includes(selected))
    action(
      p.discoveries.includes(selected) ? "Vùng đã được khảo sát" : "Khảo sát và mở bản đồ vùng",
      { type: "survey-region", target: selected },
      p.discoveries.includes(selected),
    );
  $("storage-panel").hidden = !(
    building?.kind === "storehouse" && building.owner === state.you
  );
  if (building?.kind === "storehouse")
    $("storage-stock").textContent =
      `Trong kho: ${Object.keys(ITEMS).map(key => `${building.stock[key] || 0} ${ITEMS[key]}`).join(" · ")}`;
  for (const b of state.buildings || [])
    if (![...$("places").options].some((o) => o.value === b.id)) {
      const o = document.createElement("option");
      o.value = b.id;
      o.textContent = `${BUILDINGS[b.kind].name} · ${b.x},${b.z}`;
      $("places").append(o);
    }
  renderConstruction();
  commitActions();
  valleyUI?.render(state, selected);
  $("moisture").value = state.moisture;
  $("fish").value = state.fish;
  $("moisture-value").textContent = `${Math.round(state.moisture * 100)}%`;
  $("fish-value").textContent = `${Math.round(state.fish)} / 100`;
  $("ecology-note").textContent = state.gate
    ? "Cống đang mở: ruộng nhận nước, đàn cá có thể giảm."
    : "Cống đang đóng: dòng hạ lưu được phục hồi.";
  $("event-count").textContent = `${state.eventSeq} sự kiện`;
  chronicleUI?.render(state.events);
}
// The renderer reads snapshots; camera and animation never mutate saved gameplay.
const container = $("world");
const worldMap = new Map2D(container, select, mapTravel);
for (const button of document.querySelectorAll("[data-region]")) button.addEventListener("click", () => {
  const id = button.dataset.region;
  select(id);
  worldMap.focus(P[id].x, P[id].z);
  document.querySelectorAll("[data-region]").forEach(other => other.classList.toggle("active", other === button));
});
let cartVisual = null;
function visibleCart(dt) {
  const cart = state.cart;
  const routeKey = `${state.you}:${cart.target}:${cart.leg}:${JSON.stringify(cart.route)}`;
  const distance = Number.isFinite(cart.distance) ? cart.distance : 0;
  if (!cartVisual || cartVisual.key !== routeKey || distance < cartVisual.distance)
    cartVisual = {key:routeKey,distance};
  if (dt > 0) cartVisual.distance += (distance-cartVisual.distance) * (1-Math.exp(-dt*6));
  const shown = { ...cart, distance:cartVisual.distance };
  return { ...shown, ...cartPosition({ ...state, cart:shown }) };
}
function renderWorld(dt = 0) {
  const visual = state ? { ...state, cart:visibleCart(dt), players: motion.frame(state, dt).players } : null;
  worldMap.route = [...motion.pending, ...path.map(([x, z]) => ({ x, z }))];
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

function classChoices(container, group, current = "builder") {
  $(container).replaceChildren(...Object.entries(CLASSES).map(([id, cl]) => {
    const card = document.createElement("label"); card.className = "class-card";
    const radio = document.createElement("input"); radio.type = "radio"; radio.name = group; radio.value = id; radio.checked = id === current;
    const art = document.createElement("span"); art.className = `character-art character-${cl.art}`; art.setAttribute("aria-hidden", "true");
    const title = document.createElement("strong"); title.textContent = cl.name;
    const role = document.createElement("span"); role.className = "class-role"; role.textContent = cl.role;
    const description = document.createElement("p"); description.textContent = cl.description;
    const detail = document.createElement("small"); detail.textContent = [cl.passive, ...cl.skills].join(" ");
    card.append(radio, art, title, role, description, detail); return card;
  }));
}
classChoices("class-choices", "join-class");
$("character-open").onclick = () => {
  if (!state) return;
  held.clear(); path = []; queuedAction = null;
  const p = state.players[state.you];
  $("profile-name").value = p.name; $("profile-error").textContent = "";
  classChoices("profile-choices", "profile-class", p.classId || "builder");
  $("character-dialog").showModal();
};
$("character-close").onclick = () => $("character-dialog").close();
$("character-form").onsubmit = async e => {
  e.preventDefault(); e.submitter.disabled = true;
  try {
    const ok = await command({ type: "character", name: $("profile-name").value, classId: document.querySelector('[name="profile-class"]:checked').value });
    if (ok) $("character-dialog").close();
    else $("profile-error").textContent = "Chưa lưu được. Hãy về nơi trú ẩn và chờ các thao tác hoàn tất.";
  } finally { e.submitter.disabled = false; }
};
function useSkill(skill) { if (!inputBlocked()) { held.clear(); path = []; queuedAction = null; command({ type: "skill", skill }); } }
$("skill-collect").onclick = () => useSkill("collect");
$("skill-focus").onclick = () => useSkill("focus");
window.addEventListener("keydown", e => {
  if (e.repeat || inputBlocked()) return;
  if (e.key.toLowerCase() === "q") useSkill("collect");
  if (e.key.toLowerCase() === "r") useSkill("focus");
});
setInterval(() => {
  const p = state?.players[state.you];
  $("skill-bar").hidden = !p?.classId;
  if (!p?.classId) return;
  $("class-name").textContent = CLASSES[p.classId]?.name || "";
  for (const [key, label] of [["collect", "Q · Gom vật liệu"], ["focus", "R · Tập trung"]]) {
    const b = $("skill-" + key), left = Math.max(0, Math.ceil(((p.cooldowns?.[key] || 0)-Date.now())/1000));
    b.hidden = p.classId !== "builder"; b.disabled = !!left || busy || recovering || motion.pending.length > 0;
    b.textContent = left ? `${label} (${left}s)` : label;
  }
}, 250);

valleyUI = createValleyUI({
  select(id) {
    $("construction").open = false;
    select(id);
    const t = target();
    if (t) worldMap.focus(t.x,t.z);
  },
  canAct,
  onOpen: stopMovement,
  async command(cmd) {
    if (!canAct()) return false;
    const p = state.players[state.you];
    if (Math.hypot(p.x-P.depot.x,p.z-P.depot.z)>2.5) {
      valleyUI.close();
      $("construction").open = false;
      select("depot");
      if (!travel(P.depot)) return false;
      queuedAction = {cmd,destination:P.depot};
      toast("Đang đến kho để thực hiện yêu cầu. Di chuyển bằng tay sẽ hủy yêu cầu này.");
      return { queued: true };
    }
    return command(cmd);
  },
});
chronicleUI = createChronicleUI({
  async loadEvent(id) {
    const response = await api(`/api/event?id=${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(response.data.error);
    return response.data;
  },
  select(id) {
    const known = P[id] || state?.resources.some(r => r.id === id) || state?.buildings?.some(b => b.id === id) || state?.npcs.some(n => n.id === id);
    if (!known) { toast("Địa điểm này không còn trên bản đồ hiện tại."); return; }
    $("construction").open = false;
    select(id);
    const t = target();
    if (t) worldMap.focus(t.x,t.z);
  },
  onOpen: stopMovement,
});
document.querySelector(".left-rail").scrollTop = 0;
await poll();
setInterval(() => {
  if (!document.hidden) poll();
}, 2000);
