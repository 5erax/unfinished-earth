import type {
  RecoveryJournalEntry,
  WorldRecoveryBundle,
} from "./postgres-world-store.js";

export const SIMULATION_BOUNDARY_INTENT = "simulation.boundary.commit" as const;
export const SIMULATION_BOUNDARY_EVENT = "simulation.boundary.committed" as const;

export type SimulationBoundaryEvent<TState> = {
  state: TState;
  boundaryId: string;
  serverTick: number;
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

function readBoundaryEvent<TState>(
  entry: RecoveryJournalEntry,
): SimulationBoundaryEvent<TState> | null {
  if (entry.eventType !== SIMULATION_BOUNDARY_EVENT) {
    return null;
  }

  if (!isRecord(entry.payload)) {
    throw new Error(
      `Simulation boundary at revision ${entry.revision} has a non-object event payload.`,
    );
  }

  const boundaryId = entry.payload.boundaryId;
  const serverTick = entry.payload.serverTick;
  if (
    typeof boundaryId !== "string" ||
    boundaryId.length === 0 ||
    typeof serverTick !== "number" ||
    !Number.isSafeInteger(serverTick) ||
    serverTick < 0 ||
    !("state" in entry.payload)
  ) {
    throw new Error(
      `Simulation boundary at revision ${entry.revision} has invalid replay metadata.`,
    );
  }

  return entry.payload as SimulationBoundaryEvent<TState>;
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
    const event = readBoundaryEvent<TState>(entry);
    if (!event) {
      continue;
    }

    if (entry.revision <= revision) {
      throw new Error(
        `Simulation journal revision ${entry.revision} is not after replay revision ${revision}.`,
      );
    }

    if (seenBoundaryIds.has(event.boundaryId)) {
      throw new Error(`Simulation boundary ${event.boundaryId} appears more than once.`);
    }

    seenBoundaryIds.add(event.boundaryId);
    state = event.state;
    serverTick = event.serverTick;
    revision = entry.revision;
    appliedBoundaryIds.push(event.boundaryId);
  }

  return {
    state,
    revision,
    serverTick,
    appliedBoundaryIds,
  };
}
