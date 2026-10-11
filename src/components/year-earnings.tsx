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
import {
  EARNINGS_YEAR,
  FOOD_COST_PERCENT,
  HALF_BOARD_PRICE,
  MONTH_LABELS,
  MONTHLY_SALARY,
  MONTHLY_TRANSPORT_PROFIT,
  MONTHLY_TRIP_PROFIT,
  halfBoard,
  monthPlanResult,
  planResult,
  pricedBungalowNights,
  salaryCost,
  yearEarnings,
  type EarnLine,
  type HalfBoard,
} from "@/lib/year-earnings";

const UNIT_SHORT: Record<string, string> = {
  "ocean-1": "I",
  "ocean-2": "II",
  "garden-3": "III",
  "beach-4": "Beach",
};

const INCOME = "text-[#1b4332]";
const COST = "text-[#7a1f33]";
const INCOME_ON_DARK = "text-[#d7efe2]";
const COST_ON_DARK = "text-[#f6c9d2]";

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
  const openMonths = year.months.filter((month) => !month.closed).length;
  const salaries = salaryCost(year.months.length);
  const trips = MONTHLY_TRIP_PROFIT * openMonths;
  const transport = MONTHLY_TRANSPORT_PROFIT * openMonths;
  const boards = useMemo(() => {
    const slices: Record<string, HalfBoard> = {};
    let revenue = 0;
    let food = 0;
    let left = 0;
    for (const month of year.months) {
      for (const slice of month.slices) {
        const board = halfBoard(pricedBungalowNights(slice.units), lodgeOccupancy);
        slices[`${month.month}-${slice.seasonId}`] = board;
        revenue += board.revenue;
        food += board.food;
        left += board.left;
      }
    }
    return { slices, revenue, food, left };
  }, [year, lodgeOccupancy]);
  const together = planResult(year.left, year.months.length, openMonths) + boards.left;
  const lastYear = lodgeOccupancy2026();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Januar in februar sta zaprta zaradi obnove. Od marca določiš, kako zaseden je Lodge. 100 % pomeni,
          da je vsak bungalov zaseden vsako odprto noč leta {EARNINGS_YEAR}. Pri vseh bungalovih velja cena
          WEB {EARNINGS_YEAR} za 2 osebi. 4 osebe so izjema in v zaslužek niso vštete. Ostane = polna cena − agencija −
          early booking. Oba odbitka sta od polne cene, z odstotki iz cenika. Plače so {formatEuro(MONTHLY_SALARY)} na
          mesec, vseh 12 mesecev, tudi januarja in februarja. Zasedenost jih ne zniža. Izleti prinesejo povprečno{" "}
          {formatEuro(MONTHLY_TRIP_PROFIT)} dobička na mesec, transport {formatEuro(MONTHLY_TRANSPORT_PROFIT)}. Oboje
          šteje od marca do decembra. Večina gostov vzame polpenzion, prodajna cena je {formatEuro(HALF_BOARD_PRICE)} na
          osebo na noč. Napoved šteje oba gosta na vsaki zasedeni noči. Strošek hrane je {FOOD_COST_PERCENT} % te cene.
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

      <section className="flex flex-col gap-6">
        <div>
          <h2 className={cn("text-xs font-medium tracking-[0.16em] uppercase", INCOME)}>Prihodki</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TotalCard
              label="Polna cena"
              value={year.gross}
              hint={`${year.nights} odprtih noči · Lodge ${formatPercent(lodgeOccupancy)}`}
              tone="income"
            />
            <TotalCard
              label="Izleti"
              value={trips}
              hint={`${formatEuro(MONTHLY_TRIP_PROFIT)} dobička · ${openMonths} mesecev`}
              tone="income"
            />
            <TotalCard
              label="Transport"
              value={transport}
              hint={`${formatEuro(MONTHLY_TRANSPORT_PROFIT)} dobička · ${openMonths} mesecev`}
              tone="income"
            />
            <TotalCard
              label="Polpenzion"
              value={boards.revenue}
              hint={`${formatEuro(HALF_BOARD_PRICE)} na osebo · 2 gosta na noč`}
              tone="income"
            />
            <TotalCard
              label={year.missingNights === 0 ? "Ostane od nočitev" : "Ostane od vpisanih noči"}
              value={year.left}
              hint={
                year.missingNights === 0
                  ? `po agenciji in early bookingu · Lodge ${formatPercent(lodgeOccupancy)}`
                  : `manjka cena za ${year.missingNights} noči bungalovov`
              }
              tone="income"
            />
          </div>
        </div>
        <div>
          <h2 className={cn("text-xs font-medium tracking-[0.16em] uppercase", COST)}>Stroški</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TotalCard label="Agencija" value={year.agency} hint="od polne cene" tone="cost" />
            <TotalCard label="Early booking" value={year.early} hint="od polne cene" tone="cost" />
            <TotalCard
              label="Plače"
              value={salaries}
              hint={`${formatEuro(MONTHLY_SALARY)} na mesec · 12 mesecev`}
              tone="cost"
            />
            <TotalCard
              label="Hrana"
              value={boards.food}
              hint={`${FOOD_COST_PERCENT} % prodajne cene polpenziona`}
              tone="cost"
            />
          </div>
        </div>
        <div className="max-w-sm">
          <TotalCard
            label="Skupaj"
            value={together}
            hint="ostane − plače − hrana + izleti + transport + polpenzion"
            tone={together < 0 ? "cost" : "income"}
            emphasis
          />
        </div>
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
              <p className={cn("mt-2 text-sm", COST)}>
                Agencija {agency == null ? "ni vpisana" : formatPercent(agency)}
              </p>
              <p className={cn("text-sm", COST)}>
                Early booking {early == null ? "ni vpisan" : formatPercent(early)}
              </p>
              <p className={cn("mt-3 font-heading text-2xl tracking-tight tabular-nums", INCOME)}>{formatEuro(line.left)}</p>
              <p className={cn("text-xs", INCOME)}>
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
            Plače so {formatEuro(MONTHLY_SALARY)} na mesec. Izleti {formatEuro(MONTHLY_TRIP_PROFIT)} in transport{" "}
            {formatEuro(MONTHLY_TRANSPORT_PROFIT)} sta dobiček od marca. Polpenzion je {formatEuro(HALF_BOARD_PRICE)} na
            osebo, hrana {FOOD_COST_PERCENT} %.
          </p>
        </div>
        <div className="max-w-full overflow-x-auto bg-card">
          <table className="w-full min-w-[1480px] border-collapse text-sm">
            <caption className="sr-only">
              Zaslužek po mesecih pri polni zasedenosti, leto {EARNINGS_YEAR}
            </caption>
            <thead>
              <tr className="text-xs tracking-wide text-[#5c5142] uppercase">
                <th className={cn(head, "bg-[#efe6d4] text-left")}>Mesec</th>
                <th className={cn(head, "bg-[#efe6d4] text-right")}>Noči</th>
                {PERSON_RATE_CARDS.map((card) => (
                  <th key={card.id} className={cn(head, "bg-[#e7f2ea] text-right", INCOME)} title={card.name}>
                    {UNIT_SHORT[card.id]}
                    <span className="mt-0.5 block text-[10px] font-normal tracking-normal normal-case">
                      2 osebi
                    </span>
                  </th>
                ))}
                <th className={cn(head, "bg-[#e7f2ea] text-right", INCOME)}>Polna cena</th>
                <th className={cn(head, "bg-[#e7f2ea] text-right", INCOME)}>Izleti</th>
                <th className={cn(head, "bg-[#e7f2ea] text-right", INCOME)}>Transport</th>
                <th className={cn(head, "bg-[#e7f2ea] text-right", INCOME)}>Polpenzion</th>
                <th className={cn(head, "bg-[#f8e4e8] text-right", COST)}>Agencija</th>
                <th className={cn(head, "bg-[#f8e4e8] text-right", COST)}>Early booking</th>
                <th className={cn(head, "bg-[#f8e4e8] text-right", COST)}>Plače</th>
                <th className={cn(head, "bg-[#f8e4e8] text-right", COST)}>Hrana</th>
                <th className={cn(head, "bg-[#e7f2ea] text-right", INCOME)}>Ostane</th>
                <th className={cn(head, "bg-[#f3e6c8] text-right")}>Skupaj</th>
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
                    <td className={cn(cell, "text-right tabular-nums", INCOME)}>{formatEuro(0)}</td>
                    <td className={cn(cell, "text-right tabular-nums", INCOME)}>{formatEuro(0)}</td>
                    <td className={cn(cell, "text-right tabular-nums", INCOME)}>{formatEuro(0)}</td>
                    <td className={cn(cell, "text-right")}>—</td>
                    <td className={cn(cell, "text-right")}>—</td>
                    <td className={cn(cell, "text-right tabular-nums", COST)}>{formatEuro(MONTHLY_SALARY)}</td>
                    <td className={cn(cell, "text-right tabular-nums", COST)}>{formatEuro(0)}</td>
                    <td className={cn(cell, "text-right")}>—</td>
                    <td className={cn(cell, "text-right font-medium tabular-nums", COST)}>{formatEuro(monthPlanResult(0, true))}</td>
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
                    <td className={cn(cell, "text-right tabular-nums", INCOME)}>{formatEuro(slice.gross)}</td>
                    <td className={cn(cell, "text-right tabular-nums", INCOME)}>
                      {index === 0 ? formatEuro(MONTHLY_TRIP_PROFIT) : "—"}
                    </td>
                    <td className={cn(cell, "text-right tabular-nums", INCOME)}>
                      {index === 0 ? formatEuro(MONTHLY_TRANSPORT_PROFIT) : "—"}
                    </td>
                    <td className={cn(cell, "text-right tabular-nums", INCOME)}>
                      {formatEuro(boards.slices[`${month.month}-${slice.seasonId}`]?.revenue ?? 0)}
                    </td>
                    <td className={cn(cell, "text-right tabular-nums", COST)}>{formatEuro(slice.agency)}</td>
                    <td className={cn(cell, "text-right tabular-nums", COST)}>{formatEuro(slice.early)}</td>
                    <td className={cn(cell, "text-right tabular-nums", COST)}>
                      {index === 0 ? formatEuro(MONTHLY_SALARY) : "—"}
                    </td>
                    <td className={cn(cell, "text-right tabular-nums", COST)}>
                      {formatEuro(boards.slices[`${month.month}-${slice.seasonId}`]?.food ?? 0)}
                    </td>
                    <td className={cn(cell, "text-right font-medium tabular-nums", INCOME)}>{formatEuro(slice.left)}</td>
                    <td
                      className={cn(
                        cell,
                        "text-right font-medium tabular-nums",
                        resultTone(
                          (index === 0 ? monthPlanResult(slice.left, false) : slice.left) +
                            (boards.slices[`${month.month}-${slice.seasonId}`]?.left ?? 0),
                        ),
                      )}
                    >
                      {formatEuro(
                        (index === 0 ? monthPlanResult(slice.left, false) : slice.left) +
                          (boards.slices[`${month.month}-${slice.seasonId}`]?.left ?? 0),
                      )}
                    </td>
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
                  <td key={card.id} className={cn(cell, "border-[#3a342c] text-right font-medium tabular-nums", INCOME_ON_DARK)}>
                    {formatEuro(year.units[card.id].left)}
                  </td>
                ))}
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums", INCOME_ON_DARK)}>{formatEuro(year.gross)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums", INCOME_ON_DARK)}>{formatEuro(trips)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums", INCOME_ON_DARK)}>{formatEuro(transport)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums", INCOME_ON_DARK)}>{formatEuro(boards.revenue)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums", COST_ON_DARK)}>{formatEuro(year.agency)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums", COST_ON_DARK)}>{formatEuro(year.early)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums", COST_ON_DARK)}>{formatEuro(salaries)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right tabular-nums", COST_ON_DARK)}>{formatEuro(boards.food)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right font-medium tabular-nums", INCOME_ON_DARK)}>{formatEuro(year.left)}</td>
                <td className={cn(cell, "border-[#3a342c] text-right font-medium tabular-nums", resultTone(together, true))}>
                  {formatEuro(together)}
                </td>
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
  tone?: "income" | "cost";
  emphasis?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl px-4 py-3 ring-1",
        emphasis ? "bg-[#f3e6c8] ring-[#e4d8c4]" : "bg-card ring-foreground/10",
        tone === "income" && INCOME,
        tone === "cost" && COST,
      )}
    >
      <p className="text-xs font-medium tracking-[0.14em] uppercase">{label}</p>
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
    <span className={cn("tabular-nums", INCOME)}>
      {formatEuro(line.left)}
      {line.nightlyLeft != null ? (
        <span className="mt-0.5 block text-xs text-muted-foreground">{formatEuro(line.nightlyLeft)} / noč</span>
      ) : null}
    </span>
  );
}

function resultTone(amount: number, onDark = false): string {
  if (amount < 0) return onDark ? COST_ON_DARK : COST;
  return onDark ? INCOME_ON_DARK : INCOME;
}

function sliceTone(seasonId: string): string {
  if (seasonId === "zima") return "bg-[#eef5fb]";
  if (seasonId === "pomlad-jesen") return "bg-[#f3f8ef]";
  return "bg-[#fdf6eb]";
}

const head = "border border-[#e4d8c4] px-2 py-2 font-medium";
const cell = "border border-[#e4d8c4] px-2 py-2 align-top";
