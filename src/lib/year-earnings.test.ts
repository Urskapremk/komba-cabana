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
  it("brez popustov sešteje odprte mesece, januar in februar sta zaprta", () => {
    const year = yearEarnings(2027, defaultPersonRates(), emptyWebLift(), emptyWebLift());
    assert.equal(year.months[0].closed, true);
    assert.equal(year.months[1].closed, true);
    assert.equal(year.months[0].nights, 0);
    assert.equal(year.months[0].left, 0);
    assert.equal(year.months[2].closed, false);
    assert.equal(year.months[2].nights, 31);
    assert.equal(year.months[2].gross, 56850);
    assert.equal(year.nights, 306);
    assert.equal(year.missingNights, 0);
    assert.equal(year.units["ocean-1"].gross, 202870);
    assert.equal(year.units["ocean-2"].gross, 128210);
    assert.equal(year.units["garden-3"].gross, 117550);
    assert.equal(year.units["beach-4"].gross, 202870);
    assert.equal(year.gross, 651500);
    assert.equal(year.agency, 0);
    assert.equal(year.early, 0);
    assert.equal(year.left, 651500);
  });

  it("oba popusta odšteje od polne cene in pomnoži z odprtimi nočmi", () => {
    const commission = { ...emptyWebLift(), "ocean-1": 15 };
    const early = { ...emptyWebLift(), "ocean-1": 10 };
    const year = yearEarnings(2027, defaultPersonRates(), commission, early);
    const family = year.units["ocean-1"];
    assert.equal(family.gross, 202870);
    assert.equal(family.agency, 30512);
    assert.equal(family.early, 20287);
    assert.equal(family.left, 152071);
    const marchWinter = year.months[2].slices[0].units["ocean-1"];
    assert.equal(marchWinter.nights, 28);
    assert.equal(marchWinter.nightlyGross, 560);
    assert.equal(marchWinter.nightlyLeft, 420);
    assert.equal(marchWinter.left, 11760);
    assert.equal(year.units["ocean-2"].left, 128210);
    assert.equal(year.left, 651500 - (202870 - 152071));
  });

  it("noč brez cene 2027 ne šteje v ostanek", () => {
    const rates = emptyPersonRates();
    rates["ocean-1"].zima[4] = 560;
    const year = yearEarnings(2027, rates, emptyWebLift(), emptyWebLift());
    assert.equal(year.units["ocean-1"].nights, 306);
    assert.equal(year.units["ocean-1"].missingNights, 306 - 46);
    assert.equal(year.units["ocean-1"].left, 560 * 46);
    assert.ok(year.missingNights > 0);
  });
});
