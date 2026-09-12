import { randomUUID } from "node:crypto";
import type { PostgresWorldStore } from "./postgres-world-store.js";

export type WorldCommand<TPayload = unknown> = {
  commandId: string;
  intent: string;
  payload: TPayload;
};

export type WorldCommandResult<TResult = unknown> = {
  revision: number;
  result: TResult;
  duplicate: boolean;
};

export class WorldActor {
  #revision: number;
  #queue: Promise<void> = Promise.resolve();

  private constructor(
    private readonly worldId: string,
    private readonly store: PostgresWorldStore,
    readonly ownerId: string,
    readonly fencingToken: number,
    revision: number,
  ) {
    this.#revision = revision;
  }

  static async create(
    worldId: string,
    store: PostgresWorldStore,
    ownerId = randomUUID(),
  ) {
    const ownership = await store.acquireOwnership(worldId, ownerId);
    return new WorldActor(
      worldId,
      store,
      ownership.ownerId,
      ownership.fencingToken,
      ownership.revision,
    );
  }

  get revision() {
    return this.#revision;
  }

  async saveSnapshot<TState>(state: TState) {
    await this.store.saveSnapshot(
      this.worldId,
      this.fencingToken,
      this.#revision,
      state,
    );
  }

  async execute<TPayload, TResult>(
    command: WorldCommand<TPayload>,
    handler: (
      payload: TPayload,
      currentRevision: number,
    ) => Promise<TResult> | TResult,
  ): Promise<WorldCommandResult<TResult>> {
    let release!: () => void;
    const previous = this.#queue;
    this.#queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      const response = await this.store.executeCommand(
        {
          worldId: this.worldId,
          fencingToken: this.fencingToken,
          commandId: command.commandId,
          intent: command.intent,
          payload: command.payload,
        },
        handler,
      );

      this.#revision = Math.max(this.#revision, response.revision);
      return response;
    } finally {
      release();
    }
  }
}
