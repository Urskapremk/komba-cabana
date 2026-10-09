export type SeasonId = "zima" | "pomlad-jesen" | "poletje-december";
export type OverlapRule = "praznicna" | "prejsnja";

export type Period = {
  id: string;
  from: string;
  to: string;
  season: SeasonId;
};

export type Money = {
  min: number | null;
  max: number | null;
};

export type Bungalow = {
  id: string;
  title: string;
  short: string;
  meta: string;
  source: "optima" | "rocno";
};

export const SEASON_LABEL: Record<SeasonId, string> = {
  zima: "Zima",
  "pomlad-jesen": "Pomlad + jesen",
  "poletje-december": "Poletje + december",
};

export const CALENDAR_START = "2027-01-11";
export const CALENDAR_END = "2028-01-10";

export const PERIODS: Period[] = [
  { id: "zima-1", from: "2027-01-11", to: "2027-03-31", season: "zima" },
  { id: "pomlad-1", from: "2027-04-01", to: "2027-07-08", season: "pomlad-jesen" },
  { id: "poletje-1", from: "2027-07-09", to: "2027-09-30", season: "poletje-december" },
  { id: "jesen-1", from: "2027-10-01", to: "2027-11-30", season: "pomlad-jesen" },
  { id: "zima-2", from: "2027-12-01", to: "2027-12-27", season: "zima" },
  { id: "prazniki", from: "2027-12-19", to: "2028-01-10", season: "poletje-december" },
];

export const BUNGALOWS: Bungalow[] = [
  {
    id: "ocean-1",
    title: "Komba Cabana – Bungalow I - Family",
    short: "Bungalow I - Family",
    meta: "za 4",
    source: "optima",
  },
  {
    id: "ocean-2",
    title: "Komba Cabana – Ocean Bungalow II",
    short: "Ocean Bungalow II",
    meta: "",
    source: "optima",
  },
  {
    id: "garden-3",
    title: "Komba Cabana – Garden Bungalov III",
    short: "Garden Bungalov III",
    meta: "",
    source: "optima",
  },
  {
    id: "beach-4",
    title: "Komba Cabana – Beach Villa IV",
    short: "Beach Villa IV",
    meta: "Bungalow IV",
    source: "rocno",
  },
];

function rates(pairs: number[]): Record<string, Money> {
  return Object.fromEntries(
    PERIODS.map((period, index) => [
      period.id,
      { min: pairs[index * 2], max: pairs[index * 2 + 1] },
    ]),
  );
}

function emptyRates(): Record<string, Money> {
  return Object.fromEntries(PERIODS.map((period) => [period.id, { min: null, max: null }]));
}

/** Predlagane cene Optima Plus, na noč. Beach Villa v predlogu ni bila. */
export const OPTIMA_PRICES: Record<string, Record<string, Money>> = {
  "ocean-1": rates([560, 675, 575, 693, 610, 753, 575, 693, 560, 675, 580, 773]),
  "ocean-2": rates([275, 353, 290, 387, 330, 440, 290, 387, 285, 365, 320, 457]),
  "garden-3": rates([270, 346, 285, 380, 325, 433, 285, 380, 280, 359, 315, 450]),
  "beach-4": emptyRates(),
};

export const PRESETS = [
  { id: "zima", label: "Zima", arrival: "2027-02-08", departure: "2027-02-15" },
  { id: "pomlad", label: "Pomlad", arrival: "2027-05-03", departure: "2027-05-10" },
  { id: "poletje", label: "Poletje", arrival: "2027-08-02", departure: "2027-08-09" },
  { id: "jesen", label: "Jesen", arrival: "2027-10-11", departure: "2027-10-18" },
  { id: "prazniki", label: "Prazniki", arrival: "2027-12-26", departure: "2028-01-02" },
  { id: "prehod", label: "Prehod v praznike", arrival: "2027-12-15", departure: "2027-12-29" },
] as const;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseISODate(iso: string): Date {
  const match = DATE.exec(iso);
  if (!match) throw new Error(`Neveljaven datum: ${iso}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function formatISODate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatISODate(date);
}

export function nightsBetween(arrival: string, departure: string): string[] {
  if (!DATE.test(arrival) || !DATE.test(departure) || departure <= arrival) return [];
  const nights: string[] = [];
  let cursor = arrival;
  while (cursor < departure && nights.length < 400) {
    nights.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return nights;
}

export function dayOffset(iso: string): number {
  return nightsBetween(CALENDAR_START, iso).length;
}

export function calendarLength(): number {
  return dayOffset(addDays(CALENDAR_END, 1));
}

export function periodsCovering(date: string): Period[] {
  return PERIODS.filter((period) => date >= period.from && date <= period.to);
}

export function resolvePeriod(date: string, rule: OverlapRule): Period | null {
  const matches = periodsCovering(date);
  if (matches.length === 0) return null;
  const ranked = [...matches].sort((a, b) =>
    rule === "praznicna" ? b.from.localeCompare(a.from) : a.from.localeCompare(b.from),
  );
  return ranked[0];
}

export function chosenNightly(price: Money, position: number): number | null {
  if (price.min === null || price.max === null) return null;
  const t = Math.min(100, Math.max(0, position)) / 100;
  return Math.round(price.min + (price.max - price.min) * t);
}

export type StayGroup = {
  periodId: string;
  season: SeasonId;
  periodFrom: string;
  periodTo: string;
  stayFrom: string;
  stayCheckout: string;
  nights: number;
  min: number | null;
  max: number | null;
  chosen: number | null;
  overlapNights: number;
};

export type StayQuote = {
  nights: number;
  groups: StayGroup[];
  uncovered: string[];
  minTotal: number | null;
  maxTotal: number | null;
  chosenTotal: number | null;
  overlapNights: number;
  complete: boolean;
};

export function quoteStay(
  prices: Record<string, Money>,
  arrival: string,
  departure: string,
  position: number,
  overlap: OverlapRule,
): StayQuote {
  const dates = nightsBetween(arrival, departure);
  const groups: StayGroup[] = [];
  const uncovered: string[] = [];
  let overlapNights = 0;

  for (const date of dates) {
    const covering = periodsCovering(date);
    const period = resolvePeriod(date, overlap);
    const overlaps = covering.length > 1;
    if (overlaps) overlapNights += 1;
    if (!period) {
      uncovered.push(date);
      continue;
    }
    const previous = groups[groups.length - 1];
    if (previous && previous.periodId === period.id) {
      previous.nights += 1;
      previous.stayCheckout = addDays(date, 1);
      if (overlaps) previous.overlapNights += 1;
      continue;
    }
    const price = prices[period.id] ?? { min: null, max: null };
    groups.push({
      periodId: period.id,
      season: period.season,
      periodFrom: period.from,
      periodTo: period.to,
      stayFrom: date,
      stayCheckout: addDays(date, 1),
      nights: 1,
      min: price.min,
      max: price.max,
      chosen: chosenNightly(price, position),
      overlapNights: overlaps ? 1 : 0,
    });
  }

  const sum = (pick: (group: StayGroup) => number | null) => {
    if (dates.length === 0 || uncovered.length > 0) return null;
    let total = 0;
    for (const group of groups) {
      const nightly = pick(group);
      if (nightly === null) return null;
      total += nightly * group.nights;
    }
    return total;
  };

  const minTotal = sum((group) => group.min);
  const maxTotal = sum((group) => group.max);
  const chosenTotal = sum((group) => group.chosen);

  return {
    nights: dates.length,
    groups,
    uncovered,
    minTotal,
    maxTotal,
    chosenTotal,
    overlapNights,
    complete: dates.length > 0 && minTotal !== null && maxTotal !== null && chosenTotal !== null,
  };
}

export type CalendarSegment = {
  from: string;
  to: string;
  period: Period;
};

export function resolvedSegments(rule: OverlapRule): CalendarSegment[] {
  const dates = nightsBetween(CALENDAR_START, addDays(CALENDAR_END, 1));
  const segments: CalendarSegment[] = [];
  for (const date of dates) {
    const period = resolvePeriod(date, rule);
    if (!period) continue;
    const previous = segments[segments.length - 1];
    if (previous && previous.period.id === period.id) {
      previous.to = date;
      continue;
    }
    segments.push({ from: date, to: date, period });
  }
  return segments;
}

export type Prices = Record<string, Record<string, Money>>;

/** Koliko oseb sprejme bungalov v lastni ponudbi. II in III sta 2+0, I in Beach Villa do 4. */
export const OFFER_CAPACITY: Record<string, number> = {
  "ocean-1": 4,
  "ocean-2": 2,
  "garden-3": 2,
  "beach-4": 4,
};

export type OfferRow = Record<number, number | null>;
export type Offers = Record<string, Record<string, OfferRow>>;

export function guestCounts(unitId: string): number[] {
  const capacity = OFFER_CAPACITY[unitId] ?? 1;
  return Array.from({ length: capacity }, (_, index) => index + 1);
}

export function guestLabel(count: number): string {
  if (count === 1) return "1 oseba";
  if (count === 2) return "2 osebi";
  return `${count} osebe`;
}

export type PersonSeasonId = "zima" | "pomlad-jesen" | "poletje-december";

/** Obdobja iz kanalov, brez polnega penziona. 9. 7.–13. 7. je v pomladi in v poletju. */
export const PERSON_SEASONS: {
  id: PersonSeasonId;
  label: string;
  ranges: { from: string; to: string }[];
}[] = [
  {
    id: "zima",
    label: "Zima",
    ranges: [
      { from: "01-11", to: "03-28" },
      { from: "12-01", to: "12-18" },
    ],
  },
  {
    id: "pomlad-jesen",
    label: "Pomlad + jesen",
    ranges: [
      { from: "03-29", to: "07-13" },
      { from: "10-01", to: "11-30" },
    ],
  },
  {
    id: "poletje-december",
    label: "Poletje + december",
    ranges: [
      { from: "07-09", to: "09-30" },
      { from: "12-19", to: "01-10" },
    ],
  },
];

export type PersonRateCard = {
  id: string;
  name: string;
  detail: string;
  note: string;
  capacity: number;
  discount: number;
  minimumPersons: number;
  minStay: number;
  seasons: Record<PersonSeasonId, Record<number, number>>;
};

/** Cene na noč po osebah. Polni penzion ni vključen. */
export const PERSON_RATE_CARDS: PersonRateCard[] = [
  {
    id: "ocean-1",
    name: "Bungalow I - Family",
    detail: "Ocean · spletna stran, Booking, Airbnb, Agoda-30 %",
    note: "",
    capacity: 4,
    discount: 70,
    minimumPersons: 2,
    minStay: 3,
    seasons: {
      zima: { 4: 560, 3: 490, 2: 420, 1: 420 },
      "pomlad-jesen": { 4: 670, 3: 600, 2: 530, 1: 530 },
      "poletje-december": { 4: 700, 3: 630, 2: 560, 1: 560 },
    },
  },
  {
    id: "ocean-2",
    name: "Bungalov II",
    detail: "Ocean · spletna stran, Booking, Airbnb, Agoda",
    note: "",
    capacity: 2,
    discount: 70,
    minimumPersons: 1,
    minStay: 3,
    seasons: {
      zima: { 2: 350, 1: 280 },
      "pomlad-jesen": { 2: 420, 1: 350 },
      "poletje-december": { 2: 450, 1: 380 },
    },
  },
  {
    id: "garden-3",
    name: "Bungalov III",
    detail: "Garden · spletna stran, Booking, Airbnb, Agoda",
    note: "",
    capacity: 2,
    discount: 70,
    minimumPersons: 1,
    minStay: 3,
    seasons: {
      zima: { 2: 330, 1: 260 },
      "pomlad-jesen": { 2: 390, 1: 320 },
      "poletje-december": { 2: 400, 1: 330 },
    },
  },
  {
    id: "beach-4",
    name: "Beach Villa IV",
    detail: "Samo lastna spletna stran",
    note: "Booking, Airbnb in Agoda nimajo vpisane cene.",
    capacity: 4,
    discount: 90,
    minimumPersons: 2,
    minStay: 3,
    seasons: {
      zima: { 4: 560, 3: 470, 2: 380, 1: 380 },
      "pomlad-jesen": { 4: 670, 3: 580, 2: 490, 1: 490 },
      "poletje-december": { 4: 700, 3: 610, 2: 520, 1: 520 },
    },
  },
];

export type PersonRates = Record<string, Record<PersonSeasonId, Record<number, number | null>>>;

export function personColumns(capacity: number): number[] {
  return Array.from({ length: capacity }, (_, index) => capacity - index);
}

export function formatMonthDay(monthDay: string): string {
  const [month, day] = monthDay.split("-");
  return `${Number(day)}. ${Number(month)}.`;
}

export function discountSentence(card: PersonRateCard): string {
  if (card.minimumPersons <= 1) {
    return `Popust ${card.discount} € na osebo pod ${card.capacity}. Najmanj ${card.minStay} noči.`;
  }
  return `Popust ${card.discount} € na osebo pod ${card.capacity}. Od ${card.minimumPersons} oseb navzdol je cena enaka. Najmanj ${card.minStay} noči.`;
}

export function defaultPersonRates(): PersonRates {
  const rates: PersonRates = {};
  for (const card of PERSON_RATE_CARDS) {
    rates[card.id] = {
      zima: { ...card.seasons.zima },
      "pomlad-jesen": { ...card.seasons["pomlad-jesen"] },
      "poletje-december": { ...card.seasons["poletje-december"] },
    };
  }
  return rates;
}

export function emptyPersonRates(): PersonRates {
  const rates: PersonRates = {};
  for (const card of PERSON_RATE_CARDS) {
    const seasons = {} as PersonRates[string];
    for (const season of PERSON_SEASONS) {
      const row: Record<number, number | null> = {};
      for (const count of personColumns(card.capacity)) row[count] = null;
      seasons[season.id] = row;
    }
    rates[card.id] = seasons;
  }
  return rates;
}

export function formatSeasonRange(from: string, to: string, year?: number): string {
  if (!year) return `${formatMonthDay(from)} – ${formatMonthDay(to)}`;
  const endYear = Number(to.slice(0, 2)) < Number(from.slice(0, 2)) ? year + 1 : year;
  return `${formatMonthDay(from)} ${year} – ${formatMonthDay(to)} ${endYear}`;
}

export function personRateCard(unitId: string): PersonRateCard | undefined {
  return PERSON_RATE_CARDS.find((card) => card.id === unitId);
}

export function emptyOffers(): Offers {
  return Object.fromEntries(
    BUNGALOWS.map((bungalow) => [
      bungalow.id,
      Object.fromEntries(
        PERIODS.map((period) => [
          period.id,
          Object.fromEntries(guestCounts(bungalow.id).map((count) => [count, null])),
        ]),
      ),
    ]),
  );
}

export function clonePrices(): Prices {
  return Object.fromEntries(
    BUNGALOWS.map((bungalow) => [
      bungalow.id,
      Object.fromEntries(
        PERIODS.map((period) => [period.id, { ...OPTIMA_PRICES[bungalow.id][period.id] }]),
      ),
    ]),
  );
}

export function sameMoney(a: Money, b: Money): boolean {
  return a.min === b.min && a.max === b.max;
}

function sanitizeAmount(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 1_000_000) {
    return value;
  }
  return undefined;
}

export function sanitizeOffers(input: unknown): Offers | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const next = emptyOffers();
  let recognized = false;
  for (const bungalow of BUNGALOWS) {
    const row = source[bungalow.id];
    if (!row || typeof row !== "object") continue;
    recognized = true;
    for (const period of PERIODS) {
      const cell = (row as Record<string, unknown>)[period.id];
      if (!cell || typeof cell !== "object") continue;
      for (const count of guestCounts(bungalow.id)) {
        const amount = sanitizeAmount((cell as Record<string, unknown>)[String(count)]);
        if (amount === undefined) continue;
        next[bungalow.id][period.id][count] = amount;
      }
    }
  }
  return recognized ? next : null;
}

function readPersonGrid(input: unknown, base: PersonRates): PersonRates | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const next = base;
  let recognized = false;
  for (const card of PERSON_RATE_CARDS) {
    const row = source[card.id];
    if (!row || typeof row !== "object") continue;
    recognized = true;
    for (const season of PERSON_SEASONS) {
      const cell = (row as Record<string, unknown>)[season.id];
      if (!cell || typeof cell !== "object") continue;
      for (const count of personColumns(card.capacity)) {
        const amount = sanitizeAmount((cell as Record<string, unknown>)[String(count)]);
        if (amount === undefined) continue;
        next[card.id][season.id][count] = amount;
      }
    }
  }
  return recognized ? next : null;
}

export function sanitizePersonRates(input: unknown): PersonRates | null {
  return readPersonGrid(input, defaultPersonRates());
}

export function sanitizeWeb2027(input: unknown): PersonRates | null {
  return readPersonGrid(input, emptyPersonRates());
}

function readPercentMap(input: unknown, min: number, max: number): WebLift | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const next = emptyWebLift();
  let recognized = false;
  for (const card of PERSON_RATE_CARDS) {
    if (!Object.hasOwn(source, card.id)) continue;
    recognized = true;
    const value = source[card.id];
    if (value === null || typeof value !== "number" || !Number.isFinite(value)) continue;
    const rounded = Math.round(value * 10) / 10;
    if (rounded < min || rounded > max) continue;
    next[card.id] = rounded;
  }
  return recognized ? next : null;
}

export function sanitizeWebLift(input: unknown): WebLift | null {
  return readPercentMap(input, -90, 300);
}

export function sanitizeCommission(input: unknown): WebLift | null {
  return readPercentMap(input, 0, 100);
}

export function readCenik(
  input: unknown,
): {
  prices: Prices;
  offers: Offers;
  personRates: PersonRates;
  web2027: PersonRates;
  webLift: WebLift;
  commission: WebLift;
  earlyBooking: WebLift;
  lodgeOccupancy: number;
} | null {
  if (!input || typeof input !== "object") return null;
  const envelope = input as {
    prices?: unknown;
    offers?: unknown;
    personRates?: unknown;
    web2027?: unknown;
    webLift?: unknown;
    commission?: unknown;
    earlyBooking?: unknown;
    lodgeOccupancy?: unknown;
  };
  const pricesSource = "prices" in envelope ? envelope.prices : envelope;
  const prices = sanitizePrices(pricesSource);
  const offers = sanitizeOffers(envelope.offers);
  const personRates = sanitizePersonRates(envelope.personRates);
  const web2027 = sanitizeWeb2027(envelope.web2027);
  const webLift = sanitizeWebLift(envelope.webLift);
  const commission = sanitizeCommission(envelope.commission);
  const earlyBooking = sanitizeCommission(envelope.earlyBooking);
  if (!prices && !offers && !personRates && !web2027 && !webLift && !commission && !earlyBooking) return null;
  return {
    prices: prices ?? clonePrices(),
    offers: offers ?? emptyOffers(),
    personRates: personRates ?? defaultPersonRates(),
    web2027: web2027 ?? emptyPersonRates(),
    webLift: webLift ?? emptyWebLift(),
    commission: commission ?? emptyWebLift(),
    earlyBooking: earlyBooking ?? emptyWebLift(),
    lodgeOccupancy: sanitizeLodgeOccupancy(envelope.lodgeOccupancy),
  };
}

/** Zasedenost Lodge, od 0 do 100. Manjkajoča vrednost pomeni polno zasedenost. */
export function sanitizeLodgeOccupancy(input: unknown): number {
  if (typeof input !== "number" || !Number.isFinite(input)) return 100;
  const rounded = Math.round(input * 10) / 10;
  if (rounded < 0 || rounded > 100) return 100;
  return rounded;
}

export function sanitizePrices(input: unknown): Prices | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const next = clonePrices();
  let recognized = false;
  for (const bungalow of BUNGALOWS) {
    const row = source[bungalow.id];
    if (!row || typeof row !== "object") continue;
    recognized = true;
    for (const period of PERIODS) {
      const cell = (row as Record<string, unknown>)[period.id];
      if (!cell || typeof cell !== "object") continue;
      const min = sanitizeAmount((cell as { min?: unknown }).min);
      const max = sanitizeAmount((cell as { max?: unknown }).max);
      if (min === undefined || max === undefined) continue;
      next[bungalow.id][period.id] = { min, max };
    }
  }
  return recognized ? next : null;
}

export function nightLabel(count: number): string {
  return count === 1 ? "1 noč" : `${count} noči`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("sl-SI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseISODate(iso));
}

export function pricePerPerson(amount: number | null, guests: number): number | null {
  if (amount == null || guests <= 0) return null;
  return Math.round(amount / guests);
}

export type ChildBand = {
  id: string;
  label: string;
  amount: number;
  free: boolean;
  offPercent: number;
};

/** Cena otroka od cene odrasle osebe. Velja, ko je 3. ali 4. oseba otrok. */
export function childPrices(adult: number): ChildBand[] {
  return [
    { id: "0-5", label: "0–5 let", amount: 0, free: true, offPercent: 100 },
    { id: "5-10", label: "5–10 let", amount: Math.round(adult * 0.5), free: false, offPercent: 50 },
    { id: "10-15", label: "10–15 let", amount: Math.round(adult * 0.8), free: false, offPercent: 20 },
  ];
}

export function childStaySentence(): string {
  return "Če je 3. ali 4. oseba otrok: 0–5 let je bivanje brezplačno, 5–10 let −50 %, 10–15 let −20 %.";
}

export type WebLift = Record<string, number | null>;

export function emptyWebLift(): WebLift {
  return {
    "ocean-1": null,
    "ocean-2": null,
    "garden-3": null,
    "beach-4": null,
  };
}

/** Odstotek dviga, ena decimalka, od −90 do 300. Vejica in pika sta enaki. */
export function parsePercent(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d{1,3}(\.\d{1,2})?$/.test(text)) return null;
  const value = Math.round(Number(text) * 10) / 10;
  if (value < -90 || value > 300) return null;
  return value;
}

/** Provizija agencije, od 0 do 100. Vejica in pika sta enaki. */
export function parseCommission(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return null;
  const value = Math.round(Number(text) * 10) / 10;
  if (value < 0 || value > 100) return null;
  return value;
}

/** Koliko ostane od zneska na osebo po enem odstotku popusta ali provizije. */
export function netAfterCommission(amount: number | null, percent: number | null): number | null {
  if (amount == null || percent == null || !Number.isFinite(percent)) return null;
  const next = Math.round(amount * (1 - percent / 100));
  if (next < 0 || next >= 1_000_000) return null;
  return next;
}

/** Odstotek od polne cene, zaokrožen na evro. */
export function discountShare(amount: number | null, percent: number | null): number | null {
  if (amount == null || percent == null || !Number.isFinite(percent)) return null;
  const cut = Math.round((amount * percent) / 100);
  if (cut < 0 || cut > amount) return null;
  return cut;
}

/** Polna cena minus agencija minus Early booking. Oba odbitka sta od polne cene. */
export function afterDiscounts(
  amount: number | null,
  earlyBooking: number | null,
  commission: number | null,
): { agency: number | null; early: number | null; left: number | null } {
  if (amount == null) return { agency: null, early: null, left: null };
  const agency = discountShare(amount, commission);
  const early = discountShare(amount, earlyBooking);
  if (agency == null && early == null) return { agency: null, early: null, left: null };
  const left = Math.max(0, amount - (agency ?? 0) - (early ?? 0));
  return { agency, early, left };
}

export function liftAmount(amount: number | null, percent: number): number | null {
  if (amount == null || !Number.isFinite(percent)) return null;
  const next = Math.round(amount * (1 + percent / 100));
  if (next < 0 || next >= 1_000_000) return null;
  return next;
}

/**
 * WEB 2027 za Beach Villa je enak Bungalow I - Family.
 * Vpisana cena 2027 pri I ima prednost, sicer velja trenutni WEB pri I.
 */
export function beachWeb2027FromFamily(web2027: PersonRates, web: PersonRates): PersonRates[string] {
  const familyNext = web2027["ocean-1"];
  const familyWeb = web["ocean-1"];
  const seasons = {} as PersonRates[string];
  for (const season of PERSON_SEASONS) {
    const row: Record<number, number | null> = {};
    for (const count of personColumns(4)) {
      row[count] = familyNext?.[season.id]?.[count] ?? familyWeb?.[season.id]?.[count] ?? null;
    }
    seasons[season.id] = row;
  }
  return seasons;
}

/** Vse cene enega bungalova, zaokrožene na evro. */
export function liftPersonUnit(
  unitId: string,
  current: PersonRates[string],
  percent: number,
): PersonRates[string] | null {
  const card = personRateCard(unitId);
  if (!card || !Number.isFinite(percent)) return null;
  const seasons = {} as PersonRates[string];
  for (const season of PERSON_SEASONS) {
    const row: Record<number, number | null> = {};
    for (const count of personColumns(card.capacity)) {
      row[count] = liftAmount(current[season.id]?.[count] ?? null, percent);
    }
    seasons[season.id] = row;
  }
  return seasons;
}

export function formatEuro(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("sl-SI", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("sl-SI", { maximumFractionDigits: 1 }).format(value)} %`;
}

export function spread(price: Money): { euros: number; percent: number } | null {
  if (price.min === null || price.max === null || price.min <= 0) return null;
  const euros = price.max - price.min;
  return { euros, percent: (euros / price.min) * 100 };
}

export function positionLabel(position: number): string {
  if (position <= 0) return "Min cena";
  if (position >= 100) return "Max cena";
  if (position === 50) return "Sredina razpona";
  return `${position} % od min proti max`;
}

export function segmentLabel(period: Period): string {
  if (period.id === "prazniki") return "Prazniki";
  if (period.id === "poletje-1") return "Poletje";
  return SEASON_LABEL[period.season];
}

export type ComparePeriod = {
  id: string;
  season: SeasonId;
  from2026: string;
  to2026: string;
  from2027: string;
  to2027: string;
};

/** Ista sezonska vrstica v izhodišču 2026 in predlogu 2027. December zime se po dolžini razlikuje. */
export const COMPARE_PERIODS: ComparePeriod[] = [
  {
    id: "zima-1",
    season: "zima",
    from2026: "2026-01-11",
    to2026: "2026-03-31",
    from2027: "2027-01-11",
    to2027: "2027-03-31",
  },
  {
    id: "pomlad-1",
    season: "pomlad-jesen",
    from2026: "2026-04-01",
    to2026: "2026-07-08",
    from2027: "2027-04-01",
    to2027: "2027-07-08",
  },
  {
    id: "poletje-1",
    season: "poletje-december",
    from2026: "2026-07-09",
    to2026: "2026-09-30",
    from2027: "2027-07-09",
    to2027: "2027-09-30",
  },
  {
    id: "jesen-1",
    season: "pomlad-jesen",
    from2026: "2026-10-01",
    to2026: "2026-11-30",
    from2027: "2027-10-01",
    to2027: "2027-11-30",
  },
  {
    id: "zima-2",
    season: "zima",
    from2026: "2026-12-01",
    to2026: "2026-12-18",
    from2027: "2027-12-01",
    to2027: "2027-12-27",
  },
  {
    id: "prazniki",
    season: "poletje-december",
    from2026: "2026-12-19",
    to2026: "2027-01-10",
    from2027: "2027-12-19",
    to2027: "2028-01-10",
  },
];

function yearRates(pairs: number[]): Record<string, Money> {
  return Object.fromEntries(
    COMPARE_PERIODS.map((period, index) => [
      period.id,
      { min: pairs[index * 2], max: pairs[index * 2 + 1] },
    ]),
  );
}

/** Izhodiščne bruto cene 2026 pri polni kapaciteti. Beach Ville v tem letu ni. */
export const RATES_2026: Record<string, Record<string, Money>> = {
  "ocean-1": yearRates([490, 731, 525, 750, 585, 836, 565, 807, 525, 750, 550, 846]),
  "ocean-2": yearRates([220, 328, 230, 354, 300, 429, 230, 354, 220, 338, 280, 431]),
  "garden-3": yearRates([220, 328, 230, 354, 280, 400, 230, 354, 220, 338, 280, 431]),
};

export const COMPARE_UNITS = [
  { id: "ocean-1", name: "Bungalow I - Family", detail: "Ocean · za 4 osebe · 4+0", has2026: true },
  { id: "ocean-2", name: "Bungalov II", detail: "Ocean · 2+0", has2026: true },
  { id: "garden-3", name: "Bungalov III", detail: "Garden · 2+0", has2026: true },
  { id: "beach-4", name: "Beach Villa IV", detail: "Bungalow IV · v letu 2026 ni bil v ceniku", has2026: false },
] as const;

export const GAP_FILL_2026 = [
  { id: "off", when: "Izven sezone", rule: "Najmanj 3 noči. 2 noči +10 %, 1 noč +30 %." },
  { id: "season", when: "V sezoni", rule: "Najmanj 3 noči." },
  { id: "newyear", when: "Novo leto", rule: "Najmanj 3 noči." },
] as const;

export function priceDelta(base: number | null, next: number | null): { euros: number; percent: number } | null {
  if (base === null || next === null || base === 0) return null;
  const euros = next - base;
  return { euros, percent: (euros / base) * 100 };
}

export function datesDiffer(period: ComparePeriod): boolean {
  return period.from2026.slice(5) !== period.from2027.slice(5) || period.to2026.slice(5) !== period.to2027.slice(5);
}

/** Minimalna cena odrasle osebe v letu 2027, pri vseh bungalovih. */
export const PERSON_FLOOR_2027 = 120;

export function belowPersonFloor2027(amount: number | null): boolean {
  return amount != null && amount < PERSON_FLOOR_2027;
}

/** Minimalna cena iz pisma za 2026. Ramena in novo leto tam nista posebej določena. */
export function floor2026(unitId: string, periodId: string): { amount: number; label: string } | null {
  if (unitId === "ocean-2" || unitId === "garden-3") return { amount: 200, label: "celo leto" };
  if (unitId !== "ocean-1") return null;
  if (periodId === "zima-1" || periodId === "zima-2") return { amount: 475, label: "izven sezone" };
  if (periodId === "poletje-1") return { amount: 570, label: "v sezoni" };
  return null;
}
