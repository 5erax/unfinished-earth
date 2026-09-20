import { CloudStore } from "./cloud-store.js";
import { advance, applyCommand, join, CREDIT_MS } from "./world.js";
export const onlinePlayers = (w, now) =>
  Object.values(w.players).filter((p) => now - p.seen < 15000);
export function catchUp(w, now, speed) {
  now = Math.max(now, w.lastWall);
  if (!Object.keys(w.players).length) {
    w.lastWall = now;
    return;
  }
  const activeUntil = Math.min(
    now,
    Math.max(...Object.values(w.players).map((p) => p.seen)) + 15000,
  );
  if (activeUntil > w.lastWall) advance(w, activeUntil, true, speed);
  if (now > w.lastWall) advance(w, now, false, speed);
}
export function view(w, id, now, speed) {
  const players = Object.fromEntries(
    Object.entries(w.players)
      .filter(([key, p]) => key === id || now - p.seen < 15000)
      .map(([key, p]) => [
        key,
        {
          id: key,
          name: p.name,
              classId: p.classId || null,
          x: p.x,
          z: p.z,
          ...(key === id
            ? {
                bag: p.bag,
                    cooldowns: p.cooldowns || {},
                    focusUntil: p.focusUntil || 0,
                discoveries: p.discoveries,
                trades: p.trades || 0,
                xp: p.xp || 0,
                level: p.level || 1,
                profession: p.profession,
                achievements: p.achievements || [],
                stats: p.stats || {},
                unspentPower: p.unspentPower || 0,
                powers: p.powers || {},
                talents: p.talents || {},
                talentPoints: p.talentPoints || 0,
                hp: p.hp,
                maxHp: p.maxHp,
                equipment: p.equipment || {},
                combatCooldowns: p.combatCooldowns || {},
                kills: p.kills || 0,
                moveSeq: p.moveSeq || 0,
              }
            : {}),
        },
      ]),
  );
  return {
    ...w,
    players,
    events: w.events.slice(-60),
    you: id,
    speed,
    online: onlinePlayers(w, now).length,
  };
}
const json = (status, data, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
async function hash(text) {
  const result = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(result)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
async function body(req) {
  const reader = req.body?.getReader();
  if (!reader) throw Object.assign(new Error("Yêu cầu JSON."), { status: 400 });
  let length = 0,
    parts = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 4096) {
      await reader.cancel();
      throw Object.assign(new Error("Nội dung quá lớn."), { status: 413 });
    }
    parts.push(value);
  }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const p of parts) {
    data.set(p, offset);
    offset += p.length;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(data));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw Error();
    return parsed;
  } catch {
    throw Object.assign(new Error("JSON không hợp lệ."), { status: 400 });
  }
}
export function createWorker(assets = {}, clock = Date.now) {
  return {
    async fetch(req, env) {
      const url = new URL(req.url);
      let response;
      try {
        if (
          (req.method === "GET" || req.method === "HEAD") &&
          assets[url.pathname]
        ) {
          const [content, type, binary] = assets[url.pathname];
          response = new Response(
            req.method === "HEAD"
              ? null
              : binary
                ? Uint8Array.from(atob(content), (c) => c.charCodeAt(0))
                : content,
            {
              headers: { "Content-Type": type, "Cache-Control": "no-cache" },
            },
          );
        } else if (req.method === "GET" && url.pathname === "/health") {
          // Verify durable storage, not merely that a Worker isolate started.
          await env.DB.prepare("SELECT 1 FROM cloud_worlds LIMIT 1").first();
          response = json(200, { ok: true, runtime: "worker-d1" });
        } else {
          if (req.method === "POST") {
            const origin = req.headers.get("origin");
            if (origin && new URL(origin).origin !== url.origin)
              throw Object.assign(new Error("Nguồn yêu cầu không hợp lệ."), {
                status: 403,
              });
            if (
              !req.headers.get("content-type")?.startsWith("application/json")
            )
              throw Object.assign(new Error("Yêu cầu JSON."), { status: 415 });
          }
          const store = new CloudStore(env.DB),
            now = clock(),
            speed = Number(env.SIM_SPEED || 30);
          if (!Number.isFinite(speed) || speed < 1 || speed > 30)
            throw Error("SIM_SPEED must be 1–30.");
          if (req.method === "POST" && url.pathname === "/api/join") {
            const data = await body(req);
            if (
              env.WORLD_ACCESS_CODE &&
              (await hash(String(data.code ?? ""))) !==
                (await hash(env.WORLD_ACCESS_CODE))
            )
              throw Object.assign(new Error("Mã thế giới không đúng."), {
                status: 403,
              });
            const token = crypto.randomUUID() + crypto.randomUUID(),
              id = crypto.randomUUID();
            const result = await store.transact(
              now,
              (w) => {
                catchUp(w, now, speed);
                if (onlinePlayers(w, now).length >= 8)
                  throw Object.assign(new Error("Thế giới đã đủ 8 người."), {
                    status: 409,
                  });
                if (Object.keys(w.players).length >= 100)
                  throw Object.assign(
                    new Error(
                      "Bản thử nghiệm đã đạt giới hạn 100 nhân vật. Hãy quay lại bằng phiên cũ.",
                    ),
                    { status: 409 },
                  );
                join(w, id, now, data.character);
                return { status: 200, payload: {} };
              },
              {
                session: {
                  token: await hash(token),
                  player: id,
                  expires: now + 30 * 86400000,
                },
              },
            );
            response = json(200, view(result.world, id, now, speed), {
              "Set-Cookie": `earth_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${url.protocol === "https:" ? "; Secure" : ""}`,
            });
          } else {
            const token = (req.headers.get("cookie") || "")
              .split(";")
              .map((x) => x.trim())
              .find((x) => x.startsWith("earth_session="))
              ?.slice(14);
            const session = token
              ? await store.session(await hash(token), now)
              : null;
            if (!session)
              response = json(401, {
                error: "Hãy vào thế giới để bắt đầu.",
                locked: !!env.WORLD_ACCESS_CODE,
              });
            else {
              const id = session.player;
              const allowed = (w) => {
                if (!w.players[id])
                  throw Object.assign(
                    new Error("Phiên chơi không còn trong save."),
                    { status: 401 },
                  );
                if (
                  now - w.players[id].seen >= 15000 &&
                  onlinePlayers(w, now).length >= 8
                )
                  throw Object.assign(new Error("Thế giới đã đủ 8 người."), {
                    status: 409,
                  });
              };
              if (req.method === "GET" && url.pathname === "/api/state") {
                const r = await store.transact(now, (w) => {
                  allowed(w);
                  catchUp(w, now, speed);
                  w.players[id].seen = now;
                  return { status: 200, payload: {} };
                });
                response = json(200, view(r.world, id, now, speed));
              } else if (
                req.method === "POST" &&
                url.pathname === "/api/command"
              ) {
                const cmd = await body(req);
                if (
                  typeof cmd.id !== "string" ||
                  !/^[a-zA-Z0-9-]{8,80}$/.test(cmd.id)
                )
                  throw Object.assign(new Error("commandId không hợp lệ."), {
                    status: 400,
                  });
                const r = await store.transact(
                  now,
                  (w) => {
                    allowed(w);
                    catchUp(w, now, speed);
                    // Roll back gameplay mutations on rejection, preserving legitimate catch-up.
                    const next = structuredClone(w);
                    let result;
                    try {
                      const message = applyCommand(next, id, cmd, now);
                      const gap = now - (next.lastWorkAt ?? now);
                      next.creditMs = Math.min(
                        CREDIT_MS,
                        next.creditMs + (gap >= 0 && gap <= 5000 ? gap : 0),
                      );
                      next.lastWorkAt = now;
                      Object.assign(w, next);
                      result = { status: 200, payload: { message } };
                    } catch (error) {
                      result = {
                        status: 400,
                        payload: { error: error.message },
                      };
                    }
                    w.players[id].seen = now;
                    return result;
                  },
                  { receipt: { player: id, id: cmd.id } },
                );
                response = json(r.status, {
                  ...r.payload,
                  state: view(r.world, id, now, speed),
                  replayed: r.replayed,
                });
              } else if (
                req.method === "GET" &&
                url.pathname === "/api/event"
              ) {
                const w = await store.read(now),
                  event = w.events.find(
                    (e) => e.id === Number(url.searchParams.get("id")),
                  );
                response = json(
                  event ? 200 : 404,
                  event ?? { error: "Không tìm thấy sự kiện." },
                );
              } else response = json(404, { error: "Không tìm thấy." });
            }
          }
        }
      } catch (error) {
        if (!error.status) console.error(error);
        response = json(error.status || 500, {
          error: error.status
            ? error.message
            : "Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại.",
        });
      }
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("Referrer-Policy", "no-referrer");
      response.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'",
      );
      return response;
    },
  };
}
