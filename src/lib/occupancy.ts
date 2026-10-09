import { OCCUPANCY_2026, OCCUPANCY_UNITS, type OccupancyUnitId } from "@/data/occupancy-2026";
import type { EarnLine, YearEarnings } from "@/lib/year-earnings";

export function occupiedNights(unitId: OccupancyUnitId, month?: number): number {
  const months = month == null ? OCCUPANCY_2026 : OCCUPANCY_2026.filter((row) => row.month === month);
  return months.reduce((sum, row) => sum + row.occupied[unitId], 0);
}

/** Delež zasedenih bungalov-noči v letu 2026, na eno decimalko. */
export function lodgeOccupancy2026(): number {
  const days = OCCUPANCY_2026.reduce((sum, month) => sum + month.days, 0);
  const occupied = OCCUPANCY_UNITS.reduce((sum, unitId) => sum + occupiedNights(unitId), 0);
  const possible = days * OCCUPANCY_UNITS.length;
  if (possible <= 0) return 0;
  return Math.round((occupied / possible) * 1000) / 10;
}

export function occupancyShare(occupied: number, days: number): number {
  if (days <= 0) return 0;
  return occupied / days;
}

export type ScaledLine = {
  days: number;
  occupiedNights: number;
  gross: number;
  agency: number;
  early: number;
  left: number;
};

function scaleMoney(line: EarnLine, occupied: number, days: number): ScaledLine {
  const share = occupancyShare(occupied, days);
  return {
    days,
    occupiedNights: occupied,
    gross: Math.round(line.gross * share),
    agency: Math.round(line.agency * share),
    early: Math.round(line.early * share),
    left: Math.round(line.left * share),
  };
}

export type OccupancyEstimateMonth = {
  month: number;
  days: number;
  units: Record<string, ScaledLine>;
  gross: number;
  agency: number;
  early: number;
  left: number;
  occupiedNights: number;
  possibleNights: number;
};

export type OccupancyEstimate = {
  months: OccupancyEstimateMonth[];
  units: Record<string, ScaledLine>;
  gross: number;
  agency: number;
  early: number;
  left: number;
  occupiedNights: number;
  possibleNights: number;
};

/** En odstotek za ves Lodge. Januar in februar ostaneta 0, ker sta zaprta. */
export function applyLodgeOccupancy(year: YearEarnings, percent: number): YearEarnings {
  const share = Math.min(100, Math.max(0, percent)) / 100;
  const scale = (amount: number) => Math.round(amount * share);
  const scaleLine = (line: EarnLine): EarnLine => ({
    ...line,
    gross: scale(line.gross),
    agency: scale(line.agency),
    early: scale(line.early),
    left: scale(line.left),
    nightlyGross: share === 1 ? line.nightlyGross : null,
    nightlyLeft: share === 1 ? line.nightlyLeft : null,
  });

  const months = year.months.map((month) => {
    const slices = month.slices.map((slice) => {
      const units: Record<string, EarnLine> = {};
      let gross = 0;
      let agency = 0;
      let early = 0;
      let left = 0;
      for (const [unitId, line] of Object.entries(slice.units)) {
        const scaled = scaleLine(line);
        units[unitId] = scaled;
        gross += scaled.gross;
        agency += scaled.agency;
        early += scaled.early;
        left += scaled.left;
      }
      return { ...slice, units, gross, agency, early, left };
    });
    if (slices.length === 0) {
      const units: Record<string, EarnLine> = {};
      for (const [unitId, line] of Object.entries(month.units)) units[unitId] = scaleLine(line);
      return { ...month, slices, units };
    }
    let gross = 0;
    let agency = 0;
    let early = 0;
    let left = 0;
    const summed: Record<string, EarnLine> = {};
    for (const unitId of Object.keys(month.units)) {
      summed[unitId] = slices.reduce(
        (total, slice) => ({
          ...total,
          nights: total.nights + slice.units[unitId].nights,
          gross: total.gross + slice.units[unitId].gross,
          agency: total.agency + slice.units[unitId].agency,
          early: total.early + slice.units[unitId].early,
          left: total.left + slice.units[unitId].left,
          missingNights: total.missingNights + slice.units[unitId].missingNights,
          nightlyGross: null,
          nightlyLeft: null,
        }),
        {
          nights: 0,
          gross: 0,
          agency: 0,
          early: 0,
          left: 0,
          missingNights: 0,
          nightlyGross: null,
          nightlyLeft: null,
        } satisfies EarnLine,
      );
      gross += summed[unitId].gross;
      agency += summed[unitId].agency;
      early += summed[unitId].early;
      left += summed[unitId].left;
    }
    return { ...month, slices, units: summed, gross, agency, early, left };
  });

  const units: Record<string, EarnLine> = {};
  for (const unitId of Object.keys(year.units)) {
    units[unitId] = months.reduce(
      (total, month) => ({
        ...total,
        nights: total.nights + month.units[unitId].nights,
        gross: total.gross + month.units[unitId].gross,
        agency: total.agency + month.units[unitId].agency,
        early: total.early + month.units[unitId].early,
        left: total.left + month.units[unitId].left,
        missingNights: total.missingNights + month.units[unitId].missingNights,
        nightlyGross: null,
        nightlyLeft: null,
      }),
      {
        nights: 0,
        gross: 0,
        agency: 0,
        early: 0,
        left: 0,
        missingNights: 0,
        nightlyGross: null,
        nightlyLeft: null,
      } satisfies EarnLine,
    );
  }
  return {
    ...year,
    months,
    units,
    gross: months.reduce((sum, month) => sum + month.gross, 0),
    agency: months.reduce((sum, month) => sum + month.agency, 0),
    early: months.reduce((sum, month) => sum + month.early, 0),
    left: months.reduce((sum, month) => sum + month.left, 0),
  };
}

/** Ocena 2027: ista mesečna zasedenost kot 2026, na cenah in popustih iz cenika. */
export function estimateAtLastYearOccupancy(full: YearEarnings): OccupancyEstimate {
  const months: OccupancyEstimateMonth[] = full.months.map((month) => {
    const recorded = OCCUPANCY_2026.find((row) => row.month === month.month);
    const days = recorded?.days ?? month.nights;
    const units: Record<string, ScaledLine> = {};
    let gross = 0;
    let agency = 0;
    let early = 0;
    let left = 0;
    let occupied = 0;
    for (const unitId of OCCUPANCY_UNITS) {
      const line = scaleMoney(month.units[unitId], recorded?.occupied[unitId] ?? 0, days);
      units[unitId] = line;
      gross += line.gross;
      agency += line.agency;
      early += line.early;
      left += line.left;
      occupied += line.occupiedNights;
    }
    return {
      month: month.month,
      days,
      units,
      gross,
      agency,
      early,
      left,
      occupiedNights: occupied,
      possibleNights: days * OCCUPANCY_UNITS.length,
    };
  });

  const units: Record<string, ScaledLine> = {};
  for (const unitId of OCCUPANCY_UNITS) {
    units[unitId] = months.reduce(
      (total, month) => ({
        days: total.days + month.units[unitId].days,
        occupiedNights: total.occupiedNights + month.units[unitId].occupiedNights,
        gross: total.gross + month.units[unitId].gross,
        agency: total.agency + month.units[unitId].agency,
        early: total.early + month.units[unitId].early,
        left: total.left + month.units[unitId].left,
      }),
      { days: 0, occupiedNights: 0, gross: 0, agency: 0, early: 0, left: 0 },
    );
  }
  return {
    months,
    units,
    gross: months.reduce((sum, month) => sum + month.gross, 0),
    agency: months.reduce((sum, month) => sum + month.agency, 0),
    early: months.reduce((sum, month) => sum + month.early, 0),
    left: months.reduce((sum, month) => sum + month.left, 0),
    occupiedNights: months.reduce((sum, month) => sum + month.occupiedNights, 0),
    possibleNights: months.reduce((sum, month) => sum + month.possibleNights, 0),
  };
}
