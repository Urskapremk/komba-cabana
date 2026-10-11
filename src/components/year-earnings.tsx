"use client";

import { useMemo, useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PERSON_RATE_CARDS,
  SEASON_LABEL,
  formatEuro,
  formatPercent,
  parseCommission,
  type PersonRates,
  type WebLift,
} from "@/lib/pricing";
import { applyLodgeOccupancy, lodgeOccupancy2026 } from "@/lib/occupancy";
import { EARNINGS_YEAR, MONTH_LABELS, yearEarnings, type EarnLine } from "@/lib/year-earnings";

const UNIT_SHORT: Record<string, string> = {
  "ocean-1": "I",
  "ocean-2": "II",
  "garden-3": "III",
  "beach-4": "Beach",
};

export function YearEarnings({
  rates,
  commission,
  earlyBooking,
  lodgeOccupancy,
  onLodgeOccupancy,
}: {
  rates: PersonRates;
  commission: WebLift;
  earlyBooking: WebLift;
  lodgeOccupancy: number;
  onLodgeOccupancy: (percent: number) => void;
}) {
  const year = useMemo(
    () => applyLodgeOccupancy(yearEarnings(EARNINGS_YEAR, rates, commission, earlyBooking), lodgeOccupancy),
    [rates, commission, earlyBooking, lodgeOccupancy],
  );
  const lastYear = lodgeOccupancy2026();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Januar in februar sta zaprta zaradi obnove. Od marca določiš, kako zaseden je Lodge. 100 % pomeni,
          da je vsak bungalov zaseden vsako odprto noč leta {EARNINGS_YEAR}. Pri vseh bungalovih velja cena
          WEB {EARNINGS_YEAR} za 2 osebi. 4 osebe so izjema in v zaslužek niso vštete. Ostane = polna cena − agencija −
          early booking. Oba odbitka sta od polne cene, z odstotki iz cenika.
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-[#efe6d4] px-4 py-3 ring-1 ring-[#e4d8c4]">
          <p className="text-sm text-[#3f3424]">
            <span className="font-medium">Zasedenost Lodge</span>
            <span className="ml-2">isti odstotek za vse bungalove</span>
          </p>
          <LodgePercent value={lodgeOccupancy} onApply={onLodgeOccupancy} />
          <button
            type="button"
            className="text-sm text-[#1e3a46] underline-offset-2 hover:underline"
            onClick={() => onLodgeOccupancy(lastYear)}
          >
            Lani {formatPercent(lastYear)}
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TotalCard
          label="Polna cena"
          value={year.gross}
          hint={`${year.nights} odprtih noči · Lodge ${formatPercent(lodgeOccupancy)}`}
        />
        <TotalCard label="Agencija" value={year.agency} hint="od polne cene" tone="plum" />
        <TotalCard label="Early booking" value={year.early} hint="od polne cene" tone="sea" />
        <TotalCard
          label={year.missingNights === 0 ? "Ostane" : "Ostane od vpisanih noči"}
          value={year.left}
          hint={
            year.missingNights === 0
              ? `pri zasedenosti Lodge ${formatPercent(lodgeOccupancy)}`
              : `manjka cena za ${year.missingNights} noči bungalovov`
          }
          emphasis
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PERSON_RATE_CARDS.map((card) => {
          const line = year.units[card.id];
          const agency = commission[card.id];
          const early = earlyBooking[card.id];
          return (
            <article key={card.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <h2 className="font-heading text-lg tracking-tight">{card.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                2 osebi · vsaka noč
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
          <h2 className="font-heading text-lg tracking-tight">Po mesecih · WEB {EARNINGS_YEAR}</h2>
          <p className="text-xs text-white/70">
            Znesek pri bungalovu je ostanek po obeh popustih, pri zasedenosti Lodge {formatPercent(lodgeOccupancy)}.
          </p>
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
                      2 osebi
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
              {year.months.map((month) =>
                month.closed ? (
                  <tr key={month.month} className="bg-[#f3efe8] text-muted-foreground">
                    <td className={cn(cell, "text-left")}>
                      <span className="font-medium text-foreground">{MONTH_LABELS[month.month - 1]}</span>
                      <span className="mt-0.5 block text-xs">zaprto, obnova</span>
                    </td>
                    <td className={cn(cell, "text-right tabular-nums")}>0</td>
                    {PERSON_RATE_CARDS.map((card) => (
                      <td key={card.id} className={cn(cell, "text-right")}>
                        —
                      </td>
                    ))}
                    <td className={cn(cell, "text-right")}>—</td>
                    <td className={cn(cell, "text-right")}>—</td>
                    <td className={cn(cell, "text-right")}>—</td>
                    <td className={cn(cell, "text-right")}>—</td>
                  </tr>
                ) : (
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
                    <td className={cn(cell, "text-right font-medium tabular-nums")}>{formatEuro(slice.left)}</td>
                  </tr>
                ))
                ),
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#1c1915] text-[#f6f1e7]">
                <td className={cn(cell, "border-[#3a342c] text-left font-medium")}>Leto {year.year}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums")}>{year.nights}</td>
                {PERSON_RATE_CARDS.map((card) => (
                  <td key={card.id} className={cn(cell, "border-[#3a342c] text-right font-medium tabular-nums")}>
                    {formatEuro(year.units[card.id].left)}
                  </td>
                ))}
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums")}>{formatEuro(year.gross)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums")}>{formatEuro(year.agency)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums")}>{formatEuro(year.early)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right font-medium tabular-nums")}>{formatEuro(year.left)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

function LodgePercent({ value, onApply }: { value: number; onApply: (percent: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft === null ? new Intl.NumberFormat("sl-SI", { maximumFractionDigits: 1 }).format(value) : draft;
  const parsed = parseCommission(shown);

  function apply() {
    if (parsed === null) return;
    onApply(parsed);
    setDraft(null);
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <Input
          aria-label="Zasedenost Lodge"
          size={3}
          inputMode="decimal"
          autoComplete="off"
          value={shown}
          onFocus={() => setDraft(new Intl.NumberFormat("sl-SI", { maximumFractionDigits: 1 }).format(value))}
          onBlur={() => {
            if (draft === null) return;
            if (parsed === null || parsed === value) {
              setDraft(null);
              return;
            }
            onApply(parsed);
            setDraft(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
          onChange={(event) => setDraft(event.target.value.replace(/[^\d,.-]/g, "").slice(0, 5))}
          className="h-8 w-14 rounded-md border-transparent bg-white px-1.5 pr-5 text-right text-sm tabular-nums shadow-none"
        />
        <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[11px] text-muted-foreground">
          %
        </span>
      </div>
      <Button type="button" size="sm" disabled={parsed === null} onMouseDown={(event) => event.preventDefault()} onClick={apply}>
        Uporabi
      </Button>
    </div>
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
  if (seasonId === "zima") return "bg-[#eef5fb]";
  if (seasonId === "pomlad-jesen") return "bg-[#f3f8ef]";
  return "bg-[#fdf6eb]";
}

const head = "border border-[#e4d8c4] px-2 py-2 font-medium";
const cell = "border border-[#e4d8c4] px-2 py-2 align-top";
