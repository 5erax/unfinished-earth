import { describe, expect, it } from "vitest";
import {
  createWeatherState,
  type BasinWaterState,
  type WeatherMarkovConfig,
} from "./index.js";
import {
  advanceWorldSimulationHour,
  advanceWorldSimulationHours,
  type WorldSimulationState,
} from "./world-simulation.js";

function basin(overrides: Partial<BasinWaterState> = {}): BasinWaterState {
  return {
    soilM3: 7_208.96,
    groundwaterM3: 9_830.4,
    channelM3: 900,
    floodM3: 0,
    treeCover: 0.5,
    gateFraction: 0.6,
    ...overrides,
  };
}

const weatherConfig: WeatherMarkovConfig = {
  minStateHours: 2,
  transitionWeights: {
    clear: { clear: 1, overcast: 3, rain: 0 },
    overcast: { clear: 1, overcast: 1, rain: 3 },
    rain: { clear: 1, overcast: 3, rain: 2 },
  },
  profiles: {
    clear: {
      temperatureOffsetC: 2,
      rainMmPerHour: 0,
      evaporationMmPerHour: 0.12,
      visibilityFactor: 1,
    },
    overcast: {
      temperatureOffsetC: 0,
      rainMmPerHour: 0,
      evaporationMmPerHour: 0.06,
      visibilityFactor: 0.85,
    },
    rain: {
      temperatureOffsetC: -2,
      rainMmPerHour: 0.8,
      evaporationMmPerHour: 0.02,
      visibilityFactor: 0.55,
    },
  },
};

const hourInput = {
  climate: { baselineTemperatureC: 22 },
  weatherConfig,
  upstreamEvaporationFootprint: {
    soilAreaM2: 40_000,
    channelAreaM2: 1_000,
    floodAreaM2: 0,
  },
  downstreamEvaporationFootprint: {
    soilAreaM2: 38_000,
    channelAreaM2: 1_200,
    floodAreaM2: 0,
  },
  causeIds: ["climate:season-baseline"],
};

function initialWorld(): WorldSimulationState {
  return {
    serverTick: 0,
    weather: createWeatherState({ seed: 4_242, initialKind: "overcast" }),
    water: {
      upstream: basin({ gateFraction: 0.6 }),
      downstream: basin({ gateFraction: 0.4 }),
    },
  };
}

describe("real hourly world simulation aggregate", () => {
  it("uses one authoritative weather sample for finite water input", () => {
    const result = advanceWorldSimulationHour(initialWorld(), hourInput);

    expect(result.state.serverTick).toBe(1);
    expect(result.state.weather.serverTick).toBe(1);
    expect(result.event).toMatchObject({
      eventId: "world:hour:1",
      boundaryId: "hour:1",
      serverTick: 1,
      causeIds: ["climate:season-baseline"],
    });
    expect(result.event.waterLedger.rainM3).toBeCloseTo(
      (result.event.weather.rainMm * 65_536 * 2) / 1_000,
      9,
    );
    expect(Math.abs(result.event.waterLedger.residualM3)).toBeLessThanOrEqual(
      1e-6,
    );
  });

  it("matches continuous execution after JSON snapshot + restart", () => {
    const continuous = advanceWorldSimulationHours(initialWorld(), 24, hourInput);

    const beforeRestart = advanceWorldSimulationHours(initialWorld(), 9, hourInput);
    const restored = JSON.parse(
      JSON.stringify(beforeRestart.state),
    ) as WorldSimulationState;
    const afterRestart = advanceWorldSimulationHours(restored, 15, hourInput);

    expect(afterRestart.state).toEqual(continuous.state);
    expect([...beforeRestart.events, ...afterRestart.events]).toEqual(
      continuous.events,
    );
  });

  it("rejects a world/weather tick mismatch instead of silently resynchronizing", () => {
    const invalid = initialWorld();
    invalid.serverTick = 3;

    expect(() => advanceWorldSimulationHour(invalid, hourInput)).toThrow(
      "does not match world tick",
    );
  });
});
