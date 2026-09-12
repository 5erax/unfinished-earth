import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CommandIdConflictError,
  PostgresWorldStore,
  StaleWorldOwnerError,
} from "./postgres-world-store.js";
import { WorldActor } from "./world-actor.js";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeDatabase = databaseUrl ? describe : describe.skip;
const migrations = [
  "0000_bootstrap.sql",
  "0001_world_ownership_and_snapshots.sql",
] as const;

async function migrateTestDatabase() {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    for (const migrationFile of migrations) {
      const migration = await readFile(
        new URL(
          `../../../../packages/db/drizzle/${migrationFile}`,
          import.meta.url,
        ),
        "utf8",
      );
      await pool.query(migration);
    }
  } finally {
    await pool.end();
  }
}

async function countDurableRows(worldId: string, commandId: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const receipt = await pool.query(
      `
        SELECT count(*)::int AS count
        FROM command_receipts
        WHERE scope = $1 AND command_id = $2
      `,
      [`world:${worldId}`, commandId],
    );
    const events = await pool.query(
      `
        SELECT count(*)::int AS count
        FROM event_outbox
        WHERE world_id = $1
      `,
      [worldId],
    );
    const world = await pool.query(
      "SELECT revision FROM worlds WHERE id = $1",
      [worldId],
    );

    return {
      receipts: Number(receipt.rows[0]?.count ?? 0),
      events: Number(events.rows[0]?.count ?? 0),
      revision: Number(world.rows[0]?.revision ?? 0),
    };
  } finally {
    await pool.end();
  }
}

describeDatabase("PostgreSQL world command durability", () => {
  beforeAll(async () => {
    await migrateTestDatabase();
  });

  it("T01: retries the same command idempotently without duplicating revision or event", async () => {
    const worldId = `test-${randomUUID()}`;
    const commandId = randomUUID();
    const store = PostgresWorldStore.fromConnectionString(databaseUrl);

    try {
      const actor = await WorldActor.create(worldId, store);
      let handlerCalls = 0;

      const first = await actor.execute(
        { commandId, intent: "spike.write", payload: "bridge-open" },
        async (value) => {
          handlerCalls += 1;
          return { acceptedValue: value };
        },
      );

      const retry = await actor.execute<string, { acceptedValue: string }>(
        { commandId, intent: "spike.write", payload: "bridge-open" },
        async () => {
          handlerCalls += 1;
          return { acceptedValue: "should-not-run" };
        },
      );

      expect(first).toEqual({
        revision: 1,
        result: { acceptedValue: "bridge-open" },
        duplicate: false,
      });
      expect(retry).toEqual({
        revision: 1,
        result: { acceptedValue: "bridge-open" },
        duplicate: true,
      });
      expect(handlerCalls).toBe(1);
      expect(await countDurableRows(worldId, commandId)).toEqual({
        receipts: 1,
        events: 1,
        revision: 1,
      });
    } finally {
      await store.close();
    }
  });

  it("T02: a committed command survives restart and an ACK-loss retry", async () => {
    const worldId = `test-${randomUUID()}`;
    const commandId = randomUUID();

    const firstStore = PostgresWorldStore.fromConnectionString(databaseUrl);
    const firstActor = await WorldActor.create(worldId, firstStore);
    const committedResult = await firstActor.execute(
      { commandId, intent: "spike.write", payload: "persist-me" },
      async (value) => ({ acceptedValue: value }),
    );

    // Model a process/connection loss after COMMIT but before the client can rely on the ACK.
    await firstStore.close();

    const restartedStore = PostgresWorldStore.fromConnectionString(databaseUrl);
    try {
      const restartedActor = await WorldActor.create(worldId, restartedStore);
      expect(restartedActor.revision).toBe(1);
      expect(restartedActor.fencingToken).toBeGreaterThan(firstActor.fencingToken);

      const retry = await restartedActor.execute<string, { acceptedValue: string }>(
        { commandId, intent: "spike.write", payload: "persist-me" },
        async () => ({ acceptedValue: "should-not-run" }),
      );

      expect(committedResult.revision).toBe(1);
      expect(retry).toEqual({
        revision: 1,
        result: { acceptedValue: "persist-me" },
        duplicate: true,
      });
    } finally {
      await restartedStore.close();
    }
  });

  it("T03: rejects reuse of a command id with a different request", async () => {
    const worldId = `test-${randomUUID()}`;
    const commandId = randomUUID();
    const store = PostgresWorldStore.fromConnectionString(databaseUrl);

    try {
      const actor = await WorldActor.create(worldId, store);
      await actor.execute(
        { commandId, intent: "spike.write", payload: "first" },
        async (value) => ({ acceptedValue: value }),
      );

      await expect(
        actor.execute(
          { commandId, intent: "spike.write", payload: "different" },
          async (value) => ({ acceptedValue: value }),
        ),
      ).rejects.toBeInstanceOf(CommandIdConflictError);

      expect(actor.revision).toBe(1);
      expect(await countDurableRows(worldId, commandId)).toEqual({
        receipts: 1,
        events: 1,
        revision: 1,
      });
    } finally {
      await store.close();
    }
  });

  it("rolls back revision, receipt and outbox when the handler fails", async () => {
    const worldId = `test-${randomUUID()}`;
    const commandId = randomUUID();
    const store = PostgresWorldStore.fromConnectionString(databaseUrl);

    try {
      const actor = await WorldActor.create(worldId, store);

      await expect(
        actor.execute(
          { commandId, intent: "spike.write", payload: "fail" },
          async () => {
            throw new Error("simulated handler failure");
          },
        ),
      ).rejects.toThrow("simulated handler failure");

      expect(actor.revision).toBe(0);
      expect(await countDurableRows(worldId, commandId)).toEqual({
        receipts: 0,
        events: 0,
        revision: 0,
      });
    } finally {
      await store.close();
    }
  });

  it("T04: competing actors fence the stale writer and stale snapshot", async () => {
    const worldId = `test-${randomUUID()}`;
    const store = PostgresWorldStore.fromConnectionString(databaseUrl);

    try {
      const [actorA, actorB] = await Promise.all([
        WorldActor.create(worldId, store, `actor-a-${randomUUID()}`),
        WorldActor.create(worldId, store, `actor-b-${randomUUID()}`),
      ]);

      const current =
        actorA.fencingToken > actorB.fencingToken ? actorA : actorB;
      const stale = current === actorA ? actorB : actorA;

      expect(current.fencingToken).toBeGreaterThan(stale.fencingToken);

      await expect(
        stale.execute(
          {
            commandId: randomUUID(),
            intent: "spike.write",
            payload: "stale-write",
          },
          async (value) => ({ acceptedValue: value }),
        ),
      ).rejects.toBeInstanceOf(StaleWorldOwnerError);

      await expect(
        stale.saveSnapshot({ acceptedValues: [] as string[] }),
      ).rejects.toBeInstanceOf(StaleWorldOwnerError);

      const accepted = await current.execute(
        {
          commandId: randomUUID(),
          intent: "spike.write",
          payload: "current-write",
        },
        async (value) => ({ acceptedValue: value }),
      );
      expect(accepted.revision).toBe(1);
    } finally {
      await store.close();
    }
  });

  it("T05: recovers a snapshot and replays only the journal tail after restart", async () => {
    const worldId = `test-${randomUUID()}`;
    const firstStore = PostgresWorldStore.fromConnectionString(databaseUrl);
    const firstActor = await WorldActor.create(worldId, firstStore);

    for (const value of ["alpha", "beta"] as const) {
      await firstActor.execute(
        {
          commandId: randomUUID(),
          intent: "spike.write",
          payload: value,
        },
        async (payload) => ({ acceptedValue: payload }),
      );
    }

    await firstActor.saveSnapshot({ acceptedValues: ["alpha", "beta"] });

    await firstActor.execute(
      {
        commandId: randomUUID(),
        intent: "spike.write",
        payload: "gamma",
      },
      async (payload) => ({ acceptedValue: payload }),
    );
    await firstStore.close();

    const restartedStore = PostgresWorldStore.fromConnectionString(databaseUrl);
    try {
      const restartedActor = await WorldActor.create(worldId, restartedStore);
      expect(restartedActor.revision).toBe(3);

      const recovery = await restartedStore.loadRecoveryBundle<{
        acceptedValues: string[];
      }>(worldId);

      expect(recovery.worldRevision).toBe(3);
      expect(recovery.snapshot).toMatchObject({
        revision: 2,
        state: { acceptedValues: ["alpha", "beta"] },
      });
      expect(recovery.journal.map((entry) => entry.revision)).toEqual([3]);

      const replayed = [...(recovery.snapshot?.state.acceptedValues ?? [])];
      for (const entry of recovery.journal) {
        const payload = entry.payload as { payload?: unknown };
        if (typeof payload.payload === "string") {
          replayed.push(payload.payload);
        }
      }
      expect(replayed).toEqual(["alpha", "beta", "gamma"]);
    } finally {
      await restartedStore.close();
    }
  });
});
