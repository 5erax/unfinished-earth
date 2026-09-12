import { describe, expect, it } from "vitest";
import {
  MAX_OFFLINE_REAL_SECONDS,
  WORK_CREDIT_CAP_SECONDS,
  clampOfflineCatchUp,
} from "./index.js";

describe("offline rules", () => {
  it("caps world catch-up at 72 real hours", () => {
    expect(clampOfflineCatchUp(90 * 24 * 60 * 60)).toBe(MAX_OFFLINE_REAL_SECONDS);
  });

  it("keeps work credit as a separate 8-hour cap", () => {
    expect(WORK_CREDIT_CAP_SECONDS).toBe(8 * 60 * 60);
    expect(WORK_CREDIT_CAP_SECONDS).toBeLessThan(MAX_OFFLINE_REAL_SECONDS);
  });
});
