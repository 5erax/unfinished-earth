import { describe, expect, it } from "vitest";
import {
  CROP_HARVEST_BIOMASS_KG,
  createBootstrapSettlementFoodState,
  rationCoverageDays,
  type CropLotState,
} from "./index.js";
import {
  advanceSettlementProductionDay,
  type SettlementCropState,
} from "./settlement-production.js";

function kitchenState(crop: CropLotState): SettlementCropState {
  const food = createBootstrapSettlementFoodState({
    settlementId: "downstream",
    grainKg: 3,
  });
  food.inventories.push({
    id: "downstream:kitchen",
    ownerKind: "kitchen",
    grainKg: 0,
    rations: 0,
  });

  return { day: 0, cropLots: [crop], food };
}

const nearlyMature: CropLotState = {
  cropId: "downstream-lot-01",
  progress: 11.25,
  biomassKg: (11.25 / 12) * CROP_HARVEST_BIOMASS_KG,
  mature: false,
};

describe("settlement crop → food daily boundary", () => {
  it("turns a restored crop into owned grain, cooked rations and daily consumption with cause IDs", () => {
    const result = advanceSettlementProductionDay(kitchenState(nearlyMature), {
      crops: [
        {
          cropId: "downstream-lot-01",
          water: 1,
          temperature: 1,
          care: 1,
          harvestToInventoryId: "downstream:kitchen",
        },
      ],
      cook: {
        sourceGrainInventoryId: "downstream:kitchen",
        targetRationInventoryId: "downstream:public-food",
        batches: 3,
      },
      consume: {
        inventoryIds: ["downstream:public-food"],
        rations: 12,
      },
      causeIds: ["water:restored", "weather:day:1"],
    });

    expect(result.state.day).toBe(1);
    expect(result.state.cropLots[0]).toMatchObject({
      cropId: "downstream-lot-01",
      progress: 0,
      biomassKg: 0,
      mature: false,
    });

    const kitchen = result.state.food.inventories.find(
      (inventory) => inventory.id === "downstream:kitchen",
    );
    const publicFood = result.state.food.inventories.find(
      (inventory) => inventory.id === "downstream:public-food",
    );
    expect(kitchen).toMatchObject({ grainKg: 1, rations: 0 });
    expect(publicFood).toMatchObject({ rations: 48 });
    expect(result.state.food.unmetRations).toBe(0);
    expect(result.foodEvents.map((event) => event.type)).toEqual([
      "food.stock.produced",
      "food.grain.cooked",
      "food.rations.consumed",
    ]);
    expect(result.foodEvents[0]?.causeIds).toEqual([
      "water:restored",
      "weather:day:1",
      "crop:downstream-lot-01",
      "crop-progress-event:crop:downstream:downstream-lot-01:day:1",
    ]);
  });

  it("keeps a dry crop immature and therefore creates no harvest stock", () => {
    const result = advanceSettlementProductionDay(kitchenState(nearlyMature), {
      crops: [
        {
          cropId: "downstream-lot-01",
          water: 0,
          temperature: 1,
          care: 1,
          harvestToInventoryId: "downstream:kitchen",
        },
      ],
      causeIds: ["water:deficit"],
    });

    expect(result.state.cropLots[0]).toMatchObject({
      progress: 11.25,
      mature: false,
    });
    expect(result.foodEvents).toEqual([]);
    expect(
      result.state.food.inventories.find(
        (inventory) => inventory.id === "downstream:kitchen",
      ),
    ).toMatchObject({ grainKg: 0, rations: 0 });
  });

  it("matches continuous execution after JSON snapshot + restart at the daily boundary", () => {
    const initial = kitchenState({
      cropId: "downstream-lot-01",
      progress: 10,
      biomassKg: (10 / 12) * CROP_HARVEST_BIOMASS_KG,
      mature: false,
    });
    const policy = {
      crops: [
        {
          cropId: "downstream-lot-01",
          water: 1,
          temperature: 1,
          care: 1,
          harvestToInventoryId: "downstream:kitchen",
        },
      ],
      causeIds: ["water:restored"],
    };

    const day1 = advanceSettlementProductionDay(initial, policy);
    const continuous = advanceSettlementProductionDay(day1.state, policy);

    const restored = JSON.parse(JSON.stringify(day1.state)) as SettlementCropState;
    const afterRestart = advanceSettlementProductionDay(restored, policy);

    expect(afterRestart).toEqual(continuous);
    expect(rationCoverageDays(afterRestart.state.food)).toBe(6);
  });
});
