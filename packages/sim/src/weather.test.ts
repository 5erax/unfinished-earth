import { describe, expect, it } from "vitest";
import {
  advanceWeatherHours,
  createWeatherState,
  stepWeatherHour,
  type WeatherMarkovConfig,
} from "./weather.js";

const fixtureConfig: WeatherMarkovConfig = {
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

const climate = { baselineTemperatureC: 22 };

describe("three-state deterministic weather", () => {
  it("produces the same 24 hourly samples from the same saved seed/state", () => {
    const first = advanceWeatherHours(
      createWeatherState({ seed: 91, initialKind: "clear" }),
      24,
      climate,
      fixtureConfig,
    );
    const second = advanceWeatherHours(
      createWeatherState({ seed: 91, initialKind: "clear" }),
      24,
      climate,
      fixtureConfig,
    );

    expect(second).toEqual(first);
    expect(first.samples).toHaveLength(24);
    expect(first.samples.map((sample) => sample.eventId)).toEqual(
      Array.from({ length: 24 }, (_, index) => `weather:hour:${index + 1}`),
    );
  });

  it("matches continuous execution after JSON snapshot + restart", () => {
    const initial = createWeatherState({ seed: 1_337, initialKind: "overcast" });
    const continuous = advanceWeatherHours(initial, 24, climate, fixtureConfig);

    const beforeRestart = advanceWeatherHours(initial, 9, climate, fixtureConfig);
    const restored = JSON.parse(JSON.stringify(beforeRestart.state)) as typeof initial;
    const afterRestart = advanceWeatherHours(restored, 15, climate, fixtureConfig);

    expect(afterRestart.state).toEqual(continuous.state);
    expect([...beforeRestart.samples, ...afterRestart.samples]).toEqual(
      continuous.samples,
    );
  });

  it("holds every weather state for at least two game hours even when transition weights force a change", () => {
    const forcedConfig: WeatherMarkovConfig = {
      ...fixtureConfig,
      transitionWeights: {
        clear: { clear: 0, overcast: 1, rain: 0 },
        overcast: { clear: 0, overcast: 0, rain: 1 },
        rain: { clear: 1, overcast: 0, rain: 0 },
      },
    };

    const start = createWeatherState({ seed: 5, initialKind: "clear" });
    const first = stepWeatherHour(start, climate, forcedConfig);
    expect(first.sample.kind).toBe("clear");
    expect(first.state.kind).toBe("clear");
    expect(first.state.hoursInState).toBe(2);

    const second = stepWeatherHour(first.state, climate, forcedConfig);
    expect(second.sample.kind).toBe("clear");
    expect(second.state.kind).toBe("overcast");
    expect(second.state.hoursInState).toBe(1);

    const third = stepWeatherHour(second.state, climate, forcedConfig);
    expect(third.sample.kind).toBe("overcast");
    expect(third.state.kind).toBe("overcast");
    expect(third.state.hoursInState).toBe(2);
  });

  it("emits one authoritative rain/evaporation sample that downstream systems can share", () => {
    const rainState = createWeatherState({ seed: 77, initialKind: "rain" });
    const step = stepWeatherHour(rainState, climate, fixtureConfig);

    expect(step.sample).toMatchObject({
      kind: "rain",
      temperatureC: 20,
      rainMm: 0.8,
      evaporationMm: 0.02,
      visibilityFactor: 0.55,
    });
    expect(step.sample.rainMm).toBeGreaterThan(0);
    expect(step.sample.evaporationMm).toBeGreaterThanOrEqual(0);
  });
});
