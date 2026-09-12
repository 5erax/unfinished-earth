import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";

const defaultDatabaseUrl =
  "postgresql://unfinished:unfinished@localhost:5432/unfinished_earth";

export class CommandIdConflictError extends Error {
  readonly code = "COMMAND_ID_CONFLICT";

  constructor(commandId: string) {
    super(`Command id ${commandId} was reused with a different request payload.`);
    this.name = "CommandIdConflictError";
  }
}

export class StaleWorldOwnerError extends Error {
  readonly code = "STALE_WORLD_OWNER";

  constructor(worldId: string, fencingToken: number) {
    super(
      `World ${worldId} rejected stale fencing token ${fencingToken}; another actor owns the current epoch.`,
    );
    this.name = "StaleWorldOwnerError";
  }
}

export class SnapshotRevisionMismatchError extends Error {
  readonly code = "SNAPSHOT_REVISION_MISMATCH";

  constructor(worldId: string, snapshotRevision: number, currentRevision: number) {
    super(
      `World ${worldId} cannot snapshot revision ${snapshotRevision}; current durable revision is ${currentRevision}.`,
    );
    this.name = "SnapshotRevisionMismatchError";
  }
}

export type DurableCommand<TPayload> = {
  worldId: string;
  fencingToken: number;
  commandId: string;
  intent: string;
  payload: TPayload;
};

export type DurableCommandResult<TResult> = {
  revision: number;
  result: TResult;
  duplicate: boolean;
};

export type WorldOwnership = {
  ownerId: string;
  revision: number;
  fencingToken: number;
};

export type RecoverySnapshot<TState> = {
  revision: number;
  fencingToken: number;
  state: TState;
};

export type RecoveryJournalEntry = {
  sequence: number;
  revision: number;
  eventType: string;
  payload: unknown;
  causeIds: unknown;
};

export type WorldRecoveryBundle<TState> = {
  worldRevision: number;
  snapshot: RecoverySnapshot<TState> | null;
  journal: RecoveryJournalEntry[];
};

type ReceiptRow = {
  request_hash: string;
  result: unknown;
  world_revision: string | number | bigint;
};

type WorldRow = {
  revision: string | number | bigint;
  fencing_token: string | number | bigint;
  owner_id: string | null;
};

type SnapshotRow = {
  world_revision: string | number | bigint;
  fencing_token: string | number | bigint;
  state: unknown;
};

type JournalRow = {
  sequence: string | number | bigint;
  world_revision: string | number | bigint;
  event_type: string;
  payload: unknown;
  cause_ids: unknown;
};

function toSafeNonNegativeInteger(
  value: string | number | bigint,
  label: string,
): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ${label} returned by PostgreSQL: ${String(value)}`);
  }
  return parsed;
}

function toSafeRevision(value: string | number | bigint): number {
  return toSafeNonNegativeInteger(value, "world revision");
}

function toSafeFencingToken(value: string | number | bigint): number {
  return toSafeNonNegativeInteger(value, "fencing token");
}

function toSafeSequence(value: string | number | bigint): number {
  return toSafeNonNegativeInteger(value, "journal sequence");
}

function requestHash(intent: string, payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify([intent, payload]))
    .digest("hex");
}

async function ensureWorld(client: PoolClient, worldId: string) {
  await client.query(
    `
      INSERT INTO worlds (id, sim_version, content_version)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO NOTHING
    `,
    [worldId, "prototype-0.1", "prototype-0.1"],
  );
}

function assertCurrentFence(
  worldId: string,
  expectedFencingToken: number,
  world: Pick<WorldRow, "fencing_token">,
) {
  const currentFencingToken = toSafeFencingToken(world.fencing_token);
  if (currentFencingToken !== expectedFencingToken) {
    throw new StaleWorldOwnerError(worldId, expectedFencingToken);
  }
}

export class PostgresWorldStore {
  constructor(private readonly pool: Pool) {}

  static fromConnectionString(
    databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl,
  ) {
    return new PostgresWorldStore(new Pool({ connectionString: databaseUrl }));
  }

  async close() {
    await this.pool.end();
  }

  async acquireOwnership(worldId: string, ownerId: string): Promise<WorldOwnership> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await ensureWorld(client, worldId);
      const query = await client.query(
        `
          UPDATE worlds
          SET fencing_token = fencing_token + 1,
              owner_id = $2,
              updated_at = now()
          WHERE id = $1
          RETURNING revision, fencing_token, owner_id
        `,
        [worldId, ownerId],
      );
      const row = query.rows[0] as WorldRow | undefined;
      if (!row) {
        throw new Error(`World ${worldId} could not acquire an ownership epoch.`);
      }

      await client.query("COMMIT");
      return {
        ownerId,
        revision: toSafeRevision(row.revision),
        fencingToken: toSafeFencingToken(row.fencing_token),
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original failure.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async loadRevision(worldId: string): Promise<number> {
    const client = await this.pool.connect();

    try {
      await ensureWorld(client, worldId);
      const query = await client.query(
        "SELECT revision FROM worlds WHERE id = $1",
        [worldId],
      );
      const row = query.rows[0] as Pick<WorldRow, "revision"> | undefined;
      if (!row) {
        throw new Error(`World ${worldId} could not be loaded after creation.`);
      }
      return toSafeRevision(row.revision);
    } finally {
      client.release();
    }
  }

  async saveSnapshot<TState>(
    worldId: string,
    fencingToken: number,
    revision: number,
    state: TState,
  ): Promise<void> {
    const stateJson = JSON.stringify(state);
    if (stateJson === undefined) {
      throw new Error("World snapshots must be JSON serializable.");
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await ensureWorld(client, worldId);
      const worldQuery = await client.query(
        "SELECT revision, fencing_token, owner_id FROM worlds WHERE id = $1 FOR UPDATE",
        [worldId],
      );
      const world = worldQuery.rows[0] as WorldRow | undefined;
      if (!world) {
        throw new Error(`World ${worldId} disappeared while saving a snapshot.`);
      }

      assertCurrentFence(worldId, fencingToken, world);
      const currentRevision = toSafeRevision(world.revision);
      if (currentRevision !== revision) {
        throw new SnapshotRevisionMismatchError(worldId, revision, currentRevision);
      }

      await client.query(
        `
          INSERT INTO world_snapshots
            (world_id, world_revision, fencing_token, state)
          VALUES ($1, $2, $3, $4::jsonb)
          ON CONFLICT (world_id, world_revision)
          DO UPDATE SET
            fencing_token = EXCLUDED.fencing_token,
            state = EXCLUDED.state,
            created_at = now()
        `,
        [worldId, revision, fencingToken, stateJson],
      );

      await client.query("COMMIT");
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original failure.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async loadRecoveryBundle<TState>(worldId: string): Promise<WorldRecoveryBundle<TState>> {
    const client = await this.pool.connect();

    try {
      await ensureWorld(client, worldId);
      const worldQuery = await client.query(
        "SELECT revision FROM worlds WHERE id = $1",
        [worldId],
      );
      const world = worldQuery.rows[0] as Pick<WorldRow, "revision"> | undefined;
      if (!world) {
        throw new Error(`World ${worldId} could not be loaded for recovery.`);
      }
      const worldRevision = toSafeRevision(world.revision);

      const snapshotQuery = await client.query(
        `
          SELECT world_revision, fencing_token, state
          FROM world_snapshots
          WHERE world_id = $1 AND world_revision <= $2
          ORDER BY world_revision DESC
          LIMIT 1
        `,
        [worldId, worldRevision],
      );
      const snapshotRow = snapshotQuery.rows[0] as SnapshotRow | undefined;
      const snapshotRevision = snapshotRow
        ? toSafeRevision(snapshotRow.world_revision)
        : 0;

      const journalQuery = await client.query(
        `
          SELECT sequence, world_revision, event_type, payload, cause_ids
          FROM event_outbox
          WHERE world_id = $1
            AND world_revision > $2
            AND world_revision <= $3
          ORDER BY world_revision ASC, sequence ASC
        `,
        [worldId, snapshotRevision, worldRevision],
      );

      return {
        worldRevision,
        snapshot: snapshotRow
          ? {
              revision: snapshotRevision,
              fencingToken: toSafeFencingToken(snapshotRow.fencing_token),
              state: snapshotRow.state as TState,
            }
          : null,
        journal: (journalQuery.rows as JournalRow[]).map((row) => ({
          sequence: toSafeSequence(row.sequence),
          revision: toSafeRevision(row.world_revision),
          eventType: row.event_type,
          payload: row.payload,
          causeIds: row.cause_ids,
        })),
      };
    } finally {
      client.release();
    }
  }

  async executeCommand<TPayload, TResult>(
    command: DurableCommand<TPayload>,
    handler: (
      payload: TPayload,
      currentRevision: number,
    ) => Promise<TResult> | TResult,
  ): Promise<DurableCommandResult<TResult>> {
    const client = await this.pool.connect();
    const scope = `world:${command.worldId}`;
    const hash = requestHash(command.intent, command.payload);

    try {
      await client.query("BEGIN");
      await ensureWorld(client, command.worldId);

      const worldQuery = await client.query(
        "SELECT revision, fencing_token, owner_id FROM worlds WHERE id = $1 FOR UPDATE",
        [command.worldId],
      );
      const world = worldQuery.rows[0] as WorldRow | undefined;
      if (!world) {
        throw new Error(`World ${command.worldId} disappeared during command execution.`);
      }
      assertCurrentFence(command.worldId, command.fencingToken, world);

      const receiptQuery = await client.query(
        `
          SELECT request_hash, result, world_revision
          FROM command_receipts
          WHERE scope = $1 AND command_id = $2
        `,
        [scope, command.commandId],
      );
      const receipt = receiptQuery.rows[0] as ReceiptRow | undefined;

      if (receipt) {
        if (receipt.request_hash !== hash) {
          throw new CommandIdConflictError(command.commandId);
        }

        await client.query("COMMIT");
        return {
          revision: toSafeRevision(receipt.world_revision),
          result: receipt.result as TResult,
          duplicate: true,
        };
      }

      const currentRevision = toSafeRevision(world.revision);
      const result = await handler(command.payload, currentRevision);
      const nextRevision = currentRevision + 1;
      const resultJson = JSON.stringify(result);

      if (resultJson === undefined) {
        throw new Error("Durable command results must be JSON serializable.");
      }

      const worldUpdate = await client.query(
        `
          UPDATE worlds
          SET revision = $2, updated_at = now()
          WHERE id = $1 AND fencing_token = $3
        `,
        [command.worldId, nextRevision, command.fencingToken],
      );
      if (worldUpdate.rowCount !== 1) {
        throw new StaleWorldOwnerError(command.worldId, command.fencingToken);
      }

      await client.query(
        `
          INSERT INTO command_receipts
            (scope, command_id, request_hash, result, world_revision)
          VALUES ($1, $2, $3, $4::jsonb, $5)
        `,
        [scope, command.commandId, hash, resultJson, nextRevision],
      );

      const eventId = createHash("sha256")
        .update(`${scope}:${nextRevision}:${command.commandId}`)
        .digest("hex");
      const eventPayload = JSON.stringify({
        commandId: command.commandId,
        fencingToken: command.fencingToken,
        intent: command.intent,
        payload: command.payload,
        result,
      });

      await client.query(
        `
          INSERT INTO event_outbox
            (event_id, world_id, world_revision, event_type, payload, cause_ids)
          VALUES ($1, $2, $3, $4, $5::jsonb, '[]'::jsonb)
        `,
        [eventId, command.worldId, nextRevision, command.intent, eventPayload],
      );

      await client.query("COMMIT");
      return { revision: nextRevision, result, duplicate: false };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original failure. A broken connection will be discarded by pg.
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
