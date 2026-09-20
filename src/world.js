export const SIZE = 96;
export const BAG_CAPACITY = 64;
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
  farreach: { x: 54, z: 48 },
  marsh: { x: 74, z: 18 },
  ashlands: { x: 82, z: 50 },
  frostlands: { x: 76, z: 80 },
};
export const BUILDINGS = {
  house: { name: "Nhà nhỏ", wood: 6, stone: 2, beds: 2 },
  storehouse: { name: "Kho cá nhân", wood: 4, stone: 2, capacity: 80 },
  field: { name: "Ruộng canh tác", wood: 4, stone: 1, fiber: 2, output: "food" },
  pasture: { name: "Chuồng chăn nuôi", wood: 6, stone: 2, fiber: 4, output: "food" },
  lumberyard: { name: "Trại lâm nghiệp", wood: 8, stone: 2, tool: 1, output: "wood" },
  quarry: { name: "Mỏ khai thác", wood: 6, stone: 5, tool: 1, output: "stone" },
  workshop: { name: "Xưởng công cụ", wood: 10, stone: 6, clay: 4, output: "tool" },
  canal: { name: "Kênh dẫn nước", stone: 2, clay: 4, output: "water" },
  marketstall: { name: "Quầy giao thương", wood: 8, fiber: 4, clay: 2, output: "trade" },
};
export const ITEMS = {
  wood: "gỗ", stone: "đá", food: "khẩu phần", fiber: "sợi cỏ", clay: "đất sét",
  seed: "hạt giống", grain: "ngũ cốc", vegetable: "rau củ", fruit: "trái cây",
  herb: "thảo dược", wool: "len", milk: "sữa", egg: "trứng", leather: "da thuộc",
  ore: "quặng", tool: "công cụ", plank: "ván gỗ", brick: "gạch nung",
  sword: "kiếm", bow: "cung", spear: "giáo",
};
export const TALENTS = {
  vitality: { name: "Sinh lực", branch: "Sinh tồn", max: 5, detail: "+10 máu mỗi điểm" },
  hunter: { name: "Thợ săn", branch: "Chiến đấu", max: 5, detail: "+2 sát thương mỗi điểm" },
  swift: { name: "Nhanh tay", branch: "Chiến đấu", max: 3, detail: "Giảm 8% hồi chiêu mỗi điểm" },
  naturalist: { name: "Hiểu tự nhiên", branch: "Sinh tồn", max: 4, detail: "Tăng chiến lợi phẩm và khả năng quan sát" },
  cultivator: { name: "Nhà canh tác", branch: "Sản xuất", max: 5, detail: "+1 sản lượng mỗi điểm" },
};
export const COMBAT_SKILLS = {
  strike: { name: "Đánh thường", cooldown: 1200, multiplier: 1, range: 2.5 },
  cleave: { name: "Quét rộng", cooldown: 5000, multiplier: 1.8, range: 2.8 },
  volley: { name: "Loạt tên", cooldown: 6500, multiplier: 1.55, range: 7 },
};
export const WILDLIFE = {
  deer: { name: "Hươu", hp: 34, speed: .7, diet: "grass", temperament: "prey" },
  boar: { name: "Lợn rừng", hp: 48, speed: .55, diet: "plants", temperament: "defensive" },
  wolf: { name: "Sói", hp: 58, speed: .9, diet: "meat", temperament: "predator" },
  rabbit: { name: "Thỏ", hp: 18, speed: 1.1, diet: "grass", temperament: "prey" },
  bear: { name: "Gấu", hp: 90, speed: .45, diet: "mixed", temperament: "predator" },
  fish: { name: "Cá sông", hp: 12, speed: .8, diet: "algae", temperament: "aquatic" },
};
export const CROPS = {
  grain: { name: "Lúa", item: "grain", moisture: .48, days: 3, yield: 7 },
  vegetable: { name: "Rau củ", item: "vegetable", moisture: .62, days: 4, yield: 6 },
  herb: { name: "Thảo dược", item: "herb", moisture: .38, days: 5, yield: 4 },
  fruit: { name: "Cây ăn trái", item: "fruit", moisture: .56, days: 7, yield: 8 },
};
export const LIVESTOCK = {
  chicken: { name: "Gà", item: "egg", grass: .15, days: 1, yield: 3 },
  cow: { name: "Bò", item: "milk", grass: .7, days: 2, yield: 3 },
  sheep: { name: "Cừu", item: "wool", grass: .48, days: 3, yield: 3 },
  goat: { name: "Dê", item: "milk", grass: .35, days: 2, yield: 2 },
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
    (z === 32 && x >= 18 && x <= 54) ||
    (x === 54 && z >= 32 && z <= 48)
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
    p.xp ??= 0;
    p.level ??= 1;
    p.achievements ??= [];
    p.stats ??= { gathered: 0, built: 0, harvested: 0, traded: 0, explored: 0 };
    p.profession ??= { tier: 1, title: CLASSES[p.classId]?.name || "Người khai phá" };
    p.talents ??= Object.fromEntries(Object.keys(TALENTS).map(key => [key, 0]));
    for (const key of Object.keys(TALENTS)) p.talents[key] ??= 0;
    p.talentPoints ??= p.unspentPower || 0;
    p.maxHp = 100 + (p.talents.vitality || 0) * 10;
    p.hp = Math.min(p.maxHp, p.hp ?? p.maxHp);
    p.equipment ??= { weapon: null };
    p.combatCooldowns ??= {};
    p.kills ??= 0;
    p.powers = { gather: Math.floor((p.level || 1) / 5), production: Math.floor((p.level || 1) / 7), trade: Math.floor((p.level || 1) / 10) };
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
  for (const n of w.npcs || []) {
    const seed = Number(n.id.split("-").at(-1)) || 1;
    n.traits ??= ["Chăm chỉ", "Tò mò", "Thận trọng", "Hào phóng", "Độc lập"].filter((_, i) => (seed + i * 3) % 4 === 0).slice(0, 2);
    n.needs ??= { hunger: n.hungryDays ? 35 : 78, energy: 70, social: 60, safety: 72, purpose: 65 };
    n.mood ??= "Bình tâm";
    n.thought ??= n.lastDecisionReason || "Hôm nay cần làm điều có ích cho làng.";
    n.goal ??= n.job === "Đánh cá" ? "Giữ nguồn cá ổn định" : "Tăng dự trữ lương thực";
    n.skill ??= 1 + (seed % 4);
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
    if (b.kind === "field") b.cropType ??= "grain";
    if (b.kind === "pasture") { b.animals ??= 2; b.animalType ??= "chicken"; }
  }
  const ids = new Set(w.resources.map(r => r.id));
  for (const [id, type, x, z, capacity] of expansionResources) if (!ids.has(id)) {
    w.resources.push({ id, type, x, z, remaining: capacity, capacity, regrowth: 0,
      fertility: 0.78 + ((x * 7 + z * 3) % 8) * 0.04 });
  }
  for (let i = 0; w.resources.length < 144 && i < 1024; i++) {
    const x = 3 + ((i * 17 + 9) % (SIZE - 7));
    const z = 3 + ((i * 29 + 13) % (SIZE - 7));
    if ((x >= 14 && x <= 18) || reservedTile(x, z) || w.resources.some(r => Math.hypot(r.x - x, r.z - z) < 1.5)) continue;
    const type = ["wood", "fiber", "stone", "wood", "clay", "herb", "ore", "fiber"][i % 8];
    const capacity = type === "wood" ? 12 : type === "fiber" || type === "herb" ? 14 : 10;
    w.resources.push({ id: `frontier-resource-${i}`, type, x, z, remaining: capacity, capacity, regrowth: 0,
      fertility: 0.76 + ((x * 5 + z * 7) % 9) * 0.035 });
  }
  w.marketStock ??= Object.fromEntries(Object.keys(ITEMS).map(key => [key, key === "food" ? 24 : 8]));
  w.developments ??= [];
  w.worldEra ??= Math.max(1, Math.floor((w.day || 1) / 360) + 1);
  w.biodiversity ??= { crops: ["grain"], livestock: ["chicken"], mutations: 0 };
  w.wildlife ??= Array.from({ length: 42 }, (_, i) => {
    const type = ["deer","rabbit","boar","fish","deer","wolf","rabbit","bear"][i % 8];
    const aquatic = type === "fish";
    const x = aquatic ? 15.4 + (i % 3) * .55 : 3 + ((i * 19 + 7) % 88);
    const z = aquatic ? 4 + ((i * 13) % 78) : 3 + ((i * 31 + 11) % 88);
    return { id: `wild-${i + 1}`, type, x, z, hp: WILDLIFE[type].hp, hunger: 25 + i % 50, thirst: 20 + i % 45, state: "foraging", respawnDay: 0 };
  });
  for (const animal of w.wildlife) {
    const def = WILDLIFE[animal.type] || WILDLIFE.rabbit;
    animal.hp ??= def.hp; animal.hunger ??= 30; animal.thirst ??= 30; animal.state ??= "foraging"; animal.respawnDay ??= 0;
  }
  w.expansionVersion = 2;
  return w;
}
// Continuous navigation uses expanded obstacle rectangles (actor radius 0.22).
export const MOVE_SPEED = 5;
export function obstacles(w) {
  const river = w.bridge ? [[14.28,0,17.72,16.72],[14.28,17.28,17.72,SIZE]] : [[14.28,0,17.72,SIZE]];
  return [...river, ...(w.buildings || []).filter(b => !["field", "pasture", "canal"].includes(b.kind)).map(b => [b.x-.72,b.z-.72,b.x+.72,b.z+.72])];
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
const CAREERS = {
  builder: ["Thợ học việc", "Kiến trúc sư", "Chủ thành", "Đại công trình sư"],
  keeper: ["Người gieo hạt", "Nông học gia", "Người giữ sinh quyển", "Hiền giả tự nhiên"],
  pathfinder: ["Người dò đường", "Nhà thám hiểm", "Thủ lĩnh viễn chinh", "Người mở cõi"],
  connector: ["Người đổi hàng", "Thương nhân", "Lãnh chúa thương hội", "Sứ giả liên vùng"],
};
export const ACHIEVEMENTS = [
  { id: "first-tool", name: "Đôi tay thành thạo", detail: "Thu thập 20 tài nguyên", stat: "gathered", value: 20, reward: { xp: 40, tool: 1 } },
  { id: "settler", name: "Người đặt nền móng", detail: "Xây 5 công trình", stat: "built", value: 5, reward: { xp: 60, seed: 4 } },
  { id: "grower", name: "Mùa vụ đầu tiên", detail: "Thu 30 sản phẩm", stat: "harvested", value: 30, reward: { xp: 70, tool: 1 } },
  { id: "merchant", name: "Đường hàng hóa", detail: "Trao đổi 10 lần", stat: "traded", value: 10, reward: { xp: 80, ore: 4 } },
  { id: "cartographer", name: "Bản đồ sống", detail: "Khảo sát 5 vùng", stat: "explored", value: 5, reward: { xp: 100, tool: 2 } },
  { id: "founder", name: "Mầm đế chế", detail: "Xây 20 công trình", stat: "built", value: 20, reward: { xp: 180, brick: 12 } },
];
function progressPlayer(w, p, cmd, amount = 1) {
  const xpByType = { gather: 3, build: 18, harvest: 14, "collect-building": 10, trade: 8, "npc-trade": 10, "survey-region": 20, demolish: 4, craft: 12, "configure-production": 3, combat: 12 };
  const statByType = { gather: "gathered", build: "built", harvest: "harvested", "collect-building": "harvested", trade: "traded", "npc-trade": "traded", "survey-region": "explored" };
  if (!xpByType[cmd.type]) return;
  const stat = statByType[cmd.type];
  if (stat) p.stats[stat] = (p.stats[stat] || 0) + Math.max(1, amount);
  p.xp += xpByType[cmd.type] || 1;
  const oldLevel = p.level;
  p.level = Math.max(1, 1 + Math.floor(Math.sqrt(p.xp / 45)));
  const tier = p.level >= 20 ? 4 : p.level >= 10 ? 3 : p.level >= 5 ? 2 : 1;
  if (tier > (p.profession?.tier || 1)) {
    p.profession = { tier, title: (CAREERS[p.classId] || CAREERS.builder)[tier - 1] };
    event(w, "npc", `${p.name} đạt cấp ${p.level} và thăng nghề thành ${p.profession.title}.`, p.id);
  } else p.profession = { tier, title: (CAREERS[p.classId] || CAREERS.builder)[tier - 1] };
  if (p.level > oldLevel) {
    const gained = p.level - oldLevel;
    p.unspentPower = (p.unspentPower || 0) + gained;
    p.talentPoints = (p.talentPoints || 0) + gained;
  }
  p.powers = { gather: Math.floor(p.level / 5), production: Math.floor(p.level / 7), trade: Math.floor(p.level / 10) };
  for (const achievement of ACHIEVEMENTS) if (!p.achievements.includes(achievement.id) && (p.stats[achievement.stat] || 0) >= achievement.value) {
    p.achievements.push(achievement.id);
    p.xp += achievement.reward.xp || 0;
    for (const [item, count] of Object.entries(achievement.reward)) if (item !== "xp") p.bag[item] = (p.bag[item] || 0) + count;
    event(w, "achievement", `${p.name} hoàn thành thành tựu “${achievement.name}” và nhận phần thưởng.`, p.id);
  }
}
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
  ensureWorld(w);
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
  let message = "", progressAmount = 1;
  if (cmd.type === "spend-talent") {
    const talent = TALENTS[cmd.talent];
    requireThat(talent, "Thiên phú không hợp lệ.");
    requireThat((p.talentPoints || 0) > 0, "Bạn chưa có điểm thiên phú.");
    requireThat((p.talents[cmd.talent] || 0) < talent.max, "Thiên phú đã đạt cấp tối đa.");
    p.talents[cmd.talent]++; p.talentPoints--; p.unspentPower = Math.max(0, (p.unspentPower || 0) - 1);
    p.maxHp = 100 + (p.talents.vitality || 0) * 10; p.hp = Math.min(p.maxHp, p.hp + (cmd.talent === "vitality" ? 10 : 0));
    message = `Đã tăng ${talent.name} lên bậc ${p.talents[cmd.talent]}.`;
  } else if (cmd.type === "equip-weapon") {
    requireThat(["sword","bow","spear"].includes(cmd.weapon), "Vũ khí không hợp lệ.");
    requireThat((p.bag[cmd.weapon] || 0) > 0, `Bạn chưa có ${ITEMS[cmd.weapon]}.`);
    p.equipment.weapon = cmd.weapon;
    message = `Đã trang bị ${ITEMS[cmd.weapon]}.`;
  } else if (cmd.type === "combat") {
    const animal = w.wildlife.find(a => a.id === cmd.target && a.hp > 0);
    const skill = COMBAT_SKILLS[cmd.skill] || COMBAT_SKILLS.strike;
    requireThat(animal, "Mục tiêu đã rời khỏi khu vực.");
    const weapon = p.equipment?.weapon;
    const range = weapon === "bow" ? Math.max(skill.range, 7) : skill.range;
    requireThat(Math.hypot(p.x-animal.x,p.z-animal.z) <= range, "Mục tiêu ngoài tầm đánh.");
    const reduction = Math.min(.24, (p.talents.swift || 0) * .08);
    requireThat(now >= (p.combatCooldowns[cmd.skill] || 0), "Kỹ năng đang hồi.");
    p.combatCooldowns[cmd.skill] = now + Math.round(skill.cooldown * (1-reduction));
    const base = weapon === "sword" ? 13 : weapon === "bow" ? 11 : weapon === "spear" ? 12 : 6;
    const damage = Math.round((base + (p.talents.hunter || 0) * 2) * skill.multiplier);
    animal.hp = Math.max(0, animal.hp - damage); animal.state = "fleeing";
    if (!animal.hp) {
      animal.respawnDay = w.day + 4 + Math.floor(Math.random()*5); p.kills++;
      const loot = animal.type === "fish" ? "food" : animal.type === "rabbit" ? "food" : "leather";
      const count = 1 + Math.floor((p.talents.naturalist || 0) / 2);
      const room = BAG_CAPACITY - Object.values(p.bag).reduce((a,b)=>a+b,0);
      p.bag[loot] += Math.min(count, room);
      event(w, "combat", `${p.name} hạ ${WILDLIFE[animal.type].name.toLowerCase()} và nhận ${Math.min(count, room)} ${ITEMS[loot]}.`, animal.id);
      message = `${skill.name} gây ${damage} sát thương. Mục tiêu đã bị hạ.`;
    } else {
      const retaliation = ["predator","defensive"].includes(WILDLIFE[animal.type].temperament) && Math.hypot(p.x-animal.x,p.z-animal.z) <= 2.8 ? (animal.type === "bear" ? 11 : animal.type === "wolf" ? 8 : 5) : 0;
      if (retaliation) p.hp = Math.max(1, p.hp-retaliation);
      message = `${skill.name} gây ${damage} sát thương (${animal.hp}/${WILDLIFE[animal.type].hp} máu)${retaliation ? `; bạn chịu ${retaliation} sát thương phản công` : ""}.`;
    }
  } else if (cmd.type === "character") {
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
      let capacity = Math.min(6, BAG_CAPACITY - Object.values(p.bag).reduce((a,b)=>a+b,0));
      requireThat(capacity > 0, `Túi đã đầy (${BAG_CAPACITY} đơn vị).`);
      requireThat(sources.length > 0, "Cần đứng trong 2 ô quanh một nguồn tài nguyên còn vật liệu.");
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
      cropType: cmd.kind === "field" ? "grain" : undefined,
      animalType: cmd.kind === "pasture" ? "chicken" : undefined,
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
      Number.isInteger(cmd.amount) && cmd.amount > 0 && cmd.amount <= BAG_CAPACITY,
      `Số lượng phải từ 1 đến ${BAG_CAPACITY}.`,
    );
    requireThat(
      cmd.direction === "deposit" || cmd.direction === "withdraw",
      "Thao tác kho không hợp lệ.",
    );
    const source = cmd.direction === "deposit" ? p.bag : b.stock,
      dest = cmd.direction === "deposit" ? b.stock : p.bag,
      limit = cmd.direction === "deposit" ? 80 : BAG_CAPACITY;
    requireThat(
      source[cmd.resource] >= cmd.amount,
      "Không đủ vật liệu để chuyển.",
    );
    requireThat(
      Object.values(dest).reduce((a, b) => a + b, 0) + cmd.amount <= limit,
      cmd.direction === "deposit"
        ? "Kho đã đầy (80 đơn vị)."
        : `Túi đã đầy (${BAG_CAPACITY} đơn vị).`,
    );
    source[cmd.resource] -= cmd.amount;
    dest[cmd.resource] += cmd.amount;
    message = `Đã ${cmd.direction === "deposit" ? "cất" : "lấy"} ${cmd.amount} ${ITEMS[cmd.resource]}.`;
  } else if (cmd.type === "collect-building") {
    const b = (w.buildings || []).find(building => building.id === cmd.target);
    requireThat(b && !["house", "canal"].includes(b.kind), "Đây không phải công trình có kho sản phẩm.");
    near(p, b);
    let room = BAG_CAPACITY - Object.values(p.bag).reduce((sum, amount) => sum + amount, 0), amount = 0;
    for (const item of Object.keys(ITEMS)) {
      const moved = Math.min(b.stock?.[item] || 0, room);
      if (!moved) continue;
      b.stock[item] -= moved; p.bag[item] += moved; room -= moved; amount += moved;
    }
    requireThat(amount > 0, room ? "Chưa có sản phẩm để thu gom." : "Túi đã đầy.");
    progressAmount = amount;
    message = `Đã thu ${amount} sản phẩm từ ${BUILDINGS[b.kind].name.toLowerCase()}.`;
  } else if (cmd.type === "configure-production") {
    const b = (w.buildings || []).find(building => building.id === cmd.target);
    requireThat(b && b.owner === playerId, "Bạn chỉ có thể điều chỉnh công trình của mình.");
    near(p, b);
    if (b.kind === "field") {
      requireThat(Object.hasOwn(CROPS, cmd.product), "Giống cây không hợp lệ.");
      requireThat((p.bag.seed || 0) >= 1, "Cần 1 hạt giống để đổi vụ.");
      p.bag.seed--; b.cropType = cmd.product; b.progress = 0;
      w.biodiversity.crops = [...new Set([...w.biodiversity.crops, cmd.product])];
      message = `Đã gieo ${CROPS[cmd.product].name.toLowerCase()}.`;
    } else if (b.kind === "pasture") {
      requireThat(Object.hasOwn(LIVESTOCK, cmd.product), "Vật nuôi không hợp lệ.");
      requireThat((p.bag.food || 0) >= 2, "Cần 2 khẩu phần để đưa đàn mới về chuồng.");
      p.bag.food -= 2; b.animalType = cmd.product; b.animals = Math.max(2, Math.min(4, b.animals || 2)); b.progress = 0;
      w.biodiversity.livestock = [...new Set([...w.biodiversity.livestock, cmd.product])];
      message = `Chuồng chuyển sang nuôi ${LIVESTOCK[cmd.product].name.toLowerCase()}.`;
    } else throw new Error("Công trình này không có giống sản xuất để đổi.");
  } else if (cmd.type === "craft") {
    const b = (w.buildings || []).find(building => building.id === cmd.target && building.kind === "workshop");
    requireThat(b, "Cần chọn một xưởng công cụ."); near(p, b);
    const recipes = {
      tool: { cost: { wood: 2, ore: 2 }, output: ["tool", 1] },
      plank: { cost: { wood: 2 }, output: ["plank", 3] },
      brick: { cost: { clay: 3, wood: 1 }, output: ["brick", 3] },
      ration: { cost: { grain: 2, vegetable: 1 }, output: ["food", 4] },
      sword: { cost: { ore: 4, wood: 2, leather: 1 }, output: ["sword", 1] },
      bow: { cost: { wood: 3, fiber: 3, leather: 1 }, output: ["bow", 1] },
      spear: { cost: { wood: 3, ore: 2 }, output: ["spear", 1] },
    };
    const recipe = recipes[cmd.recipe]; requireThat(recipe, "Công thức không hợp lệ.");
    spend(p, recipe.cost); const [item, count] = recipe.output; p.bag[item] += count;
    message = `Đã chế tạo ${count} ${ITEMS[item]}.`;
  } else if (cmd.type === "demolish") {
    const index = (w.buildings || []).findIndex(building => building.id === cmd.target);
    const b = w.buildings[index]; requireThat(b && b.owner === playerId, "Bạn chỉ có thể tháo dỡ công trình của mình."); near(p, b);
    const definition = BUILDINGS[b.kind], returned = [];
    for (const [item, count] of Object.entries(definition)) if (Object.hasOwn(ITEMS, item) && typeof count === "number") {
      const back = Math.floor(count / 2); if (back) { p.bag[item] += back; returned.push(`${back} ${ITEMS[item]}`); }
    }
    w.buildings.splice(index, 1);
    event(w, "build", `${p.name} tháo dỡ ${definition.name.toLowerCase()} để quy hoạch lại đất.`, b.id);
    message = `Đã tháo dỡ công trình${returned.length ? `, thu hồi ${returned.join(", ")}` : ""}.`;
  } else if (cmd.type === "trade") {
    near(p, POINTS.market);
    const recipes = {
      fiber_wood: { give: ["fiber", 3], take: ["wood", 2], label: "3 sợi cỏ đổi 2 gỗ" },
      clay_stone: { give: ["clay", 3], take: ["stone", 2], label: "3 đất sét đổi 2 đá" },
      food_fiber: { give: ["food", 2], take: ["fiber", 3], label: "2 thức ăn đổi 3 sợi cỏ" },
      wood_clay: { give: ["wood", 2], take: ["clay", 2], label: "2 gỗ đổi 2 đất sét" },
      grain_seed: { give: ["grain", 3], take: ["seed", 2], label: "3 ngũ cốc đổi 2 hạt giống" },
      wool_ore: { give: ["wool", 2], take: ["ore", 2], label: "2 len đổi 2 quặng" },
      herb_tool: { give: ["herb", 4], take: ["tool", 1], label: "4 thảo dược đổi 1 công cụ" },
      milk_clay: { give: ["milk", 3], take: ["clay", 3], label: "3 sữa đổi 3 đất sét" },
    };
    const recipe = recipes[cmd.recipe];
    requireThat(recipe, "Món trao đổi không hợp lệ.");
    const [give, giveAmount] = recipe.give, [take, takeAmount] = recipe.take;
    requireThat((p.bag[give] || 0) >= giveAmount, `Không đủ ${ITEMS[give]} để trao đổi.`);
    const used = Object.values(p.bag).reduce((sum, amount) => sum + amount, 0);
    requireThat(used - giveAmount + takeAmount <= BAG_CAPACITY, "Túi không đủ chỗ cho món nhận về.");
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
      Object.values(p.bag).reduce((a, b) => a + b, 0) < BAG_CAPACITY,
      `Túi đã đầy (${BAG_CAPACITY} đơn vị).`,
    );
    const powerBonus = (p.bag.tool || 0) > 0 ? 1 : 0;
    const levelBonus = p.powers?.gather || 0;
    const amount = Math.min((p.classId === "builder" && ["stone", "ore"].includes(r.type) ? 2 : 1) + powerBonus + levelBonus, r.remaining,
      BAG_CAPACITY - Object.values(p.bag).reduce((a,b)=>a+b,0));
    r.remaining -= amount;
    p.bag[r.type] += amount;
    p.lastGather = now;
    if (r.type === "wood") w.trees = Math.max(0, w.trees - 0.25);
    if (r.remaining <= 0) r.depletedDay = w.day;
    progressAmount = amount;
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
    requireThat(Number.isInteger(cmd.amount) && cmd.amount > 0 && cmd.amount <= BAG_CAPACITY, `Số khẩu phần cần từ 1 đến ${BAG_CAPACITY}.`);
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
      BAG_CAPACITY - Object.values(p.bag).reduce((a, b) => a + b, 0),
    );
    requireThat(amount > 0, "Túi đã đầy.");
    takeFoodCauses(w, "depotFoodLots", amount);
    w.depot -= amount;
    p.bag.food += amount;
    message = `Đã lấy ${amount} khẩu phần từ kho.`;
  } else if (cmd.type === "npc-trade") {
    const n = w.npcs.find(person => person.id === cmd.target);
    requireThat(n, "Không tìm thấy người dân này.");
    const home = POINTS[n.village], nearHome = Math.hypot(p.x - home.x, p.z - home.z) <= 4;
    const nearWork = Number.isFinite(n.workX) && Math.hypot(p.x - n.workX, p.z - n.workZ) <= 4;
    requireThat(nearHome || nearWork, "Hãy đến gần nơi người dân đang sống hoặc làm việc.");
    const deals = n.job === "Đánh cá" ? [["fiber", 2], ["food", 3]]
      : n.job === "Chăn nuôi" ? [["grain", 2], ["wool", 2]]
      : n.job === "Thợ thủ công" ? [["ore", 2], ["tool", 1]]
      : n.job === "Buôn bán" ? [["clay", 2], ["herb", 3]]
      : [["wood", 2], ["seed", 3]];
    const [[give, giveAmount], [take, takeAmount]] = deals;
    requireThat((p.bag[give] || 0) >= giveAmount, `${n.name} cần ${giveAmount} ${ITEMS[give]}.`);
    p.bag[give] -= giveAmount; p.bag[take] += takeAmount; p.trades = (p.trades || 0) + 1;
    n.needs.social = Math.min(100, n.needs.social + 12); n.thought = `${p.name} đã trao đổi công bằng với mình. Có thể tin tưởng người này.`;
    event(w, "trade", `${p.name} trao đổi với ${n.name}: ${giveAmount} ${ITEMS[give]} lấy ${takeAmount} ${ITEMS[take]}.`, n.id);
    message = `${n.name} đồng ý trao đổi ${takeAmount} ${ITEMS[take]}.`;
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
    requireThat(["mistwood", "highland", "farreach", "marsh", "ashlands", "frostlands"].includes(cmd.target), "Vùng khám phá không hợp lệ.");
    near(p, POINTS[cmd.target]);
    requireThat(!p.discoveries.includes(cmd.target), "Bạn đã khảo sát vùng này.");
    p.discoveries.push(cmd.target);
    const item = cmd.target === "mistwood" ? "fiber" : cmd.target === "highland" ? "clay" : cmd.target === "marsh" ? "herb" : cmd.target === "ashlands" ? "ore" : "stone";
    const room = BAG_CAPACITY - Object.values(p.bag).reduce((sum, amount) => sum + amount, 0);
    const found = Math.min(2, room);
    p.bag[item] += found;
    event(w, "knowledge", `${p.name} mở bản đồ ${{ mistwood: "Rừng Sương", highland: "Cao nguyên Đỏ", farreach: "Biên Viễn", marsh: "Đầm Sương", ashlands: "Đất Tro", frostlands: "Băng Nguyên" }[cmd.target]} và tìm thấy ${found} ${ITEMS[item]}.`, cmd.target);
    message = `Đã khảo sát vùng mới${found ? ` và tìm thấy ${found} ${ITEMS[item]}` : ""}.`;
  } else {
    throw new Error("Lệnh không được hỗ trợ.");
  }
  progressPlayer(w, p, cmd, progressAmount);
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
  for (const animal of w.wildlife) {
    const def = WILDLIFE[animal.type] || WILDLIFE.rabbit;
    if (animal.hp <= 0) {
      if (w.day >= animal.respawnDay) { animal.hp = def.hp; animal.hunger = 25; animal.thirst = 20; animal.state = "foraging"; }
      continue;
    }
    animal.hunger = Math.min(100, animal.hunger + (def.diet === "meat" ? 13 : 8));
    animal.thirst = Math.min(100, animal.thirst + (w.weather === "Mưa lớn" ? -18 : 10));
    animal.state = animal.thirst > 70 ? "seeking-water" : animal.hunger > 65 ? "foraging" : def.temperament === "predator" ? "hunting" : "resting";
    if (animal.state === "seeking-water" && def.temperament !== "aquatic") animal.x += Math.sign(16-animal.x) * Math.min(1.2, Math.abs(16-animal.x));
    else if (def.temperament !== "aquatic") {
      const angle = ((w.day * 17 + Number(animal.id.split("-").at(-1))*47) % 360) * Math.PI/180;
      animal.x = Math.max(2,Math.min(SIZE-3,animal.x+Math.cos(angle)*def.speed));
      animal.z = Math.max(2,Math.min(SIZE-3,animal.z+Math.sin(angle)*def.speed));
    }
    if (animal.hunger >= 100 || animal.thirst >= 100) animal.hp = Math.max(1, animal.hp - 5);
    if (def.diet === "meat" && animal.hunger > 70) {
      const prey = w.wildlife.find(a => a.hp > 0 && WILDLIFE[a.type]?.temperament === "prey" && Math.hypot(a.x-animal.x,a.z-animal.z)<4);
      if (prey) { prey.hp = Math.max(0, prey.hp-18); animal.hunger = Math.max(10, animal.hunger-45); animal.state = "hunting"; }
    } else if (def.diet !== "meat") { animal.hunger = Math.max(5, animal.hunger - Math.max(2, w.grass/24)); w.grass = Math.max(0,w.grass-.04); }
    if (def.temperament === "predator") for (const p of Object.values(w.players)) if (Math.hypot(p.x-animal.x,p.z-animal.z)<2.2) {
      p.hp = Math.max(0,(p.hp ?? p.maxHp)- (animal.type === "bear" ? 14 : 9));
      if (!p.hp) { Object.assign(p,POINTS.home); p.hp=p.maxHp; event(w,"combat",`${p.name} bị ${def.name.toLowerCase()} đánh gục và tỉnh lại tại nơi trú ẩn.`,p.id); }
    }
  }
  w.grazers = Math.max(
    0,
    Math.min(64, w.grazers + (w.grass > 40 ? 0.3 : -0.5)),
  );
  w.predators = Math.max(
    0,
    Math.min(16, w.predators + (w.grazers > 12 ? 0.08 : -0.12)),
  );
  w.crop = Math.min(1, w.crop + w.moisture * 0.4);
  for (const r of w.resources) {
    if (r.remaining >= r.capacity) { r.regrowth = 0; continue; }
    const weatherFactor = w.weather === "Mưa lớn" ? 1.45 : w.weather === "Hạn" ? 0.45 : 1;
    const rate = r.type === "wood" ? (0.08 + w.moisture * 0.2) * weatherFactor
      : r.type === "fiber" || r.type === "herb" ? (0.18 + w.moisture * 0.32) * weatherFactor
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
    const sites = w.buildings.filter(b => !["house", "storehouse", "canal"].includes(b.kind) && b.village === village.id);
    let worker = 0;
    for (const n of people) {
      if (n.job !== "Đánh cá") {
        const preferred = n.job === "Chăn nuôi" ? ["pasture"] : n.job === "Thợ thủ công" ? ["workshop", "quarry", "lumberyard"] : n.job === "Buôn bán" ? ["marketstall"] : ["field", "lumberyard"];
        const choices = sites.filter(site => preferred.includes(site.kind));
        const site = choices.length ? choices[worker++ % choices.length] : sites.length ? sites[worker++ % sites.length] : { id: "farm", ...POINTS.farm };
        n.worksite = site.id; n.workX = site.x; n.workZ = site.z;
        n.activity = site.kind === "pasture" ? "Chăm đàn vật nuôi" : site.kind === "workshop" ? "Chế tạo công cụ" : site.kind === "quarry" ? "Khai thác đá và quặng" : site.kind === "lumberyard" ? "Chăm rừng sản xuất" : site.kind === "marketstall" ? "Trao đổi hàng hóa" : "Chăm ruộng và thu hoạch";
      } else {
        n.worksite = "river";
        n.workX = village.id === "east" ? 18.7 : 13.3;
        n.workZ = 9 + (Number(n.id.split("-").at(-1)) % 18);
        n.activity = "Đánh cá và theo dõi nguồn nước";
      }
    }
  }
  for (const b of w.buildings.filter(b => !["house", "storehouse", "canal"].includes(b.kind))) {
    const workers = w.npcs.filter(n => n.worksite === b.id).length;
    const ownerPower = w.players[b.owner]?.powers?.production || 0;
    if (b.kind === "field") {
      const crop = CROPS[b.cropType] || CROPS.grain;
      const canals = w.buildings.filter(other => other.kind === "canal" && Math.hypot(other.x - b.x, other.z - b.z) <= 6).length;
      b.localMoisture = Math.max(0, Math.min(1, w.moisture + canals * .16));
      const suitability = Math.max(.2, 1 - Math.abs(b.localMoisture - crop.moisture));
      b.progress += suitability / crop.days * (1 + workers * .14 + ownerPower * .08);
      if (b.progress >= 1 && b.stock[crop.item] < 80) {
        const cycles = Math.floor(b.progress), amount = Math.min(80 - b.stock[crop.item], cycles * (crop.yield + Math.min(4, workers)));
        b.stock[crop.item] += amount; b.stock.seed = Math.min(80, b.stock.seed + cycles);
        b.progress -= cycles; b.lastYield = amount;
      }
    } else if (b.kind === "pasture") {
      const animal = LIVESTOCK[b.animalType] || LIVESTOCK.chicken;
      if (w.grass > 45 && w.day % 4 === 0) b.animals = Math.min(8, b.animals + 1);
      if (w.grass < 18 && b.animals > 2) b.animals--;
      b.progress += (1 / animal.days) * (1 + workers * .1);
      if (b.progress >= 1) {
        const cycles = Math.floor(b.progress), amount = Math.min(80 - b.stock[animal.item], cycles * animal.yield + Math.min(3, workers));
        b.stock[animal.item] += amount; b.progress -= cycles; b.lastYield = amount;
      }
      w.grass = Math.max(0, w.grass - b.animals * animal.grass * .12);
    } else if (b.kind === "lumberyard" && w.trees > 20) {
      const amount = Math.min(80 - b.stock.wood, 1 + Math.floor(workers / 2));
      b.stock.wood += amount; w.trees = Math.max(0, w.trees - amount * .18); b.lastYield = amount;
    } else if (b.kind === "quarry") {
      const amount = Math.min(80 - b.stock.stone, 1 + Math.floor(workers / 2));
      b.stock.stone += amount; if (w.day % 3 === 0) b.stock.ore = Math.min(80, b.stock.ore + 1); b.lastYield = amount;
    } else if (b.kind === "marketstall") {
      const item = ["seed", "fiber", "clay", "herb"][w.day % 4];
      b.stock[item] = Math.min(80, b.stock[item] + 1 + Math.floor(workers / 2));
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
      n.needs.hunger = Math.max(0, Math.min(100, n.needs.hunger + (n.fedToday ? 18 : -28)));
      n.needs.energy = Math.max(15, Math.min(100, 62 + ((w.day + Number(n.id.split("-").at(-1))) % 29)));
      n.needs.social = Math.max(10, Math.min(100, n.needs.social + (people.length > 6 ? 3 : -2)));
      n.needs.safety = Math.max(10, Math.min(100, 72 + (w.predators < 5 ? 10 : -18) + (w.weather === "Mưa lớn" ? -8 : 0)));
      n.needs.purpose = Math.max(10, Math.min(100, 55 + (n.worksite && n.worksite !== "farm" ? 22 : 0) + (n.fedToday ? 8 : -12)));
      const lowest = Object.entries(n.needs).sort((a, b) => a[1] - b[1])[0];
      n.mood = lowest[1] < 25 ? "Bất an" : lowest[1] < 45 ? "Lo lắng" : Object.values(n.needs).every(value => value > 72) ? "Hứng khởi" : "Bình tâm";
      n.thought = lowest[0] === "hunger" ? "Mình cần tìm thêm thức ăn trước khi nghĩ tới việc khác."
        : lowest[0] === "energy" ? "Hôm nay nên làm chậm lại và nghỉ trước khi trời tối."
        : lowest[0] === "social" ? `Mình muốn gặp người ở ${v.name} và nghe chuyện của họ.`
        : lowest[0] === "safety" ? "Dấu chân thú săn mồi đang ở quá gần làng."
        : `Công việc ${n.activity?.toLowerCase() || "hôm nay"} đang tạo ra thay đổi thật sự.`;
      n.goal = n.needs.hunger < 45 ? "Tìm nguồn thức ăn ổn định" : n.job === "Chăn nuôi" ? "Mở rộng đàn vật nuôi" : n.job === "Thợ thủ công" ? "Tạo thêm công cụ" : n.job === "Buôn bán" ? "Mở tuyến hàng mới" : n.job === "Đánh cá" ? "Giữ nguồn cá ổn định" : "Cải thiện vụ mùa";
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
    if (w.day % 11 === 0 && people.length) {
      const specialist = people[w.day % people.length];
      const available = [
        w.buildings.some(b => b.kind === "pasture" && b.village === v.id) && "Chăn nuôi",
        w.buildings.some(b => b.kind === "workshop" && b.village === v.id) && "Thợ thủ công",
        w.buildings.some(b => b.kind === "marketstall" && b.village === v.id) && "Buôn bán",
      ].filter(Boolean);
      if (available.length && w.day - (specialist.jobChangedDay ?? -20) >= 9) {
        const next = available[(w.day + people.length) % available.length];
        if (specialist.job !== next) {
          const from = specialist.job; specialist.job = next; specialist.jobChangedDay = w.day;
          specialist.lastDecisionReason = `Tự chọn nghề ${next.toLowerCase()} vì làng đã có công trình phù hợp và đang cần người phụ trách.`;
          specialist.decisionCause = event(w, "npc", `${specialist.name} rời nghề ${from.toLowerCase()} để trở thành ${next.toLowerCase()}.`, v.id);
        }
      }
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
  if (w.day % 9 === 0) {
    const roll = (Math.imul(w.day, 1103515245) >>> 8) % 5;
    if (roll === 0) {
      w.moisture = Math.min(1, w.moisture + .24); w.climateShift = "Lũ theo mùa";
      for (const r of w.resources.filter(r => r.type === "clay")) r.remaining = Math.min(r.capacity, r.remaining + 2);
      event(w, "world", "Một trận lũ đổi dòng chảy nhỏ, bồi thêm đất sét nhưng làm ruộng thấp bị úng.", "marsh");
    } else if (roll === 1) {
      w.trees = Math.max(0, w.trees - 9); w.climateShift = "Cháy rừng khô";
      for (const r of w.resources.filter(r => r.type === "wood" && r.x > 30).slice(0, 4)) r.remaining = Math.max(0, r.remaining - 3);
      event(w, "world", "Sét mùa hạn gây cháy rừng cục bộ. Tro làm đất màu hơn nhưng nguồn gỗ phía đông suy giảm.", "ashlands");
    } else if (roll === 2) {
      w.marketStock.seed += 5; w.marketStock.tool += 1; w.climateShift = "Đoàn thương nhân";
      event(w, "trade", "Một đoàn thương nhân lạ đến Chợ Phiên, mang theo hạt giống và công cụ mới.", "market");
    } else if (roll === 3) {
      w.grazers = Math.min(64, w.grazers + 6); w.biodiversity.mutations++;
      event(w, "world", "Một đàn thú di cư tiến vào đồng cỏ, kéo theo những giống cây chưa từng mọc ở thung lũng.", "farreach");
    } else {
      w.fish = Math.min(100, w.fish + 12); w.climateShift = "Mùa cá ngược dòng";
      event(w, "world", "Đàn cá từ hạ lưu bất ngờ quay lại với số lượng lớn, thay đổi sinh kế của hai làng.", "east");
    }
    w.developments.push({ day: w.day, kind: w.climateShift || "Biến động", roll });
    w.developments = w.developments.slice(-24);
  }
  if (w.day % 20 === 0 && w.buildings.filter(b => b.owner === "community").length < 12) {
    const village = w.villages[w.day % w.villages.length], center = POINTS[village.id];
    const kind = village.food < w.npcs.filter(n => n.village === village.id).length * 2 ? "field" : w.grass > 45 ? "pasture" : "house";
    for (let i = 0; i < 16; i++) {
      const a = (i + w.day) * Math.PI / 8, x = Math.round(center.x + Math.cos(a) * (4 + i % 3)), z = Math.round(center.z + Math.sin(a) * (4 + i % 3));
      if (!walkable(w, x, z) || reservedTile(x, z) || w.resources.some(r => r.remaining > 0 && r.x === x && r.z === z)) continue;
      const building = { id: `community-${w.day}`, kind, x, z, owner: "community", village: village.id,
        stock: Object.fromEntries(Object.keys(ITEMS).map(item => [item, 0])), progress: 0,
        cropType: kind === "field" ? Object.keys(CROPS)[w.day % Object.keys(CROPS).length] : undefined,
        animalType: kind === "pasture" ? Object.keys(LIVESTOCK)[w.day % Object.keys(LIVESTOCK).length] : undefined,
        animals: kind === "pasture" ? 2 : 0 };
      w.buildings.push(building);
      event(w, "build", `${village.name} tự góp công dựng ${BUILDINGS[kind].name.toLowerCase()} tại ô ${x}, ${z}.`, building.id);
      break;
    }
  }
  w.worldEra = Math.max(w.worldEra, Math.floor(w.day / 360) + 1);
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
