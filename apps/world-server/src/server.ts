import { randomUUID } from "node:crypto";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { z } from "zod";
import { WorldActor } from "./world/world-actor.js";

const spikeMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping"), sentAt: z.number() }),
  z.object({ type: z.literal("get-revision") }),
  z.object({ type: z.literal("spike-write"), value: z.string().max(128) }),
]);

export async function createServer() {
  const app = Fastify({
    logger: true,
    bodyLimit: 64 * 1024,
  });

  await app.register(websocket, {
    options: {
      maxPayload: 64 * 1024,
      perMessageDeflate: false,
    },
  });

  const actor = new WorldActor();

  app.get("/health", async () => ({
    ok: true,
    worldRevision: actor.revision,
  }));

  app.get("/ws", { websocket: true }, (socket) => {
    socket.on("message", async (raw) => {
      let json: unknown;
      try {
        json = JSON.parse(raw.toString());
      } catch {
        socket.send(JSON.stringify({ type: "error", code: "INVALID_JSON" }));
        return;
      }

      const parsed = spikeMessageSchema.safeParse(json);

      if (!parsed.success) {
        socket.send(JSON.stringify({ type: "error", code: "INVALID_MESSAGE" }));
        return;
      }

      if (parsed.data.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", sentAt: parsed.data.sentAt }));
        return;
      }

      if (parsed.data.type === "get-revision") {
        socket.send(JSON.stringify({ type: "revision", revision: actor.revision }));
        return;
      }

      const response = await actor.execute(
        { commandId: randomUUID(), payload: parsed.data.value },
        async (value) => ({ acceptedValue: value }),
      );

      socket.send(JSON.stringify({ type: "spike-write-result", ...response }));
    });
  });

  return app;
}
