export type WorldCommand<TPayload = unknown> = {
  commandId: string;
  payload: TPayload;
};

export type WorldCommandResult<TResult = unknown> = {
  revision: number;
  result: TResult;
};

export class WorldActor {
  #revision = 0;
  #queue: Promise<void> = Promise.resolve();

  get revision() {
    return this.#revision;
  }

  async execute<TPayload, TResult>(
    command: WorldCommand<TPayload>,
    handler: (payload: TPayload, currentRevision: number) => Promise<TResult> | TResult,
  ): Promise<WorldCommandResult<TResult>> {
    let release!: () => void;
    const previous = this.#queue;
    this.#queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      const result = await handler(command.payload, this.#revision);
      this.#revision += 1;
      return { revision: this.#revision, result };
    } finally {
      release();
    }
  }
}
