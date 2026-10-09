import {
  PERSON_RATE_CARDS,
  PERSON_SEASONS,
  type PersonRates,
  type PersonSeasonId,
  type WebLift,
  afterDiscounts,
} from "./pricing";

/** Koledarsko leto za izračun polne zasedenosti. */
export const EARNINGS_YEAR = 2027;

export const MONTH_LABELS = [
  "Januar",
  "Februar",
  "Marec",
  "April",
  "Maj",
  "Junij",
  "Julij",
  "Avgust",
  "September",
  "Oktober",
  "November",
  "December",
] as const;

export type EarnLine = {
  nights: number;
  gross: number;
  agency: number;
  early: number;
  left: number;
  missingNights: number;
  nightlyGross: number | null;
  nightlyLeft: number | null;
};

export type SeasonSlice = {
  seasonId: PersonSeasonId;
  fromDay: number;
  toDay: number;
  nights: number;
  units: Record<string, EarnLine>;
  gross: number;
  agency: number;
  early: number;
  left: number;
  missingNights: number;
};

export type MonthEarnings = {
  month: number;
  nights: number;
  slices: SeasonSlice[];
  units: Record<string, EarnLine>;
  gross: number;
  agency: number;
  early: number;
  left: number;
  missingNights: number;
};

export type YearEarnings = {
  year: number;
  nights: number;
  months: MonthEarnings[];
  units: Record<string, EarnLine>;
  gross: number;
  agency: number;
  early: number;
  left: number;
  missingNights: number;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function monthDayInRange(day: string, from: string, to: string): boolean {
  if (from <= to) return day >= from && day <= to;
  return day >= from || day <= to;
}

/** Web sezona za dan v letu. Če se obdobji prekrivata, zmaga tisto, ki se začne pozneje. */
export function personSeasonOn(monthDay: string): PersonSeasonId | null {
  const matches: { id: PersonSeasonId; from: string }[] = [];
  for (const season of PERSON_SEASONS) {
    for (const range of season.ranges) {
      if (monthDayInRange(monthDay, range.from, range.to)) {
        matches.push({ id: season.id, from: range.from });
      }
    }
  }
  if (matches.length === 0) return null;
  matches.sort((left, right) => right.from.localeCompare(left.from));
  return matches[0].id;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthSeasonSlices(
  year: number,
  month: number,
): { seasonId: PersonSeasonId; fromDay: number; toDay: number; nights: number }[] {
  const count = daysInMonth(year, month);
  const slices: { seasonId: PersonSeasonId; fromDay: number; toDay: number; nights: number }[] = [];
  for (let day = 1; day <= count; day += 1) {
    const seasonId = personSeasonOn(`${pad(month)}-${pad(day)}`);
    if (!seasonId) continue;
    const last = slices[slices.length - 1];
    if (last && last.seasonId === seasonId) {
      last.toDay = day;
      last.nights += 1;
      continue;
    }
    slices.push({ seasonId, fromDay: day, toDay: day, nights: 1 });
  }
  return slices;
}

function emptyLine(): EarnLine {
  return {
    nights: 0,
    gross: 0,
    agency: 0,
    early: 0,
    left: 0,
    missingNights: 0,
    nightlyGross: null,
    nightlyLeft: null,
  };
}

function addLine(total: EarnLine, line: EarnLine): EarnLine {
  const sameNightly =
    total.nights === 0 ||
    (total.nightlyGross != null && total.nightlyGross === line.nightlyGross && total.missingNights === 0 && line.missingNights === 0);
  return {
    nights: total.nights + line.nights,
    gross: total.gross + line.gross,
    agency: total.agency + line.agency,
    early: total.early + line.early,
    left: total.left + line.left,
    missingNights: total.missingNights + line.missingNights,
    nightlyGross: sameNightly ? line.nightlyGross : null,
    nightlyLeft: sameNightly ? line.nightlyLeft : null,
  };
}

function nightKept(amount: number | null, earlyPercent: number | null, commissionPercent: number | null) {
  if (amount == null) return null;
  const cut = afterDiscounts(amount, earlyPercent, commissionPercent);
  return {
    agency: cut.agency ?? 0,
    early: cut.early ?? 0,
    left: cut.left ?? amount,
  };
}

function lineForNights(
  nights: number,
  amount: number | null,
  earlyPercent: number | null,
  commissionPercent: number | null,
): EarnLine {
  const kept = nightKept(amount, earlyPercent, commissionPercent);
  if (!kept) {
    return {
      nights,
      gross: 0,
      agency: 0,
      early: 0,
      left: 0,
      missingNights: nights,
      nightlyGross: null,
      nightlyLeft: null,
    };
  }
  return {
    nights,
    gross: amount! * nights,
    agency: kept.agency * nights,
    early: kept.early * nights,
    left: kept.left * nights,
    missingNights: 0,
    nightlyGross: amount,
    nightlyLeft: kept.left,
  };
}

/**
 * Zaslužek celega leta po mesecih pri polni zasedenosti.
 * Vsak bungalov je zaseden vsako noč po web ceni za polno število oseb.
 * Agencija in Early booking se odštejeta od polne cene.
 */
export function yearEarnings(
  year: number,
  rates: PersonRates,
  commission: WebLift,
  earlyBooking: WebLift,
): YearEarnings {
  const months: MonthEarnings[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const slices: SeasonSlice[] = monthSeasonSlices(year, month).map((slice) => {
      const units: Record<string, EarnLine> = {};
      let gross = 0;
      let agency = 0;
      let early = 0;
      let left = 0;
      let missingNights = 0;
      for (const card of PERSON_RATE_CARDS) {
        const amount = rates[card.id]?.[slice.seasonId]?.[card.capacity] ?? null;
        const line = lineForNights(slice.nights, amount, earlyBooking[card.id] ?? null, commission[card.id] ?? null);
        units[card.id] = line;
        gross += line.gross;
        agency += line.agency;
        early += line.early;
        left += line.left;
        missingNights += line.missingNights;
      }
      return { ...slice, units, gross, agency, early, left, missingNights };
    });

    const units: Record<string, EarnLine> = {};
    for (const card of PERSON_RATE_CARDS) units[card.id] = emptyLine();
    let gross = 0;
    let agency = 0;
    let early = 0;
    let left = 0;
    let missingNights = 0;
    let nights = 0;
    for (const slice of slices) {
      nights += slice.nights;
      gross += slice.gross;
      agency += slice.agency;
      early += slice.early;
      left += slice.left;
      missingNights += slice.missingNights;
      for (const card of PERSON_RATE_CARDS) {
        units[card.id] = addLine(units[card.id], slice.units[card.id]);
      }
    }
    months.push({ month, nights, slices, units, gross, agency, early, left, missingNights });
  }

  const units: Record<string, EarnLine> = {};
  for (const card of PERSON_RATE_CARDS) units[card.id] = emptyLine();
  let gross = 0;
  let agency = 0;
  let early = 0;
  let left = 0;
  let missingNights = 0;
  let nights = 0;
  for (const month of months) {
    nights += month.nights;
    gross += month.gross;
    agency += month.agency;
    early += month.early;
    left += month.left;
    missingNights += month.missingNights;
    for (const card of PERSON_RATE_CARDS) {
      units[card.id] = addLine(units[card.id], month.units[card.id]);
    }
  }

  return { year, nights, months, units, gross, agency, early, left, missingNights };
}
