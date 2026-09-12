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

export type DurableCommand<TPayload> = {
  worldId: string;
  commandId: string;
  intent: string;
  payload: TPayload;
};

export type DurableCommandResult<TResult> = {
  revision: number;
  result: TResult;
  duplicate: boolean;
};

type ReceiptRow = {
  request_hash: string;
  result: unknown;
  world_revision: string | number | bigint;
};

type WorldRow = {
  revision: string | number | bigint;
};

function toSafeRevision(value: string | number | bigint): number {
  const revision = Number(value);
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new Error(`Invalid world revision returned by PostgreSQL: ${String(value)}`);
  }
  return revision;
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

  async loadRevision(worldId: string): Promise<number> {
    const client = await this.pool.connect();

    try {
      await ensureWorld(client, worldId);
      const query = await client.query(
        "SELECT revision FROM worlds WHERE id = $1",
        [worldId],
      );
      const row = query.rows[0] as WorldRow | undefined;
      if (!row) {
        throw new Error(`World ${worldId} could not be loaded after creation.`);
      }
      return toSafeRevision(row.revision);
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
        "SELECT revision FROM worlds WHERE id = $1 FOR UPDATE",
        [command.worldId],
      );
      const world = worldQuery.rows[0] as WorldRow | undefined;
      if (!world) {
        throw new Error(`World ${command.worldId} disappeared during command execution.`);
      }

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

      await client.query(
        `
          UPDATE worlds
          SET revision = $2, updated_at = now()
          WHERE id = $1
        `,
        [command.worldId, nextRevision],
      );

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
