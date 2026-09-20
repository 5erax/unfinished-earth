const kinds = {
  all: "Tất cả", build: "Công trình", logistics: "Chuyến hàng",
  food: "Lương thực", npc: "Dân làng", water: "Nguồn nước", trade: "Trao đổi", achievement: "Thành tựu",
};
const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

// Chronicle reads committed events only. A cause is never inferred from time
// or a nearby place: each link comes from the server's explicit cause IDs.
export function createChronicleUI({ loadEvent, select, onOpen }) {
  const feed = document.getElementById("events");
  const filters = make("nav", "chronicle-filters");
  filters.setAttribute("aria-label", "Lọc lịch sử thế giới");
  feed.before(filters);
  let filter = "all", events = [], signature = "", navigation = 0;
  const cached = new Map(), trail = [];
  const dialog = make("dialog", "story-dialog");
  dialog.id = "chronicle-dialog";
  dialog.setAttribute("aria-labelledby", "story-title");
  const top = make("div", "story-top");
  const back = make("button", "secondary", "← Sự kiện trước");
  back.type = "button";
  const close = make("button", "story-close", "Đóng ×");
  close.type = "button";
  close.onclick = () => dialog.close();
  top.append(back, close);
  const kicker = make("span", "eyebrow", "CÂU CHUYỆN CỦA THUNG LŨNG");
  const title = make("h2", "", "Điều gì đã xảy ra?");
  title.id = "story-title";
  const meta = make("p", "story-meta");
  const text = make("p", "story-text");
  const causeTitle = make("h3", "story-cause-title", "Những việc dẫn đến thay đổi này");
  const causes = make("div", "story-causes");
  const location = make("button", "primary", "Xem địa điểm trên bản đồ →");
  location.type = "button";
  const notice = make("p", "story-notice");
  notice.setAttribute("role", "status");
  dialog.append(top, kicker, title, meta, text, causeTitle, causes, notice, location);
  document.body.append(dialog);
  dialog.addEventListener("close", () => { navigation++; });

  async function get(id) {
    if (cached.has(id)) return cached.get(id);
    const e = await loadEvent(id);
    if (!e || typeof e.text !== "string" || e.id !== id)
      throw new Error("Chưa tìm thấy sự kiện này trong lịch sử.");
    cached.set(e.id, e);
    return e;
  }
  function describe(e) {
    return kinds[e.kind] || (e.kind === "knowledge" ? "Khám phá" : "Thế giới");
  }
  async function show(e, push = true) {
    const ticket = ++navigation;
    if (push) trail.push(e);
    back.disabled = trail.length < 2;
    title.textContent = describe(e);
    meta.textContent = `Ngày ${e.day} · Dấu mốc #${e.id}`;
    text.textContent = e.text;
    notice.textContent = "";
    location.hidden = !e.place;
    location.onclick = () => { dialog.close(); select(e.place); };
    causes.replaceChildren();
    const ids = [...new Set(e.causes || [])].filter(id => id !== e.id);
    causeTitle.hidden = !ids.length;
    if (!ids.length) notice.textContent = "Đây là điểm bắt đầu được ghi lại của câu chuyện này.";
    for (const id of ids) {
      const button = make("button", "story-cause", `Đang tìm dấu mốc #${id}…`);
      button.type = "button";
      button.disabled = true;
      causes.append(button);
      try {
        const cause = await get(id);
        if (ticket !== navigation) return;
        const label = make("span", "story-cause-meta", `${describe(cause)} · Ngày ${cause.day}`);
        const detail = make("span", "", cause.text);
        button.replaceChildren(label, detail);
        button.disabled = false;
        button.onclick = () => show(cause);
      } catch {
        if (ticket !== navigation) return;
        button.textContent = `Chưa tải được dấu mốc #${id}. Bấm để thử lại.`;
        button.disabled = false;
        button.onclick = () => show(e, false);
      }
    }
  }
  back.onclick = () => {
    if (trail.length < 2) return;
    trail.pop();
    show(trail.at(-1), false);
  };
  function open(e) {
    onOpen?.();
    trail.length = 0;
    if (!dialog.open) dialog.showModal();
    show(e);
  }
  function render() {
    const next = `${filter}:${events.map(e => e.id).join(",")}`;
    if (next === signature) return;
    signature = next;
    feed.replaceChildren();
    for (const e of [...events].reverse().filter(e => filter === "all" || e.kind === filter).slice(0, 15)) {
      const article = make("article", "chronicle-entry");
      const meta = make("small", "", `NGÀY ${e.day} · ${describe(e)}`);
      const detail = make("p", "", e.text);
      const button = make("button", "chronicle-story-link", e.causes?.length ? "Lần theo nguyên nhân →" : "Mở câu chuyện →");
      button.type = "button";
      button.onclick = () => open(e);
      article.append(meta, detail, button);
      feed.append(article);
    }
    if (!feed.childElementCount)
      feed.append(make("p", "chronicle-empty", "Chưa có dấu mốc loại này trong lịch sử gần đây."));
  }
  for (const [id, label] of Object.entries(kinds)) {
    const button = make("button", "", label);
    button.type = "button";
    button.setAttribute("aria-pressed", String(id === filter));
    button.onclick = () => {
      filter = id;
      for (const b of filters.children) b.setAttribute("aria-pressed", String(b === button));
      render();
    };
    filters.append(button);
  }
  return {
    render(nextEvents) {
      events = nextEvents;
      for (const e of events) cached.set(e.id, e);
      // Keep only the recent feed and the story being read in browser memory.
      if (cached.size > 240) {
        const retain = new Set([...events, ...trail].map(e => e.id));
        for (const id of cached.keys()) if (!retain.has(id)) cached.delete(id);
      }
      render();
    },
    open,
  };
}
