import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { PostgresWorldStore } from "./postgres-world-store.js";
import {
  SIMULATION_BOUNDARY_EVENT,
  SIMULATION_BOUNDARY_INTENT,
  replaySimulationState,
} from "./simulation-replay.js";
import { WorldActor } from "./world-actor.js";

const databaseUrl = process.env.DATABASE_URL ?? "";
const describeDatabase = databaseUrl ? describe : describe.skip;

type PrototypeDomainState = {
  serverTick: number;
  prngState: number;
  water: {
    upstreamChannelM3: number;
    downstreamChannelM3: number;
  };
  crop: {
    downstreamProgress: number;
  };
  food: {
    downstreamRations: number;
  };
};

function advancePrototypeBoundary(
  state: PrototypeDomainState,
  options: { transferM3: number; cropDelta: number; rationDelta?: number },
): PrototypeDomainState {
  return {
    serverTick: state.serverTick + 1,
    prngState: (state.prngState * 1_664_525 + 1_013_904_223) >>> 0,
    water: {
      upstreamChannelM3: state.water.upstreamChannelM3 - options.transferM3,
      downstreamChannelM3:
        state.water.downstreamChannelM3 + options.transferM3,
    },
    crop: {
      downstreamProgress: state.crop.downstreamProgress + options.cropDelta,
    },
    food: {
      downstreamRations:
        state.food.downstreamRations + (options.rationDelta ?? 0),
    },
  };
}

describeDatabase("durable simulation boundary replay", () => {
  it("reconstructs exact post-boundary state from snapshot + projected domain-event tail", async () => {
    const worldId = `sim-replay-${randomUUID()}`;
    const firstStore = PostgresWorldStore.fromConnectionString(databaseUrl);
    const firstActor = await WorldActor.create(worldId, firstStore);

    const initial: PrototypeDomainState = {
      serverTick: 0,
      prngState: 42,
      water: {
        upstreamChannelM3: 900,
        downstreamChannelM3: 700,
      },
      crop: { downstreamProgress: 10 },
      food: { downstreamRations: 72 },
    };
    const boundary1 = advancePrototypeBoundary(initial, {
      transferM3: 10,
      cropDelta: 0.5,
    });
    const command1 = randomUUID();
    const committed1 = await firstActor.execute(
      {
        commandId: command1,
        intent: SIMULATION_BOUNDARY_INTENT,
        payload: { boundaryId: "hour:1" },
      },
      async () => ({
        state: boundary1,
        boundaryId: "hour:1",
        serverTick: boundary1.serverTick,
      }),
      ({ result }) => [
        {
          eventType: SIMULATION_BOUNDARY_EVENT,
          payload: result,
          causeIds: ["world:initial-water"],
        },
      ],
    );
    expect(committed1.revision).toBe(1);
    await firstActor.saveSnapshot(boundary1);

    const boundary2 = advancePrototypeBoundary(boundary1, {
      transferM3: 30,
      cropDelta: 0.5,
      rationDelta: 4,
    });
    const command2 = randomUUID();
    const committed2 = await firstActor.execute(
      {
        commandId: command2,
        intent: SIMULATION_BOUNDARY_INTENT,
        payload: { boundaryId: "hour:2" },
      },
      async () => ({
        state: boundary2,
        boundaryId: "hour:2",
        serverTick: boundary2.serverTick,
      }),
      ({ result }) => [
        {
          eventType: SIMULATION_BOUNDARY_EVENT,
          payload: result,
          causeIds: ["gate:upstream"],
        },
      ],
    );
    expect(committed2.revision).toBe(2);

    const duplicate = await firstActor.execute(
      {
        commandId: command2,
        intent: SIMULATION_BOUNDARY_INTENT,
        payload: { boundaryId: "hour:2" },
      },
      async () => ({
        state: initial,
        boundaryId: "should-not-run",
        serverTick: 999,
      }),
      () => {
        throw new Error("duplicate retry must not re-project events");
      },
    );
    expect(duplicate).toMatchObject({ revision: 2, duplicate: true });
    await firstStore.close();

    const restartedStore = PostgresWorldStore.fromConnectionString(databaseUrl);
    try {
      const restartedActor = await WorldActor.create(worldId, restartedStore);
      expect(restartedActor.revision).toBe(2);

      const bundle =
        await restartedStore.loadRecoveryBundle<PrototypeDomainState>(worldId);
      const replayed = replaySimulationState(bundle);

      expect(bundle.snapshot).toMatchObject({ revision: 1, state: boundary1 });
      expect(bundle.journal).toHaveLength(1);
      expect(bundle.journal[0]).toMatchObject({
        eventType: SIMULATION_BOUNDARY_EVENT,
        causeIds: ["gate:upstream"],
      });
      expect(replayed).toEqual({
        state: boundary2,
        revision: 2,
        serverTick: 2,
        appliedBoundaryIds: ["hour:2"],
      });

      const pool = new Pool({ connectionString: databaseUrl });
      try {
        const events = await pool.query(
          `
            SELECT count(*)::int AS count
            FROM event_outbox
            WHERE world_id = $1 AND event_type = $2
          `,
          [worldId, SIMULATION_BOUNDARY_EVENT],
        );
        expect(Number(events.rows[0]?.count ?? 0)).toBe(2);
      } finally {
        await pool.end();
      }
    } finally {
      await restartedStore.close();
    }
  });

  it("rolls back revision, receipt and events when domain-event projection fails", async () => {
    const worldId = `projection-failure-${randomUUID()}`;
    const commandId = randomUUID();
    const store = PostgresWorldStore.fromConnectionString(databaseUrl);

    try {
      const actor = await WorldActor.create(worldId, store);
      await expect(
        actor.execute(
          {
            commandId,
            intent: SIMULATION_BOUNDARY_INTENT,
            payload: { boundaryId: "hour:1" },
          },
          async () => ({
            state: {
              serverTick: 1,
              prngState: 7,
              water: { upstreamChannelM3: 1, downstreamChannelM3: 1 },
              crop: { downstreamProgress: 1 },
              food: { downstreamRations: 1 },
            } satisfies PrototypeDomainState,
            boundaryId: "hour:1",
            serverTick: 1,
          }),
          () => {
            throw new Error("simulated domain-event projection failure");
          },
        ),
      ).rejects.toThrow("simulated domain-event projection failure");

      expect(actor.revision).toBe(0);

      const pool = new Pool({ connectionString: databaseUrl });
      try {
        const [world, receipts, events] = await Promise.all([
          pool.query("SELECT revision FROM worlds WHERE id = $1", [worldId]),
          pool.query(
            "SELECT count(*)::int AS count FROM command_receipts WHERE scope = $1 AND command_id = $2",
            [`world:${worldId}`, commandId],
          ),
          pool.query(
            "SELECT count(*)::int AS count FROM event_outbox WHERE world_id = $1",
            [worldId],
          ),
        ]);
        expect(Number(world.rows[0]?.revision ?? -1)).toBe(0);
        expect(Number(receipts.rows[0]?.count ?? -1)).toBe(0);
        expect(Number(events.rows[0]?.count ?? -1)).toBe(0);
      } finally {
        await pool.end();
      }
    } finally {
      await store.close();
    }
  });
});

describe("simulation replay validation", () => {
  it("rejects malformed simulation boundary domain events instead of guessing", () => {
    expect(() =>
      replaySimulationState<PrototypeDomainState>({
        worldRevision: 2,
        snapshot: {
          revision: 1,
          fencingToken: 1,
          state: {
            serverTick: 1,
            prngState: 1,
            water: { upstreamChannelM3: 1, downstreamChannelM3: 1 },
            crop: { downstreamProgress: 1 },
            food: { downstreamRations: 1 },
          },
        },
        journal: [
          {
            sequence: 1,
            revision: 2,
            eventType: SIMULATION_BOUNDARY_EVENT,
            payload: {},
            causeIds: [],
          },
        ],
      }),
    ).toThrow("invalid replay metadata");
  });
});
