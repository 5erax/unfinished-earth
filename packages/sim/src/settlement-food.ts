import {
  COOK_GRAIN_BATCH_KG,
  COOK_RATIONS_PER_BATCH,
} from "./water-food.js";

export const DEFAULT_SETTLEMENT_RESIDENTS = 12;
export const BOOTSTRAP_PUBLIC_RATIONS = 48;
export const BOOTSTRAP_MERCHANT_RATIONS = 24;

export type FoodInventoryOwnerKind = "public" | "merchant" | "seed" | "kitchen" | "transit";

export type FoodInventoryState = {
  id: string;
  ownerKind: FoodInventoryOwnerKind;
  grainKg: number;
  rations: number;
};

export type SettlementFoodState = {
  settlementId: string;
  residents: number;
  inventories: FoodInventoryState[];
  unmetRations: number;
  appliedTransactionIds: string[];
};

type FoodTransactionBase = {
  transactionId: string;
  causeIds?: string[];
};

export type SettlementFoodTransaction =
  | (FoodTransactionBase & {
      type: "produce";
      inventoryId: string;
      grainKg?: number;
      rations?: number;
    })
  | (FoodTransactionBase & {
      type: "transfer";
      fromInventoryId: string;
      toInventoryId: string;
      grainKg?: number;
      rations?: number;
    })
  | (FoodTransactionBase & {
      type: "cook";
      sourceGrainInventoryId: string;
      targetRationInventoryId: string;
      batches: number;
    })
  | (FoodTransactionBase & {
      type: "consume";
      inventoryIds: string[];
      rations: number;
    });

export type SettlementFoodEvent = {
  eventId: string;
  type:
    | "food.stock.produced"
    | "food.stock.transferred"
    | "food.grain.cooked"
    | "food.rations.consumed"
    | "food.shortage.detected";
  transactionId: string;
  settlementId: string;
  causeIds: string[];
  payload: Record<string, unknown>;
};

export type SettlementFoodTransactionResult = {
  state: SettlementFoodState;
  events: SettlementFoodEvent[];
  duplicate: boolean;
};

function requireNonEmpty(value: string, label: string) {
  if (!value.trim()) {
    throw new RangeError(`${label} must be non-empty`);
  }
}

function requireFiniteNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`);
  }
}

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

function cloneState(state: SettlementFoodState): SettlementFoodState {
  return {
    ...state,
    inventories: state.inventories.map((inventory) => ({ ...inventory })),
    appliedTransactionIds: [...state.appliedTransactionIds],
  };
}

function inventoryById(state: SettlementFoodState, inventoryId: string) {
  const inventory = state.inventories.find((candidate) => candidate.id === inventoryId);
  if (!inventory) {
    throw new Error(
      `Settlement ${state.settlementId} has no food inventory ${inventoryId}.`,
    );
  }
  return inventory;
}

function validateInventory(inventory: FoodInventoryState) {
  requireNonEmpty(inventory.id, "inventory id");
  requireFiniteNonNegative(inventory.grainKg, `${inventory.id} grainKg`);
  requireNonNegativeInteger(inventory.rations, `${inventory.id} rations`);
}

function validateState(state: SettlementFoodState) {
  requireNonEmpty(state.settlementId, "settlementId");
  requireNonNegativeInteger(state.residents, "residents");
  requireNonNegativeInteger(state.unmetRations, "unmetRations");

  const inventoryIds = new Set<string>();
  for (const inventory of state.inventories) {
    validateInventory(inventory);
    if (inventoryIds.has(inventory.id)) {
      throw new Error(`Food inventory ${inventory.id} is duplicated.`);
    }
    inventoryIds.add(inventory.id);
  }

  const transactionIds = new Set<string>();
  for (const transactionId of state.appliedTransactionIds) {
    requireNonEmpty(transactionId, "applied transaction id");
    if (transactionIds.has(transactionId)) {
      throw new Error(`Applied transaction ${transactionId} is duplicated.`);
    }
    transactionIds.add(transactionId);
  }
}

function eventFor(
  state: SettlementFoodState,
  transaction: SettlementFoodTransaction,
  index: number,
  type: SettlementFoodEvent["type"],
  payload: Record<string, unknown>,
): SettlementFoodEvent {
  return {
    eventId: `food:${transaction.transactionId}:${index}`,
    type,
    transactionId: transaction.transactionId,
    settlementId: state.settlementId,
    causeIds: [...(transaction.causeIds ?? [])],
    payload,
  };
}

export function createBootstrapSettlementFoodState(options: {
  settlementId: string;
  grainKg: number;
  residents?: number;
}): SettlementFoodState {
  requireNonEmpty(options.settlementId, "settlementId");
  requireFiniteNonNegative(options.grainKg, "grainKg");
  const residents = options.residents ?? DEFAULT_SETTLEMENT_RESIDENTS;
  requireNonNegativeInteger(residents, "residents");

  const state: SettlementFoodState = {
    settlementId: options.settlementId,
    residents,
    inventories: [
      {
        id: `${options.settlementId}:public-food`,
        ownerKind: "public",
        grainKg: 0,
        rations: BOOTSTRAP_PUBLIC_RATIONS,
      },
      {
        id: `${options.settlementId}:merchant-food`,
        ownerKind: "merchant",
        grainKg: 0,
        rations: BOOTSTRAP_MERCHANT_RATIONS,
      },
      {
        id: `${options.settlementId}:seed-grain`,
        ownerKind: "seed",
        grainKg: options.grainKg,
        rations: 0,
      },
    ],
    unmetRations: 0,
    appliedTransactionIds: [],
  };
  validateState(state);
  return state;
}

export function totalRations(
  state: SettlementFoodState,
  inventoryIds?: readonly string[],
) {
  validateState(state);
  if (!inventoryIds) {
    return state.inventories.reduce((sum, inventory) => sum + inventory.rations, 0);
  }

  const uniqueIds = new Set(inventoryIds);
  if (uniqueIds.size !== inventoryIds.length) {
    throw new Error("Food coverage inventoryIds must be unique.");
  }
  return inventoryIds.reduce(
    (sum, inventoryId) => sum + inventoryById(state, inventoryId).rations,
    0,
  );
}

export function rationCoverageDays(
  state: SettlementFoodState,
  inventoryIds?: readonly string[],
) {
  validateState(state);
  if (state.residents === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return totalRations(state, inventoryIds) / state.residents;
}

export function applySettlementFoodTransaction(
  state: SettlementFoodState,
  transaction: SettlementFoodTransaction,
): SettlementFoodTransactionResult {
  validateState(state);
  requireNonEmpty(transaction.transactionId, "transactionId");
  const causeIds = transaction.causeIds ?? [];
  validateCauseIds(causeIds);

  if (state.appliedTransactionIds.includes(transaction.transactionId)) {
    return { state, events: [], duplicate: true };
  }

  const next = cloneState(state);
  const events: SettlementFoodEvent[] = [];

  switch (transaction.type) {
    case "produce": {
      const grainKg = transaction.grainKg ?? 0;
      const rations = transaction.rations ?? 0;
      requireFiniteNonNegative(grainKg, "produced grainKg");
      requireNonNegativeInteger(rations, "produced rations");
      if (grainKg === 0 && rations === 0) {
        throw new Error("Food production transaction must produce a non-zero quantity.");
      }

      const target = inventoryById(next, transaction.inventoryId);
      target.grainKg += grainKg;
      target.rations += rations;
      events.push(
        eventFor(next, transaction, 0, "food.stock.produced", {
          inventoryId: target.id,
          grainKg,
          rations,
        }),
      );
      break;
    }

    case "transfer": {
      if (transaction.fromInventoryId === transaction.toInventoryId) {
        throw new Error("Food transfer source and destination must differ.");
      }
      const grainKg = transaction.grainKg ?? 0;
      const rations = transaction.rations ?? 0;
      requireFiniteNonNegative(grainKg, "transferred grainKg");
      requireNonNegativeInteger(rations, "transferred rations");
      if (grainKg === 0 && rations === 0) {
        throw new Error("Food transfer transaction must move a non-zero quantity.");
      }

      const source = inventoryById(next, transaction.fromInventoryId);
      const target = inventoryById(next, transaction.toInventoryId);
      if (source.grainKg + 1e-9 < grainKg || source.rations < rations) {
        throw new Error(`Food inventory ${source.id} has insufficient stock.`);
      }
      source.grainKg -= grainKg;
      source.rations -= rations;
      target.grainKg += grainKg;
      target.rations += rations;
      events.push(
        eventFor(next, transaction, 0, "food.stock.transferred", {
          fromInventoryId: source.id,
          toInventoryId: target.id,
          grainKg,
          rations,
        }),
      );
      break;
    }

    case "cook": {
      requireNonNegativeInteger(transaction.batches, "cook batches");
      if (transaction.batches === 0) {
        throw new Error("Cook transaction must include at least one whole batch.");
      }
      const grainKg = transaction.batches * COOK_GRAIN_BATCH_KG;
      const rations = transaction.batches * COOK_RATIONS_PER_BATCH;
      const source = inventoryById(next, transaction.sourceGrainInventoryId);
      const target = inventoryById(next, transaction.targetRationInventoryId);
      if (source.grainKg + 1e-9 < grainKg) {
        throw new Error(`Food inventory ${source.id} has insufficient grain.`);
      }
      source.grainKg -= grainKg;
      target.rations += rations;
      events.push(
        eventFor(next, transaction, 0, "food.grain.cooked", {
          sourceGrainInventoryId: source.id,
          targetRationInventoryId: target.id,
          batches: transaction.batches,
          grainKg,
          rations,
        }),
      );
      break;
    }

    case "consume": {
      requireNonNegativeInteger(transaction.rations, "consumed rations");
      if (transaction.rations === 0) {
        throw new Error("Consumption transaction must request at least one ration.");
      }
      const uniqueIds = new Set(transaction.inventoryIds);
      if (uniqueIds.size !== transaction.inventoryIds.length) {
        throw new Error("Consumption inventoryIds must be unique.");
      }

      let remaining = transaction.rations;
      const debits: Array<{ inventoryId: string; rations: number }> = [];
      for (const inventoryId of transaction.inventoryIds) {
        const inventory = inventoryById(next, inventoryId);
        const debit = Math.min(inventory.rations, remaining);
        if (debit > 0) {
          inventory.rations -= debit;
          remaining -= debit;
          debits.push({ inventoryId, rations: debit });
        }
        if (remaining === 0) {
          break;
        }
      }

      const consumed = transaction.rations - remaining;
      events.push(
        eventFor(next, transaction, 0, "food.rations.consumed", {
          requestedRations: transaction.rations,
          consumedRations: consumed,
          debits,
        }),
      );
      if (remaining > 0) {
        next.unmetRations += remaining;
        events.push(
          eventFor(next, transaction, 1, "food.shortage.detected", {
            requestedRations: transaction.rations,
            consumedRations: consumed,
            shortageRations: remaining,
          }),
        );
      }
      break;
    }
  }

  next.appliedTransactionIds.push(transaction.transactionId);
  validateState(next);
  return { state: next, events, duplicate: false };
}
