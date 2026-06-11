import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeAmountPln,
  signedAmountPln,
  isAmountPlnConsistent,
  areEntriesBalanced,
} from "./invariants.ts";

describe("computeAmountPln / signedAmountPln", () => {
  it("zaokrągla do 2 miejsc jak w imporcie", () => {
    assert.equal(signedAmountPln(100, 4.3219), 432.19);
    assert.equal(signedAmountPln(-50, 2), -100);
  });

  it("computeAmountPln zachowuje znak", () => {
    assert.equal(computeAmountPln(-10, 4.5), -45);
  });
});

describe("isAmountPlnConsistent", () => {
  it("akceptuje poprawny wpis", () => {
    assert.equal(
      isAmountPlnConsistent({ amount: -100, exchange_rate: 4.32, amount_pln: -432 }),
      true
    );
  });

  it("odrzuca rozjazd > 2 gr", () => {
    assert.equal(
      isAmountPlnConsistent({ amount: 100, exchange_rate: 1, amount_pln: 99.9 }),
      false
    );
  });
});

describe("areEntriesBalanced", () => {
  it("transfer zbilansowany", () => {
    assert.equal(
      areEntriesBalanced([{ amount_pln: -500 }, { amount_pln: 500 }]),
      true
    );
  });

  it("przewalutowanie z małą różnicą kursową", () => {
    assert.equal(
      areEntriesBalanced([{ amount_pln: -432.19 }, { amount_pln: 432.19 }]),
      true
    );
  });
});
