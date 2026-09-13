import {
  nextXorshift32,
  normalizeSeed,
  uint32ToUnitFloat,
} from "./prng.js";

export const WEATHER_KINDS = ["clear", "overcast", "rain"] as const;
export type WeatherKind = (typeof WEATHER_KINDS)[number];

export type WeatherState = {
  serverTick: number;
  kind: WeatherKind;
  hoursInState: number;
  prngState: number;
};

export type WeatherProfile = {
  temperatureOffsetC: number;
  rainMmPerHour: number;
  evaporationMmPerHour: number;
  visibilityFactor: number;
};

export type WeatherTransitionWeights = Record<
  WeatherKind,
  Record<WeatherKind, number>
>;

export type WeatherMarkovConfig = {
  minStateHours: number;
  transitionWeights: WeatherTransitionWeights;
  profiles: Record<WeatherKind, WeatherProfile>;
};

export type WeatherClimateInput = {
  baselineTemperatureC: number;
};

export type WeatherHourSample = {
  eventId: string;
  tick: number;
  kind: WeatherKind;
  temperatureC: number;
  rainMm: number;
  evaporationMm: number;
  visibilityFactor: number;
  transitionRandom: number;
};

export type WeatherStepResult = {
  state: WeatherState;
  sample: WeatherHourSample;
};

export type WeatherAdvanceResult = {
  state: WeatherState;
  samples: WeatherHourSample[];
};

function requireFinite(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite`);
  }
}

function requireFiniteNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`);
  }
}

function requireFraction(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be within [0, 1]`);
  }
}

function requirePositiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive safe integer`);
  }
}

function validateConfig(config: WeatherMarkovConfig) {
  requirePositiveInteger(config.minStateHours, "minStateHours");

  for (const from of WEATHER_KINDS) {
    let totalWeight = 0;
    for (const to of WEATHER_KINDS) {
      const weight = config.transitionWeights[from][to];
      requireFiniteNonNegative(weight, `transition ${from}->${to} weight`);
      totalWeight += weight;
    }
    if (totalWeight <= 0) {
      throw new RangeError(`transition weights for ${from} must sum above zero`);
    }
  }

  for (const kind of WEATHER_KINDS) {
    const profile = config.profiles[kind];
    requireFinite(profile.temperatureOffsetC, `${kind} temperatureOffsetC`);
    requireFiniteNonNegative(profile.rainMmPerHour, `${kind} rainMmPerHour`);
    requireFiniteNonNegative(
      profile.evaporationMmPerHour,
      `${kind} evaporationMmPerHour`,
    );
    requireFraction(profile.visibilityFactor, `${kind} visibilityFactor`);
  }
}

function validateState(state: WeatherState) {
  if (!Number.isSafeInteger(state.serverTick) || state.serverTick < 0) {
    throw new RangeError("weather serverTick must be a non-negative safe integer");
  }
  if (!WEATHER_KINDS.includes(state.kind)) {
    throw new RangeError(`unknown weather kind ${String(state.kind)}`);
  }
  requirePositiveInteger(state.hoursInState, "weather hoursInState");
  if (!Number.isSafeInteger(state.prngState) || state.prngState < 0) {
    throw new RangeError("weather prngState must be a non-negative safe integer");
  }
}

function chooseNextKind(
  current: WeatherKind,
  transitionRandom: number,
  config: WeatherMarkovConfig,
): WeatherKind {
  const weights = config.transitionWeights[current];
  const total = WEATHER_KINDS.reduce((sum, kind) => sum + weights[kind], 0);
  let cursor = transitionRandom * total;

  for (const kind of WEATHER_KINDS) {
    cursor -= weights[kind];
    if (cursor < 0) {
      return kind;
    }
  }

  return "rain";
}

export function createWeatherState(options: {
  seed: number;
  initialKind?: WeatherKind;
  serverTick?: number;
}): WeatherState {
  const serverTick = options.serverTick ?? 0;
  if (!Number.isSafeInteger(serverTick) || serverTick < 0) {
    throw new RangeError("weather serverTick must be a non-negative safe integer");
  }

  return {
    serverTick,
    kind: options.initialKind ?? "clear",
    hoursInState: 1,
    prngState: normalizeSeed(options.seed),
  };
}

export function stepWeatherHour(
  state: WeatherState,
  climate: WeatherClimateInput,
  config: WeatherMarkovConfig,
): WeatherStepResult {
  validateState(state);
  validateConfig(config);
  requireFinite(climate.baselineTemperatureC, "baselineTemperatureC");

  const prngState = nextXorshift32(state.prngState);
  const transitionRandom = uint32ToUnitFloat(prngState);
  const profile = config.profiles[state.kind];
  const tick = state.serverTick + 1;

  const sample: WeatherHourSample = {
    eventId: `weather:hour:${tick}`,
    tick,
    kind: state.kind,
    temperatureC: climate.baselineTemperatureC + profile.temperatureOffsetC,
    rainMm: profile.rainMmPerHour,
    evaporationMm: profile.evaporationMmPerHour,
    visibilityFactor: profile.visibilityFactor,
    transitionRandom,
  };

  const canTransition = state.hoursInState >= config.minStateHours;
  const nextKind = canTransition
    ? chooseNextKind(state.kind, transitionRandom, config)
    : state.kind;

  return {
    state: {
      serverTick: tick,
      kind: nextKind,
      hoursInState: nextKind === state.kind ? state.hoursInState + 1 : 1,
      prngState,
    },
    sample,
  };
}

export function advanceWeatherHours(
  state: WeatherState,
  hourCount: number,
  climate: WeatherClimateInput,
  config: WeatherMarkovConfig,
): WeatherAdvanceResult {
  if (!Number.isSafeInteger(hourCount) || hourCount < 0) {
    throw new RangeError("hourCount must be a non-negative safe integer");
  }

  let nextState = { ...state };
  const samples: WeatherHourSample[] = [];
  for (let index = 0; index < hourCount; index += 1) {
    const step = stepWeatherHour(nextState, climate, config);
    nextState = step.state;
    samples.push(step.sample);
  }
  return { state: nextState, samples };
}
