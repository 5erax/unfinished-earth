import type {
  RecoveryJournalEntry,
  WorldRecoveryBundle,
} from "./postgres-world-store.js";

export const SIMULATION_BOUNDARY_INTENT = "simulation.boundary.commit" as const;

export type SimulationBoundaryEnvelope<TState> = {
  commandId: string;
  fencingToken: number;
  intent: typeof SIMULATION_BOUNDARY_INTENT;
  payload: unknown;
  result: {
    state: TState;
    boundaryId: string;
    serverTick: number;
  };
};

export type ReplayedSimulationState<TState> = {
  state: TState;
  revision: number;
  serverTick: number | null;
  appliedBoundaryIds: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readBoundaryEnvelope<TState>(
  entry: RecoveryJournalEntry,
): SimulationBoundaryEnvelope<TState> | null {
  if (entry.eventType !== SIMULATION_BOUNDARY_INTENT) {
    return null;
  }

  if (!isRecord(entry.payload)) {
    throw new Error(
      `Simulation boundary at revision ${entry.revision} has a non-object journal payload.`,
    );
  }

  const intent = entry.payload.intent;
  const result = entry.payload.result;
  if (intent !== SIMULATION_BOUNDARY_INTENT || !isRecord(result)) {
    throw new Error(
      `Simulation boundary at revision ${entry.revision} has an invalid command envelope.`,
    );
  }

  const boundaryId = result.boundaryId;
  const serverTick = result.serverTick;
  if (
    typeof boundaryId !== "string" ||
    boundaryId.length === 0 ||
    typeof serverTick !== "number" ||
    !Number.isSafeInteger(serverTick) ||
    serverTick < 0 ||
    !("state" in result)
  ) {
    throw new Error(
      `Simulation boundary at revision ${entry.revision} has invalid replay metadata.`,
    );
  }

  return entry.payload as SimulationBoundaryEnvelope<TState>;
}

export function replaySimulationState<TState>(
  bundle: WorldRecoveryBundle<TState>,
): ReplayedSimulationState<TState> {
  if (!bundle.snapshot) {
    throw new Error(
      "Simulation replay requires a durable snapshot as the base state for this spike.",
    );
  }

  let state = bundle.snapshot.state;
  let revision = bundle.snapshot.revision;
  let serverTick: number | null = null;
  const appliedBoundaryIds: string[] = [];
  const seenBoundaryIds = new Set<string>();

  for (const entry of bundle.journal) {
    if (entry.revision <= revision) {
      throw new Error(
        `Journal revision ${entry.revision} is not after replay revision ${revision}.`,
      );
    }

    const envelope = readBoundaryEnvelope<TState>(entry);
    if (!envelope) {
      continue;
    }

    const { boundaryId } = envelope.result;
    if (seenBoundaryIds.has(boundaryId)) {
      throw new Error(`Simulation boundary ${boundaryId} appears more than once.`);
    }

    seenBoundaryIds.add(boundaryId);
    state = envelope.result.state;
    serverTick = envelope.result.serverTick;
    revision = entry.revision;
    appliedBoundaryIds.push(boundaryId);
  }

  return {
    state,
    revision,
    serverTick,
    appliedBoundaryIds,
  };
}
