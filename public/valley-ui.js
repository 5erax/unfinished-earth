import { settlementSummary, worldReport, cartPosition, DAY_MS } from "/world-rules.js";

const $ = (id) => document.getElementById(id);
const format = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const number = (value) => format.format(Number.isFinite(value) ? value : 0);
const names = { west: "Làng Thượng", east: "Làng Hạ" };
const statusNames = {
  ready: "Sẵn sàng tại kho", transit: "Đang giao hàng", returning: "Đang về kho",
  blocked: "Đường bị chặn", paused: "Đã tạm dừng", resting: "Chờ tiếp sức", empty: "Chờ thức ăn",
};
function node(tag, className = "", text = "") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}
function text(element, value) {
  if (element.textContent !== String(value)) element.textContent = value;
}
function metric(parent, label, className = "") {
  const item = node("div", `valley-metric ${className}`);
  const value = node("strong", "", "—");
  item.append(node("span", "", label), value);
  parent.append(item);
  return value;
}
function reserveDays(summary) {
  if (!summary.population) return "Chưa có cư dân";
  return Number.isFinite(summary.foodDays) ? `${number(summary.foodDays)} ngày game` : "Chưa có nhu cầu";
}

// Nodes and controls persist across snapshots so polling never steals focus or collapses a roster.
export function createValleyUI({ select, command, canAct, onOpen = () => {} }) {
  const dialog = $("valley-dialog");
  let current = null;
  let selected = "home";
  let pending = false;
  let chosenTarget = null;
  const settlements = new Map();
  const reportSlots = [];
  const report = $("valley-report");
  report.replaceChildren();
  for (let i = 0; i < 4; i++) {
    const button = node("button", "valley-report-item");
    const title = node("strong");
    const detail = node("span");
    button.append(title, detail);
    button.hidden = true;
    const slot = { button, title, detail, target: null };
    button.addEventListener("click", () => slot.target ? locate(slot.target) : open());
    report.append(button);
    reportSlots.push(slot);
  }
  const calm = node("p", "valley-empty", "Chưa có vấn đề khẩn cấp. Hãy ghé thăm hai làng.");
  report.append(calm);

  function close() { if (dialog.open) dialog.close(); }
  function open() {
    onOpen();
    if (current) render(current, selected);
    if (!dialog.open) dialog.showModal();
  }
  function locate(target) { close(); select(target); }
  $("valley-open").addEventListener("click", open);
  $("valley-report-open").addEventListener("click", open);
  $("valley-close").addEventListener("click", close);
  $("valley-depot-locate").addEventListener("click", () => locate("depot"));
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });

  for (const id of ["west", "east"]) {
    const card = node("section", `valley-village valley-village-${id}`);
    const heading = node("div", "valley-section-heading");
    const name = node("h3", "", names[id]);
    const locateButton = node("button", "", "Xem làng ↗");
    locateButton.addEventListener("click", () => locate(id));
    heading.append(name, locateButton);
    const reserve = node("div", "valley-reserve");
    const foodDays = node("strong", "", "—");
    reserve.append(node("span", "", "Dự trữ đủ cho"), foodDays);
    const metrics = node("div", "valley-metrics");
    const food = metric(metrics, "Khẩu phần trong làng");
    const beds = metric(metrics, "Cư dân / chỗ ở");
    const ledger = node("div", "valley-ledger");
    ledger.append(node("span", "valley-ledger-label", "LƯƠNG THỰC TRONG NGÀY"));
    const ledgerValues = node("div", "valley-ledger-values");
    const produced = metric(ledgerValues, "Làm ra", "valley-good");
    const consumed = metric(ledgerValues, "Đã ăn");
    const shortage = metric(ledgerValues, "Còn thiếu");
    ledger.append(ledgerValues);
    const trend = node("p", "valley-trend");
    const reason = node("p", "valley-village-reason");
    const roster = node("details", "valley-roster");
    const rosterTitle = node("summary", "", "Gặp người dân");
    const rosterList = node("div", "valley-roster-list");
    roster.append(rosterTitle, rosterList);
    card.append(heading, reserve, metrics, ledger, trend, reason, roster);
    $("valley-settlements").append(card);
    settlements.set(id, { card, name, foodDays, food, beds, produced, consumed, shortage, trend, reason, rosterTitle, rosterList, rows: new Map() });
  }

  const details = $("valley-details");
  const detailsTitle = node("strong", "valley-detail-title");
  const detailsBody = node("p");
  const detailsReason = node("p", "valley-muted");
  const detailsOpen = node("button", "", "Mở bảng Thung lũng →");
  detailsOpen.addEventListener("click", open);
  details.append(detailsTitle, detailsBody, detailsReason, detailsOpen);

  const targetControl = $("valley-cart-target");
  const amountControl = $("valley-stock-amount");
  targetControl.addEventListener("change", () => { chosenTarget = targetControl.value; renderControls(); });
  amountControl.addEventListener("input", renderControls);

  async function dispatch(cmd) {
    if (!current || pending || !canAct()) return;
    pending = true;
    text($("valley-command-note"), "Đang thực hiện…");
    renderControls();
    try {
      // The host handles travel, authoritative confirmation and its existing error toast.
      const accepted = await command(cmd);
      text($("valley-command-note"), accepted?.queued ? "Nhân vật đang đến kho. Yêu cầu sẽ thực hiện khi tới nơi." : accepted === true ? "Đã ghi nhận thao tác." : "Chưa hoàn tất. Kiểm tra thông báo trong game.");
      if ((accepted === true || accepted?.queued) && cmd.type === "cart-control") chosenTarget = null;
    } catch {
      text($("valley-command-note"), "Chưa nhận được xác nhận. Hãy đợi kết nối trở lại.");
    } finally {
      pending = false;
      if (current) render(current, selected);
    }
  }
  $("valley-cart-toggle").addEventListener("click", () => {
    if (current) dispatch({ type: "cart-control", paused: !current.cart.paused });
  });
  $("valley-cart-apply").addEventListener("click", () => {
    if (!current || current.cart.cargo > 0 || current.cart.leg === "return" || current.cart.progress > 0) return;
    dispatch({ type: "cart-control", target: targetControl.value, paused: Boolean(current.cart.paused) });
  });
  $("valley-stock-submit").addEventListener("click", () => {
    const amount = Number(amountControl.value);
    const available = current?.players?.[current.you]?.bag?.food || 0;
    if (!Number.isInteger(amount) || amount < 1 || amount > available) return;
    dispatch({ type: "stock-food", amount });
  });

  function renderControls() {
    const cart = current?.cart;
    const allowed = Boolean(current && !pending && canAct());
    const food = current?.players?.[current.you]?.bag?.food || 0;
    const atDock = cart && !cart.cargo && cart.leg !== "return" && !cart.progress;
    const amount = Number(amountControl.value);
    $("valley-cart-toggle").disabled = !allowed;
    text($("valley-cart-toggle"), cart?.paused ? "Cho xe tiếp tục" : "Tạm dừng xe");
    targetControl.disabled = !allowed || !atDock;
    $("valley-cart-apply").disabled = !allowed || !atDock || targetControl.value === cart?.target;
    amountControl.disabled = !allowed || food < 1;
    amountControl.max = String(Math.floor(food));
    $("valley-stock-submit").disabled = !allowed || !Number.isInteger(amount) || amount < 1 || amount > food;
    text($("valley-bag-food"), `Trong túi: ${number(food)} khẩu phần${food < 1 ? " · Thu thập hoặc lấy thức ăn trước." : ""}`);
    text($("valley-target-note"), atDock ? "Xe đang ở kho. Có thể đổi làng nhận cho chuyến tiếp theo." : "Chờ xe về kho và dỡ hết hàng để đổi nơi nhận.");
    if (!allowed && !pending) text($("valley-command-note"), "Có thể xem tình hình. Đợi nhân vật sẵn sàng và kết nối lại để thao tác.");
    else if (allowed && $("valley-command-note").textContent.startsWith("Có thể xem")) text($("valley-command-note"), "");
  }

  function updateRoster(card, world, id) {
    const people = (world.npcs || []).filter((npc) => npc.village === id);
    const alive = new Set(people.map((npc) => npc.id));
    for (const [key, row] of card.rows) {
      if (!alive.has(key)) { row.root.remove(); card.rows.delete(key); }
    }
    const hungry = people.filter((npc) => npc.hungryDays > 0 || npc.fedToday === false).length;
    text(card.rosterTitle, `${people.length} người dân${hungry ? ` · ${hungry} người thiếu ăn` : " · Đủ bữa"}`);
    for (const npc of people) {
      let row = card.rows.get(npc.id);
      if (!row) {
        const root = node("div", "valley-resident");
        const heading = node("div", "valley-resident-heading");
        const name = node("strong");
        const appetite = node("span", "valley-appetite");
        const job = node("span", "valley-resident-job");
        const reason = node("p", "valley-resident-reason");
        heading.append(name, appetite);
        root.append(heading, job, reason);
        card.rosterList.append(root);
        row = { root, name, appetite, job, reason };
        card.rows.set(npc.id, row);
      }
      const isHungry = npc.hungryDays > 0 || npc.fedToday === false;
      text(row.name, npc.name);
      text(row.appetite, isHungry ? `Thiếu ăn${npc.hungryDays > 0 ? ` ${number(npc.hungryDays)} ngày` : " hôm nay"}` : "Đủ bữa");
      row.appetite.classList.toggle("valley-warning", isHungry);
      text(row.job, npc.job);
      text(row.reason, npc.lastDecisionReason || "Đang theo dõi điều kiện sống trong làng.");
    }
  }

  function render(world, target = selected) {
    if (!world) return;
    current = world;
    selected = target;
    text($("valley-day"), `Ngày ${world.day} · ${world.weather} · Những thay đổi nối tiếp từ việc bạn làm`);
    const summary = new Map();
    for (const [id, card] of settlements) {
      const village = settlementSummary(world, id);
      if (!village) continue;
      summary.set(id, village);
      text(card.name, village.name || names[id]);
      text(card.foodDays, reserveDays(village));
      card.card.classList.toggle("valley-at-risk", village.foodDays < 1 || village.hungry > 0);
      text(card.food, number(village.food));
      text(card.beds, `${number(village.population)} / ${village.capacity == null ? "—" : number(village.capacity)}`);
      text(card.produced, `+${number(village.produced)}`);
      text(card.consumed, number(village.consumed));
      text(card.shortage, number(village.shortage));
      card.shortage.classList.toggle("valley-warning", village.shortage > 0);
      const trend = village.trend || 0;
      text(card.trend, `Dự trữ ${trend > 0 ? "tăng" : trend < 0 ? "giảm" : "không đổi"}${trend ? ` ${number(Math.abs(trend))} khẩu phần` : ""} · ${number(village.farmers)} làm ruộng · ${number(village.fishers)} đánh cá`);
      text(card.reason, village.reason || "Đời sống thay đổi theo nguồn thức ăn và chỗ ở.");
      updateRoster(card, world, id);
    }
    const today = worldReport(world);
    const entries = [...(today.issues || []).slice(0, 3).map((issue) => ({ ...issue, positive: false }))];
    if (today.positive) entries.push({ ...today.positive, positive: true });
    reportSlots.forEach((slot, i) => {
      const entry = entries[i];
      slot.button.hidden = !entry;
      if (!entry) return;
      slot.target = entry.target;
      slot.button.classList.toggle("valley-report-positive", entry.positive);
      text(slot.title, `${entry.positive ? "↗ " : ""}${entry.title}`);
      text(slot.detail, entry.detail);
    });
    calm.hidden = entries.length > 0;

    const cart = world.cart;
    const returning = cart.leg === "return";
    const destination = names[cart.target] || names.east;
    text($("valley-route-from"), returning ? destination : "Kho chung");
    text($("valley-route-to"), returning ? "Kho chung" : destination);
    text($("valley-cart-status"), statusNames[cart.status] || "Đang chờ");
    text($("valley-cart-cargo"), `${number(cart.cargo)} khẩu phần trên xe`);
    const progress = Math.max(0, Math.min(1, cart.progress || 0));
    $("valley-cart-progress").value = progress;
    $("valley-cart-progress").setAttribute("aria-valuetext", `${Math.round(progress * 100)}% chặng ${returning ? "về kho" : "giao hàng"}`);
    const position = cartPosition(world);
    const days = Math.max(0, (cart.travelMs || 2 * DAY_MS) * (1 - progress) / DAY_MS);
    text($("valley-cart-eta"), position.moving ? `Còn khoảng ${number(days)} ngày game ${returning ? "để về kho" : "để tới làng"} · ${Math.round(progress * 100)}% chặng đường` : `Đã đi ${Math.round(progress * 100)}% chặng đường · Đồng hồ hành trình đang dừng`);
    text($("valley-depot-stock"), `${number(world.depot)} khẩu phần`);
    const reason = {
      blocked: !world.bridge && cart.target !== "west" ? "Cầu gãy chặn tuyến đường. Hàng vẫn ở trên xe; sửa cầu để tiếp tục." : "Một vật cản chặn tuyến đường. Hàng và vị trí xe được giữ nguyên.",
      paused: "Bạn đã cho xe dừng. Hàng và quãng đường được giữ nguyên.",
      resting: "Xe tạm nghỉ vì hết tín dụng làm việc khi vắng mặt. Trở lại hoạt động để tiếp sức.",
      empty: "Kho chưa có thức ăn. Thu hoạch hoặc góp thức ăn để xe có hàng giao.",
      ready: "Xe chờ tại kho 3 giờ game để bốc hàng và đổi tuyến, sau đó nhận tối đa 8 khẩu phần mỗi chuyến.",
      transit: "Hàng đã rời kho và đang trên xe. Làng chỉ nhận được khi xe tới nơi.",
      returning: "Đã giao hàng. Xe cần trở lại kho trước khi nhận chuyến tiếp theo.",
    };
    text($("valley-route-reason"), reason[cart.status] || "Xe chạy theo tuyến đường giữa kho và làng.");
    if (document.activeElement !== targetControl) targetControl.value = chosenTarget || cart.target || "east";
    renderControls();

    details.hidden = !summary.has(selected) && selected !== "depot";
    if (summary.has(selected)) {
      const village = summary.get(selected);
      text(detailsTitle, `Dự trữ: ${reserveDays(village)}`);
      text(detailsBody, `${number(village.population)} cư dân · ${number(village.food)} khẩu phần · ${number(village.hungry)} người thiếu ăn`);
      text(detailsReason, village.reason || "Mở bảng Thung lũng để xem từng người dân.");
    } else if (selected === "depot") {
      text(detailsTitle, statusNames[cart.status] || "Kho chung & xe kéo");
      text(detailsBody, `${number(world.depot)} trong kho · ${number(cart.cargo)} trên xe · Đích đến: ${returning ? "Kho chung" : destination}`);
      text(detailsReason, reason[cart.status] || "Mở bảng Thung lũng để điều phối.");
    }
  }
  renderControls();
  return { render, open, close, isOpen: () => dialog.open };
}
