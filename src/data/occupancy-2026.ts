/** Zasedene noči 2026 iz Bentral izpisa. Samo Confirmed, Paid in Paid (1st part). Preklicane niso vštete. Noč šteje enkrat, tudi če je bungalov v isti rezervaciji naveden večkrat. */
export const OCCUPANCY_YEAR = 2026;

export const OCCUPANCY_UNITS = ["ocean-1", "ocean-2", "garden-3", "beach-4"] as const;

export type OccupancyUnitId = (typeof OCCUPANCY_UNITS)[number];

export type OccupancyMonth = {
  month: number;
  days: number;
  occupied: Record<OccupancyUnitId, number>;
};

export const OCCUPANCY_INCLUDED = {
  confirmed: 96,
  paid: 18,
  paidFirstPart: 25,
} as const;

export const OCCUPANCY_EXCLUDED = {
  canceled: 146,
  noResponse: 29,
  notAvailable: 1,
  blank: 2,
} as const;

/** Potrjene ali plačane rezervacije brez bungalova. Niso v odstotku. */
export const OCCUPANCY_WITHOUT_UNIT = {
  reservations: 50,
  nights: 53,
} as const;

export const OCCUPANCY_WITH_UNIT = 89;

export const OCCUPANCY_2026: OccupancyMonth[] = [
  { month: 1, days: 31, occupied: { "ocean-1": 0, "ocean-2": 0, "garden-3": 0, "beach-4": 0 } },
  { month: 2, days: 28, occupied: { "ocean-1": 0, "ocean-2": 0, "garden-3": 0, "beach-4": 0 } },
  { month: 3, days: 31, occupied: { "ocean-1": 7, "ocean-2": 4, "garden-3": 3, "beach-4": 7 } },
  { month: 4, days: 30, occupied: { "ocean-1": 14, "ocean-2": 19, "garden-3": 6, "beach-4": 10 } },
  { month: 5, days: 31, occupied: { "ocean-1": 10, "ocean-2": 15, "garden-3": 5, "beach-4": 4 } },
  { month: 6, days: 30, occupied: { "ocean-1": 0, "ocean-2": 9, "garden-3": 3, "beach-4": 6 } },
  { month: 7, days: 31, occupied: { "ocean-1": 12, "ocean-2": 11, "garden-3": 3, "beach-4": 9 } },
  { month: 8, days: 31, occupied: { "ocean-1": 15, "ocean-2": 21, "garden-3": 20, "beach-4": 17 } },
  { month: 9, days: 30, occupied: { "ocean-1": 1, "ocean-2": 13, "garden-3": 13, "beach-4": 2 } },
  { month: 10, days: 31, occupied: { "ocean-1": 13, "ocean-2": 18, "garden-3": 26, "beach-4": 6 } },
  { month: 11, days: 30, occupied: { "ocean-1": 11, "ocean-2": 9, "garden-3": 9, "beach-4": 2 } },
  { month: 12, days: 31, occupied: { "ocean-1": 6, "ocean-2": 21, "garden-3": 6, "beach-4": 8 } },
];
