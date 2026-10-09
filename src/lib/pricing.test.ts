import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CALENDAR_END,
  CALENDAR_START,
  OPTIMA_PRICES,
  calendarLength,
  chosenNightly,
  nightsBetween,
  quoteStay,
  resolvePeriod,
  resolvedSegments,
  sanitizePrices,
} from "./pricing";

describe("noči", () => {
  it("šteje noči do odhoda", () => {
    assert.equal(nightsBetween("2027-08-02", "2027-08-09").length, 7);
    assert.deepEqual(nightsBetween("2027-08-09", "2027-08-09"), []);
    assert.deepEqual(nightsBetween("2027-08-10", "2027-08-09"), []);
  });

  it("pokrije sezono od 11. 1. 2027 do 10. 1. 2028", () => {
    assert.equal(calendarLength(), 365);
    assert.equal(CALENDAR_START, "2027-01-11");
    assert.equal(CALENDAR_END, "2028-01-10");
  });
});

describe("prekrivanje decembra", () => {
  it("19. december privzeto obračuna kot praznike", () => {
    assert.equal(resolvePeriod("2027-12-18", "praznicna")?.id, "zima-2");
    assert.equal(resolvePeriod("2027-12-19", "praznicna")?.id, "prazniki");
    assert.equal(resolvePeriod("2027-12-27", "praznicna")?.id, "prazniki");
    assert.equal(resolvePeriod("2027-12-28", "praznicna")?.id, "prazniki");
    assert.equal(resolvePeriod("2028-01-10", "praznicna")?.id, "prazniki");
    assert.equal(resolvePeriod("2028-01-11", "praznicna"), null);
  });

  it("prejšnje obdobje obdrži zimo do 27. decembra", () => {
    assert.equal(resolvePeriod("2027-12-19", "prejsnja")?.id, "zima-2");
    assert.equal(resolvePeriod("2027-12-27", "prejsnja")?.id, "zima-2");
    assert.equal(resolvePeriod("2027-12-28", "prejsnja")?.id, "prazniki");
  });
});

describe("izračun bivanja", () => {
  it("poletni teden Ocean I zaokroži sredino na evro", () => {
    assert.equal(chosenNightly({ min: 610, max: 753 }, 50), 682);
    const quote = quoteStay(OPTIMA_PRICES["ocean-1"], "2027-08-02", "2027-08-09", 50, "praznicna");
    assert.equal(quote.complete, true);
    assert.equal(quote.nights, 7);
    assert.equal(quote.groups.length, 1);
    assert.equal(quote.groups[0].periodId, "poletje-1");
    assert.equal(quote.minTotal, 610 * 7);
    assert.equal(quote.maxTotal, 753 * 7);
    assert.equal(quote.chosenTotal, 682 * 7);
  });

  it("prehod v praznike razdeli Ocean I na zimo in praznike", () => {
    const quote = quoteStay(OPTIMA_PRICES["ocean-1"], "2027-12-15", "2027-12-29", 0, "praznicna");
    assert.equal(quote.nights, 14);
    assert.equal(quote.overlapNights, 9);
    assert.deepEqual(
      quote.groups.map((group) => [group.periodId, group.nights, group.min]),
      [
        ["zima-2", 4, 560],
        ["prazniki", 10, 580],
      ],
    );
    assert.equal(quote.minTotal, 560 * 4 + 580 * 10);
    assert.equal(quote.maxTotal, 675 * 4 + 773 * 10);
  });

  it("isto bivanje po zimski ceni obdrži december do 27.", () => {
    const quote = quoteStay(OPTIMA_PRICES["ocean-1"], "2027-12-15", "2027-12-29", 100, "prejsnja");
    assert.deepEqual(
      quote.groups.map((group) => [group.periodId, group.nights]),
      [
        ["zima-2", 13],
        ["prazniki", 1],
      ],
    );
    assert.equal(quote.chosenTotal, quote.maxTotal);
  });

  it("Beach Villa brez cen ne da skupnega zneska", () => {
    const quote = quoteStay(OPTIMA_PRICES["beach-4"], "2027-08-02", "2027-08-09", 50, "praznicna");
    assert.equal(quote.nights, 7);
    assert.equal(quote.groups[0].periodId, "poletje-1");
    assert.equal(quote.complete, false);
    assert.equal(quote.chosenTotal, null);
  });

  it("noči zunaj cenika prekinejo vsoto", () => {
    const quote = quoteStay(OPTIMA_PRICES["garden-3"], "2027-01-09", "2027-01-13", 0, "praznicna");
    assert.deepEqual(quote.uncovered, ["2027-01-09", "2027-01-10"]);
    assert.equal(quote.minTotal, null);
    assert.equal(quote.groups[0].nights, 2);
    assert.equal(quote.groups[0].min, 270);
  });
});

describe("koledar", () => {
  it("praznična pravila odrežejo zimo 18. decembra", () => {
    const segments = resolvedSegments("praznicna");
    const december = segments.find((segment) => segment.period.id === "zima-2");
    const holiday = segments.find((segment) => segment.period.id === "prazniki");
    assert.equal(december?.from, "2027-12-01");
    assert.equal(december?.to, "2027-12-18");
    assert.equal(holiday?.from, "2027-12-19");
    assert.equal(holiday?.to, "2028-01-10");
  });
});

describe("shranjene cene", () => {
  it("ohranijo vpisane cene Beach Ville in zavržejo smeti", () => {
    const parsed = sanitizePrices({
      "beach-4": { "poletje-1": { min: 400, max: 520 } },
      "ocean-1": { "zima-1": { min: -5, max: 700 } },
    });
    assert.ok(parsed);
    assert.deepEqual(parsed["beach-4"]["poletje-1"], { min: 400, max: 520 });
    assert.deepEqual(parsed["beach-4"]["zima-1"], { min: null, max: null });
    assert.deepEqual(parsed["ocean-1"]["zima-1"], { min: 560, max: 675 });
  });
});
