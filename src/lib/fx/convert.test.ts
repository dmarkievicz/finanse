import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertFromPln,
  convertToPln,
  detectRateSemantics,
} from "./convert.ts";

describe("detectRateSemantics", () => {
  it("NBP / formularz: PLN za EUR", () => {
    assert.equal(detectRateSemantics("EUR", 4.28), "pln_per_foreign");
  });

  it("Excel: EUR za PLN", () => {
    assert.equal(detectRateSemantics("EUR", 0.233645), "foreign_per_pln");
  });
});

describe("convertFromPln / convertToPln", () => {
  it("31457,23 PLN → EUR po kursie 0,233645 (EUR/PLN)", () => {
    const eur = convertFromPln(31457.23, "EUR", 0.233645);
    assert.ok(Math.abs(eur - 7349.82) < 0.1);
    const back = convertToPln(eur, "EUR", 0.233645);
    assert.ok(Math.abs(back - 31457.23) < 0.5);
  });

  it("7350 EUR → PLN po kursie NBP 4,28", () => {
    const pln = convertToPln(7350, "EUR", 4.28);
    assert.ok(Math.abs(pln - 31458) < 1);
    const back = convertFromPln(31458, "EUR", 4.28);
    assert.ok(Math.abs(back - 7350) < 1);
  });
});
