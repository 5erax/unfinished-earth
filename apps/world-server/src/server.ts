import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { z } from "zod";
import {
  CommandIdConflictError,
  PostgresWorldStore,
  StaleWorldOwnerError,
} from "./world/postgres-world-store.js";
import { WorldActor } from "./world/world-actor.js";

const spikeMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ping"), sentAt: z.number() }),
  z.object({ type: z.literal("get-revision") }),
  z.object({
    type: z.literal("spike-write"),
    commandId: z.string().min(1).max(128),
    value: z.string().max(128),
  }),
]);

type ServerOptions = {
  databaseUrl?: string;
  worldId?: string;
};

export async function createServer(options: ServerOptions = {}) {
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

  const store = PostgresWorldStore.fromConnectionString(options.databaseUrl);
  const actor = await WorldActor.create(
    options.worldId ?? process.env.WORLD_ID ?? "prototype-world",
    store,
  );

  app.addHook("onClose", async () => {
    await store.close();
  });

  app.get("/health", async () => ({
    ok: true,
    worldRevision: actor.revision,
    fencingToken: actor.fencingToken,
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
        socket.send(
          JSON.stringify({
            type: "revision",
            revision: actor.revision,
            fencingToken: actor.fencingToken,
          }),
        );
        return;
      }

      try {
        const response = await actor.execute(
          {
            commandId: parsed.data.commandId,
            intent: "spike.write",
            payload: parsed.data.value,
          },
          async (value) => ({ acceptedValue: value }),
        );

        socket.send(JSON.stringify({ type: "spike-write-result", ...response }));
      } catch (error) {
        if (
          error instanceof CommandIdConflictError ||
          error instanceof StaleWorldOwnerError
        ) {
          socket.send(
            JSON.stringify({
              type: "error",
              code: error.code,
              commandId: parsed.data.commandId,
            }),
          );
          return;
        }

        app.log.error(error);
        socket.send(
          JSON.stringify({
            type: "error",
            code: "WRITE_FAILED",
            commandId: parsed.data.commandId,
          }),
        );
      }
    });
  });

  return app;
}
