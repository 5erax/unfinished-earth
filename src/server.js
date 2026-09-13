import http from "node:http";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "./store.js";
import { applyCommand, advance, join, CREDIT_MS } from "./world.js";
const root = fileURLToPath(new URL("../", import.meta.url));
const digest = (value) => createHash("sha256").update(value).digest("hex");
export function createGameServer({
  dbPath = ":memory:",
  speed = 30,
  accessCode = "",
  clock = Date.now,
} = {}) {
  if (!Number.isFinite(speed) || speed < 1 || speed > 30)
    throw new Error("SIM_SPEED must be between 1 and 30.");
  const store = new Store(dbPath, clock());
  const seen = new Map(),
    attempts = new Map();
  function snapshot(player) {
    const w = store.world;
    return {
      ...w,
      players: Object.fromEntries(
        Object.entries(w.players)
          .filter(
            ([id]) => id === player || clock() - (seen.get(id) ?? 0) < 15000,
          )
          .map(([id, p]) => [
            id,
            {
              id,
              name: p.name,
              x: p.x,
              z: p.z,
              ...(id === player
                ? {
                    bag: p.bag,
                    discoveries: p.discoveries,
                    moveSeq: p.moveSeq || 0,
                  }
                : {}),
            },
          ]),
      ),
      events: w.events.slice(-60),
      you: player,
      speed,
      online: seen.size,
    };
  }
  function tick() {
    const now = clock();
    for (const [id, when] of seen) if (now - when > 15000) seen.delete(id);
    const w = structuredClone(store.world);
    if (Object.keys(w.players).length)
      advance(w, Math.max(now, w.lastWall), seen.size > 0, speed);
    else w.lastWall = now; // Do not starve a world before its first visitor.
    w.revision++;
    store.save(w);
  }
  function send(res, status, data) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  }
  async function body(req) {
    let bytes = 0,
      parts = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 4096)
        throw Object.assign(new Error("Nội dung quá lớn."), { status: 413 });
      parts.push(chunk);
    }
    try {
      return JSON.parse(Buffer.concat(parts).toString());
    } catch {
      throw Object.assign(new Error("JSON không hợp lệ."), { status: 400 });
    }
  }
  const files = new Map([
    ["/world-rules.js", ["src/world.js", "text/javascript"]],
    ["/map2d.js", ["public/map2d.js", "text/javascript"]],
    ["/motion.js", ["public/motion.js", "text/javascript"]],
    ["/world-sprites.png", ["public/world-sprites.png", "image/png"]],
    ["/command-journal.js", ["public/command-journal.js", "text/javascript"]],
    ["/", ["public/index.html", "text/html"]],
    ["/app.js", ["public/app.js", "text/javascript"]],
    ["/style.css", ["public/style.css", "text/css"]],
    [
      "/three.js",
      ["node_modules/three/build/three.module.js", "text/javascript"],
    ],
    [
      "/three.core.js",
      ["node_modules/three/build/three.core.js", "text/javascript"],
    ],
  ]);
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    const url = new URL(req.url, "http://localhost");
    try {
      if (req.method === "GET" && files.has(url.pathname)) {
        const [file, type] = files.get(url.pathname);
        res.writeHead(200, {
          "Content-Type": `${type}; charset=utf-8`,
          "Cache-Control": "no-cache",
        });
        res.end(readFileSync(resolve(root, file)));
        return;
      }
      if (req.method === "GET" && url.pathname === "/health") {
        send(res, 200, { ok: true, schemaVersion: store.world.schemaVersion });
        return;
      }
      if (req.method === "POST") {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) {
          send(res, 403, { error: "Nguồn yêu cầu không hợp lệ." });
          return;
        }
        if (
          !String(req.headers["content-type"]).startsWith("application/json")
        ) {
          send(res, 415, { error: "Yêu cầu JSON." });
          return;
        }
      }
      if (req.method === "POST" && url.pathname === "/api/join") {
        const key = req.socket.remoteAddress;
        const now = clock();
        const a = attempts.get(key) || { since: now, count: 0 };
        if (now - a.since > 60000) {
          a.since = now;
          a.count = 0;
        }
        a.count++;
        attempts.set(key, a);
        if (attempts.size > 10000)
          attempts.delete(attempts.keys().next().value);
        if (a.count > 12) {
          send(res, 429, {
            error: "Quá nhiều lần vào thế giới. Thử lại sau một phút.",
          });
          return;
        }
        const data = await body(req);
        if (!data || typeof data !== "object") {
          send(res, 400, { error: "Nội dung không hợp lệ." });
          return;
        }
        if (
          accessCode &&
          !timingSafeEqual(
            Buffer.from(digest(String(data.code ?? ""))),
            Buffer.from(digest(accessCode)),
          )
        ) {
          send(res, 403, { error: "Mã thế giới không đúng." });
          return;
        }
        if (seen.size >= 8) {
          send(res, 409, { error: "Thế giới đã có 8 người đang kết nối." });
          return;
        }
        tick();
        const token = randomBytes(32).toString("hex"),
          id = randomBytes(8).toString("hex");
        const w = structuredClone(store.world);
        join(w, id, now);
        w.revision++;
        // A failed session insert cannot ACK a playable session; the orphan player owns no assets.
        store.save(w);
        store.db
          .prepare("INSERT INTO sessions VALUES(?,?,?)")
          .run(digest(token), id, now + 30 * 86400000);
        seen.set(id, now);
        res.setHeader(
          "Set-Cookie",
          `earth_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${req.socket.encrypted || req.headers["x-forwarded-proto"] === "https" ? "; Secure" : ""}`,
        );
        send(res, 200, snapshot(id));
        return;
      }
      const token = String(req.headers.cookie ?? "")
        .split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith("earth_session="))
        ?.slice(14);
      const session = token
        ? store.db
            .prepare("SELECT player FROM sessions WHERE token=? AND expires>?")
            .get(digest(token), clock())
        : null;
      if (!session) {
        send(res, 401, {
          error: "Hãy vào thế giới để bắt đầu.",
          locked: !!accessCode,
        });
        return;
      }
      const id = session.player;
      if (!seen.has(id) && seen.size >= 8) {
        send(res, 409, { error: "Thế giới đã đủ 8 kết nối." });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/state") {
        tick();
        seen.set(id, clock());
        send(res, 200, snapshot(id));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/command") {
        const cmd = await body(req);
        if (
          !cmd ||
          typeof cmd.id !== "string" ||
          !/^[a-zA-Z0-9-]{8,80}$/.test(cmd.id)
        ) {
          send(res, 400, { error: "commandId không hợp lệ." });
          return;
        }
        const previous = store.result(id, cmd.id);
        if (previous) {
          send(res, previous.status, {
            ...previous.payload,
            state: snapshot(id),
            replayed: true,
          });
          return;
        }
        tick();
        const w = structuredClone(store.world);
        let result;
        try {
          const message = applyCommand(w, id, cmd, clock());
          const gap = clock() - (w.lastWorkAt ?? clock());
          const earned = gap >= 0 && gap <= 5000 ? gap : 0;
          w.lastWorkAt = clock();
          w.creditMs = Math.min(CREDIT_MS, w.creditMs + earned);
          w.revision++;
          result = { status: 200, payload: { message } };
          store.save(w, { player: id, id: cmd.id, result });
        } catch (error) {
          // Rejected commands are durable too; retrying cannot turn a prior failure into a success.
          result = { status: 400, payload: { error: error.message } };
          store.save(store.world, { player: id, id: cmd.id, result });
        }
        seen.set(id, clock());
        send(res, result.status, { ...result.payload, state: snapshot(id) });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/event") {
        const e = store.world.events.find(
          (e) => e.id === Number(url.searchParams.get("id")),
        );
        send(res, e ? 200 : 404, e ?? { error: "Không tìm thấy sự kiện." });
        return;
      }
      send(res, 404, { error: "Không tìm thấy." });
    } catch (error) {
      if (!error.status) console.error(error);
      if (!res.headersSent)
        send(res, error.status || 500, {
          error: error.status
            ? error.message
            : "Máy chủ không xử lý được yêu cầu. Trạng thái đã xác nhận được giữ nguyên.",
        });
      else res.end();
    }
  });
  server.requestTimeout = 10000;
  const interval = setInterval(() => {
    try {
      tick();
    } catch (e) {
      console.error("Simulation paused:", e);
    }
  }, 1000);
  interval.unref();
  server.on("close", () => {
    clearInterval(interval);
    store.close();
  });
  return { server, store, tick };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const host = process.env.HOST || "127.0.0.1",
    port = Number(process.env.PORT || 3000),
    accessCode = process.env.WORLD_ACCESS_CODE || "";
  if (
    !["127.0.0.1", "localhost", "::1"].includes(host) &&
    accessCode.length < 16
  )
    throw new Error(
      "Set WORLD_ACCESS_CODE to at least 16 characters before binding to a network interface.",
    );
  const dbPath = resolve(
    process.env.DATA_DIR || resolve(root, "data"),
    "world.sqlite",
  );
  mkdirSync(dirname(dbPath), { recursive: true });
  const { server } = createGameServer({
    dbPath,
    speed: Number(process.env.SIM_SPEED || 30),
    accessCode,
  });
  server.listen(port, host, () =>
    console.log(
      `The Unfinished Earth: http://${host}:${port} (SIM_SPEED=${process.env.SIM_SPEED || 30})`,
    ),
  );
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
