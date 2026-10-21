import { describe, expect, it } from "vitest";
import { PRIORITY_LABEL, formatDueDate } from "./cardFormat";

describe("formatDueDate", () => {
  it("formats an ISO date as M/D without leading zeros", () => {
    expect(formatDueDate("2026-08-05")).toBe("8/5");
    expect(formatDueDate("2026-12-31")).toBe("12/31");
  });

  it("returns null for empty values", () => {
    expect(formatDueDate(null)).toBeNull();
    expect(formatDueDate(undefined)).toBeNull();
    expect(formatDueDate("")).toBeNull();
  });
});

describe("PRIORITY_LABEL", () => {
  it("maps lower-case priority keys to Japanese labels", () => {
    expect(PRIORITY_LABEL).toEqual({ high: "高", medium: "中", low: "低" });
  });
});
