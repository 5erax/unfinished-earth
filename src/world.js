export const SIZE = 48;
export const VERSION = 1;
export const DAY_MS = 1_800_000;
export const OFFLINE_MS = 72 * 3_600_000;
export const CREDIT_MS = 8 * 3_600_000;
export const POINTS = {
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
};
export const BUILDINGS = {
  house: { name: "Nhà nhỏ", wood: 6, stone: 2, beds: 2 },
  storehouse: { name: "Kho cá nhân", wood: 4, stone: 2, capacity: 80 },
  field: { name: "Ruộng canh tác", wood: 4, stone: 1, fiber: 2, output: "food" },
  pasture: { name: "Chuồng chăn nuôi", wood: 6, stone: 2, fiber: 4, output: "food" },
};
export const ITEMS = {
  wood: "gỗ", stone: "đá", food: "thức ăn", fiber: "sợi cỏ", clay: "đất sét",
};
export function housingCapacity(w, village) {
  return (
    (w.housingBase?.[village] ?? Math.max(12, w.npcs.filter((n) => n.village === village).length)) +
    (w.buildings || []).filter(
      (b) => b.kind === "house" && b.village === village,
    ).length *
      2
  );
}
function reservedTile(x, z) {
  return (
    Object.values(POINTS).some((p) => Math.hypot(x - p.x, z - p.z) <= 2) ||
    (x === 7 && z >= 8 && z <= 22) ||
    (z === 17 && x >= 7 && x <= 25) ||
    (x === 24 && z >= 12 && z <= 17) ||
    (z === 10 && x >= 24 && x <= 36) ||
    (x === 8 && z >= 22 && z <= 40) ||
    (z === 32 && x >= 18 && x <= 40)
  );
}
export function placementProblem(w, playerId, kind, x, z) {
  if (!Object.hasOwn(BUILDINGS, kind)) return "Loại công trình không hợp lệ.";
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(z) ||
    x < 2 ||
    z < 2 ||
    x > SIZE - 3 ||
    z > SIZE - 3
  )
    return `Chọn ô đất từ 2 đến ${SIZE - 3}.`;
  if (!walkable(w, x, z) || (x >= 15 && x <= 17))
    return "Không thể xây trên sông hoặc công trình khác.";
  if (reservedTile(x, z))
    return "Giữ trống đường đi và khu công trình hiện có.";
  if (
    (w.resources || []).some((r) => r.x === x && r.z === z && r.remaining > 0)
  )
    return "Thu thập hết tài nguyên trên ô này trước.";
  if (Object.values(w.players).some((p) => Math.abs(p.x-x) <= .72 && Math.abs(p.z-z) <= .72))
    return "Có người chơi đang đứng trên ô này.";
  if ((w.buildings || []).length >= 160)
    return "Thế giới đã đủ 160 công trình.";
  if (
    kind === "house" &&
    ![POINTS.west, POINTS.east].some((p) => Math.hypot(x - p.x, z - p.z) <= 6)
  )
    return "Đặt nhà trong 6 ô quanh một làng để bổ sung chỗ ở.";
  const p = w.players[playerId];
  if (!p || Math.hypot(p.x - x, p.z - z) > 2.5)
    return "Hãy đi tới gần ô đất trước khi xây.";
  // Removing this cell must not disconnect any of its existing walkable neighbours.
  const neighbours = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
    .map(([dx, dz]) => [x + dx, z + dz])
    .filter(([a, b]) => walkable(w, a, b));
  if (neighbours.length > 1) {
    const queue = [neighbours[0]],
      seen = new Set([neighbours[0].join(",")]);
    for (let i = 0; i < queue.length; i++) {
      const [a, b] = queue[i];
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = a + dx,
          nz = b + dz,
          key = `${nx},${nz}`;
        if ((nx === x && nz === z) || seen.has(key) || !walkable(w, nx, nz))
          continue;
        seen.add(key);
        queue.push([nx, nz]);
      }
    }
    if (neighbours.some((n) => !seen.has(n.join(","))))
      return "Công trình sẽ bịt lối đi. Hãy chọn ô khác.";
  }
  return null;
}
const names = [
  "An",
  "Bình",
  "Chi",
  "Dũng",
  "Giang",
  "Hà",
  "Hiền",
  "Khánh",
  "Lan",
  "Minh",
  "Nam",
  "Oanh",
  "Phúc",
  "Quân",
  "Sơn",
  "Thảo",
  "Trang",
  "Tú",
  "Vân",
  "Việt",
  "Xuân",
  "Yến",
  "Lâm",
  "Mai",
];
export function event(w, kind, text, place, causes = []) {
  const e = { id: ++w.eventSeq, day: w.day, kind, text, place, causes };
  w.events.push(e);
  return e.id;
}
export function createWorld(now = Date.now()) {
  const w = {
    schemaVersion: VERSION,
    simVersion: VERSION,
    revision: 0,
    day: 1,
    dayProgress: 0,
    lastWall: now,
    lastActive: now,
    absenceStartedAt: null,
    offlineUntil: null,
    creditMs: 0,
    gate: false,
    bridge: false,
    bridgeCause: null,
    gateCause: null,
    moisture: 0.35,
    fish: 60,
    grass: 70,
    trees: 90,
    grazers: 18,
    predators: 4,
    weather: "Nắng",
    crop: 0,
    depot: 24,
    cart: { cargo: 0, progress: 0, status: "blocked", target: "east", paused: false,
      leg: "outbound", travelMs: 2 * DAY_MS, route: [], routeDistance: 0, distance: 0, motionVersion: 1 },
    housingBase: { west: 12, east: 12 },
    villages: [
      { id: "west", name: "Làng Thượng", food: 72 },
      { id: "east", name: "Làng Hạ", food: 18 },
    ],
    npcs: names.map((name, i) => ({
      id: `npc-${i + 1}`,
      name,
      village: i < 12 ? "west" : "east",
      job: i % 3 ? "Trồng trọt" : "Đánh cá",
      hungryDays: 0,
    })),
    players: {},
    resources: [],
    eventSeq: 0,
    events: [],
    deliveries: 0,
    eastDeliveries: 0,
    harvests: 0,
  };
  for (let i = 0; i < 34; i++) {
    const x = 2 + ((i * 7) % 27),
      z = 2 + ((i * 11) % 27);
    if (
      (x >= 15 && x <= 17) ||
      Object.values(POINTS).some((p) => Math.hypot(p.x - x, p.z - z) < 2)
    )
      continue;
    w.resources.push({
      id: `resource-${i}`,
      type: i % 3 ? "wood" : "stone",
      x,
      z,
      remaining: i % 3 ? 8 : 6,
    });
  }
  // Nearby guaranteed resources make the first bridge possible without crossing the river.
  w.resources.push(
    { id: "home-wood", type: "wood", x: 6, z: 20, remaining: 16 },
    { id: "home-stone", type: "stone", x: 9, z: 23, remaining: 12 },
  );
  ensureWorld(w);
  event(
    w,
    "world",
    "Mưa lớn cuốn mất cầu. Xe lương thực đang mắc ở bờ tây; Làng Hạ cần một tuyến tiếp tế.",
    "bridge",
  );
  return w;
}
const expansionResources = [
  ["mist-wood-1", "wood", 6, 35, 14], ["mist-wood-2", "wood", 11, 39, 16],
  ["mist-wood-3", "wood", 21, 41, 12], ["east-wood", "wood", 42, 20, 10],
  ["high-stone-1", "stone", 38, 6, 12], ["high-stone-2", "stone", 43, 15, 14],
  ["south-stone", "stone", 27, 41, 10],
  ["reed-1", "fiber", 5, 32, 14], ["reed-2", "fiber", 11, 35, 16],
  ["steppe-fiber-1", "fiber", 35, 27, 14], ["steppe-fiber-2", "fiber", 42, 36, 18],
  ["clay-1", "clay", 21, 8, 12], ["clay-2", "clay", 29, 21, 14],
  ["clay-3", "clay", 36, 17, 12],
];
export function ensureWorld(w) {
  w.buildings ??= [];
  w.resources ??= [];
  for (const p of Object.values(w.players || {})) {
    p.bag ??= {};
    for (const item of Object.keys(ITEMS)) p.bag[item] ??= 0;
    p.trades ??= 0;
  }
  for (const n of w.npcs || []) if (!Number.isFinite(n.workX) || !Number.isFinite(n.workZ)) {
    if (n.job === "Đánh cá") {
      n.worksite = "river"; n.workX = n.village === "east" ? 18.7 : 13.3;
      n.workZ = 9 + (Number(n.id.split("-").at(-1)) % 18);
      n.activity = "Đánh cá và theo dõi nguồn nước";
    } else {
      n.worksite = "farm"; n.workX = POINTS.farm.x; n.workZ = POINTS.farm.z;
      n.activity = "Chăm ruộng và thu hoạch";
    }
  }
  for (const r of w.resources) {
    r.capacity ??= Math.max(r.remaining || 0, r.type === "wood" ? 8 : 6);
    r.regrowth ??= 0;
    r.fertility ??= 0.75 + ((Number(r.id.match(/\d+/)?.[0]) || 3) % 7) * 0.06;
  }
  for (const b of w.buildings) {
    b.stock ??= {};
    for (const item of Object.keys(ITEMS)) b.stock[item] ??= 0;
    b.progress ??= 0;
    if (b.kind === "pasture") b.animals ??= 2;
  }
  const ids = new Set(w.resources.map(r => r.id));
  for (const [id, type, x, z, capacity] of expansionResources) if (!ids.has(id)) {
    w.resources.push({ id, type, x, z, remaining: capacity, capacity, regrowth: 0,
      fertility: 0.78 + ((x * 7 + z * 3) % 8) * 0.04 });
  }
  w.expansionVersion = 1;
  return w;
}
// Continuous navigation uses expanded obstacle rectangles (actor radius 0.22).
export const MOVE_SPEED = 5;
export function obstacles(w) {
  const river = w.bridge ? [[14.28,0,17.72,16.72],[14.28,17.28,17.72,SIZE]] : [[14.28,0,17.72,SIZE]];
  return [...river, ...(w.buildings || []).map(b => [b.x-.72,b.z-.72,b.x+.72,b.z+.72])];
}
function pointFree(rects, x, z) {
  return Number.isFinite(x) && Number.isFinite(z) && x >= 1 && z >= 1 && x <= SIZE - 2 && z <= SIZE - 2 &&
    !rects.some(([l,t,r,b]) => x >= l && x <= r && z >= t && z <= b);
}
function clearSegment(rects, a, b) {
  if (!pointFree(rects,a.x,a.z) || !pointFree(rects,b.x,b.z)) return false;
  for (const [l,t,r,d] of rects) {
    let lo=0, hi=1;
    for (const [start, delta, min, max] of [[a.x,b.x-a.x,l,r],[a.z,b.z-a.z,t,d]]) {
      if (Math.abs(delta)<1e-12) { if(start<min || start>max) { lo=2; break; } }
      else { const u=(min-start)/delta, v=(max-start)/delta; lo=Math.max(lo,Math.min(u,v)); hi=Math.min(hi,Math.max(u,v)); }
    }
    if (lo<=hi) return false;
  }
  return true;
}
export function freeSegment(w,a,b) { return clearSegment(obstacles(w),a,b); }
export function findRoute(w,start,destination,radius=0) {
  const rects=obstacles(w);
  if (!pointFree(rects,start.x,start.z) || !Number.isFinite(destination.x) || !Number.isFinite(destination.z)) return null;
  if (radius>0 && Math.hypot(start.x-destination.x,start.z-destination.z)<=radius) return [];
  const goals=[];
  if (pointFree(rects,destination.x,destination.z)) goals.push(destination);
  if(radius>0) for(let i=0;i<24;i++) {
    const a=i*Math.PI/12, p={x:destination.x+Math.cos(a)*radius,z:destination.z+Math.sin(a)*radius};
    if(pointFree(rects,p.x,p.z)) goals.push(p);
  }
  if(!goals.length) return null;
  const nodes=[start,...goals];
  for(const [l,t,r,b] of rects) for(const x of [l-.02,r+.02]) for(const z of [t-.02,b+.02])
    if(pointFree(rects,x,z)) nodes.push({x,z});
  const dist=nodes.map(()=>Infinity), prev=nodes.map(()=>-1), seen=new Set(); dist[0]=0;
  while(seen.size<nodes.length) {
    let at=-1;
    for(let i=0;i<nodes.length;i++) if(!seen.has(i) && (at<0 || dist[i]<dist[at])) at=i;
    if(at<0 || !Number.isFinite(dist[at])) return null;
    if(at>0 && at<=goals.length) {
      const path=[]; while(at>0) { path.unshift([nodes[at].x,nodes[at].z]); at=prev[at]; } return path;
    }
    seen.add(at);
    for(let i=1;i<nodes.length;i++) {
      if(seen.has(i)) continue;
      const cost=dist[at]+Math.hypot(nodes[i].x-nodes[at].x,nodes[i].z-nodes[at].z);
      if(cost<dist[i] && clearSegment(rects,nodes[at],nodes[i])) {dist[i]=cost;prev[i]=at;}
    }
  }
  return null;
}
export function walkable(w, x, z) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(z) ||
    x < 1 ||
    z < 1 ||
    x >= SIZE - 1 ||
    z >= SIZE - 1
  )
    return false;
  if ((w.buildings || []).some((b) => b.x === x && b.z === z)) return false;
  return x < 15 || x > 17 || (w.bridge && z === 17);
}
const requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};
function near(p, target) {
  requireThat(
    Math.hypot(p.x - target.x, p.z - target.z) <= 2.5,
    "Hãy đi đến gần địa điểm trước (tối đa 2 ô).",
  );
}
function spend(p, costs, legacyStone = 0) {
  if (typeof costs === "number") costs = { wood: costs, stone: legacyStone };
  const missing = Object.entries(costs)
    .filter(([key, amount]) => Object.hasOwn(ITEMS, key) && typeof amount === "number" && amount > 0 && (p.bag[key] || 0) < amount)
    .map(([key, amount]) => `${amount} ${ITEMS[key] || key}`);
  requireThat(!missing.length, `Cần ${missing.join(" và ")}.`);
  for (const [key, amount] of Object.entries(costs)) if (Object.hasOwn(ITEMS, key) && typeof amount === "number" && amount > 0) p.bag[key] -= amount;
}
export const CLASSES = {
  builder: { name: "Thợ dựng", role: "Dựng nhà · sửa cầu", color: "#bb793e", art: 0,
    description: "Đôi tay biến đống đổ nát thành nơi trú chân.",
    passive: "Tay nghề: thu thập tối đa 2 đá mỗi lần, vẫn tiêu hao nguồn đá.",
    skills: ["Q · Gom vật liệu: lấy tối đa 6 vật liệu từ các nguồn trong 2 ô. Hồi 30 giây.", "R · Tập trung: thu thập cách nhau 0,25 giây trong 15 giây. Hồi 60 giây."] },
  keeper: { name: "Người giữ nguồn", role: "Nước · đất · mùa màng", color: "#698759", art: 1,
    description: "Giữ dòng nước sạch và gieo lại những mảnh đất cằn.", passive: "Bộ kỹ năng đang được phát triển. Hiện chơi được các hoạt động chung.", skills: [] },
  pathfinder: { name: "Người dẫn đường", role: "Khám phá · vận chuyển", color: "#c69b43", art: 2,
    description: "Tìm con đường nối những mái nhà còn cách biệt.", passive: "Bộ kỹ năng đang được phát triển. Hiện chơi được các hoạt động chung.", skills: [] },
  connector: { name: "Người kết nối", role: "Cộng đồng · trao đổi", color: "#6984b2", art: 3,
    description: "Lắng nghe từng câu chuyện và kéo mọi người lại gần.", passive: "Bộ kỹ năng đang được phát triển. Hiện chơi được các hoạt động chung.", skills: [] },
};
export function characterProfile(input) {
  try {
  requireThat(input && typeof input === "object" && Object.hasOwn(CLASSES, input.classId), "Hãy chọn một class hợp lệ.");
  requireThat(typeof input.name === "string", "Hãy đặt tên nhân vật.");
  const name = input.name.trim().normalize("NFC");
  requireThat(name.length >= 2 && name.length <= 24 && !/[<>\x00-\x1f\x7f]/.test(name), "Tên cần 2–24 ký tự, không chứa ký tự đặc biệt < >.");
  return { name, classId: input.classId };
  } catch (error) { error.status = 400; throw error; }
}
export function join(w, id, now, profile) {
  ensureWorld(w);
  const character = profile ? characterProfile(profile) : {};
  if (w.players[id]) return;
  w.players[id] = {
    id,
    name: `Người dựng làng ${Object.keys(w.players).length + 1}`,
    ...character,
    ...POINTS.home,
    bag: { wood: 0, stone: 0, food: 0, fiber: 0, clay: 0 },
    lastMove: 0,
    lastGather: 0,
    seen: now,
    discoveries: [],
  };
}

function cartRoad(target) {
  // The cart follows the same reserved roads and narrow bridge as players.
  return target === "west"
    ? [POINTS.depot, { x: 11, z: 17 }, { x: 7, z: 17 }, { x: 7, z: 8 }, POINTS.west].map(p => ({ ...p }))
    : [POINTS.depot, { x: 11, z: 17 }, { x: 24, z: 17 }, POINTS.east].map(p => ({ ...p }));
}
function roadLength(route) {
  return route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - route[i].x, p.z - route[i].z), 0);
}
function pointOnRoad(route, distance) {
  let remaining = Math.max(0, distance);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (remaining < length - 1e-9 || i === route.length - 1) {
      const t = length ? Math.min(1, remaining / length) : 0;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
        heading: Math.atan2(b.z - a.z, b.x - a.x), segment: i };
    }
    remaining -= length;
  }
  return { ...POINTS.depot, heading: -Math.PI / 2, segment: 1 };
}
function readCartRoute(cart) {
  if (Array.isArray(cart?.route) && cart.route.length > 1) return cart.route;
  const route = cartRoad(cart?.target === "west" ? "west" : "east");
  return cart?.leg === "return" ? route.reverse() : route;
}
export function cartPosition(w) {
  const cart = w.cart || {}, route = readCartRoute(cart), length = roadLength(route);
  const distance = Number.isFinite(cart.distance) ? cart.distance
    : Math.max(0, Math.min(1, (cart.progress || 0) / 2)) * length;
  const { x, z, heading } = pointOnRoad(route, distance);
  return { x, z, heading, moving: !cart.paused && ["transit", "returning"].includes(cart.status) };
}
function prepareCart(w) {
  const cart = w.cart ??= { cargo: 0, progress: 0, status: "ready" };
  cart.target = cart.target === "west" ? "west" : "east";
  cart.paused = cart.paused === true;
  cart.leg = cart.leg === "return" ? "return" : "outbound";
  cart.travelMs = Number.isFinite(cart.travelMs) && cart.travelMs > 0 ? cart.travelMs : 2 * DAY_MS;
  cart.dockMs ??= cart.cargo > 0 || cart.leg === "return" ? 0 : DAY_MS / 8;
  if (!cart.motionVersion) {
    // Old saves count 0/1/2 daily travel steps. Conversion moves no inventory.
    cart.route = cartRoad(cart.target);
    cart.routeDistance = roadLength(cart.route);
    cart.distance = cart.cargo > 0 ? Math.max(0, Math.min(1, (cart.progress || 0) / 2)) * cart.routeDistance : 0;
    cart.motionVersion = 1;
  }
  if (!Array.isArray(cart.route) || cart.route.length < 2) cart.route = readCartRoute(cart);
  cart.routeDistance = roadLength(cart.route);
  cart.distance = Math.max(0, Math.min(cart.routeDistance, Number.isFinite(cart.distance) ? cart.distance : 0));
  cart.progress = cart.routeDistance ? cart.distance / cart.routeDistance : 0;
  cart.moving = !cart.paused && ["transit", "returning"].includes(cart.status);
  return cart;
}
function takeFoodCauses(holder, key, amount) {
  let remaining = amount;
  const causes = [];
  for (const lot of holder[key] || []) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, Math.max(0, lot.amount));
    lot.amount -= used;
    remaining -= used;
    if (used && lot.cause) causes.push(lot.cause);
  }
  holder[key] = (holder[key] || []).filter(lot => lot.amount > 0);
  return [...new Set(causes)];
}
function rememberFood(holder, key, amount, cause) {
  if (amount > 0) (holder[key] ??= []).push({ amount, cause });
}
function advanceCart(w, elapsedMs, working) {
  const cart = prepareCart(w);
  const stop = status => { cart.status = status; cart.moving = false; };
  if (cart.paused) return stop("paused");
  if (!working) return stop("resting");
  let remainingMs = elapsedMs;
  while (remainingMs > 0) {
    if (cart.leg === "outbound" && !cart.cargo) {
      if (cart.dockMs > 0) {
        const loadingTime = Math.min(remainingMs, cart.dockMs);
        cart.dockMs -= loadingTime;
        remainingMs -= loadingTime;
        stop(w.depot > 0 ? "ready" : "empty");
        if (remainingMs <= 0) return;
      }
      const amount = Math.min(8, w.depot);
      if (amount <= 0) return stop("empty");
      const causes = takeFoodCauses(w, "depotFoodLots", amount);
      w.depot -= amount;
      cart.cargo = amount;
      cart.route = cartRoad(cart.target);
      cart.routeDistance = roadLength(cart.route);
      cart.distance = 0;
      cart.progress = 0;
      cart.loadCause = event(w, "logistics", `Xe nhận ${amount} khẩu phần tại kho, lên đường đến ${w.villages.find(v => v.id === cart.target).name}.`, "depot", causes);
    }
    const start = pointOnRoad(cart.route, cart.distance);
    const endOfSegment = cart.route[start.segment];
    const segmentRemaining = Math.hypot(endOfSegment.x - start.x, endOfSegment.z - start.z);
    const unitsPerMs = cart.routeDistance / cart.travelMs;
    const distance = Math.min(segmentRemaining, remainingMs * unitsPerMs);
    const ratio = segmentRemaining ? distance / segmentRemaining : 1;
    const destination = { x: start.x + (endOfSegment.x - start.x) * ratio, z: start.z + (endOfSegment.z - start.z) * ratio };
    if (!freeSegment(w, start, destination)) {
      // Approach the obstruction without crossing it; cargo stays on this cart.
      let lo = 0, hi = 1;
      for (let i = 0; i < 24; i++) {
        const t = (lo + hi) / 2;
        const candidate = { x: start.x + (destination.x - start.x) * t, z: start.z + (destination.z - start.z) * t };
        if (freeSegment(w, start, candidate)) lo = t; else hi = t;
      }
      cart.distance += distance * lo;
      cart.progress = cart.distance / cart.routeDistance;
      return stop("blocked");
    }
    cart.distance += distance;
    cart.progress = cart.distance / cart.routeDistance;
    remainingMs = Math.max(0, remainingMs - distance / unitsPerMs);
    cart.status = cart.leg === "return" ? "returning" : "transit";
    cart.moving = true;
    if (cart.distance >= cart.routeDistance - 1e-8) {
      if (cart.leg === "outbound") {
        const village = w.villages.find(v => v.id === cart.target), amount = cart.cargo;
        village.food += amount;
        const causes = [cart.loadCause, cart.target === "east" ? w.bridgeCause : null].filter(Boolean);
        const delivery = event(w, "logistics", `Xe giao ${amount} khẩu phần cho ${village.name}, đang quay về kho lấy chuyến tiếp theo.`, village.id, causes);
        rememberFood(village, "foodLots", amount, delivery);
        cart.cargo = 0;
        cart.loadCause = null;
        w.deliveries++;
        if (cart.target === "east") w.eastDeliveries = (w.eastDeliveries || 0) + 1;
        cart.leg = "return";
        cart.route = [...cart.route].reverse();
        cart.status = "returning";
      } else {
        cart.leg = "outbound";
        cart.route = cartRoad(cart.target);
        cart.dockMs = DAY_MS / 8;
        cart.status = w.depot > 0 ? "ready" : "empty";
      }
      cart.distance = 0;
      cart.progress = 0;
      cart.moving = cart.status === "returning";
    } else if (distance <= 1e-8) {
      // Avoid getting stuck exactly on a route corner.
      cart.distance = Math.min(cart.routeDistance, cart.distance + 1e-8);
    }
  }
}

export function settlementSummary(w, id) {
  const village = w.villages.find(v => v.id === id);
  if (!village) return null;
  const people = w.npcs.filter(n => n.village === id);
  const population = people.length, food = village.food;
  const hungry = people.filter(n => n.fedToday === false || n.hungryDays > 0).length;
  const capacity = housingCapacity(w, id);
  const foodDays = population ? food / population : 0;
  const reason = hungry ? `${hungry} người thiếu khẩu phần hôm nay. Cần tiếp tế hoặc tăng sản lượng.`
    : foodDays < 1 ? "Dự trữ chưa đủ một ngày; làng cần chuyến tiếp tế kế tiếp."
    : capacity <= population ? "Các giường đã có người ở. Xây thêm nhà để đón cư dân."
    : "Làng còn thức ăn và chỗ ở; có thể đón người từ nơi thiếu ăn.";
  return { id, name: village.name, population, capacity, food, foodDays,
    produced: village.daily?.produced ?? 0, consumed: village.daily?.consumed ?? 0,
    shortage: village.daily?.shortage ?? 0, trend: village.daily?.trend ?? 0, hungry,
    fishers: people.filter(n => n.job === "Đánh cá").length,
    farmers: people.filter(n => n.job === "Trồng trọt").length, reason };
}
export function worldReport(w) {
  const issues = [];
  const settlements = w.villages.map(v => settlementSummary(w, v.id)).sort((a, b) => b.hungry - a.hungry || a.foodDays - b.foodDays);
  for (const v of settlements) {
    if (v.hungry) issues.push({ title: `${v.name} thiếu thức ăn`, detail: `${v.hungry}/${v.population} người chưa đủ khẩu phần. Làng còn ${Math.floor(v.food)} khẩu phần.`, target: v.id });
    else if (v.population && v.foodDays < 1) issues.push({ title: `${v.name} sắp hết dự trữ`, detail: `Còn ${Math.floor(v.food)} khẩu phần cho ${v.population} người. Tiếp tế trước bữa ăn ngày tới.`, target: v.id });
  }
  if (w.cart?.status === "blocked") issues.push({ title: "Tuyến vận chuyển bị chặn", detail: `Xe đang giữ ${w.cart.cargo} khẩu phần; hàng vẫn ở trên xe. ${!w.bridge && w.cart.target !== "west" ? "Sửa cầu để nối lại tuyến." : "Cần mở đường trước khi xe tiếp tục."}`, target: !w.bridge && w.cart.target !== "west" ? "bridge" : "depot" });
  else if (w.cart?.paused) issues.push({ title: "Xe tiếp tế đang tạm dừng", detail: "Đến kho chung và tiếp tục chuyến xe khi bạn sẵn sàng.", target: "depot" });
  else if (w.depot <= 0 && !w.cart?.cargo) issues.push({ title: "Kho chung đã hết thức ăn", detail: w.crop >= 1 ? "Ruộng đã chín. Thu hoạch để bổ sung chuyến xe." : "Đợi ruộng chín hoặc chuyển thức ăn trong túi vào kho.", target: w.crop >= 1 ? "farm" : "depot" });
  if (w.fish < 30) issues.push({ title: "Đàn cá đang suy giảm", detail: `Nguồn cá còn ${Math.round(w.fish)}%. ${w.gate ? "Đóng cống một thời gian giúp dòng sông phục hồi." : "Giảm áp lực đánh bắt và chờ nguồn cá phục hồi."}`, target: "gate" });
  const latest = [...w.events].reverse().find(e => w.day - e.day <= 3 && (e.kind === "build" || e.kind === "logistics" && e.place !== "depot" || e.kind === "food"));
  return { issues: issues.slice(0, 3), positive: latest ? { title: "Thay đổi gần đây", detail: latest.text, target: latest.place } : null };
}
export function applyCommand(w, playerId, cmd, now = Date.now()) {
  ensureWorld(w);
  const p = w.players[playerId];
  requireThat(p, "Phiên chơi đã hết hạn.");
  requireThat(
    cmd && typeof cmd === "object" && typeof cmd.type === "string",
    "Lệnh không hợp lệ.",
  );
  let message = "";
  if (cmd.type === "character") {
    const profile = characterProfile(cmd);
    near(p, POINTS.home);
    Object.assign(p, profile);
    message = `Bạn đã chọn ${CLASSES[p.classId].name}.`;
  } else if (cmd.type === "skill") {
    requireThat(p.classId === "builder", "Kỹ năng này dành cho Thợ dựng.");
    requireThat(["collect", "focus"].includes(cmd.skill), "Kỹ năng không hợp lệ.");
    requireThat(now >= (p.cooldowns?.[cmd.skill] || 0), "Kỹ năng đang hồi. Hãy chờ một chút.");
    if (cmd.skill === "focus") {
      p.focusUntil = now + 15000;
      p.cooldowns = { ...p.cooldowns, focus: now + 60000 };
      message = "Tập trung: thu thập nhanh trong 15 giây.";
    } else {
      const sources = w.resources.filter(r => r.remaining > 0 && Math.hypot(r.x-p.x, r.z-p.z) <= 2);
      let capacity = Math.min(6, 40 - Object.values(p.bag).reduce((a,b)=>a+b,0));
      requireThat(capacity > 0, "Túi đã đầy (40 đơn vị).");
      requireThat(sources.length > 0, "Cần đứng trong 2 ô quanh nguồn gỗ hoặc đá còn vật liệu.");
      let total = 0;
      for (const r of sources) {
        const amount = Math.min(capacity, r.remaining);
        r.remaining -= amount; p.bag[r.type] += amount;
        if (r.type === "wood") w.trees = Math.max(0, w.trees - amount * 0.25);
        capacity -= amount; total += amount;
        if (!capacity) break;
      }
      p.cooldowns = { ...p.cooldowns, collect: now + 30000 };
      message = `Đã gom ${total} vật liệu quanh bạn.`;
    }
  } else if (cmd.type === "build") {
    const problem = placementProblem(w, playerId, cmd.kind, cmd.x, cmd.z);
    requireThat(!problem, problem);
    const definition = BUILDINGS[cmd.kind];
    spend(p, definition);
    const village = ["west", "east"].sort(
      (a, b) =>
        Math.hypot(cmd.x - POINTS[a].x, cmd.z - POINTS[a].z) -
        Math.hypot(cmd.x - POINTS[b].x, cmd.z - POINTS[b].z),
    )[0];
    if (cmd.kind === "house" && !w.housingBase)
      w.housingBase = Object.fromEntries(
        w.villages.map((v) => [
          v.id,
          Math.max(12, w.npcs.filter((n) => n.village === v.id).length),
        ]),
      );
    w.buildingSeq = (w.buildingSeq || 0) + 1;
    const building = {
      id: `building-${w.buildingSeq}`,
      kind: cmd.kind,
      x: cmd.x,
      z: cmd.z,
      owner: playerId,
      village,
      stock: { wood: 0, stone: 0, food: 0, fiber: 0, clay: 0 },
      progress: 0,
      animals: cmd.kind === "pasture" ? 2 : 0,
    };
    (w.buildings ??= []).push(building);
    building.cause = event(
      w,
      "build",
      `${p.name} xây ${definition.name.toLowerCase()} tại ô ${cmd.x}, ${cmd.z}${cmd.kind === "house" ? `: thêm 2 chỗ ở cho ${w.villages.find((v) => v.id === village).name}` : cmd.kind === "storehouse" ? " với sức chứa 80 đơn vị" : ": mở rộng vùng sản xuất của làng"}.`,
      building.id,
    );
    message = `Đã xây ${definition.name.toLowerCase()}.`;
  } else if (cmd.type === "storage") {
    const b = (w.buildings || []).find((b) => b.id === cmd.target);
    requireThat(b && b.kind === "storehouse", "Không tìm thấy kho cá nhân.");
    requireThat(b.owner === playerId, "Chỉ chủ kho được cất hoặc lấy hàng.");
    near(p, b);
    requireThat(
      Object.hasOwn(ITEMS, cmd.resource),
      "Vật liệu không hợp lệ.",
    );
    requireThat(
      Number.isInteger(cmd.amount) && cmd.amount > 0 && cmd.amount <= 40,
      "Số lượng phải từ 1 đến 40.",
    );
    requireThat(
      cmd.direction === "deposit" || cmd.direction === "withdraw",
      "Thao tác kho không hợp lệ.",
    );
    const source = cmd.direction === "deposit" ? p.bag : b.stock,
      dest = cmd.direction === "deposit" ? b.stock : p.bag,
      limit = cmd.direction === "deposit" ? 80 : 40;
    requireThat(
      source[cmd.resource] >= cmd.amount,
      "Không đủ vật liệu để chuyển.",
    );
    requireThat(
      Object.values(dest).reduce((a, b) => a + b, 0) + cmd.amount <= limit,
      cmd.direction === "deposit"
        ? "Kho đã đầy (80 đơn vị)."
        : "Túi đã đầy (40 đơn vị).",
    );
    source[cmd.resource] -= cmd.amount;
    dest[cmd.resource] += cmd.amount;
    message = `Đã ${cmd.direction === "deposit" ? "cất" : "lấy"} ${cmd.amount} ${ITEMS[cmd.resource]}.`;
  } else if (cmd.type === "collect-building") {
    const b = (w.buildings || []).find(building => building.id === cmd.target);
    requireThat(b && ["field", "pasture"].includes(b.kind), "Đây không phải công trình sản xuất.");
    near(p, b);
    const available = b.stock?.food || 0;
    const room = 40 - Object.values(p.bag).reduce((sum, amount) => sum + amount, 0);
    const amount = Math.min(available, room);
    requireThat(amount > 0, available ? "Túi đã đầy." : "Chưa có sản phẩm để thu gom.");
    b.stock.food -= amount;
    p.bag.food += amount;
    message = `Đã thu ${amount} thức ăn từ ${BUILDINGS[b.kind].name.toLowerCase()}.`;
  } else if (cmd.type === "trade") {
    near(p, POINTS.market);
    const recipes = {
      fiber_wood: { give: ["fiber", 3], take: ["wood", 2], label: "3 sợi cỏ đổi 2 gỗ" },
      clay_stone: { give: ["clay", 3], take: ["stone", 2], label: "3 đất sét đổi 2 đá" },
      food_fiber: { give: ["food", 2], take: ["fiber", 3], label: "2 thức ăn đổi 3 sợi cỏ" },
      wood_clay: { give: ["wood", 2], take: ["clay", 2], label: "2 gỗ đổi 2 đất sét" },
    };
    const recipe = recipes[cmd.recipe];
    requireThat(recipe, "Món trao đổi không hợp lệ.");
    const [give, giveAmount] = recipe.give, [take, takeAmount] = recipe.take;
    requireThat((p.bag[give] || 0) >= giveAmount, `Không đủ ${ITEMS[give]} để trao đổi.`);
    const used = Object.values(p.bag).reduce((sum, amount) => sum + amount, 0);
    requireThat(used - giveAmount + takeAmount <= 40, "Túi không đủ chỗ cho món nhận về.");
    p.bag[give] -= giveAmount;
    p.bag[take] += takeAmount;
    p.trades = (p.trades || 0) + 1;
    event(w, "trade", `${p.name} trao đổi tại Chợ Phiên: ${recipe.label}.`, "market");
    message = `Trao đổi thành công: ${recipe.label}.`;
  } else if (cmd.type === "glide") {
    requireThat(Array.isArray(cmd.steps) && cmd.steps.length > 0 && cmd.steps.length <= 64, "Đoạn đường không hợp lệ.");
    let from = p; const lengths=[];
    for(const step of cmd.steps) {
      requireThat(step && typeof step.x === "number" && typeof step.z === "number", "Tọa độ không hợp lệ.");
      const distance=Math.hypot(step.x-from.x,step.z-from.z);
      requireThat(distance>0 && distance<=.4 && freeSegment(w,from,step), "Đường đi đã bị chặn.");
      lengths.push(distance); from=step;
    }
    let budget=Math.min(4000,Math.max(0,now-(p.lastMove || now-50))) / 1000 * MOVE_SPEED, count=0;
    while(count<lengths.length && lengths[count]<=budget+1e-8) budget-=lengths[count++];
    if(count) {
      p.x=cmd.steps[count-1].x; p.z=cmd.steps[count-1].z;
      p.lastMove=now-Math.max(0,budget)/MOVE_SPEED*1000;
      p.moveSeq=(p.moveSeq||0)+count;
    }
  } else if (cmd.type === "walk") {
    requireThat(
      Array.isArray(cmd.steps) && cmd.steps.length > 0 && cmd.steps.length <= 8,
      "Đoạn đường không hợp lệ.",
    );
    let x = p.x,
      z = p.z;
    for (const step of cmd.steps) {
      requireThat(
        step &&
          Number.isInteger(step.x) &&
          Number.isInteger(step.z) &&
          walkable(w, step.x, step.z) &&
          Math.abs(step.x - x) + Math.abs(step.z - z) === 1,
        "Đường đi đã bị chặn.",
      );
      x = step.x;
      z = step.z;
    }
    const budget = Math.min(1280, Math.max(0, now - (p.lastMove || now - 160)));
    const count = Math.min(cmd.steps.length, Math.floor(budget / 160));
    if (count) {
      p.x = cmd.steps[count - 1].x;
      p.z = cmd.steps[count - 1].z;
      p.lastMove = now - (budget - count * 160);
      p.moveSeq = (p.moveSeq || 0) + count;
    }
  } else if (cmd.type === "move") {
    requireThat(now - p.lastMove >= 160, "Bạn đang di chuyển quá nhanh.");
    requireThat(
      walkable(w, cmd.x, cmd.z) &&
        Math.abs(cmd.x - p.x) + Math.abs(cmd.z - p.z) === 1,
      "Đường đi bị chặn. Hãy sửa cầu để qua sông.",
    );
    p.x = cmd.x;
    p.z = cmd.z;
    p.lastMove = now;
  } else if (cmd.type === "gather") {
    const r = w.resources.find((r) => r.id === cmd.target);
    requireThat(r, "Không tìm thấy tài nguyên.");
    near(p, r);
    requireThat(
      now - p.lastGather >= (p.classId === "builder" && p.focusUntil > now ? 250 : 500),
      "Đợi một chút trước lần thu thập tiếp theo.",
    );
    requireThat(r.remaining > 0, "Nguồn này đã cạn.");
    requireThat(
      Object.values(p.bag).reduce((a, b) => a + b, 0) < 40,
      "Túi đã đầy (40 đơn vị).",
    );
    const amount = Math.min(p.classId === "builder" && r.type === "stone" ? 2 : 1, r.remaining,
      40 - Object.values(p.bag).reduce((a,b)=>a+b,0));
    r.remaining -= amount;
    p.bag[r.type] += amount;
    p.lastGather = now;
    if (r.type === "wood") w.trees = Math.max(0, w.trees - 0.25);
    if (r.remaining <= 0) r.depletedDay = w.day;
    message = `Đã nhặt ${amount} ${ITEMS[r.type] || r.type}.`;
  } else if (cmd.type === "bridge") {
    near(p, { x: 14, z: 17 });
    requireThat(!w.bridge, "Cầu đã được sửa.");
    spend(p, 8, 4);
    w.bridge = true;
    const cart = prepareCart(w);
    cart.status = cart.paused ? "paused" : cart.leg === "return" ? "returning" : cart.cargo ? "transit" : w.depot ? "ready" : "empty";
    cart.moving = ["transit", "returning"].includes(cart.status);
    w.bridgeCause = event(
      w,
      "build",
      "Cầu được sửa bằng 8 gỗ và 4 đá. Tuyến xe sang Làng Hạ đã thông.",
      "bridge",
      [1],
    );
    message = "Cầu đã thông. Xe có thể giao lương thực từ kho.";
  } else if (cmd.type === "gate") {
    near(p, POINTS.gate);
    requireThat(typeof cmd.open === "boolean", "Trạng thái cống không hợp lệ.");
    requireThat(cmd.open !== w.gate, "Cống đang ở trạng thái này.");
    if (!w.gateCause) spend(p, 4, 2);
    w.gate = cmd.open;
    w.gateCause = event(
      w,
      "water",
      w.gate
        ? "Mở cống: ruộng nhận thêm nước; dòng sông hạ lưu giảm."
        : "Đóng cống: khôi phục nước hạ lưu, ruộng phụ thuộc vào mưa.",
      "gate",
      w.gateCause ? [w.gateCause] : [],
    );
    message = w.gate ? "Đã mở cống tưới." : "Đã đóng cống tưới.";
  } else if (cmd.type === "harvest") {
    near(p, POINTS.farm);
    requireThat(
      w.crop >= 1,
      "Cây chưa chín. Hãy điều tiết nước và chờ vụ mới.",
    );
    const yieldCount = Math.floor(8 + 12 * w.moisture);
    w.depot += yieldCount;
    w.crop = 0;
    w.harvests++;
    const harvestCause = event(
      w,
      "food",
      `Thu hoạch ${yieldCount} khẩu phần, chuyển vào kho chung.`,
      "farm",
      w.gateCause ? [w.gateCause] : [],
    );
    rememberFood(w, "depotFoodLots", yieldCount, harvestCause);
    message = `Đã đưa ${yieldCount} khẩu phần vào kho.`;
  } else if (cmd.type === "cart-control") {
    near(p, POINTS.depot);
    requireThat(typeof cmd.paused === "boolean", "Chọn tiếp tục hoặc tạm dừng xe.");
    requireThat(cmd.target === undefined || ["west", "east"].includes(cmd.target), "Điểm giao hàng không hợp lệ.");
    const cart = prepareCart(w);
    if (cmd.target && cmd.target !== cart.target) {
      requireThat(cart.cargo === 0 && cart.leg === "outbound" && cart.distance === 0, "Chỉ đổi nơi nhận khi xe đã trở về kho và không mang hàng.");
      cart.target = cmd.target;
      cart.route = cartRoad(cart.target);
      cart.routeDistance = roadLength(cart.route);
    }
    cart.paused = cmd.paused;
    cart.status = cart.paused ? "paused" : cart.leg === "return" ? "returning" : cart.cargo ? "transit" : w.depot > 0 ? "ready" : "empty";
    cart.moving = !cart.paused && ["transit", "returning"].includes(cart.status);
    message = cart.paused ? "Đã tạm dừng xe. Toàn bộ hàng vẫn được giữ trên xe." : `Xe tiếp tục tuyến ${w.villages.find(v => v.id === cart.target).name}.`;
  } else if (cmd.type === "stock-food") {
    near(p, POINTS.depot);
    requireThat(Number.isInteger(cmd.amount) && cmd.amount > 0 && cmd.amount <= 40, "Số khẩu phần cần từ 1 đến 40.");
    requireThat(p.bag.food >= cmd.amount, "Túi không đủ khẩu phần để chuyển.");
    p.bag.food -= cmd.amount;
    w.depot += cmd.amount;
    const cause = event(w, "food", `${p.name} đưa ${cmd.amount} khẩu phần vào kho chung để tiếp tế.`, "depot");
    rememberFood(w, "depotFoodLots", cmd.amount, cause);
    message = `Đã chuyển ${cmd.amount} khẩu phần vào kho chung.`;
  } else if (cmd.type === "supply") {
    near(p, POINTS.depot);
    requireThat(w.depot > 0, "Kho đã hết lương thực.");
    const amount = Math.min(
      8,
      w.depot,
      40 - Object.values(p.bag).reduce((a, b) => a + b, 0),
    );
    requireThat(amount > 0, "Túi đã đầy.");
    takeFoodCauses(w, "depotFoodLots", amount);
    w.depot -= amount;
    p.bag.food += amount;
    message = `Đã lấy ${amount} khẩu phần từ kho.`;
  } else if (cmd.type === "donate") {
    requireThat(
      cmd.target === "west" || cmd.target === "east",
      "Làng không hợp lệ.",
    );
    near(p, POINTS[cmd.target]);
    requireThat(p.bag.food > 0, "Bạn chưa mang thức ăn.");
    const v = w.villages.find((v) => v.id === cmd.target);
    const amount = p.bag.food;
    v.food += amount;
    p.bag.food = 0;
    const cause = event(
      w,
      "food",
      `${p.name} giao ${amount} khẩu phần cho ${v.name}.`,
      cmd.target,
      [],
    );
    rememberFood(v, "foodLots", amount, cause);
    if (cmd.target === "east") w.eastDeliveries = (w.eastDeliveries || 0) + 1;
    message = "Đã giao thức ăn.";
  } else if (cmd.type === "explore") {
    near(p, POINTS.ruin);
    requireThat(!p.discoveries.includes("ruin"), "Bạn đã đọc dấu tích này.");
    p.discoveries.push("ruin");
    event(
      w,
      "knowledge",
      "Tìm thấy vạch đo nước cũ ở tàn tích: lấy nước tưới quá lâu có thể làm giảm đàn cá hạ lưu.",
      "ruin",
    );
    message = "Đã ghi lại tri thức về mực nước.";
  } else if (cmd.type === "survey-region") {
    requireThat(["mistwood", "highland"].includes(cmd.target), "Vùng khám phá không hợp lệ.");
    near(p, POINTS[cmd.target]);
    requireThat(!p.discoveries.includes(cmd.target), "Bạn đã khảo sát vùng này.");
    p.discoveries.push(cmd.target);
    const item = cmd.target === "mistwood" ? "fiber" : "clay";
    const room = 40 - Object.values(p.bag).reduce((sum, amount) => sum + amount, 0);
    const found = Math.min(2, room);
    p.bag[item] += found;
    event(w, "knowledge", `${p.name} mở bản đồ ${cmd.target === "mistwood" ? "Rừng Sương" : "Cao nguyên Đỏ"} và tìm thấy ${found} ${ITEMS[item]}.`, cmd.target);
    message = `Đã khảo sát vùng mới${found ? ` và tìm thấy ${found} ${ITEMS[item]}` : ""}.`;
  } else {
    throw new Error("Lệnh không được hỗ trợ.");
  }
  p.seen = now;
  return message;
}
export function simulateDay(w, production = true) {
  ensureWorld(w);
  w.day++;
  const phase = (w.day - 1) % 12;
  w.weather =
    phase === 5 || phase === 6 ? "Mưa lớn" : phase >= 9 ? "Hạn" : "Nắng";
  const rain =
    w.weather === "Mưa lớn" ? 0.22 : w.weather === "Hạn" ? -0.12 : 0.025;
  w.moisture = Math.max(
    0,
    Math.min(1, w.moisture + rain + (w.gate ? 0.16 : -0.045)),
  );
  w.fish = Math.max(
    0,
    Math.min(100, w.fish + (w.gate ? -5 : 3) + (w.weather === "Hạn" ? -2 : 0)),
  );
  w.grass = Math.max(0, Math.min(100, w.grass + 4 * w.moisture - 1.5));
  w.grazers = Math.max(
    0,
    Math.min(30, w.grazers + (w.grass > 40 ? 0.3 : -0.5)),
  );
  w.predators = Math.max(
    0,
    Math.min(8, w.predators + (w.grazers > 12 ? 0.08 : -0.12)),
  );
  w.crop = Math.min(1, w.crop + w.moisture * 0.4);
  for (const r of w.resources) {
    if (r.remaining >= r.capacity) { r.regrowth = 0; continue; }
    const weatherFactor = w.weather === "Mưa lớn" ? 1.45 : w.weather === "Hạn" ? 0.45 : 1;
    const rate = r.type === "wood" ? (0.08 + w.moisture * 0.2) * weatherFactor
      : r.type === "fiber" ? (0.18 + w.moisture * 0.32) * weatherFactor
      : r.type === "clay" ? (w.weather === "Mưa lớn" ? 0.2 : 0.045)
      : (w.weather === "Mưa lớn" ? 0.07 : 0.018);
    r.regrowth += rate * r.fertility;
    const restored = Math.min(r.capacity - r.remaining, Math.floor(r.regrowth));
    if (restored > 0) { r.remaining += restored; r.regrowth -= restored; }
  }
  const livingWood = w.resources.filter(r => r.type === "wood").reduce((sum, r) => sum + r.remaining, 0);
  w.trees = Math.max(0, Math.min(100, w.trees + (livingWood > 35 ? 0.45 : -0.15) + (w.weather === "Mưa lớn" ? 0.35 : 0)));
  for (const village of w.villages) {
    const people = w.npcs.filter(n => n.village === village.id).sort((a, b) => a.id.localeCompare(b.id));
    const sites = w.buildings.filter(b => ["field", "pasture"].includes(b.kind) && b.village === village.id);
    let worker = 0;
    for (const n of people) {
      if (n.job === "Trồng trọt") {
        const site = sites.length ? sites[worker++ % sites.length] : { id: "farm", ...POINTS.farm };
        n.worksite = site.id; n.workX = site.x; n.workZ = site.z;
        n.activity = site.kind === "pasture" ? "Chăm đàn vật nuôi" : "Chăm ruộng và thu hoạch";
      } else {
        n.worksite = "river";
        n.workX = village.id === "east" ? 18.7 : 13.3;
        n.workZ = 9 + (Number(n.id.split("-").at(-1)) % 18);
        n.activity = "Đánh cá và theo dõi nguồn nước";
      }
    }
  }
  for (const b of w.buildings.filter(b => ["field", "pasture"].includes(b.kind))) {
    const workers = w.npcs.filter(n => n.worksite === b.id).length;
    if (b.kind === "field") {
      b.progress += (0.12 + w.moisture * 0.32) * (1 + workers * 0.12);
      if (b.progress >= 1 && b.stock.food < 80) {
        const cycles = Math.floor(b.progress), amount = Math.min(80 - b.stock.food, cycles * (4 + Math.min(3, workers)));
        b.stock.food += amount; b.progress -= cycles; b.lastYield = amount;
      }
    } else {
      if (w.grass > 45 && w.day % 4 === 0) b.animals = Math.min(8, b.animals + 1);
      if (w.grass < 18 && b.animals > 2) b.animals--;
      const amount = Math.min(80 - b.stock.food, Math.floor(b.animals * 0.35 + workers * 0.4));
      if (amount > 0) { b.stock.food += amount; b.lastYield = amount; w.grass = Math.max(0, w.grass - b.animals * 0.22); }
    }
  }
  // Cart work advances only in advance(), split at work-credit boundaries.
  // Daily ecology and villagers' own subsistence continue when automation rests.
  prepareCart(w);
  if (!production && !w.cart.paused) { w.cart.status = "resting"; w.cart.moving = false; }
  w.housingBase ??= Object.fromEntries(w.villages.map(v => [v.id, Math.max(12, w.npcs.filter(n => n.village === v.id).length)]));
  const fishYield = w.fish / 100 * 1.1;
  let catches = 0;
  for (const v of w.villages) {
    const people = w.npcs.filter(n => n.village === v.id).sort((a, b) => a.id.localeCompare(b.id));
    const fishers = people.filter(n => n.job === "Đánh cá").length;
    const farmYield = w.moisture * (v.id === "west" ? 1.2 : 0.9);
    const caught = Math.min(Math.max(0, Math.floor(w.fish - catches)), Math.floor(fishers * fishYield));
    const planted = (people.length - fishers) * farmYield + (v.harvestCarry || 0);
    const grown = Math.floor(planted);
    v.harvestCarry = planted - grown;
    catches += caught;
    const produced = caught + grown, before = v.food;
    v.food += produced;
    const consumed = Math.min(people.length, Math.floor(v.food));
    const rotation = people.length ? w.day % people.length : 0;
    const rank = new Map(people.map((n, i) => [n.id, (i - rotation + people.length) % people.length]));
    // Feed the longest hungry first. Rotate ties so a scarce final ration does
    // not always go to the same resident because of array order.
    const rationOrder = [...people].sort((a, b) => (b.hungryDays || 0) - (a.hungryDays || 0) || rank.get(a.id) - rank.get(b.id));
    const fed = new Set(rationOrder.slice(0, consumed).map(n => n.id));
    const mealCauses = takeFoodCauses(v, "foodLots", consumed);
    v.food -= consumed;
    v.daily = { day: w.day, produced, consumed, shortage: people.length - consumed, trend: v.food - before };
    if (mealCauses.length) v.mealCause = event(w, "food", `${v.name} chia ${consumed} khẩu phần cho cư dân, có sử dụng thức ăn vừa được tiếp tế. Còn ${v.food} khẩu phần trong làng.`, v.id, mealCauses);
    for (const n of people) {
      n.fedToday = fed.has(n.id);
      n.hungryDays = n.fedToday ? 0 : (n.hungryDays || 0) + 1;
      n.hungerDebt = Math.max(0, (n.hungerDebt || 0) + (n.fedToday ? -0.5 : 1));
      n.lastDecisionReason ??= n.fedToday ? "Ở lại làng, làm việc và nhận khẩu phần hằng ngày." : "Đang chờ thêm thức ăn tại làng.";
    }
    const betterJob = farmYield > fishYield + 0.15 ? "Trồng trọt" : fishYield > farmYield + 0.15 ? "Đánh cá" : null;
    const candidate = rationOrder.find(n => betterJob && n.job !== betterJob && (n.hungryDays >= 2 || n.hungerDebt >= 2) && w.day - (n.jobChangedDay ?? -5) >= 5);
    if (candidate) {
      const from = candidate.job;
      candidate.job = betterJob;
      candidate.jobChangedDay = w.day;
      candidate.lastDecisionReason = betterJob === "Trồng trọt"
        ? `Chuyển sang trồng trọt vì ruộng ẩm ${Math.round(w.moisture * 100)}% cho sản lượng tốt hơn đánh cá.`
        : `Chuyển sang đánh cá vì nguồn cá ${Math.round(w.fish)}% cho sản lượng tốt hơn ruộng hiện tại.`;
      candidate.decisionCause = event(w, "npc", `${candidate.name} đổi nghề từ ${from.toLowerCase()} sang ${betterJob.toLowerCase()} sau những bữa thiếu ăn. ${candidate.lastDecisionReason}`, v.id);
    }
  }
  w.fish = Math.max(0, w.fish - catches * 0.6);
  // Decide from a shared post-meal snapshot; at most one resident leaves each
  // village per day. Applying decisions never creates or replaces an NPC.
  const snapshots = w.villages.map(v => ({ v, people: w.npcs.filter(n => n.village === v.id), food: v.food }));
  const decisions = [];
  for (const source of snapshots) {
    if (source.people.length <= 2) continue;
    const destination = snapshots.find(other => other.v.id !== source.v.id);
    if (!destination) continue;
    const sourceCoverage = source.food / source.people.length;
    const destinationCoverage = destination.food / (destination.people.length + 1);
    if (destinationCoverage < 1 || destinationCoverage < sourceCoverage + 0.75 || destination.people.length >= housingCapacity(w, destination.v.id)) continue;
    if (!w.bridge || !findRoute(w, POINTS[source.v.id], POINTS[destination.v.id])) continue;
    const n = [...source.people].sort((a, b) => (b.hungerDebt || 0) - (a.hungerDebt || 0) || a.id.localeCompare(b.id))
      .find(person => (person.hungryDays >= 3 || person.hungerDebt >= 3) && w.day - (person.movedDay ?? -7) >= 7);
    if (n) decisions.push({ n, source, destination });
  }
  for (const { n, source, destination } of decisions) {
    const count = w.npcs.filter(person => person.village === destination.v.id).length;
    if (count >= housingCapacity(w, destination.v.id)) continue;
    n.village = destination.v.id;
    n.movedDay = w.day;
    n.lastDecisionReason = `Rời ${source.v.name} sau nhiều bữa thiếu ăn: ${destination.v.name} còn giường và dự trữ tốt hơn, đường qua cầu đã thông.`;
    const houses = (w.buildings || []).filter(b => b.kind === "house" && b.village === destination.v.id && b.cause).map(b => b.cause);
    n.decisionCause = event(w, "npc", `${n.name} ${n.lastDecisionReason.charAt(0).toLowerCase()}${n.lastDecisionReason.slice(1)}`, destination.v.id, [w.bridgeCause, ...houses].filter(Boolean));
  }
}
export function advance(w, now, active, speed = 30) {
  ensureWorld(w);
  requireThat(now >= w.lastWall, "Đồng hồ máy chủ đi lùi.");
  if (active) {
    // Process the prior absence before resuming, using its original deadline.
    if (w.absenceStartedAt !== null) advance(w, now, false, speed);
    w.absenceStartedAt = null;
    w.offlineUntil = null;
    w.lastActive = now;
  } else if (w.absenceStartedAt === null) {
    w.absenceStartedAt = w.lastWall;
    w.offlineUntil = w.lastWall + OFFLINE_MS;
  }
  const end = active ? now : Math.min(now, w.offlineUntil);
  let elapsed = Math.max(0, end - w.lastWall);
  prepareCart(w);
  // Max 4320 simulated days per absence at prototype speed 30; no per-frame loop.
  while (elapsed > 0) {
    const credit = Math.max(0, w.creditMs || 0);
    const working = active || credit > 0;
    const slice = Math.min(elapsed, (DAY_MS - w.dayProgress) / speed, !active && working ? credit : Infinity);
    advanceCart(w, slice * speed, working);
    if (!active) w.creditMs = Math.max(0, w.creditMs - slice);
    w.dayProgress += slice * speed;
    elapsed -= slice;
    if (w.dayProgress >= DAY_MS - 0.001) {
      w.dayProgress = 0;
      simulateDay(w, working);
    }
  }
  w.lastWall = now;
}
