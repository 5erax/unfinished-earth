import { nextXorshift32, normalizeSeed } from "./prng.js";

export const GAME_DAY_REAL_SECONDS = 30 * 60;
export const GAME_HOUR_REAL_SECONDS = GAME_DAY_REAL_SECONDS / 24;
export const MAX_OFFLINE_REAL_SECONDS = 72 * 60 * 60;
export const WORK_CREDIT_CAP_SECONDS = 8 * 60 * 60;
export const PROTOTYPE_SIM_VERSION = "prototype-0.1" as const;

export type ScheduledSimInput = {
  id: string;
  tick: number;
  delta: number;
};

export type DeterministicSimState = {
  simVersion: typeof PROTOTYPE_SIM_VERSION;
  serverTick: number;
  prngState: number;
  accumulator: number;
  absenceStartedAtRealSeconds: number | null;
  lastSimulatedAtRealSeconds: number;
  catchUpWatermarkRealSeconds: number;
  scheduledInputs: ScheduledSimInput[];
};

export type DeterministicSimEvent =
  | {
      type: "scheduled-input.applied";
      eventId: string;
      tick: number;
      inputId: string;
      delta: number;
    }
  | {
      type: "hourly-boundary.completed";
      eventId: string;
      tick: number;
      randomSample: number;
      accumulator: number;
    };

export type AdvanceResult = {
  state: DeterministicSimState;
  events: DeterministicSimEvent[];
};

function assertFiniteNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`);
  }
}

function assertNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`);
  }
}

function validateScheduledInputs(inputs: readonly ScheduledSimInput[]) {
  const ids = new Set<string>();
  for (const input of inputs) {
    if (!input.id) {
      throw new RangeError("scheduled input id must be non-empty");
    }
    if (ids.has(input.id)) {
      throw new RangeError(`scheduled input id ${input.id} is duplicated`);
    }
    ids.add(input.id);
    assertNonNegativeInteger(input.tick, "scheduled input tick");
    if (input.tick === 0) {
      throw new RangeError("scheduled input tick must be greater than zero");
    }
    if (!Number.isFinite(input.delta)) {
      throw new RangeError("scheduled input delta must be finite");
    }
  }
}

export function clampOfflineCatchUp(elapsedRealSeconds: number) {
  assertFiniteNonNegative(elapsedRealSeconds, "elapsedRealSeconds");
  return Math.min(elapsedRealSeconds, MAX_OFFLINE_REAL_SECONDS);
}

export function createDeterministicSimState(options: {
  seed: number;
  startRealSeconds?: number;
  scheduledInputs?: readonly ScheduledSimInput[];
}): DeterministicSimState {
  const startRealSeconds = options.startRealSeconds ?? 0;
  assertFiniteNonNegative(startRealSeconds, "startRealSeconds");

  const scheduledInputs = [...(options.scheduledInputs ?? [])].map((input) => ({
    ...input,
  }));
  validateScheduledInputs(scheduledInputs);
  scheduledInputs.sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id));

  return {
    simVersion: PROTOTYPE_SIM_VERSION,
    serverTick: 0,
    prngState: normalizeSeed(options.seed),
    accumulator: 0,
    absenceStartedAtRealSeconds: null,
    lastSimulatedAtRealSeconds: startRealSeconds,
    catchUpWatermarkRealSeconds: startRealSeconds,
    scheduledInputs,
  };
}

export function advanceSimulationTicks(
  state: DeterministicSimState,
  tickCount: number,
): AdvanceResult {
  assertNonNegativeInteger(tickCount, "tickCount");

  let nextState: DeterministicSimState = {
    ...state,
    scheduledInputs: state.scheduledInputs.map((input) => ({ ...input })),
  };
  const events: DeterministicSimEvent[] = [];

  for (let index = 0; index < tickCount; index += 1) {
    const nextTick = nextState.serverTick + 1;
    const dueInputs = nextState.scheduledInputs.filter(
      (input) => input.tick === nextTick,
    );
    const futureInputs = nextState.scheduledInputs.filter(
      (input) => input.tick !== nextTick,
    );

    let accumulator = nextState.accumulator;
    for (const input of dueInputs) {
      accumulator += input.delta;
      events.push({
        type: "scheduled-input.applied",
        eventId: `input:${input.id}:tick:${nextTick}`,
        tick: nextTick,
        inputId: input.id,
        delta: input.delta,
      });
    }

    const prngState = nextXorshift32(nextState.prngState);
    const randomSample = prngState % 7;
    accumulator += randomSample;

    const nextWatermark =
      nextState.catchUpWatermarkRealSeconds + GAME_HOUR_REAL_SECONDS;
    nextState = {
      ...nextState,
      serverTick: nextTick,
      prngState,
      accumulator,
      lastSimulatedAtRealSeconds: nextWatermark,
      catchUpWatermarkRealSeconds: nextWatermark,
      scheduledInputs: futureInputs,
    };

    events.push({
      type: "hourly-boundary.completed",
      eventId: `hour:${nextTick}`,
      tick: nextTick,
      randomSample,
      accumulator,
    });
  }

  return { state: nextState, events };
}

export function startOfflineAbsence(
  state: DeterministicSimState,
  absenceStartedAtRealSeconds = state.lastSimulatedAtRealSeconds,
): DeterministicSimState {
  assertFiniteNonNegative(
    absenceStartedAtRealSeconds,
    "absenceStartedAtRealSeconds",
  );
  if (absenceStartedAtRealSeconds < state.lastSimulatedAtRealSeconds) {
    throw new RangeError(
      "absenceStartedAtRealSeconds cannot be earlier than lastSimulatedAtRealSeconds",
    );
  }

  if (state.absenceStartedAtRealSeconds !== null) {
    return state;
  }

  return {
    ...state,
    absenceStartedAtRealSeconds,
    lastSimulatedAtRealSeconds: absenceStartedAtRealSeconds,
    catchUpWatermarkRealSeconds: absenceStartedAtRealSeconds,
    scheduledInputs: state.scheduledInputs.map((input) => ({ ...input })),
  };
}

export function catchUpOfflineTo(
  state: DeterministicSimState,
  nowRealSeconds: number,
): AdvanceResult {
  assertFiniteNonNegative(nowRealSeconds, "nowRealSeconds");
  if (state.absenceStartedAtRealSeconds === null) {
    throw new Error("offline catch-up requires an active absence window");
  }

  const capRealSeconds =
    state.absenceStartedAtRealSeconds + MAX_OFFLINE_REAL_SECONDS;
  const targetRealSeconds = Math.min(nowRealSeconds, capRealSeconds);
  if (targetRealSeconds <= state.catchUpWatermarkRealSeconds) {
    return {
      state: {
        ...state,
        scheduledInputs: state.scheduledInputs.map((input) => ({ ...input })),
      },
      events: [],
    };
  }

  const elapsedRealSeconds =
    targetRealSeconds - state.catchUpWatermarkRealSeconds;
  const tickCount = Math.floor(elapsedRealSeconds / GAME_HOUR_REAL_SECONDS);
  return advanceSimulationTicks(state, tickCount);
}

export * from "./prng.js";
export * from "./water-food.js";
export * from "./settlement-food.js";
export * from "./weather.js";
export * from "./world-simulation.js";
