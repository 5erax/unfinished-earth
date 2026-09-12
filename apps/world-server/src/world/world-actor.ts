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
    revision: number,
  ) {
    this.#revision = revision;
  }

  static async create(worldId: string, store: PostgresWorldStore) {
    const revision = await store.loadRevision(worldId);
    return new WorldActor(worldId, store, revision);
  }

  get revision() {
    return this.#revision;
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
