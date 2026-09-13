import {
  stepTwoBasinWaterHour,
  type BasinEvaporationInput,
  type TwoBasinWaterState,
  type WaterLedger,
} from "./water-food.js";
import {
  stepWeatherHour,
  type WeatherClimateInput,
  type WeatherHourSample,
  type WeatherMarkovConfig,
  type WeatherState,
} from "./weather.js";

export type WorldSimulationState = {
  serverTick: number;
  weather: WeatherState;
  water: TwoBasinWaterState;
};

export type WorldSimulationHourInput = {
  climate: WeatherClimateInput;
  weatherConfig: WeatherMarkovConfig;
  upstreamEvaporationFootprint: Omit<
    BasinEvaporationInput,
    "potentialEvaporationMm"
  >;
  downstreamEvaporationFootprint: Omit<
    BasinEvaporationInput,
    "potentialEvaporationMm"
  >;
  causeIds?: string[];
};

export type WorldSimulationHourEvent = {
  eventId: string;
  type: "world.hour.completed";
  boundaryId: string;
  serverTick: number;
  causeIds: string[];
  weather: WeatherHourSample;
  waterLedger: WaterLedger;
};

export type WorldSimulationHourResult = {
  state: WorldSimulationState;
  event: WorldSimulationHourEvent;
};

function validateCauseIds(causeIds: readonly string[]) {
  if (causeIds.some((causeId) => !causeId.trim())) {
    throw new RangeError("causeIds must contain only non-empty strings");
  }
}

function evaporationInput(
  potentialEvaporationMm: number,
  footprint: Omit<BasinEvaporationInput, "potentialEvaporationMm">,
): BasinEvaporationInput {
  return {
    potentialEvaporationMm,
    soilAreaM2: footprint.soilAreaM2,
    channelAreaM2: footprint.channelAreaM2,
    floodAreaM2: footprint.floodAreaM2,
  };
}

export function advanceWorldSimulationHour(
  state: WorldSimulationState,
  input: WorldSimulationHourInput,
): WorldSimulationHourResult {
  if (!Number.isSafeInteger(state.serverTick) || state.serverTick < 0) {
    throw new RangeError("world serverTick must be a non-negative safe integer");
  }
  if (state.weather.serverTick !== state.serverTick) {
    throw new Error(
      `Weather tick ${state.weather.serverTick} does not match world tick ${state.serverTick}.`,
    );
  }

  const causeIds = [...(input.causeIds ?? [])];
  validateCauseIds(causeIds);

  const weather = stepWeatherHour(
    state.weather,
    input.climate,
    input.weatherConfig,
  );
  const water = stepTwoBasinWaterHour(state.water, {
    upstreamRainMm: weather.sample.rainMm,
    downstreamRainMm: weather.sample.rainMm,
    upstreamEvaporation: evaporationInput(
      weather.sample.evaporationMm,
      input.upstreamEvaporationFootprint,
    ),
    downstreamEvaporation: evaporationInput(
      weather.sample.evaporationMm,
      input.downstreamEvaporationFootprint,
    ),
  });

  const serverTick = state.serverTick + 1;
  if (weather.state.serverTick !== serverTick) {
    throw new Error(
      `Weather reducer produced tick ${weather.state.serverTick}; expected ${serverTick}.`,
    );
  }

  const boundaryId = `hour:${serverTick}`;
  return {
    state: {
      serverTick,
      weather: weather.state,
      water: water.state,
    },
    event: {
      eventId: `world:${boundaryId}`,
      type: "world.hour.completed",
      boundaryId,
      serverTick,
      causeIds,
      weather: weather.sample,
      waterLedger: water.ledger,
    },
  };
}

export function advanceWorldSimulationHours(
  state: WorldSimulationState,
  hourCount: number,
  input: WorldSimulationHourInput,
) {
  if (!Number.isSafeInteger(hourCount) || hourCount < 0) {
    throw new RangeError("hourCount must be a non-negative safe integer");
  }

  let nextState: WorldSimulationState = {
    ...state,
    weather: { ...state.weather },
    water: {
      upstream: { ...state.water.upstream },
      downstream: { ...state.water.downstream },
    },
  };
  const events: WorldSimulationHourEvent[] = [];

  for (let index = 0; index < hourCount; index += 1) {
    const step = advanceWorldSimulationHour(nextState, input);
    nextState = step.state;
    events.push(step.event);
  }

  return { state: nextState, events };
}
