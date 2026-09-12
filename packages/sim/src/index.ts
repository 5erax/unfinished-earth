export const GAME_DAY_REAL_SECONDS = 30 * 60;
export const MAX_OFFLINE_REAL_SECONDS = 72 * 60 * 60;
export const WORK_CREDIT_CAP_SECONDS = 8 * 60 * 60;

export function clampOfflineCatchUp(elapsedRealSeconds: number) {
  if (!Number.isFinite(elapsedRealSeconds) || elapsedRealSeconds < 0) {
    throw new RangeError("elapsedRealSeconds must be a finite non-negative number");
  }

  return Math.min(elapsedRealSeconds, MAX_OFFLINE_REAL_SECONDS);
}
