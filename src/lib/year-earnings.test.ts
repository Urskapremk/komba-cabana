import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultPersonRates, emptyPersonRates, emptyWebLift } from "./pricing";
import { monthSeasonSlices, personSeasonOn, yearEarnings } from "./year-earnings";

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
  it("brez popustov sešteje web cene vseh bungalovov za leto 2027", () => {
    const year = yearEarnings(2027, defaultPersonRates(), emptyWebLift(), emptyWebLift());
    assert.equal(year.nights, 365);
    assert.equal(year.missingNights, 0);
    assert.equal(year.months[0].gross, 60300);
    assert.equal(year.units["ocean-1"].gross, 237310);
    assert.equal(year.units["ocean-2"].gross, 149860);
    assert.equal(year.units["garden-3"].gross, 137720);
    assert.equal(year.units["beach-4"].gross, 237310);
    assert.equal(year.gross, 762200);
    assert.equal(year.agency, 0);
    assert.equal(year.early, 0);
    assert.equal(year.left, 762200);
  });

  it("oba popusta odšteje od polne cene in pomnoži z nočmi", () => {
    const commission = { ...emptyWebLift(), "ocean-1": 15 };
    const early = { ...emptyWebLift(), "ocean-1": 10 };
    const year = yearEarnings(2027, defaultPersonRates(), commission, early);
    const family = year.units["ocean-1"];
    assert.equal(family.gross, 237310);
    assert.equal(family.agency, 35678);
    assert.equal(family.early, 23731);
    assert.equal(family.left, 177901);
    const januaryWinter = year.months[0].slices[1].units["ocean-1"];
    assert.equal(januaryWinter.nights, 21);
    assert.equal(januaryWinter.nightlyGross, 560);
    assert.equal(januaryWinter.nightlyLeft, 420);
    assert.equal(januaryWinter.left, 8820);
    assert.equal(year.units["ocean-2"].left, 149860);
    assert.equal(year.left, 762200 - (237310 - 177901));
  });

  it("noč brez cene 2027 ne šteje v ostanek", () => {
    const rates = emptyPersonRates();
    rates["ocean-1"].zima[4] = 560;
    const year = yearEarnings(2027, rates, emptyWebLift(), emptyWebLift());
    assert.equal(year.units["ocean-1"].nights, 365);
    assert.equal(year.units["ocean-1"].missingNights, 365 - 95);
    assert.equal(year.units["ocean-1"].left, 560 * 95);
    assert.ok(year.missingNights > 0);
  });
});
