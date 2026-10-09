"use client";

import { useMemo, useState } from "react";
import { cn } from "cn";
import {
  PERSON_RATE_CARDS,
  SEASON_LABEL,
  formatEuro,
  formatPercent,
  type PersonRates,
  type WebLift,
} from "@/lib/pricing";
import { EARNINGS_YEAR, MONTH_LABELS, yearEarnings, type EarnLine, type YearEarnings } from "@/lib/year-earnings";

const UNIT_SHORT: Record<string, string> = {
  "ocean-1": "I",
  "ocean-2": "II",
  "garden-3": "III",
  "beach-4": "Beach",
};

export function YearEarnings({
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
  const current = useMemo(
    () => yearEarnings(EARNINGS_YEAR, web, commission, earlyBooking),
    [web, commission, earlyBooking],
  );
  const planned = useMemo(
    () => yearEarnings(EARNINGS_YEAR, next, commission, earlyBooking),
    [next, commission, earlyBooking],
  );
  const active = source === "web" ? current : planned;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Polna zasedenost pomeni, da je vsak bungalov zaseden vsako noč leta {EARNINGS_YEAR}. Cena je
          web cena za polno število oseb: 4 pri Bungalowu I in Beach Villi, 2 pri II in III. Ostane =
          polna cena − agencija − early booking. Oba odbitka sta od polne cene, z odstotki iz cenika.
          9.–13. 7. velja poletje. 1.–10. 1. in 19.–31. 12. sta praznična cena, 1.–18. 12. je zima.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <SourceCard
            title="Trenutni WEB"
            selected={source === "web"}
            year={current}
            onSelect={() => setSource("web")}
          />
          <SourceCard
            title="WEB 2027"
            selected={source === "2027"}
            year={planned}
            onSelect={() => setSource("2027")}
          />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TotalCard label="Polna cena" value={active.gross} hint={`${active.nights} noči × 4 bungalovi`} />
        <TotalCard label="Agencija" value={active.agency} hint="od polne cene" tone="plum" />
        <TotalCard label="Early booking" value={active.early} hint="od polne cene" tone="sea" />
        <TotalCard
          label={active.missingNights === 0 ? "Ostane" : "Ostane od vpisanih noči"}
          value={active.left}
          hint={
            active.missingNights === 0
              ? "to lahko zaslužiš"
              : `manjka cena za ${active.missingNights} noči bungalovov`
          }
          emphasis
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PERSON_RATE_CARDS.map((card) => {
          const line = active.units[card.id];
          const agency = commission[card.id];
          const early = earlyBooking[card.id];
          return (
            <article key={card.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <h2 className="font-heading text-lg tracking-tight">{card.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {card.capacity} {card.capacity < 3 ? "osebi" : "osebe"} · vsaka noč
              </p>
              <p className="mt-2 text-sm text-[#6b3058]">
                Agencija {agency == null ? "ni vpisana" : formatPercent(agency)}
              </p>
              <p className="text-sm text-[#1e3a46]">
                Early booking {early == null ? "ni vpisan" : formatPercent(early)}
              </p>
              <p className="mt-3 font-heading text-2xl tracking-tight tabular-nums">{formatEuro(line.left)}</p>
              <p className="text-xs text-muted-foreground">
                polna cena {formatEuro(line.gross)}
                {line.missingNights > 0 ? ` · manjka ${line.missingNights} noči` : ""}
              </p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
        <div className="bg-[#1c1915] px-4 py-3 text-[#f6f1e7]">
          <h2 className="font-heading text-lg tracking-tight">Po mesecih · {source === "web" ? "trenutni WEB" : "WEB 2027"}</h2>
          <p className="text-xs text-white/70">Znesek pri bungalovu je ostanek po obeh popustih.</p>
        </div>
        <div className="max-w-full overflow-x-auto bg-card">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <caption className="sr-only">
              Zaslužek po mesecih pri polni zasedenosti, leto {EARNINGS_YEAR}
            </caption>
            <thead>
              <tr className="text-xs tracking-wide text-[#5c5142] uppercase">
                <th className={cn(head, "bg-[#efe6d4] text-left")}>Mesec</th>
                <th className={cn(head, "bg-[#efe6d4] text-right")}>Noči</th>
                {PERSON_RATE_CARDS.map((card) => (
                  <th key={card.id} className={cn(head, "bg-[#e4eef2] text-right")} title={card.name}>
                    {UNIT_SHORT[card.id]}
                    <span className="mt-0.5 block text-[10px] font-normal tracking-normal normal-case">
                      {card.capacity} {card.capacity < 3 ? "osebi" : "osebe"}
                    </span>
                  </th>
                ))}
                <th className={cn(head, "text-right")}>Polna cena</th>
                <th className={cn(head, "text-right text-[#6b3058]")}>Agencija</th>
                <th className={cn(head, "text-right text-[#1e3a46]")}>Early booking</th>
                <th className={cn(head, "bg-[#f3e6c8] text-right")}>Ostane</th>
              </tr>
            </thead>
            <tbody>
              {active.months.map((month) =>
                month.slices.map((slice, index) => (
                  <tr key={`${month.month}-${slice.seasonId}`} className={sliceTone(slice.seasonId)}>
                    <td className={cn(cell, "text-left")}>
                      {index === 0 ? <span className="font-medium">{MONTH_LABELS[month.month - 1]}</span> : null}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {slice.fromDay}.–{slice.toDay}. {month.month}. · {SEASON_LABEL[slice.seasonId]}
                      </span>
                    </td>
                    <td className={cn(cell, "text-right tabular-nums")}>{slice.nights}</td>
                    {PERSON_RATE_CARDS.map((card) => (
                      <td key={card.id} className={cn(cell, "text-right")}>
                        <Money line={slice.units[card.id]} />
                      </td>
                    ))}
                    <td className={cn(cell, "text-right tabular-nums")}>{formatEuro(slice.gross)}</td>
                    <td className={cn(cell, "text-right tabular-nums text-[#6b3058]")}>{formatEuro(slice.agency)}</td>
                    <td className={cn(cell, "text-right tabular-nums text-[#1e3a46]")}>{formatEuro(slice.early)}</td>
                    <td className={cn(cell, "bg-[#fbf6ec] text-right font-medium tabular-nums")}>{formatEuro(slice.left)}</td>
                  </tr>
                )),
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#1c1915] text-[#f6f1e7]">
                <td className={cn(cell, "border-[#3a342c] text-left font-medium")}>Leto {active.year}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums")}>{active.nights}</td>
                {PERSON_RATE_CARDS.map((card) => (
                  <td key={card.id} className={cn(cell, "border-[#3a342c] text-right font-medium tabular-nums")}>
                    {formatEuro(active.units[card.id].left)}
                  </td>
                ))}
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums")}>{formatEuro(active.gross)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums")}>{formatEuro(active.agency)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums")}>{formatEuro(active.early)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right font-medium tabular-nums")}>{formatEuro(active.left)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

function SourceCard({
  title,
  year,
  selected,
  onSelect,
}: {
  title: string;
  year: YearEarnings;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "rounded-2xl px-4 py-4 text-left ring-1 transition-colors",
        selected ? "bg-[#1c1915] text-[#f6f1e7] ring-[#1c1915]" : "bg-card text-foreground ring-foreground/10 hover:bg-[#f8f1e4]",
      )}
    >
      <span className="text-xs font-medium tracking-[0.16em] uppercase">{title}</span>
      <span className="mt-2 block font-heading text-3xl tracking-tight tabular-nums">{formatEuro(year.left)}</span>
      <span className={cn("mt-1 block text-xs", selected ? "text-white/70" : "text-muted-foreground")}>
        {year.missingNights === 0
          ? `ostane pri polni zasedenosti · polna cena ${formatEuro(year.gross)}`
          : `samo vpisane noči · manjka cena za ${year.missingNights} noči bungalovov`}
      </span>
    </button>
  );
}

function TotalCard({
  label,
  value,
  hint,
  tone,
  emphasis,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "plum" | "sea";
  emphasis?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl px-4 py-3 ring-1",
        emphasis ? "bg-[#f3e6c8] ring-[#e4d8c4]" : "bg-card ring-foreground/10",
      )}
    >
      <p
        className={cn(
          "text-xs font-medium tracking-[0.14em] uppercase",
          tone === "plum" && "text-[#6b3058]",
          tone === "sea" && "text-[#1e3a46]",
        )}
      >
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl tracking-tight tabular-nums">{formatEuro(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </article>
  );
}

function Money({ line }: { line: EarnLine }) {
  if (line.missingNights > 0) {
    return <span className="text-xs text-[#8a3b28]">ni cene</span>;
  }
  return (
    <span className="tabular-nums">
      {formatEuro(line.left)}
      {line.nightlyLeft != null ? (
        <span className="mt-0.5 block text-xs text-muted-foreground">{formatEuro(line.nightlyLeft)} / noč</span>
      ) : null}
    </span>
  );
}

function sliceTone(seasonId: string): string {
  if (seasonId === "zima") return "bg-[#f3f7f9]";
  if (seasonId === "pomlad-jesen") return "bg-[#faf6ee]";
  return "bg-[#fbf6ec]";
}

const head = "border border-[#e4d8c4] px-2 py-2 font-medium";
const cell = "border border-[#e4d8c4] px-2 py-2 align-top";
