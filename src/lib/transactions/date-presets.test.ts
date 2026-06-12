import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolvePeriodPreset,
  validateCustomDateRange,
} from "./date-presets.ts";

describe("resolvePeriodPreset", () => {
  it("today uses local calendar day", () => {
    const ref = new Date(2026, 5, 9, 23, 30);
    const range = resolvePeriodPreset("today", ref);
    assert.equal(range.from, "2026-06-09");
    assert.equal(range.to, "2026-06-09");
  });

  it("this_month spans full calendar month", () => {
    const ref = new Date(2026, 5, 15);
    const range = resolvePeriodPreset("this_month", ref);
    assert.equal(range.from, "2026-06-01");
    assert.equal(range.to, "2026-06-30");
  });
});

describe("validateCustomDateRange", () => {
  it("requires both dates", () => {
    assert.ok(validateCustomDateRange("", "2026-01-01"));
    assert.ok(validateCustomDateRange("2026-01-01", ""));
  });

  it("rejects inverted range", () => {
    assert.match(validateCustomDateRange("2026-06-30", "2026-06-01") ?? "", /od/);
  });

  it("accepts valid range", () => {
    assert.equal(validateCustomDateRange("2026-06-01", "2026-06-30"), null);
  });
});
