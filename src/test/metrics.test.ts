import { describe, it, expect } from "vitest";

// Pure metric helpers extracted here so QA can verify calculations without a DB.

/** Connect rate: connected / total, 0 if no calls. */
function connectRate(connected: number, total: number): number {
  if (total === 0) return 0;
  return connected / total;
}

/** Week-over-week delta as a fraction. Returns null when prior is 0 (no baseline). */
function wowDelta(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return (current - prior) / prior;
}

/**
 * Classifies an agent as needing attention if they dropped >20% WoW
 * or connected fewer than 5 calls this week.
 */
function needsAttention(connectedThisWeek: number, connectedPriorWeek: number): boolean {
  if (connectedThisWeek < 5) return true;
  if (connectedPriorWeek > 0 && connectedThisWeek < connectedPriorWeek * 0.8) return true;
  return false;
}

describe("connectRate", () => {
  it("returns 0 when total is 0", () => {
    expect(connectRate(0, 0)).toBe(0);
  });

  it("returns 1 when all calls connected", () => {
    expect(connectRate(10, 10)).toBe(1);
  });

  it("calculates partial rate correctly", () => {
    expect(connectRate(3, 10)).toBeCloseTo(0.3);
  });
});

describe("wowDelta", () => {
  it("returns null when prior week is 0 (no baseline)", () => {
    expect(wowDelta(5, 0)).toBeNull();
  });

  it("returns 0 when no change", () => {
    expect(wowDelta(10, 10)).toBe(0);
  });

  it("returns positive fraction for improvement", () => {
    expect(wowDelta(12, 10)).toBeCloseTo(0.2);
  });

  it("returns negative fraction for decline", () => {
    expect(wowDelta(8, 10)).toBeCloseTo(-0.2);
  });
});

describe("needsAttention", () => {
  it("flags agent with fewer than 5 connected calls", () => {
    expect(needsAttention(4, 10)).toBe(true);
  });

  it("flags agent who dropped more than 20% WoW", () => {
    expect(needsAttention(7, 10)).toBe(true); // 30% drop
  });

  it("does not flag healthy agent", () => {
    expect(needsAttention(10, 10)).toBe(false);
  });

  it("does not flag agent who dropped exactly 20% (boundary)", () => {
    expect(needsAttention(8, 10)).toBe(false); // exactly 20%, not >20%
  });
});
