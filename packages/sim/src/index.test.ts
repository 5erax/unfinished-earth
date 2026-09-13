import { describe, expect, it } from "vitest";
import {
  GAME_HOUR_REAL_SECONDS,
  MAX_OFFLINE_REAL_SECONDS,
  WORK_CREDIT_CAP_SECONDS,
  advanceSimulationTicks,
  catchUpOfflineTo,
  clampOfflineCatchUp,
  createDeterministicSimState,
  startOfflineAbsence,
  type DeterministicSimState,
} from "./index.js";

function cloneState(state: DeterministicSimState): DeterministicSimState {
  return JSON.parse(JSON.stringify(state)) as DeterministicSimState;
}

describe("offline rules", () => {
  it("caps world catch-up at 72 real hours", () => {
    expect(clampOfflineCatchUp(90 * 24 * 60 * 60)).toBe(MAX_OFFLINE_REAL_SECONDS);
  });

  it("keeps work credit as a separate 8-hour cap", () => {
    expect(WORK_CREDIT_CAP_SECONDS).toBe(8 * 60 * 60);
    expect(WORK_CREDIT_CAP_SECONDS).toBeLessThan(MAX_OFFLINE_REAL_SECONDS);
  });

  it("does not extend the 72-hour absence window across repeated catch-up calls", () => {
    const absent = startOfflineAbsence(
      createDeterministicSimState({ seed: 101 }),
      0,
    );
    const first = catchUpOfflineTo(absent, 90 * 24 * 60 * 60);
    const second = catchUpOfflineTo(first.state, 180 * 24 * 60 * 60);

    const expectedTicks = Math.floor(
      MAX_OFFLINE_REAL_SECONDS / GAME_HOUR_REAL_SECONDS,
    );
    expect(first.state.serverTick).toBe(expectedTicks);
    expect(second.state.serverTick).toBe(expectedTicks);
    expect(second.events).toEqual([]);
    expect(second.state.absenceStartedAtRealSeconds).toBe(0);
    expect(second.state.catchUpWatermarkRealSeconds).toBe(
      expectedTicks * GAME_HOUR_REAL_SECONDS,
    );
  });
});

describe("deterministic simulation state", () => {
  const scheduledInputs = [
    { id: "gate-open", tick: 3, delta: 11 },
    { id: "bridge-restored", tick: 7, delta: -4 },
  ] as const;

  it("produces the same state and events for the same seed and inputs", () => {
    const first = advanceSimulationTicks(
      createDeterministicSimState({ seed: 42, scheduledInputs }),
      12,
    );
    const second = advanceSimulationTicks(
      createDeterministicSimState({ seed: 42, scheduledInputs }),
      12,
    );

    expect(second).toEqual(first);
  });

  it("matches continuous execution after JSON snapshot, restart, and resume", () => {
    const initial = createDeterministicSimState({
      seed: 0x12345678,
      scheduledInputs,
    });
    const continuous = advanceSimulationTicks(initial, 12);

    const beforeRestart = advanceSimulationTicks(initial, 5);
    const restoredSnapshot = cloneState(beforeRestart.state);
    const afterRestart = advanceSimulationTicks(restoredSnapshot, 7);

    expect(afterRestart.state).toEqual(continuous.state);
    expect([...beforeRestart.events, ...afterRestart.events]).toEqual(
      continuous.events,
    );
  });

  it("matches continuous execution with offline catch-up for the same boundary", () => {
    const continuousInitial = createDeterministicSimState({
      seed: 20260912,
      scheduledInputs,
    });
    const continuous = advanceSimulationTicks(continuousInitial, 12);

    const offlineInitial = startOfflineAbsence(
      createDeterministicSimState({ seed: 20260912, scheduledInputs }),
      0,
    );
    const offline = catchUpOfflineTo(
      offlineInitial,
      12 * GAME_HOUR_REAL_SECONDS,
    );

    expect(offline.state).toEqual({
      ...continuous.state,
      absenceStartedAtRealSeconds: 0,
    });
    expect(offline.events).toEqual(continuous.events);
  });
});
