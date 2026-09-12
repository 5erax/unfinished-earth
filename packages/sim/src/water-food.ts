export const BASIN_AREA_M2 = 65_536;
export const SOIL_CAPACITY_M3 = 13_107.2;
export const GROUNDWATER_CAPACITY_M3 = 19_660.8;
export const CHANNEL_BANKFULL_M3 = 1_500;
export const GATE_DAILY_CAPACITY_M3 = 1_200;
export const MIN_GATE_FRACTION = 0.2;
export const HOURS_PER_GAME_DAY = 24;
export const CROP_IRRIGATION_MAX_M3_PER_DAY = 0.016;
export const CROP_MATURE_PROGRESS = 12;
export const CROP_HARVEST_BIOMASS_KG = 10;
export const CROP_EDIBLE_GRAIN_KG = 7;
export const CROP_BYPRODUCT_KG = 3;
export const COOK_GRAIN_BATCH_KG = 2;
export const COOK_RATIONS_PER_BATCH = 4;

export type BasinWaterState = {
  soilM3: number;
  groundwaterM3: number;
  channelM3: number;
  floodM3: number;
  treeCover: number;
  gateFraction: number;
};

export type TwoBasinWaterState = {
  upstream: BasinWaterState;
  downstream: BasinWaterState;
};

export type HourlyWaterInput = {
  upstreamRainMm: number;
  downstreamRainMm: number;
};

export type WaterLedger = {
  startM3: number;
  rainM3: number;
  internalTransferM3: number;
  exportM3: number;
  endM3: number;
  residualM3: number;
};

export type WaterStepResult = {
  state: TwoBasinWaterState;
  ledger: WaterLedger;
};

export type CropLotState = {
  cropId: string;
  progress: number;
  biomassKg: number;
  mature: boolean;
};

export type CropDayResult = {
  lot: CropLotState;
  progressDelta: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function basinTotal(state: BasinWaterState) {
  return state.soilM3 + state.groundwaterM3 + state.channelM3 + state.floodM3;
}

export function waterTotal(state: TwoBasinWaterState) {
  return basinTotal(state.upstream) + basinTotal(state.downstream);
}

function validateBasin(state: BasinWaterState) {
  requireFiniteNonNegative(state.soilM3, "soilM3");
  requireFiniteNonNegative(state.groundwaterM3, "groundwaterM3");
  requireFiniteNonNegative(state.channelM3, "channelM3");
  requireFiniteNonNegative(state.floodM3, "floodM3");
  requireFraction(state.treeCover, "treeCover");
  requireFraction(state.gateFraction, "gateFraction");
  if (state.soilM3 > SOIL_CAPACITY_M3 + 1e-9) {
    throw new RangeError("soilM3 exceeds prototype soil capacity");
  }
  if (state.groundwaterM3 > GROUNDWATER_CAPACITY_M3 + 1e-9) {
    throw new RangeError("groundwaterM3 exceeds prototype groundwater capacity");
  }
}

function applyLocalHourlyHydrology(state: BasinWaterState, rainMm: number) {
  validateBasin(state);
  requireFiniteNonNegative(rainMm, "rainMm");

  const rainM3 = (rainMm * BASIN_AREA_M2) / 1_000;
  const infiltrationFraction = clamp(0.35 + 0.45 * state.treeCover, 0.35, 0.8);
  const proposedInfiltration = rainM3 * infiltrationFraction;
  const directRunoff = rainM3 - proposedInfiltration;

  const soilRoom = Math.max(0, SOIL_CAPACITY_M3 - state.soilM3);
  const acceptedInfiltration = Math.min(proposedInfiltration, soilRoom);
  const rejectedInfiltration = proposedInfiltration - acceptedInfiltration;
  let soilM3 = state.soilM3 + acceptedInfiltration;

  const groundwaterRoom = Math.max(
    0,
    GROUNDWATER_CAPACITY_M3 - state.groundwaterM3,
  );
  const proposedDeepPercolation = (0.01 * soilM3) / HOURS_PER_GAME_DAY;
  const deepPercolation = Math.min(
    soilM3,
    groundwaterRoom,
    proposedDeepPercolation,
  );
  soilM3 -= deepPercolation;
  let groundwaterM3 = state.groundwaterM3 + deepPercolation;

  const proposedBaseflow = (0.005 * groundwaterM3) / HOURS_PER_GAME_DAY;
  const baseflow = Math.min(groundwaterM3, proposedBaseflow);
  groundwaterM3 -= baseflow;

  let channelM3 =
    state.channelM3 + directRunoff + rejectedInfiltration + baseflow;
  let floodM3 = state.floodM3;
  if (channelM3 > CHANNEL_BANKFULL_M3) {
    floodM3 += channelM3 - CHANNEL_BANKFULL_M3;
    channelM3 = CHANNEL_BANKFULL_M3;
  }

  return {
    state: {
      ...state,
      soilM3,
      groundwaterM3,
      channelM3,
      floodM3,
    },
    rainM3,
  };
}

function gateCapacityPerHour(gateFraction: number) {
  const effectiveFraction = clamp(gateFraction, MIN_GATE_FRACTION, 1);
  return (effectiveFraction * GATE_DAILY_CAPACITY_M3) / HOURS_PER_GAME_DAY;
}

function acceptChannelInflow(state: BasinWaterState, inflowM3: number) {
  let channelM3 = state.channelM3 + inflowM3;
  let floodM3 = state.floodM3;
  if (channelM3 > CHANNEL_BANKFULL_M3) {
    floodM3 += channelM3 - CHANNEL_BANKFULL_M3;
    channelM3 = CHANNEL_BANKFULL_M3;
  }
  return { ...state, channelM3, floodM3 };
}

export function stepTwoBasinWaterHour(
  state: TwoBasinWaterState,
  input: HourlyWaterInput,
): WaterStepResult {
  const startM3 = waterTotal(state);
  const upstreamLocal = applyLocalHourlyHydrology(
    state.upstream,
    input.upstreamRainMm,
  );
  const downstreamLocal = applyLocalHourlyHydrology(
    state.downstream,
    input.downstreamRainMm,
  );

  const upstreamTransferM3 = Math.min(
    upstreamLocal.state.channelM3,
    gateCapacityPerHour(upstreamLocal.state.gateFraction),
  );
  const upstream = {
    ...upstreamLocal.state,
    channelM3: upstreamLocal.state.channelM3 - upstreamTransferM3,
  };

  const downstreamWithTransfer = acceptChannelInflow(
    downstreamLocal.state,
    upstreamTransferM3,
  );
  const exportM3 = Math.min(
    downstreamWithTransfer.channelM3,
    gateCapacityPerHour(downstreamWithTransfer.gateFraction),
  );
  const downstream = {
    ...downstreamWithTransfer,
    channelM3: downstreamWithTransfer.channelM3 - exportM3,
  };

  const nextState = { upstream, downstream };
  const endM3 = waterTotal(nextState);
  const rainM3 = upstreamLocal.rainM3 + downstreamLocal.rainM3;
  const expectedEndM3 = startM3 + rainM3 - exportM3;
  const residualM3 = endM3 - expectedEndM3;

  if (Math.abs(residualM3) > 1e-6) {
    throw new Error(
      `Water ledger residual ${residualM3} m3 exceeds per-transaction tolerance`,
    );
  }

  validateBasin(nextState.upstream);
  validateBasin(nextState.downstream);

  return {
    state: nextState,
    ledger: {
      startM3,
      rainM3,
      internalTransferM3: upstreamTransferM3,
      exportM3,
      endM3,
      residualM3,
    },
  };
}

export function cropWaterSuitability(options: {
  lotCount: number;
  soilMoistureFraction: number;
  irrigationAvailableM3: number;
}) {
  if (!Number.isSafeInteger(options.lotCount) || options.lotCount < 0) {
    throw new RangeError("lotCount must be a non-negative safe integer");
  }
  requireFraction(options.soilMoistureFraction, "soilMoistureFraction");
  requireFiniteNonNegative(options.irrigationAvailableM3, "irrigationAvailableM3");
  if (options.lotCount === 0) {
    return 1;
  }

  const deficitFraction = 1 - options.soilMoistureFraction;
  const requiredM3 =
    options.lotCount * CROP_IRRIGATION_MAX_M3_PER_DAY * deficitFraction;
  if (requiredM3 === 0) {
    return 1;
  }
  return clamp(options.irrigationAvailableM3 / requiredM3, 0, 1);
}

export function advanceCropLotDay(
  lot: CropLotState,
  suitability: {
    water: number;
    temperature: number;
    care: number;
  },
): CropDayResult {
  requireFraction(suitability.water, "water suitability");
  requireFraction(suitability.temperature, "temperature suitability");
  requireFraction(suitability.care, "care suitability");
  requireFiniteNonNegative(lot.progress, "crop progress");
  requireFiniteNonNegative(lot.biomassKg, "crop biomassKg");

  if (lot.mature || lot.progress >= CROP_MATURE_PROGRESS) {
    return {
      lot: {
        ...lot,
        progress: CROP_MATURE_PROGRESS,
        biomassKg: CROP_HARVEST_BIOMASS_KG,
        mature: true,
      },
      progressDelta: 0,
    };
  }

  const progressDelta = Math.min(
    suitability.water,
    suitability.temperature,
    suitability.care,
  );
  const progress = Math.min(CROP_MATURE_PROGRESS, lot.progress + progressDelta);
  const biomassKg =
    (progress / CROP_MATURE_PROGRESS) * CROP_HARVEST_BIOMASS_KG;

  return {
    lot: {
      ...lot,
      progress,
      biomassKg,
      mature: progress >= CROP_MATURE_PROGRESS,
    },
    progressDelta,
  };
}

export function harvestMatureCrop(lot: CropLotState) {
  if (!lot.mature || lot.progress < CROP_MATURE_PROGRESS) {
    throw new Error(`crop ${lot.cropId} is not mature`);
  }

  return {
    grainKg: CROP_EDIBLE_GRAIN_KG,
    byproductKg: CROP_BYPRODUCT_KG,
    nextLot: {
      cropId: lot.cropId,
      progress: 0,
      biomassKg: 0,
      mature: false,
    } satisfies CropLotState,
  };
}

export function cookWholeGrainBatches(grainKg: number) {
  requireFiniteNonNegative(grainKg, "grainKg");
  const batches = Math.floor(grainKg / COOK_GRAIN_BATCH_KG);
  return {
    batches,
    rations: batches * COOK_RATIONS_PER_BATCH,
    remainingGrainKg: grainKg - batches * COOK_GRAIN_BATCH_KG,
  };
}
