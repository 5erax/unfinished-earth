import { describe, expect, it } from "vitest";
import {
  CROP_HARVEST_BIOMASS_KG,
  advanceCropLotDay,
  cookWholeGrainBatches,
  cropWaterSuitability,
  harvestMatureCrop,
  stepTwoBasinWaterHour,
  type BasinWaterState,
  type CropLotState,
} from "./water-food.js";

function basin(overrides: Partial<BasinWaterState> = {}): BasinWaterState {
  return {
    soilM3: 7_208.96,
    groundwaterM3: 9_830.4,
    channelM3: 900,
    floodM3: 0,
    treeCover: 0.5,
    gateFraction: 1,
    ...overrides,
  };
}

describe("finite two-basin water ledger", () => {
  it("conserves water across rain, internal transfer and world export", () => {
    const result = stepTwoBasinWaterHour(
      {
        upstream: basin({ gateFraction: 0.6 }),
        downstream: basin({ gateFraction: 0.4 }),
      },
      { upstreamRainMm: 10, downstreamRainMm: 2 },
    );

    expect(Math.abs(result.ledger.residualM3)).toBeLessThanOrEqual(1e-6);
    expect(result.ledger.rainM3).toBeCloseTo(786.432, 9);
    expect(result.ledger.evaporationM3).toBe(0);
    expect(result.ledger.internalTransferM3).toBeGreaterThan(0);
    expect(result.ledger.exportM3).toBeGreaterThan(0);
    expect(result.state.upstream.soilM3).toBeGreaterThanOrEqual(0);
    expect(result.state.downstream.channelM3).toBeGreaterThanOrEqual(0);
  });

  it("makes upstream gate intervention change downstream water without minting water", () => {
    const commonDownstream = basin({
      soilM3: 0,
      groundwaterM3: 0,
      channelM3: 0,
      gateFraction: 0.2,
      treeCover: 0,
    });
    const lowGate = stepTwoBasinWaterHour(
      {
        upstream: basin({
          soilM3: 0,
          groundwaterM3: 0,
          channelM3: 100,
          gateFraction: 0.2,
          treeCover: 0,
        }),
        downstream: commonDownstream,
      },
      { upstreamRainMm: 0, downstreamRainMm: 0 },
    );
    const openGate = stepTwoBasinWaterHour(
      {
        upstream: basin({
          soilM3: 0,
          groundwaterM3: 0,
          channelM3: 100,
          gateFraction: 1,
          treeCover: 0,
        }),
        downstream: commonDownstream,
      },
      { upstreamRainMm: 0, downstreamRainMm: 0 },
    );

    expect(lowGate.ledger.internalTransferM3).toBe(10);
    expect(openGate.ledger.internalTransferM3).toBe(50);
    expect(openGate.state.downstream.channelM3).toBeGreaterThan(
      lowGate.state.downstream.channelM3,
    );
    expect(Math.abs(lowGate.ledger.residualM3)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(openGate.ledger.residualM3)).toBeLessThanOrEqual(1e-6);
  });

  it("subtracts evaporation from explicit soil/channel/flood footprints without overdrawing a store", () => {
    const nearlyDry = basin({
      soilM3: 0.5,
      groundwaterM3: 0,
      channelM3: 0.2,
      floodM3: 0.25,
      treeCover: 0,
      gateFraction: 0.2,
    });
    const evaporation = {
      potentialEvaporationMm: 1,
      soilAreaM2: 1_000,
      channelAreaM2: 1_000,
      floodAreaM2: 1_000,
    };

    const result = stepTwoBasinWaterHour(
      { upstream: nearlyDry, downstream: nearlyDry },
      {
        upstreamRainMm: 0,
        downstreamRainMm: 0,
        upstreamEvaporation: evaporation,
        downstreamEvaporation: evaporation,
      },
    );

    expect(result.ledger.evaporationM3).toBeCloseTo(1.9, 12);
    expect(result.ledger.exportM3).toBe(0);
    expect(result.state.upstream).toMatchObject({
      soilM3: 0,
      channelM3: 0,
      floodM3: 0,
    });
    expect(result.state.downstream).toMatchObject({
      soilM3: 0,
      channelM3: 0,
      floodM3: 0,
    });
    expect(Math.abs(result.ledger.residualM3)).toBeLessThanOrEqual(1e-6);
  });
});

describe("water → crop → food projection", () => {
  it("turns a controlled irrigation difference into an explainable food outcome", () => {
    const drySuitability = cropWaterSuitability({
      lotCount: 6,
      soilMoistureFraction: 0,
      irrigationAvailableM3: 0.05,
    });
    const restoredSuitability = cropWaterSuitability({
      lotCount: 6,
      soilMoistureFraction: 0,
      irrigationAvailableM3: 0.096,
    });
    const nearlyMature: CropLotState = {
      cropId: "downstream-lot-01",
      progress: 11.25,
      biomassKg: (11.25 / 12) * CROP_HARVEST_BIOMASS_KG,
      mature: false,
    };

    const dryDay = advanceCropLotDay(nearlyMature, {
      water: drySuitability,
      temperature: 1,
      care: 1,
    });
    const restoredDay = advanceCropLotDay(nearlyMature, {
      water: restoredSuitability,
      temperature: 1,
      care: 1,
    });

    expect(drySuitability).toBeCloseTo(0.05 / 0.096, 12);
    expect(restoredSuitability).toBe(1);
    expect(dryDay.lot.mature).toBe(false);
    expect(restoredDay.lot.mature).toBe(true);

    const harvest = harvestMatureCrop(restoredDay.lot);
    const cooked = cookWholeGrainBatches(harvest.grainKg);
    expect(harvest).toMatchObject({ grainKg: 7, byproductKg: 3 });
    expect(cooked).toEqual({
      batches: 3,
      rations: 12,
      remainingGrainKg: 1,
    });
  });

  it("recovers crop progress over discrete days instead of snapping to mature", () => {
    const stressed: CropLotState = {
      cropId: "recovery-lot",
      progress: 10,
      biomassKg: (10 / 12) * CROP_HARVEST_BIOMASS_KG,
      mature: false,
    };

    const dryDay = advanceCropLotDay(stressed, {
      water: 0,
      temperature: 1,
      care: 1,
    });
    const firstRestoredDay = advanceCropLotDay(dryDay.lot, {
      water: 1,
      temperature: 1,
      care: 1,
    });
    const secondRestoredDay = advanceCropLotDay(firstRestoredDay.lot, {
      water: 1,
      temperature: 1,
      care: 1,
    });

    expect(dryDay.lot.progress).toBe(10);
    expect(firstRestoredDay.lot.progress).toBe(11);
    expect(firstRestoredDay.lot.mature).toBe(false);
    expect(secondRestoredDay.lot.progress).toBe(12);
    expect(secondRestoredDay.lot.mature).toBe(true);
  });
});
