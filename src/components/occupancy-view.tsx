"use client";

import { useMemo, useState } from "react";
import { cn } from "cn";
import {
  OCCUPANCY_2026,
  OCCUPANCY_EXCLUDED,
  OCCUPANCY_INCLUDED,
  OCCUPANCY_UNITS,
  OCCUPANCY_WITH_UNIT,
  OCCUPANCY_WITHOUT_UNIT,
  OCCUPANCY_YEAR,
  type OccupancyUnitId,
} from "@/data/occupancy-2026";
import { estimateAtLastYearOccupancy, occupancyShare } from "@/lib/occupancy";
import { formatEuro, formatPercent, type PersonRates, type WebLift, personRateCard } from "@/lib/pricing";
import { EARNINGS_YEAR, MONTH_LABELS, yearEarnings } from "@/lib/year-earnings";

const SHORT: Record<OccupancyUnitId, string> = {
  "ocean-1": "I",
  "ocean-2": "II",
  "garden-3": "III",
  "beach-4": "Beach",
};

export function OccupancyView({
  web,
  next,
  commission,
  earlyBooking,
}: {
  web: PersonRates;
  next: PersonRates;
  commission: WebLift;
  earlyBooking: WebLift;
}) {
  const [source, setSource] = useState<"web" | "2027">("web");
  const rates = source === "web" ? web : next;
  const full = useMemo(
    () => yearEarnings(EARNINGS_YEAR, rates, commission, earlyBooking),
    [rates, commission, earlyBooking],
  );
  const estimate = useMemo(() => estimateAtLastYearOccupancy(full), [full]);
  const yearDays = OCCUPANCY_2026.reduce((sum, month) => sum + month.days, 0);
  const yearOccupied = OCCUPANCY_UNITS.reduce(
    (sum, unitId) => sum + OCCUPANCY_2026.reduce((inner, month) => inner + month.occupied[unitId], 0),
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Iz rezervacij {OCCUPANCY_YEAR}: {OCCUPANCY_INCLUDED.confirmed} potrjenih, {OCCUPANCY_INCLUDED.paid} plačanih
        in {OCCUPANCY_INCLUDED.paidFirstPart} delno plačanih. Preklicane ({OCCUPANCY_EXCLUDED.canceled}) in brez
        odgovora ({OCCUPANCY_EXCLUDED.noResponse}) niso vštete. Noč šteje kot zasedena, tudi če je isti bungalov v
        izpisu naveden večkrat. {OCCUPANCY_WITHOUT_UNIT.reservations} rezervacij nima bungalova (
        {OCCUPANCY_WITHOUT_UNIT.nights} noči) in niso v odstotku. V odstotek gre {OCCUPANCY_WITH_UNIT} rezervacij z
        bungalovom.
      </p>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {OCCUPANCY_UNITS.map((unitId) => {
          const occupied = OCCUPANCY_2026.reduce((sum, month) => sum + month.occupied[unitId], 0);
          const card = personRateCard(unitId);
          return (
            <article key={unitId} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <h2 className="font-heading text-lg tracking-tight">{card?.name}</h2>
              <p className="mt-2 font-heading text-3xl tracking-tight tabular-nums">{shareText(occupied, yearDays)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {occupied} od {yearDays} noči
              </p>
              <ShareBar occupied={occupied} days={yearDays} />
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
        <div className="bg-[#1c1915] px-4 py-3 text-[#f6f1e7]">
          <h2 className="font-heading text-lg tracking-tight">Zasedenost {OCCUPANCY_YEAR} po mesecih</h2>
          <p className="text-xs text-white/70">
            Delež zasedenih noči enega bungalova. Skupaj je {yearOccupied} od {yearDays * OCCUPANCY_UNITS.length}{" "}
            bungalov-noči, {shareText(yearOccupied, yearDays * OCCUPANCY_UNITS.length)}.
          </p>
        </div>
        <div className="max-w-full overflow-x-auto bg-card">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">Dejanska zasedenost po mesecih, leto {OCCUPANCY_YEAR}</caption>
            <thead>
              <tr className="text-xs tracking-wide text-[#5c5142] uppercase">
                <th className={cn(head, "bg-[#efe6d4] text-left")}>Mesec</th>
                {OCCUPANCY_UNITS.map((unitId) => (
                  <th key={unitId} className={cn(head, "bg-[#e4eef2] text-right")}>
                    {SHORT[unitId]}
                  </th>
                ))}
                <th className={cn(head, "bg-[#f3e6c8] text-right")}>Skupaj</th>
              </tr>
            </thead>
            <tbody>
              {OCCUPANCY_2026.map((month) => {
                const occupied = OCCUPANCY_UNITS.reduce((sum, unitId) => sum + month.occupied[unitId], 0);
                const possible = month.days * OCCUPANCY_UNITS.length;
                return (
                  <tr key={month.month}>
                    <td className={cn(cell, "text-left")}>
                      <span className="font-medium">{MONTH_LABELS[month.month - 1]}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{month.days} noči</span>
                    </td>
                    {OCCUPANCY_UNITS.map((unitId) => (
                      <td key={unitId} className={cn(cell, "text-right")}>
                        <NightShare occupied={month.occupied[unitId]} days={month.days} />
                      </td>
                    ))}
                    <td className={cn(cell, "bg-[#fbf6ec] text-right")}>
                      <NightShare occupied={occupied} days={possible} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#1c1915] text-[#f6f1e7]">
                <td className={cn(cell, "border-[#3a342c] text-left font-medium")}>Leto {OCCUPANCY_YEAR}</td>
                {OCCUPANCY_UNITS.map((unitId) => {
                  const occupied = OCCUPANCY_2026.reduce((sum, month) => sum + month.occupied[unitId], 0);
                  return (
                    <td key={unitId} className={cn(cell, "border-[#3a342c] text-right")}>
                      <span className="font-medium tabular-nums">{shareText(occupied, yearDays)}</span>
                      <span className="mt-0.5 block text-xs text-white/70">
                        {occupied} / {yearDays}
                      </span>
                    </td>
                  );
                })}
                <td className={cn(cell, "border-[#3a342c] text-right")}>
                  <span className="font-medium tabular-nums">
                    {shareText(yearOccupied, yearDays * OCCUPANCY_UNITS.length)}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/70">
                    {yearOccupied} / {yearDays * OCCUPANCY_UNITS.length}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-heading text-2xl tracking-tight">Ocena {EARNINGS_YEAR}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Če se odprte noči {EARNINGS_YEAR} napolnijo v enakem deležu kot {OCCUPANCY_YEAR}. Cena je web cena za 2
            osebi, popusti so tisti iz cenika. Januar in februar ostaneta zaprta.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SourceButton
            title="Trenutni WEB"
            selected={source === "web"}
            onSelect={() => setSource("web")}
            rates={web}
            commission={commission}
            earlyBooking={earlyBooking}
          />
          <SourceButton
            title="WEB 2027"
            selected={source === "2027"}
            onSelect={() => setSource("2027")}
            rates={next}
            commission={commission}
            earlyBooking={earlyBooking}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl bg-[#f3e6c8] px-4 py-3 ring-1 ring-[#e4d8c4]">
            <p className="text-xs font-medium tracking-[0.14em] uppercase">Ostane po lanskem deležu</p>
            <p className="mt-2 font-heading text-3xl tracking-tight tabular-nums">{formatEuro(estimate.left)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              polna cena {formatEuro(estimate.gross)} · agencija {formatEuro(estimate.agency)} · early booking{" "}
              {formatEuro(estimate.early)}
            </p>
          </article>
          <article className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <p className="text-xs font-medium tracking-[0.14em] uppercase">Če bi bilo polno od marca</p>
            <p className="mt-2 font-heading text-3xl tracking-tight tabular-nums">{formatEuro(full.left)}</p>
            <p className="mt-1 text-xs text-muted-foreground">ista cena in ista popusta, vsaka odprta noč zasedena</p>
          </article>
        </div>
        <div className="max-w-full overflow-x-auto rounded-2xl bg-card ring-1 ring-foreground/10">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="text-xs tracking-wide text-[#5c5142] uppercase">
                <th className={cn(head, "bg-[#efe6d4] text-left")}>Mesec</th>
                {OCCUPANCY_UNITS.map((unitId) => (
                  <th key={unitId} className={cn(head, "text-right")}>
                    {SHORT[unitId]}
                  </th>
                ))}
                <th className={cn(head, "bg-[#f3e6c8] text-right")}>Ostane</th>
              </tr>
            </thead>
            <tbody>
              {estimate.months.map((month) => (
                <tr key={month.month}>
                  <td className={cn(cell, "text-left font-medium")}>{MONTH_LABELS[month.month - 1]}</td>
                  {OCCUPANCY_UNITS.map((unitId) => (
                    <td key={unitId} className={cn(cell, "text-right tabular-nums")}>
                      {month.month <= 2 ? (
                        <span className="text-xs text-muted-foreground">zaprto</span>
                      ) : (
                        formatEuro(month.units[unitId].left)
                      )}
                    </td>
                  ))}
                  <td className={cn(cell, "bg-[#fbf6ec] text-right font-medium tabular-nums")}>
                    {month.month <= 2 ? "—" : formatEuro(month.left)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#1c1915] text-[#f6f1e7]">
                <td className={cn(cell, "border-[#3a342c] text-left font-medium")}>Leto {EARNINGS_YEAR}</td>
                {OCCUPANCY_UNITS.map((unitId) => (
                  <td key={unitId} className={cn(cell, "border-[#3a342c] text-right font-medium tabular-nums")}>
                    {formatEuro(estimate.units[unitId].left)}
                  </td>
                ))}
                <td className={cn(cell, "border-[#3a342c] text-right font-medium tabular-nums")}>
                  {formatEuro(estimate.left)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

function SourceButton({
  title,
  selected,
  onSelect,
  rates,
  commission,
  earlyBooking,
}: {
  title: string;
  selected: boolean;
  onSelect: () => void;
  rates: PersonRates;
  commission: WebLift;
  earlyBooking: WebLift;
}) {
  const estimate = estimateAtLastYearOccupancy(yearEarnings(EARNINGS_YEAR, rates, commission, earlyBooking));
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "rounded-2xl px-4 py-4 text-left ring-1",
        selected ? "bg-[#1c1915] text-[#f6f1e7] ring-[#1c1915]" : "bg-card ring-foreground/10 hover:bg-[#f8f1e4]",
      )}
    >
      <span className="text-xs font-medium tracking-[0.16em] uppercase">{title}</span>
      <span className="mt-2 block font-heading text-3xl tracking-tight tabular-nums">{formatEuro(estimate.left)}</span>
      <span className={cn("mt-1 block text-xs", selected ? "text-white/70" : "text-muted-foreground")}>
        ocena po zasedenosti {OCCUPANCY_YEAR}
      </span>
    </button>
  );
}

function NightShare({ occupied, days }: { occupied: number; days: number }) {
  return (
    <span>
      <span className="tabular-nums">{shareText(occupied, days)}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">
        {occupied} / {days}
      </span>
      <ShareBar occupied={occupied} days={days} />
    </span>
  );
}

function ShareBar({ occupied, days }: { occupied: number; days: number }) {
  const width = Math.min(100, occupancyShare(occupied, days) * 100);
  return (
    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#efe6d4]">
      <span className="block h-full rounded-full bg-[#1e3a46]" style={{ width: `${width}%` }} />
    </span>
  );
}

function shareText(occupied: number, days: number): string {
  return formatPercent(occupancyShare(occupied, days) * 100);
}

const head = "border border-[#e4d8c4] px-2 py-2 font-medium";
const cell = "border border-[#e4d8c4] px-2 py-2 align-top";
