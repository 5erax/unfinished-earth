export const SIZE = 32;
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
};
export const BUILDINGS = {
  house: { name: "Nhà nhỏ", wood: 6, stone: 2, beds: 2 },
  storehouse: { name: "Kho cá nhân", wood: 4, stone: 2, capacity: 80 },
};
export function housingCapacity(w, village) {
  if (!w.housingBase) return null;
  return (
    w.housingBase[village] +
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
    (x === 24 && z >= 12 && z <= 17)
  );
}
export function placementProblem(w, playerId, kind, x, z) {
  if (!Object.hasOwn(BUILDINGS, kind)) return "Loại công trình không hợp lệ.";
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(z) ||
    x < 2 ||
    z < 2 ||
    x > 29 ||
    z > 29
  )
    return "Chọn ô đất từ 2 đến 29.";
  if (!walkable(w, x, z) || (x >= 15 && x <= 17))
    return "Không thể xây trên sông hoặc công trình khác.";
  if (reservedTile(x, z))
    return "Giữ trống đường đi và khu công trình hiện có.";
  if (
    (w.resources || []).some((r) => r.x === x && r.z === z && r.remaining > 0)
  )
    return "Thu thập hết tài nguyên trên ô này trước.";
  if (Object.values(w.players).some((p) => p.x === x && p.z === z))
    return "Có người chơi đang đứng trên ô này.";
  if ((w.buildings || []).length >= 64)
    return "Vùng thử nghiệm đã đủ 64 công trình.";
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
    cart: { cargo: 0, progress: 0, status: "blocked" },
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
  event(
    w,
    "world",
    "Mưa lớn cuốn mất cầu. Xe lương thực đang mắc ở bờ tây; Làng Hạ cần một tuyến tiếp tế.",
    "bridge",
  );
  return w;
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
function spend(p, wood, stone) {
  requireThat(
    p.bag.wood >= wood && p.bag.stone >= stone,
    `Cần ${wood} gỗ và ${stone} đá.`,
  );
  p.bag.wood -= wood;
  p.bag.stone -= stone;
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
  const character = profile ? characterProfile(profile) : {};
  if (w.players[id]) return;
  w.players[id] = {
    id,
    name: `Người dựng làng ${Object.keys(w.players).length + 1}`,
    ...character,
    ...POINTS.home,
    bag: { wood: 0, stone: 0, food: 0 },
    lastMove: 0,
    lastGather: 0,
    seen: now,
    discoveries: [],
  };
}
export function applyCommand(w, playerId, cmd, now = Date.now()) {
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
    spend(p, definition.wood, definition.stone);
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
      stock: { wood: 0, stone: 0, food: 0 },
    };
    (w.buildings ??= []).push(building);
    building.cause = event(
      w,
      "build",
      `${p.name} xây ${definition.name.toLowerCase()} tại ô ${cmd.x}, ${cmd.z}${cmd.kind === "house" ? `: thêm 2 chỗ ở cho ${w.villages.find((v) => v.id === village).name}` : " với sức chứa 80 đơn vị"}.`,
      building.id,
    );
    message = `Đã xây ${definition.name.toLowerCase()}.`;
  } else if (cmd.type === "storage") {
    const b = (w.buildings || []).find((b) => b.id === cmd.target);
    requireThat(b && b.kind === "storehouse", "Không tìm thấy kho cá nhân.");
    requireThat(b.owner === playerId, "Chỉ chủ kho được cất hoặc lấy hàng.");
    near(p, b);
    requireThat(
      ["wood", "stone", "food"].includes(cmd.resource),
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
    message = `Đã ${cmd.direction === "deposit" ? "cất" : "lấy"} ${cmd.amount} ${{ wood: "gỗ", stone: "đá", food: "khẩu phần" }[cmd.resource]}.`;
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
    message = `Đã nhặt ${amount} ${r.type === "wood" ? "gỗ" : "đá"}.`;
  } else if (cmd.type === "bridge") {
    near(p, { x: 14, z: 17 });
    requireThat(!w.bridge, "Cầu đã được sửa.");
    spend(p, 8, 4);
    w.bridge = true;
    w.cart.status = w.cart.cargo ? "transit" : w.depot ? "ready" : "empty";
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
    event(
      w,
      "food",
      `Thu hoạch ${yieldCount} khẩu phần, chuyển vào kho chung.`,
      "farm",
      w.gateCause ? [w.gateCause] : [],
    );
    message = `Đã đưa ${yieldCount} khẩu phần vào kho.`;
  } else if (cmd.type === "supply") {
    near(p, POINTS.depot);
    requireThat(w.depot > 0, "Kho đã hết lương thực.");
    const amount = Math.min(
      8,
      w.depot,
      40 - Object.values(p.bag).reduce((a, b) => a + b, 0),
    );
    requireThat(amount > 0, "Túi đã đầy.");
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
    event(
      w,
      "food",
      `${p.name} giao ${amount} khẩu phần cho ${v.name}.`,
      cmd.target,
      w.bridgeCause ? [w.bridgeCause] : [],
    );
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
  } else {
    throw new Error("Lệnh không được hỗ trợ.");
  }
  p.seen = now;
  return message;
}
export function simulateDay(w, production = true) {
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
  if (production && w.bridge) {
    if (w.cart.cargo === 0) {
      const amount = Math.min(8, w.depot);
      w.depot -= amount;
      w.cart.cargo = amount;
      w.cart.progress = 0;
    }
    if (w.cart.cargo > 0) {
      w.cart.progress++;
      if (w.cart.progress >= 2) {
        const amount = w.cart.cargo;
        w.villages[1].food += amount;
        w.cart.cargo = 0;
        w.cart.progress = 0;
        w.deliveries++;
        event(
          w,
          "logistics",
          `Xe giao ${amount} khẩu phần từ kho đến Làng Hạ. Không còn hàng trên xe.`,
          "east",
          w.bridgeCause ? [w.bridgeCause] : [],
        );
      }
    }
  }
  w.cart.status = !w.bridge
    ? "blocked"
    : !production
      ? "resting"
      : w.cart.cargo
        ? "transit"
        : w.depot
          ? "ready"
          : "empty";
  // Snapshot decisions prevent an NPC migrating twice in one day.
  const decisions = [];
  for (const v of w.villages) {
    const people = w.npcs.filter((n) => n.village === v.id);
    const fishers = people.filter((n) => n.job === "Đánh cá").length;
    const produced = Math.floor(
      (fishers * w.fish) / 100 + (people.length - fishers) * w.moisture * 0.7,
    );
    v.food += produced;
    const fed = Math.min(people.length, v.food);
    v.food -= fed;
    const shortage = fed < people.length;
    for (const n of people) {
      n.hungryDays = shortage ? n.hungryDays + 1 : 0;
      if (n.hungryDays >= 3) {
        const destination = w.villages.find((other) => other.id !== v.id);
        if (w.bridge && destination.food > 24)
          decisions.push({ n, destination });
        else if (n.job === "Đánh cá" && w.moisture > 0.6) {
          n.job = "Trồng trọt";
          n.hungryDays = 0;
          event(
            w,
            "npc",
            `${n.name} chuyển từ đánh cá sang trồng trọt sau ba ngày thiếu ăn, khi ruộng đủ ẩm.`,
            v.id,
            w.gateCause ? [w.gateCause] : [],
          );
        }
      }
    }
  }
  for (const { n, destination } of decisions) {
    const capacity = housingCapacity(w, destination.id);
    if (
      capacity !== null &&
      w.npcs.filter((person) => person.village === destination.id).length >=
        capacity
    )
      continue;
    const from = n.village;
    n.village = destination.id;
    n.hungryDays = 0;
    event(
      w,
      "npc",
      `${n.name} rời ${from === "east" ? "Làng Hạ" : "Làng Thượng"} đến ${destination.name}: thiếu ăn ba ngày, làng nhận còn dự trữ${w.housingBase ? " và chỗ ở" : ""}, cầu đã thông.`,
      destination.id,
      w.bridgeCause ? [w.bridgeCause] : [],
    );
  }
}
export function advance(w, now, active, speed = 30) {
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
  // Max 4320 simulated days per absence at prototype speed 30; no per-frame loop.
  while (elapsed > 0) {
    const slice = Math.min(elapsed, (DAY_MS - w.dayProgress) / speed);
    const working = active || w.creditMs >= slice;
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
