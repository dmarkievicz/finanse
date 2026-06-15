import { describe, it } from "node:test";
import assert from "node:assert/strict";

const SPOT = 15_864.34;

function coinDealerPricePln(
  spotPlnPerOz: number,
  weightOz: number,
  series: string
): number {
  const fractional: Record<number, number> = {
    0.1: 1.029_787_561_285_247_2,
    0.25: 1.024_791_450_511_020_3,
    0.5: 1.019_791_557_669_591,
  };
  const series1oz: Record<string, number> = {
    maple: 0.996_795_958_735_125_5,
    kangaroo: 0.996_795_958_735_125_5,
    britannia: 0.996_795_958_735_125_5,
    philharmonic: 0.996_795_958_735_125_5,
    krugerrand: 0.994_796_505_874_180_8,
    eagle: 1.013_792_568_742_223_1,
    bison: 1.017_792_104_808_646_2,
  };

  const tiers = [0.1, 0.25, 0.5, 1];
  const tier = tiers.reduce((best, t) =>
    Math.abs(weightOz - t) < Math.abs(weightOz - best) ? t : best
  );

  const metal = spotPlnPerOz * tier;
  const value =
    tier < 1
      ? metal * fractional[tier]
      : metal * (series1oz[series] ?? series1oz.maple);

  return Math.round(value * 100) / 100;
}

describe("coinDealerPricePln", () => {
  it("liczy ceny ułamkowe uncji", () => {
    assert.equal(coinDealerPricePln(SPOT, 0.1, "kangaroo"), 1633.69);
    assert.equal(coinDealerPricePln(SPOT, 0.25, "britannia"), 4064.41);
    assert.equal(coinDealerPricePln(SPOT, 0.5, "krugerrand"), 8089.16);
  });

  it("liczy ceny 1 oz wg serii", () => {
    assert.equal(coinDealerPricePln(SPOT, 1, "maple"), 15813.51);
    assert.equal(coinDealerPricePln(SPOT, 1, "kangaroo"), 15813.51);
    assert.equal(coinDealerPricePln(SPOT, 1, "britannia"), 15813.51);
    assert.equal(coinDealerPricePln(SPOT, 1, "philharmonic"), 15813.51);
    assert.equal(coinDealerPricePln(SPOT, 1, "krugerrand"), 15781.79);
    assert.equal(coinDealerPricePln(SPOT, 1, "eagle"), 16083.15);
    assert.equal(coinDealerPricePln(SPOT, 1, "bison"), 16146.6);
  });
});
