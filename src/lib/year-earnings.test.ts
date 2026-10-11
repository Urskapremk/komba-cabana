import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultPersonRates, emptyPersonRates, emptyWebLift } from "./pricing";
import {
  afterSalaries,
  FOOD_COST_PERCENT,
  HALF_BOARD_PRICE,
  halfBoard,
  monthPlanResult,
  monthSeasonSlices,
  MONTHLY_SALARY,
  MONTHLY_TRANSPORT_PROFIT,
  MONTHLY_TRIP_PROFIT,
  personSeasonOn,
  planResult,
  salaryCost,
  yearEarnings,
} from "./year-earnings";

describe("web sezone po dnevih", () => {
  it("julij 9.–13. obračuna kot poletje, ker se začne pozneje", () => {
    assert.equal(personSeasonOn("07-08"), "pomlad-jesen");
    assert.equal(personSeasonOn("07-09"), "poletje-december");
    assert.equal(personSeasonOn("07-13"), "poletje-december");
    assert.equal(personSeasonOn("01-10"), "poletje-december");
    assert.equal(personSeasonOn("01-11"), "zima");
    assert.equal(personSeasonOn("03-28"), "zima");
    assert.equal(personSeasonOn("03-29"), "pomlad-jesen");
    assert.equal(personSeasonOn("12-18"), "zima");
    assert.equal(personSeasonOn("12-19"), "poletje-december");
    assert.equal(personSeasonOn("02-29"), "zima");
  });

  it("leto 2027 ima 365 noči, prelomni meseci so razdeljeni", () => {
    const january = monthSeasonSlices(2027, 1);
    assert.deepEqual(
      january.map((slice) => [slice.seasonId, slice.nights]),
      [
        ["poletje-december", 10],
        ["zima", 21],
      ],
    );
    const march = monthSeasonSlices(2027, 3);
    assert.deepEqual(
      march.map((slice) => slice.nights),
      [28, 3],
    );
    const july = monthSeasonSlices(2027, 7);
    assert.deepEqual(
      july.map((slice) => [slice.seasonId, slice.fromDay, slice.nights]),
      [
        ["pomlad-jesen", 1, 8],
        ["poletje-december", 9, 23],
      ],
    );
    const december = monthSeasonSlices(2027, 12);
    assert.deepEqual(
      december.map((slice) => [slice.seasonId, slice.nights]),
      [
        ["zima", 18],
        ["poletje-december", 13],
      ],
    );
    assert.equal(monthSeasonSlices(2027, 2).reduce((sum, slice) => sum + slice.nights, 0), 28);
    assert.equal(monthSeasonSlices(2028, 2).reduce((sum, slice) => sum + slice.nights, 0), 29);
  });
});

describe("zaslužek pri polni zasedenosti", () => {
  it("brez popustov sešteje odprte mesece, januar in februar sta zaprta", () => {
    const year = yearEarnings(2027, defaultPersonRates(), emptyWebLift(), emptyWebLift());
    assert.equal(year.months[0].closed, true);
    assert.equal(year.months[1].closed, true);
    assert.equal(year.months[0].nights, 0);
    assert.equal(year.months[0].left, 0);
    assert.equal(year.months[2].closed, false);
    assert.equal(year.months[2].nights, 31);
    assert.equal(year.months[2].gross, 46930);
    assert.equal(year.nights, 306);
    assert.equal(year.missingNights, 0);
    assert.equal(year.units["ocean-1"].gross, 160030);
    assert.equal(year.units["ocean-2"].gross, 128210);
    assert.equal(year.units["garden-3"].gross, 117550);
    assert.equal(year.units["beach-4"].gross, 147790);
    assert.equal(year.gross, 553580);
    assert.equal(year.agency, 0);
    assert.equal(year.early, 0);
    assert.equal(year.left, 553580);
    assert.equal(MONTHLY_SALARY, 1200);
    assert.equal(salaryCost(year.months.length), 14400);
    assert.equal(afterSalaries(year.left, year.months.length), 553580 - 14400);
    assert.equal(salaryCost(1), 1200);
    const openMonths = year.months.filter((month) => !month.closed).length;
    assert.equal(openMonths, 10);
    assert.equal(MONTHLY_TRIP_PROFIT, 800);
    assert.equal(MONTHLY_TRANSPORT_PROFIT, 600);
    assert.equal(monthPlanResult(0, true), -1200);
    assert.equal(monthPlanResult(1000, false), 1000 - 1200 + 800 + 600);
    assert.equal(planResult(year.left, year.months.length, openMonths), 553580 - 14400 + 8000 + 6000);
    assert.equal(HALF_BOARD_PRICE, 50);
    assert.equal(FOOD_COST_PERCENT, 33);
    const full = halfBoard(10, 100);
    assert.equal(full.revenue, 1000);
    assert.equal(full.food, 330);
    assert.equal(full.left, 670);
    const half = halfBoard(10, 50);
    assert.equal(half.revenue, 500);
    assert.equal(half.food, 165);
    assert.equal(half.left, 335);
    assert.equal(halfBoard(0, 100).revenue, 0);
  });

  it("oba popusta odšteje od cene za 2 osebi in pomnoži z odprtimi nočmi", () => {
    const commission = { ...emptyWebLift(), "ocean-1": 15 };
    const early = { ...emptyWebLift(), "ocean-1": 10 };
    const year = yearEarnings(2027, defaultPersonRates(), commission, early);
    const family = year.units["ocean-1"];
    assert.equal(family.gross, 160030);
    assert.equal(family.agency, 24086);
    assert.equal(family.early, 16003);
    assert.equal(family.left, 119941);
    const marchWinter = year.months[2].slices[0].units["ocean-1"];
    assert.equal(marchWinter.nights, 28);
    assert.equal(marchWinter.nightlyGross, 420);
    assert.equal(marchWinter.nightlyLeft, 315);
    assert.equal(marchWinter.left, 8820);
    assert.equal(year.units["ocean-2"].left, 128210);
    assert.equal(year.left, 553580 - (160030 - 119941));
  });

  it("cena za 4 osebe se ne šteje, noč brez cene za 2 osebi ne šteje v ostanek", () => {
    const rates = emptyPersonRates();
    rates["ocean-1"].zima[4] = 560;
    rates["ocean-1"].zima[2] = 420;
    const year = yearEarnings(2027, rates, emptyWebLift(), emptyWebLift());
    assert.equal(year.units["ocean-1"].nights, 306);
    assert.equal(year.units["ocean-1"].missingNights, 306 - 46);
    assert.equal(year.units["ocean-1"].left, 420 * 46);
    assert.ok(year.missingNights > 0);
  });
});
