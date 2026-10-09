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
    title: "Komba Cabana – Ocean Bungalov I – za 4",
    short: "Ocean Bungalov I",
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

export function clonePrices(): Record<string, Record<string, Money>> {
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

export function sanitizePrices(input: unknown): Record<string, Record<string, Money>> | null {
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
