import {
  advanceCropLotDay,
  harvestMatureCrop,
  type CropLotState,
} from "./water-food.js";
import {
  applySettlementFoodTransaction,
  type SettlementFoodEvent,
  type SettlementFoodState,
} from "./settlement-food.js";

export type SettlementCropState = {
  day: number;
  cropLots: CropLotState[];
  food: SettlementFoodState;
};

export type CropDayPolicy = {
  cropId: string;
  water: number;
  temperature: number;
  care: number;
  harvestToInventoryId?: string;
};

export type SettlementProductionDayInput = {
  crops: CropDayPolicy[];
  cook?: {
    sourceGrainInventoryId: string;
    targetRationInventoryId: string;
    batches: number;
  };
  consume?: {
    inventoryIds: string[];
    rations: number;
  };
  causeIds?: string[];
};

export type CropProgressEvent = {
  eventId: string;
  type: "crop.day.progressed";
  settlementId: string;
  cropId: string;
  day: number;
  progressDelta: number;
  mature: boolean;
  causeIds: string[];
};

export type SettlementProductionDayResult = {
  state: SettlementCropState;
  cropEvents: CropProgressEvent[];
  foodEvents: SettlementFoodEvent[];
};

function requireNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`);
  }
}

function validateCauseIds(causeIds: readonly string[]) {
  if (causeIds.some((causeId) => !causeId.trim())) {
    throw new RangeError("causeIds must contain only non-empty strings");
  }
}

function cloneState(state: SettlementCropState): SettlementCropState {
  return {
    day: state.day,
    cropLots: state.cropLots.map((lot) => ({ ...lot })),
    food: {
      ...state.food,
      inventories: state.food.inventories.map((inventory) => ({ ...inventory })),
      appliedTransactionIds: [...state.food.appliedTransactionIds],
    },
  };
}

export function advanceSettlementProductionDay(
  state: SettlementCropState,
  input: SettlementProductionDayInput,
): SettlementProductionDayResult {
  requireNonNegativeInteger(state.day, "settlement production day");
  const nextDay = state.day + 1;
  const causeIds = [...(input.causeIds ?? [])];
  validateCauseIds(causeIds);

  const cropIds = new Set<string>();
  for (const lot of state.cropLots) {
    if (!lot.cropId.trim()) {
      throw new RangeError("cropId must be non-empty");
    }
    if (cropIds.has(lot.cropId)) {
      throw new Error(`Crop ${lot.cropId} is duplicated in settlement production state.`);
    }
    cropIds.add(lot.cropId);
  }

  const policies = new Map<string, CropDayPolicy>();
  for (const policy of input.crops) {
    if (policies.has(policy.cropId)) {
      throw new Error(`Crop policy ${policy.cropId} is duplicated.`);
    }
    if (!cropIds.has(policy.cropId)) {
      throw new Error(`Crop policy ${policy.cropId} has no matching crop lot.`);
    }
    policies.set(policy.cropId, policy);
  }

  if (policies.size !== state.cropLots.length) {
    throw new Error("Every crop lot requires exactly one daily crop policy.");
  }

  const next = cloneState(state);
  next.day = nextDay;
  const cropEvents: CropProgressEvent[] = [];
  const foodEvents: SettlementFoodEvent[] = [];

  for (let index = 0; index < next.cropLots.length; index += 1) {
    const lot = next.cropLots[index]!;
    const policy = policies.get(lot.cropId)!;
    const progressed = advanceCropLotDay(lot, {
      water: policy.water,
      temperature: policy.temperature,
      care: policy.care,
    });

    cropEvents.push({
      eventId: `crop:${state.food.settlementId}:${lot.cropId}:day:${nextDay}`,
      type: "crop.day.progressed",
      settlementId: state.food.settlementId,
      cropId: lot.cropId,
      day: nextDay,
      progressDelta: progressed.progressDelta,
      mature: progressed.lot.mature,
      causeIds,
    });

    if (progressed.lot.mature && policy.harvestToInventoryId) {
      const harvest = harvestMatureCrop(progressed.lot);
      next.cropLots[index] = harvest.nextLot;
      const production = applySettlementFoodTransaction(next.food, {
        type: "produce",
        transactionId: `harvest:${state.food.settlementId}:${lot.cropId}:day:${nextDay}`,
        inventoryId: policy.harvestToInventoryId,
        grainKg: harvest.grainKg,
        causeIds: [
          ...causeIds,
          `crop:${lot.cropId}`,
          `crop-progress-event:${cropEvents[cropEvents.length - 1]!.eventId}`,
        ],
      });
      next.food = production.state;
      foodEvents.push(...production.events);
    } else {
      next.cropLots[index] = progressed.lot;
    }
  }

  if (input.cook) {
    const cooked = applySettlementFoodTransaction(next.food, {
      type: "cook",
      transactionId: `cook:${state.food.settlementId}:day:${nextDay}`,
      sourceGrainInventoryId: input.cook.sourceGrainInventoryId,
      targetRationInventoryId: input.cook.targetRationInventoryId,
      batches: input.cook.batches,
      causeIds: [...causeIds, `settlement-day:${nextDay}`],
    });
    next.food = cooked.state;
    foodEvents.push(...cooked.events);
  }

  if (input.consume) {
    const consumed = applySettlementFoodTransaction(next.food, {
      type: "consume",
      transactionId: `consume:${state.food.settlementId}:day:${nextDay}`,
      inventoryIds: [...input.consume.inventoryIds],
      rations: input.consume.rations,
      causeIds: [...causeIds, `settlement-day:${nextDay}`],
    });
    next.food = consumed.state;
    foodEvents.push(...consumed.events);
  }

  return { state: next, cropEvents, foodEvents };
}
