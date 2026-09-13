import { describe, expect, it } from "vitest";
import {
  applySettlementFoodTransaction,
  createBootstrapSettlementFoodState,
  rationCoverageDays,
  totalRations,
} from "./settlement-food.js";

describe("settlement food reserve ledger", () => {
  it("matches the Bible bootstrap: 72 rations = six resident-days, public stock = four days", () => {
    const state = createBootstrapSettlementFoodState({
      settlementId: "upstream",
      grainKg: 9,
    });

    expect(totalRations(state)).toBe(72);
    expect(rationCoverageDays(state)).toBe(6);
    expect(
      rationCoverageDays(state, ["upstream:public-food"]),
    ).toBe(4);
    expect(
      state.inventories.find((inventory) => inventory.id === "upstream:seed-grain"),
    ).toMatchObject({ grainKg: 9, rations: 0 });
  });

  it("cooks only whole grain batches and records the causal transaction once", () => {
    const initial = createBootstrapSettlementFoodState({
      settlementId: "upstream",
      grainKg: 9,
    });

    const first = applySettlementFoodTransaction(initial, {
      type: "cook",
      transactionId: "cook:day-1:batch-1",
      sourceGrainInventoryId: "upstream:seed-grain",
      targetRationInventoryId: "upstream:public-food",
      batches: 2,
      causeIds: ["crop:harvest:lot-01"],
    });

    expect(first.duplicate).toBe(false);
    expect(first.events).toEqual([
      expect.objectContaining({
        type: "food.grain.cooked",
        causeIds: ["crop:harvest:lot-01"],
        payload: expect.objectContaining({ grainKg: 4, rations: 8, batches: 2 }),
      }),
    ]);
    expect(
      first.state.inventories.find(
        (inventory) => inventory.id === "upstream:seed-grain",
      ),
    ).toMatchObject({ grainKg: 5 });
    expect(
      first.state.inventories.find(
        (inventory) => inventory.id === "upstream:public-food",
      ),
    ).toMatchObject({ rations: 56 });

    const duplicate = applySettlementFoodTransaction(first.state, {
      type: "cook",
      transactionId: "cook:day-1:batch-1",
      sourceGrainInventoryId: "upstream:seed-grain",
      targetRationInventoryId: "upstream:public-food",
      batches: 2,
      causeIds: ["crop:harvest:lot-01"],
    });
    expect(duplicate).toEqual({
      state: first.state,
      events: [],
      duplicate: true,
    });
  });

  it("consumes one ration per resident without making stock negative", () => {
    const initial = createBootstrapSettlementFoodState({
      settlementId: "downstream",
      grainKg: 3,
    });

    const consumed = applySettlementFoodTransaction(initial, {
      type: "consume",
      transactionId: "consume:downstream:day-1",
      inventoryIds: ["downstream:public-food"],
      rations: 12,
      causeIds: ["day:1", "settlement:downstream"],
    });

    expect(consumed.events).toHaveLength(1);
    expect(consumed.events[0]).toMatchObject({
      type: "food.rations.consumed",
      payload: expect.objectContaining({
        requestedRations: 12,
        consumedRations: 12,
      }),
    });
    expect(
      consumed.state.inventories.find(
        (inventory) => inventory.id === "downstream:public-food",
      ),
    ).toMatchObject({ rations: 36 });
    expect(consumed.state.unmetRations).toBe(0);
  });

  it("turns insufficient authorized stock into an explicit shortage instead of a negative balance", () => {
    const initial = createBootstrapSettlementFoodState({
      settlementId: "downstream",
      grainKg: 3,
    });

    const result = applySettlementFoodTransaction(initial, {
      type: "consume",
      transactionId: "consume:downstream:shortage",
      inventoryIds: ["downstream:public-food"],
      rations: 60,
      causeIds: ["bridge:blocked"],
    });

    expect(result.events.map((event) => event.type)).toEqual([
      "food.rations.consumed",
      "food.shortage.detected",
    ]);
    expect(result.events[1]).toMatchObject({
      causeIds: ["bridge:blocked"],
      payload: {
        requestedRations: 60,
        consumedRations: 48,
        shortageRations: 12,
      },
    });
    expect(
      result.state.inventories.find(
        (inventory) => inventory.id === "downstream:public-food",
      ),
    ).toMatchObject({ rations: 0 });
    expect(result.state.unmetRations).toBe(12);
  });

  it("moves stock atomically between owned inventories without changing settlement total", () => {
    const initial = createBootstrapSettlementFoodState({
      settlementId: "upstream",
      grainKg: 9,
    });
    const before = totalRations(initial);

    const transferred = applySettlementFoodTransaction(initial, {
      type: "transfer",
      transactionId: "transfer:merchant-to-public:1",
      fromInventoryId: "upstream:merchant-food",
      toInventoryId: "upstream:public-food",
      rations: 6,
      causeIds: ["relief-policy:1"],
    });

    expect(totalRations(transferred.state)).toBe(before);
    expect(
      transferred.state.inventories.find(
        (inventory) => inventory.id === "upstream:merchant-food",
      ),
    ).toMatchObject({ rations: 18 });
    expect(
      transferred.state.inventories.find(
        (inventory) => inventory.id === "upstream:public-food",
      ),
    ).toMatchObject({ rations: 54 });
  });
});
