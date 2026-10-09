import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OCCUPANCY_2026 } from "@/data/occupancy-2026";
import { defaultPersonRates, emptyWebLift } from "@/lib/pricing";
import { applyLodgeOccupancy, estimateAtLastYearOccupancy, lodgeOccupancy2026, occupiedNights, occupancyShare } from "@/lib/occupancy";
import { yearEarnings } from "@/lib/year-earnings";

describe("zasedenost 2026", () => {
  it("šteje potrjene noči enkrat na bungalov", () => {
    assert.equal(OCCUPANCY_2026[0].occupied["ocean-1"], 0);
    assert.equal(OCCUPANCY_2026[2].occupied["ocean-1"], 7);
    assert.equal(OCCUPANCY_2026[3].occupied["ocean-2"], 19);
    assert.equal(occupiedNights("ocean-1"), 89);
    assert.equal(occupiedNights("ocean-2"), 140);
    assert.equal(occupiedNights("garden-3"), 94);
    assert.equal(occupiedNights("beach-4"), 71);
    assert.equal(occupancyShare(7, 31), 7 / 31);
  });

  it("ocena 2027 vzame delež zasedenih noči od cene za 2 osebi", () => {
    const full = yearEarnings(2027, defaultPersonRates(), emptyWebLift(), emptyWebLift());
    const estimate = estimateAtLastYearOccupancy(full);
    const march = estimate.months[2].units["ocean-1"];
    assert.equal(march.occupiedNights, 7);
    assert.equal(march.gross, Math.round(13350 * (7 / 31)));
    assert.equal(estimate.months[0].left, 0);
    assert.equal(estimate.months[1].left, 0);
    assert.ok(estimate.left < full.left);
    assert.equal(estimate.occupiedNights, 89 + 140 + 94 + 71);
  });

  it("zasedenost Lodge zniža zaslužek vseh bungalovov, januar ostane zaprt", () => {
    assert.equal(lodgeOccupancy2026(), 27);
    const full = yearEarnings(2027, defaultPersonRates(), emptyWebLift(), emptyWebLift());
    const same = applyLodgeOccupancy(full, 100);
    assert.equal(same.left, full.left);
    const half = applyLodgeOccupancy(full, 50);
    assert.equal(half.months[0].left, 0);
    assert.equal(half.months[2].slices[0].units["ocean-1"].left, 5880);
    assert.equal(half.left < full.left, true);
    const empty = applyLodgeOccupancy(full, 0);
    assert.equal(empty.left, 0);
  });
});
