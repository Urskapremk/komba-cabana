import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CALENDAR_END,
  CALENDAR_START,
  COMPARE_PERIODS,
  OPTIMA_PRICES,
  RATES_2026,
  calendarLength,
  chosenNightly,
  datesDiffer,
  floor2026,
  nightsBetween,
  priceDelta,
  quoteStay,
  resolvePeriod,
  resolvedSegments,
  PERSON_RATE_CARDS,
  PERSON_SEASONS,
  formatSeasonRange,
  emptyOffers,
  guestCounts,
  personRateCard,
  childPrices,
  familyChildLabel,
  familyGalleryTwoPerson,
  galleryAdultPrice,
  PERSON_FLOOR_2027,
  belowPersonFloor2027,
  pricePerPerson,
  beachWeb2027FromFamily,
  defaultPersonRates,
  emptyPersonRates,
  liftAmount,
  liftPersonUnit,
  afterDiscounts,
  netAfterCommission,
  parseCommission,
  parsePercent,
  readCenik,
  sanitizeOffers,
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

describe("primerjava 2026 in 2027", () => {
  it("pri bungalovu I dvigne min in zoži max", () => {
    assert.equal(priceDelta(RATES_2026["ocean-1"]["zima-1"].min, OPTIMA_PRICES["ocean-1"]["zima-1"].min)?.euros, 70);
    assert.equal(priceDelta(RATES_2026["ocean-1"]["poletje-1"].max, OPTIMA_PRICES["ocean-1"]["poletje-1"].max)?.euros, -83);
    assert.equal(RATES_2026["ocean-1"]["jesen-1"].min, 565);
    assert.equal(RATES_2026["ocean-1"]["prazniki"].max, 846);
  });

  it("pri II in III dvigne obe meji, poletni max III ostane 400", () => {
    assert.equal(priceDelta(220, OPTIMA_PRICES["ocean-2"]["zima-1"].min)?.euros, 55);
    assert.equal(RATES_2026["garden-3"]["poletje-1"].max, 400);
    assert.equal(priceDelta(400, OPTIMA_PRICES["garden-3"]["poletje-1"].max)?.euros, 33);
    assert.deepEqual(RATES_2026["ocean-2"]["prazniki"], { min: 280, max: 431 });
    assert.deepEqual(RATES_2026["garden-3"]["prazniki"], { min: 280, max: 431 });
  });

  it("zimski december 2026 konča 18., predlog 2027 pa 27.", () => {
    const december = COMPARE_PERIODS.find((period) => period.id === "zima-2");
    assert.ok(december);
    assert.equal(datesDiffer(december), true);
    assert.equal(december.to2026, "2026-12-18");
    assert.equal(december.to2027, "2027-12-27");
    assert.equal(datesDiffer(COMPARE_PERIODS[0]), false);
  });

  it("pozna minimalne cene samo tam, kjer jih pismo določi", () => {
    assert.deepEqual(floor2026("ocean-1", "zima-1"), { amount: 475, label: "izven sezone" });
    assert.deepEqual(floor2026("ocean-1", "poletje-1"), { amount: 570, label: "v sezoni" });
    assert.equal(floor2026("ocean-1", "prazniki"), null);
    assert.equal(floor2026("ocean-1", "jesen-1"), null);
    assert.equal(floor2026("garden-3", "zima-1")?.amount, 200);
    assert.equal(floor2026("beach-4", "zima-1"), null);
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

  it("ponudbo shrani po osebah in prezre kapaciteto čez bungalov", () => {
    assert.deepEqual(guestCounts("ocean-1"), [1, 2, 3, 4]);
    assert.deepEqual(guestCounts("ocean-2"), [1, 2]);
    assert.equal(emptyOffers()["garden-3"]["zima-1"][2], null);
    const offers = sanitizeOffers({
      "ocean-1": { "poletje-1": { "1": 480, "4": 753, "5": 900 } },
      "ocean-2": { "zima-1": { "2": 300, "4": 800, "1": "drago" } },
    });
    assert.ok(offers);
    assert.equal(offers["ocean-1"]["poletje-1"][1], 480);
    assert.equal(offers["ocean-1"]["poletje-1"][4], 753);
    assert.equal(offers["ocean-1"]["poletje-1"][2], null);
    assert.equal(offers["ocean-2"]["zima-1"][2], 300);
    assert.equal(offers["ocean-2"]["zima-1"][1], null);
    assert.equal(Object.hasOwn(offers["ocean-2"]["zima-1"], 4), false);
  });

  it("star cenik brez ponudb ostane, ponudbe se dodajo zraven", () => {
    const cenik = readCenik({
      prices: { "beach-4": { "zima-1": { min: 300, max: 400 } } },
      offers: { "beach-4": { "zima-1": { "3": 360 } } },
    });
    assert.ok(cenik);
    assert.deepEqual(cenik.prices["beach-4"]["zima-1"], { min: 300, max: 400 });
    assert.deepEqual(cenik.prices["ocean-1"]["zima-1"], { min: 560, max: 675 });
    assert.equal(cenik.offers["beach-4"]["zima-1"][3], 360);
    assert.equal(cenik.offers["ocean-1"]["poletje-1"][4], null);
    assert.equal(cenik.personRates["ocean-1"].zima[4], 560);
    assert.equal(cenik.web2027["ocean-1"].zima[4], null);
    assert.equal(cenik.webLift["ocean-1"], null);
  });

  it("leto 2027 za WEB ostane prazno, dokler cena ni vpisana", () => {
    const cenik = readCenik({
      web2027: { "ocean-1": { zima: { "4": 610, "3": 500, "2": 450, "1": 400 } }, "beach-4": { "poletje-december": { "1": 500 } } },
    });
    assert.ok(cenik);
    assert.equal(cenik.web2027["ocean-1"].zima[4], null);
    assert.equal(cenik.web2027["ocean-1"].zima[3], null);
    assert.equal(cenik.web2027["ocean-1"].zima[2], 450);
    assert.equal(cenik.web2027["ocean-1"].zima[1], 400);
    assert.equal(cenik.web2027["ocean-2"]["pomlad-jesen"][2], null);
    assert.equal(cenik.web2027["beach-4"]["poletje-december"][1], 500);
    assert.equal(cenik.personRates["ocean-1"].zima[4], 560);
    assert.equal(formatSeasonRange("12-19", "01-10", 2027), "19. 12. 2027 – 10. 1. 2028");
    assert.equal(formatSeasonRange("01-11", "03-28", 2027), "11. 1. 2027 – 28. 3. 2027");
  });
});

describe("cene po osebah", () => {
  it("bungalov I vzame kanale in izpusti polni penzion", () => {
    const card = personRateCard("ocean-1");
    assert.ok(card);
    assert.equal(card.seasons.zima[4], 560);
    assert.equal(card.seasons.zima[3], 490);
    assert.equal(card.seasons.zima[2], 420);
    assert.equal(card.seasons.zima[1], 420);
    assert.equal(card.seasons["pomlad-jesen"][4], 670);
    assert.equal(card.seasons["poletje-december"][2], 560);
    assert.equal(card.discount, 70);
    assert.equal(card.minimumPersons, 2);
    assert.equal(JSON.stringify(card).includes("920"), false);
    assert.equal(JSON.stringify(card).includes("1080"), false);
    assert.equal(JSON.stringify(card).includes("1100"), false);
  });

  it("II in III imata popust do 1 osebe, Beach Villa samo spletno stran", () => {
    assert.equal(personRateCard("ocean-2")?.seasons.zima[2], 350);
    assert.equal(personRateCard("ocean-2")?.seasons.zima[1], 280);
    assert.equal(personRateCard("ocean-2")?.seasons["pomlad-jesen"][2], 420);
    assert.equal(personRateCard("ocean-2")?.seasons["poletje-december"][1], 380);
    assert.equal(personRateCard("garden-3")?.seasons.zima[2], 330);
    assert.equal(personRateCard("garden-3")?.seasons["pomlad-jesen"][1], 320);
    assert.equal(personRateCard("garden-3")?.seasons["poletje-december"][2], 400);
    const beach = personRateCard("beach-4");
    assert.equal(beach?.seasons.zima[4], 560);
    assert.equal(beach?.seasons.zima[3], 470);
    assert.equal(beach?.seasons["pomlad-jesen"][2], 490);
    assert.equal(beach?.seasons["poletje-december"][1], 520);
    assert.equal(beach?.discount, 90);
    assert.equal(JSON.stringify(PERSON_RATE_CARDS).includes("534"), false);
    assert.equal(JSON.stringify(PERSON_RATE_CARDS).includes("590"), false);
  });

  it("odstotek dvigne vse cene bungalova od WEB in zaokroži na evro", () => {
    assert.equal(parsePercent("5"), 5);
    assert.equal(parsePercent("7,5"), 7.5);
    assert.equal(parsePercent("7.5"), 7.5);
    assert.equal(parsePercent(""), null);
    assert.equal(parsePercent("301"), null);
    const current = defaultPersonRates()["ocean-1"];
    const lifted = liftPersonUnit("ocean-1", current, 5);
    assert.ok(lifted);
    assert.equal(lifted.zima[4], null);
    assert.equal(lifted.zima[3], null);
    assert.equal(lifted.zima[2], 441);
    assert.equal(lifted.zima[1], 441);
    assert.equal(lifted["pomlad-jesen"][2], 557);
    assert.equal(lifted["pomlad-jesen"][1], 557);
    assert.equal(lifted["pomlad-jesen"][4], null);
    assert.equal(lifted["poletje-december"][2], 588);
    assert.equal(lifted["poletje-december"][1], 588);
    assert.equal(lifted["poletje-december"][4], null);
    assert.equal(liftAmount(null, 5), null);
    const beach = liftPersonUnit("beach-4", defaultPersonRates()["beach-4"], 5);
    assert.ok(beach);
    assert.equal(beach.zima[4], 588);
    assert.equal(beach.zima[3], 494);
    assert.equal(beach.zima[2], 399);
    assert.equal(beach.zima[1], 399);
    assert.equal(beach["pomlad-jesen"][4], 704);
    assert.equal(beach["poletje-december"][4], 735);
    assert.equal(beach["poletje-december"][3], 641);
    const cenik = readCenik({ webLift: { "ocean-1": 7.5, "beach-4": 400, "ocean-2": null } });
    assert.equal(cenik?.webLift["ocean-1"], 7.5);
    assert.equal(cenik?.webLift["ocean-2"], null);
    assert.equal(cenik?.webLift["beach-4"], null);
  });

  it("Beach Villa 2027 prevzame cene Bungalow I", () => {
    const web = defaultPersonRates();
    const fromWeb = beachWeb2027FromFamily(emptyPersonRates(), web);
    assert.equal(fromWeb.zima[4], 560);
    assert.equal(fromWeb.zima[3], 490);
    assert.equal(fromWeb.zima[2], 420);
    assert.equal(fromWeb.zima[1], 420);
    assert.equal(fromWeb["pomlad-jesen"][3], 600);
    assert.equal(fromWeb["poletje-december"][2], 560);
    assert.equal(fromWeb.zima[2] === web["beach-4"].zima[2], false);
    const next = emptyPersonRates();
    next["ocean-1"].zima[2] = 441;
    next["ocean-1"].zima[4] = 588;
    next["ocean-1"]["poletje-december"][1] = 588;
    const mixed = beachWeb2027FromFamily(next, web);
    assert.equal(mixed.zima[2], 441);
    assert.equal(mixed.zima[4], 560);
    assert.equal(mixed.zima[3], 490);
    assert.equal(mixed["poletje-december"][1], 588);
    assert.equal(mixed["poletje-december"][4], 700);
  });

  it("ceno bungalova deli na osebo", () => {
    assert.equal(pricePerPerson(560, 4), 140);
    assert.equal(pricePerPerson(490, 3), 163);
    assert.equal(pricePerPerson(420, 2), 210);
    assert.equal(pricePerPerson(420, 1), 420);
    assert.equal(pricePerPerson(670, 4), 168);
    assert.equal(pricePerPerson(null, 4), null);
  });

  it("provizija agencije pove, koliko ostane na osebo", () => {
    assert.equal(parseCommission("15"), 15);
    assert.equal(parseCommission("15,5"), 15.5);
    assert.equal(parseCommission("0"), 0);
    assert.equal(parseCommission("101"), null);
    assert.equal(parseCommission("-5"), null);
    assert.equal(netAfterCommission(140, 15), 119);
    assert.equal(netAfterCommission(163, 20), 130);
    assert.equal(netAfterCommission(70, 15), 60);
    assert.equal(netAfterCommission(0, 15), 0);
    assert.equal(netAfterCommission(null, 15), null);
    assert.equal(netAfterCommission(140, null), null);
    const cenik = readCenik({ commission: { "ocean-1": 15, "beach-4": 120 } });
    assert.equal(cenik?.commission["ocean-1"], 15);
    assert.equal(cenik?.commission["beach-4"], null);
    assert.equal(cenik?.commission["ocean-2"], null);
    assert.deepEqual(afterDiscounts(140, 20, 15), { agency: 21, early: 28, left: 91 });
    assert.deepEqual(afterDiscounts(140, 20, null), { agency: null, early: 28, left: 112 });
    assert.deepEqual(afterDiscounts(140, null, 15), { agency: 21, early: null, left: 119 });
    assert.deepEqual(afterDiscounts(null, 20, 15), { agency: null, early: null, left: null });
    const stored = readCenik({ earlyBooking: { "ocean-2": 10, "garden-3": 150 } });
    assert.equal(stored?.earlyBooking["ocean-2"], 10);
    assert.equal(stored?.earlyBooking["garden-3"], null);
    assert.equal(stored?.earlyBooking["ocean-1"], null);
  });

  it("minimalna cena 2027 je 120 € na osebo", () => {
    assert.equal(PERSON_FLOOR_2027, 120);
    assert.equal(belowPersonFloor2027(119), true);
    assert.equal(belowPersonFloor2027(120), false);
    assert.equal(belowPersonFloor2027(140), false);
    assert.equal(belowPersonFloor2027(null), false);
  });

  it("otrok v galeriji ima popust od polovice cene za 2 osebi", () => {
    assert.equal(galleryAdultPrice(420), 210);
    assert.equal(galleryAdultPrice(530), 265);
    assert.equal(galleryAdultPrice(560), 280);
    assert.equal(galleryAdultPrice(421), 211);
    assert.equal(galleryAdultPrice(null), null);
    assert.equal(familyChildLabel(3), "3. oseba, otrok");
    assert.equal(familyChildLabel(4), "4. oseba, otrok");
    assert.equal(familyGalleryTwoPerson(420, null, false), 420);
    assert.equal(familyGalleryTwoPerson(420, 350, false), 420);
    assert.equal(familyGalleryTwoPerson(420, 350, true), 350);
    assert.equal(familyGalleryTwoPerson(420, null, true), 420);
    const winter = childPrices(galleryAdultPrice(420)!);
    assert.equal(winter[0].free, true);
    assert.equal(winter[0].amount, 0);
    assert.equal(winter[1].amount, 105);
    assert.equal(winter[1].offPercent, 50);
    assert.equal(winter[2].amount, 168);
    assert.equal(winter[2].offPercent, 20);
    assert.equal(childPrices(galleryAdultPrice(530)!)[1].amount, 133);
    assert.equal(childPrices(galleryAdultPrice(530)!)[2].amount, 212);
    assert.equal(childPrices(galleryAdultPrice(560)!)[1].amount, 140);
    assert.equal(childPrices(galleryAdultPrice(560)!)[2].amount, 224);
    assert.equal(winter[1].amount === childPrices(pricePerPerson(560, 4)!)[1].amount, false);
    assert.equal(winter[2].amount === childPrices(pricePerPerson(490, 3)!)[2].amount, false);
  });

  it("obdobja kanala se stikajo, julij 9.–13. je v dveh sezonah", () => {
    const spring = PERSON_SEASONS.find((season) => season.id === "pomlad-jesen");
    const summer = PERSON_SEASONS.find((season) => season.id === "poletje-december");
    assert.equal(spring?.ranges[0].to, "07-13");
    assert.equal(summer?.ranges[0].from, "07-09");
    assert.equal(summer?.ranges[0].to, "09-30");
    assert.equal(spring?.ranges[1].from, "10-01");
  });
});
