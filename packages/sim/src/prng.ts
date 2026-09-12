export function normalizeSeed(seed: number) {
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError("seed must be a safe integer");
  }

  const normalized = seed >>> 0;
  return normalized === 0 ? 0x6d2b79f5 : normalized;
}

export function nextXorshift32(state: number) {
  let value = state >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

export function uint32ToUnitFloat(value: number) {
  return (value >>> 0) / 0x1_0000_0000;
}
