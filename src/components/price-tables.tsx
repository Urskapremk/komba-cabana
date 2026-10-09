"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";
import {
  BUNGALOWS,
  COMPARE_PERIODS,
  COMPARE_UNITS,
  GAP_FILL_2026,
  OPTIMA_PRICES,
  PERIODS,
  RATES_2026,
  SEASON_LABEL,
  type Money,
  clonePrices,
  datesDiffer,
  floor2026,
  formatDate,
  formatEuro,
  formatPercent,
  priceDelta,
  sameMoney,
  sanitizePrices,
  spread,
} from "@/lib/pricing";

const STORAGE_KEY = "komba-cabana-cenik-v1";

type Prices = Record<string, Record<string, Money>>;

const SEASON_SOFT: Record<string, string> = {
  zima: "bg-[#f3f7f9]",
  "pomlad-jesen": "bg-[#faf6ee]",
  "poletje-december": "bg-[#fbf6ec]",
};

function subscribeStore(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStore(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function parsePrices(raw: string | null): Prices | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { prices?: unknown };
    const source = parsed && typeof parsed === "object" && "prices" in parsed ? parsed.prices : parsed;
    return sanitizePrices(source);
  } catch {
    return null;
  }
}

function EuroInput({
  value,
  onChange,
  label,
  pending,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  label: string;
  pending?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft === null ? (value === null ? "" : String(value)) : draft;

  return (
    <div className="relative">
      <Input
        aria-label={label}
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder="—"
        onFocus={() => setDraft(value === null ? "" : String(value))}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          const raw = event.target.value.replace(/\D/g, "").slice(0, 6);
          setDraft(raw);
          onChange(raw === "" ? null : Number(raw));
        }}
        className={cn(
          "h-8 rounded-md border-transparent bg-white pr-6 text-right text-sm tabular-nums shadow-none",
          pending && "border-dashed border-input",
        )}
      />
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[11px] text-muted-foreground">
        €
      </span>
    </div>
  );
}

function Delta({ base, next }: { base: number | null; next: number | null }) {
  const delta = priceDelta(base, next);
  if (!delta) return <span className="text-muted-foreground">—</span>;
  const tone = delta.euros > 0 ? "text-[#1d6b45]" : delta.euros < 0 ? "text-[#8a3b28]" : "text-muted-foreground";
  const sign = delta.euros > 0 ? "+" : "";
  return (
    <span className={cn("whitespace-nowrap tabular-nums", tone)}>
      {sign}
      {formatEuro(delta.euros)}
      <span className="ml-1 text-xs">
        {sign}
        {formatPercent(delta.percent)}
      </span>
    </span>
  );
}

function shiftSentence(unitId: string, prices: Prices): string {
  const rows = COMPARE_PERIODS.map((period) => {
    const base = RATES_2026[unitId][period.id];
    const next = prices[unitId][period.id];
    return {
      min: priceDelta(base.min, next.min),
      max: priceDelta(base.max, next.max),
    };
  }).filter((row) => row.min && row.max);
  if (rows.length === 0) return "Predlog 2027 še nima obeh cen.";
  const minUp = rows.filter((row) => row.min!.euros > 0).length;
  const minDown = rows.filter((row) => row.min!.euros < 0).length;
  const maxUp = rows.filter((row) => row.max!.euros > 0).length;
  const maxDown = rows.filter((row) => row.max!.euros < 0).length;
  const minText =
    minUp === rows.length
      ? "Vsi minimumi so višji kot 2026."
      : minDown === rows.length
        ? "Vsi minimumi so nižji kot 2026."
        : `Minimumi: ${minUp} višjih, ${minDown} nižjih.`;
  const maxText =
    maxUp === rows.length
      ? "Vsi maksimumi so višji."
      : maxDown === rows.length
        ? "Vsi maksimumi so nižji."
        : `Maksimumi: ${maxUp} višjih, ${maxDown} nižjih.`;
  return `${minText} ${maxText}`;
}

export function PriceTables() {
  const storedRaw = useSyncExternalStore(subscribeStore, readStore, () => null);
  const stored = useMemo(() => parsePrices(storedRaw), [storedRaw]);
  const [draft, setDraft] = useState<Prices | null>(null);
  const prices = draft ?? stored ?? clonePrices();

  function commit(next: Prices) {
    setDraft(next);
    const previous = parsePrices(localStorage.getItem(STORAGE_KEY));
    const payload = previous ? { ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"), prices: next } : { prices: next };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function setPrice(unitId: string, periodId: string, next: Money) {
    commit({
      ...prices,
      [unitId]: { ...prices[unitId], [periodId]: next },
    });
  }

  function resetUnit(unitId: string) {
    commit({
      ...prices,
      [unitId]: Object.fromEntries(PERIODS.map((period) => [period.id, { ...OPTIMA_PRICES[unitId][period.id] }])),
    });
  }

  const dirty = BUNGALOWS.some((bungalow) =>
    PERIODS.some((period) => !sameMoney(prices[bungalow.id][period.id], OPTIMA_PRICES[bungalow.id][period.id])),
  );

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-border/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">Komba Cabana</p>
              <h1 className="font-heading mt-2 text-4xl tracking-tight md:text-5xl">Kalkulacije cen</h1>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Izhodišče 2026
              <br />
              Predlog Optima Plus 2027
            </p>
          </div>
          <p className="max-w-3xl text-base leading-relaxed text-foreground/80">
            Cene so na noč, v evrih, bruto in pri polni kapaciteti. To je prodajna cena, ki jo plača
            gost. Izhodišče 2026 je brez Beach Ville. Predlog 2027 popraviš kar v tabeli. Sprememba
            je predlog 2027 proti izhodišču 2026.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 md:py-10">
        <Rules />

        <section id="primerjava" className="flex w-full min-w-0 scroll-mt-6 flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl tracking-tight">2026 proti 2027</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Zimski december 2026 traja do 18. 12. V predlogu 2027 traja do 27. 12. in se od
                19. 12. prekriva s prazniki.
              </p>
            </div>
            <Button variant="outline" disabled={!dirty} onClick={() => commit(clonePrices())}>
              Ponastavi predlog 2027
            </Button>
          </div>

          {COMPARE_UNITS.filter((unit) => unit.has2026).map((unit) => (
            <CompareCard
              key={unit.id}
              unitId={unit.id}
              name={unit.name}
              detail={unit.detail}
              prices={prices[unit.id]}
              summary={shiftSentence(unit.id, prices)}
              onChange={(periodId, next) => setPrice(unit.id, periodId, next)}
              onReset={() => resetUnit(unit.id)}
            />
          ))}
        </section>

        <section className="flex w-full min-w-0 flex-col gap-4">
          <div>
            <h2 className="font-heading text-2xl tracking-tight">Beach Villa IV</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              V izhodišču 2026 je ni. Obdobja so enaka kot pri ostalih bungalovih v predlogu 2027.
            </p>
          </div>
          <BeachCard
            prices={prices["beach-4"]}
            onChange={(periodId, next) => setPrice("beach-4", periodId, next)}
            onReset={() => resetUnit("beach-4")}
          />
        </section>
      </main>
    </div>
  );
}

function Rules() {
  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-2">
      <article className="min-w-0 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        <div className="bg-[#1c1915] px-4 py-3 text-[#f6f1e7]">
          <h2 className="font-heading text-lg tracking-tight">Minimalne cene 2026</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="bg-[#efe6d4] text-left text-xs tracking-wide text-[#5c5142] uppercase">
                <th className="px-4 py-2 font-medium">Bungalov</th>
                <th className="px-3 py-2 font-medium">Izven sezone</th>
                <th className="px-3 py-2 font-medium">V sezoni</th>
                <th className="px-4 py-2 font-medium">Celo leto</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/70">
                <td className="px-4 py-3 font-medium">I · 4+0</td>
                <td className="px-3 py-3 tabular-nums">475 €</td>
                <td className="px-3 py-3 tabular-nums">570 €</td>
                <td className="px-4 py-3 text-muted-foreground">—</td>
              </tr>
              <tr className="border-t border-border/70 bg-[#faf6ee]">
                <td className="px-4 py-3 font-medium">II · 2+0</td>
                <td className="px-3 py-3 text-muted-foreground">—</td>
                <td className="px-3 py-3 text-muted-foreground">—</td>
                <td className="px-4 py-3 tabular-nums">200 €</td>
              </tr>
              <tr className="border-t border-border/70">
                <td className="px-4 py-3">
                  <span className="font-medium">III · 2+0</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Vaša cena, lanska iz 2025
                  </span>
                </td>
                <td className="px-3 py-3 text-muted-foreground">—</td>
                <td className="px-3 py-3 text-muted-foreground">—</td>
                <td className="px-4 py-3 tabular-nums">200 €</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Optima prosi, da javite, če za 2026 dovolita drugačne minimalne cene. Ramena in novo leto
          v pismu nista posebej omejena.
        </p>
      </article>

      <article className="min-w-0 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        <div className="bg-[#1c1915] px-4 py-3 text-[#f6f1e7]">
          <h2 className="font-heading text-lg tracking-tight">Gap fill 2026</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#efe6d4] text-left text-xs tracking-wide text-[#5c5142] uppercase">
              <th className="px-4 py-2 font-medium">Čas</th>
              <th className="px-4 py-2 font-medium">Pravilo</th>
            </tr>
          </thead>
          <tbody>
            {GAP_FILL_2026.map((row) => (
              <tr key={row.id} className="border-t border-border/70">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{row.when}</td>
                <td className="px-4 py-3">{row.rule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

function CompareCard({
  unitId,
  name,
  detail,
  prices,
  summary,
  onChange,
  onReset,
}: {
  unitId: string;
  name: string;
  detail: string;
  prices: Record<string, Money>;
  summary: string;
  onChange: (periodId: string, next: Money) => void;
  onReset: () => void;
}) {
  const changed = PERIODS.some((period) => !sameMoney(prices[period.id], OPTIMA_PRICES[unitId][period.id]));

  return (
    <article className="w-full min-w-0 overflow-hidden rounded-2xl ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1915] px-4 py-3 text-[#f6f1e7]">
        <div>
          <h3 className="font-heading text-lg tracking-tight">{name}</h3>
          <p className="text-xs text-white/70">{detail}</p>
        </div>
        <Button size="sm" variant="secondary" disabled={!changed} onClick={onReset}>
          Ponastavi
        </Button>
      </div>
      <p className="bg-[#f8f1e4] px-4 py-2.5 text-sm leading-relaxed text-[#3f3424]">{summary}</p>

      <div className="max-w-full overflow-x-auto bg-card">
        <table className="w-full min-w-[1040px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[8.5%]" />
            <col className="w-[8.5%]" />
            <col className="w-[7%]" />
            <col className="w-[13.333%]" />
            <col className="w-[13.333%]" />
            <col className="w-[13.334%]" />
          </colgroup>
          <thead>
            <tr className="text-xs tracking-wide text-[#5c5142] uppercase">
              <th rowSpan={2} className={cn(headCell, "bg-[#efe6d4] text-left")}>
                Obdobje
              </th>
              <th colSpan={3} className={cn(headCell, "bg-[#e4eef2] text-center")}>
                2026 izhodišče
              </th>
              <th colSpan={3} className={cn(headCell, "bg-[#f3e6c8] text-center")}>
                2027 predlog
              </th>
              <th colSpan={3} className={cn(headCell, "bg-[#efe6d4] text-center")}>
                Sprememba
              </th>
            </tr>
            <tr className="text-xs tracking-wide text-[#5c5142] uppercase">
              {["Min", "Max", "Razpon"].map((label) => (
                <th key={`2026-${label}`} className={cn(headCell, "bg-[#e4eef2] text-right")}>
                  {label}
                </th>
              ))}
              {["Min", "Max", "Razpon"].map((label) => (
                <th key={`2027-${label}`} className={cn(headCell, "bg-[#f3e6c8] text-right")}>
                  {label}
                </th>
              ))}
              {["Δ min", "Δ max", "Δ razpon"].map((label) => (
                <th key={label} className={cn(headCell, "bg-[#efe6d4] text-right")}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_PERIODS.map((period) => {
              const base = RATES_2026[unitId][period.id];
              const next = prices[period.id];
              const tone = period.id === "prazniki" ? "poletje-december" : period.season;
              const edited = !sameMoney(next, OPTIMA_PRICES[unitId][period.id]);
              const floor = floor2026(unitId, period.id);
              const underFloor = floor !== null && next.min !== null && next.min < floor.amount;
              const baseBand = base.min !== null && base.max !== null ? base.max - base.min : null;
              const nextBand = next.min !== null && next.max !== null ? next.max - next.min : null;
              return (
                <tr key={period.id} className={SEASON_SOFT[tone]}>
                  <td className={cn(bodyCell, "text-left")}>
                    <span className="font-medium">{SEASON_LABEL[period.season]}</span>
                    <PeriodDates period={period} />
                    {edited ? <span className="mt-0.5 block text-xs text-primary">prilagojeno</span> : null}
                  </td>
                  <td className={numCell}>{formatEuro(base.min)}</td>
                  <td className={numCell}>{formatEuro(base.max)}</td>
                  <td className={numCell}>{formatEuro(baseBand)}</td>
                  <td className={cn(bodyCell, "text-right")}>
                    <EuroInput
                      label={`${name}, ${SEASON_LABEL[period.season]} od ${period.from2027}, min 2027`}
                      value={next.min}
                      onChange={(min) => onChange(period.id, { ...next, min })}
                    />
                    {underFloor ? (
                      <span className="mt-1 block text-xs text-[#8a3b28]">
                        pod {floor.amount} €, {floor.label}
                      </span>
                    ) : null}
                  </td>
                  <td className={cn(bodyCell, "text-right")}>
                    <EuroInput
                      label={`${name}, ${SEASON_LABEL[period.season]} od ${period.from2027}, max 2027`}
                      value={next.max}
                      onChange={(max) => onChange(period.id, { ...next, max })}
                    />
                  </td>
                  <td className={numCell}>{formatEuro(nextBand)}</td>
                  <td className={numCell}>
                    <Delta base={base.min} next={next.min} />
                  </td>
                  <td className={numCell}>
                    <Delta base={base.max} next={next.max} />
                  </td>
                  <td className={numCell}>
                    <Delta base={baseBand} next={nextBand} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

const headCell = "border border-[#e4d8c4] px-2 py-1.5 font-medium";
const bodyCell = "border border-[#e4d8c4] px-2 py-1.5 align-middle";
const numCell = "border border-[#e4d8c4] px-2 py-1.5 text-right align-middle tabular-nums whitespace-nowrap";

function dayMonth(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(day)}. ${Number(month)}.`;
}

function PeriodDates({ period }: { period: (typeof COMPARE_PERIODS)[number] }) {
  if (!datesDiffer(period)) {
    return (
      <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
        {dayMonth(period.from2026)} – {dayMonth(period.to2026)}
      </span>
    );
  }
  return (
    <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
      2026 {dayMonth(period.from2026)} – {dayMonth(period.to2026)}
      <br />
      2027 {dayMonth(period.from2027)} – {dayMonth(period.to2027)}
    </span>
  );
}

function BeachCard({
  prices,
  onChange,
  onReset,
}: {
  prices: Record<string, Money>;
  onChange: (periodId: string, next: Money) => void;
  onReset: () => void;
}) {
  const changed = PERIODS.some((period) => !sameMoney(prices[period.id], OPTIMA_PRICES["beach-4"][period.id]));

  return (
    <article id="beach-villa" className="w-full min-w-0 scroll-mt-6 overflow-hidden rounded-2xl ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1915] px-4 py-3 text-[#f6f1e7]">
        <h3 className="font-heading text-lg tracking-tight">Beach Villa IV</h3>
        <Button size="sm" variant="secondary" disabled={!changed} onClick={onReset}>
          Počisti
        </Button>
      </div>
      <div className="max-w-full overflow-x-auto bg-card">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[20%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr className="text-xs tracking-wide text-[#5c5142] uppercase">
              <th className={cn(headCell, "bg-[#efe6d4] text-left")}>Od</th>
              <th className={cn(headCell, "bg-[#efe6d4] text-left")}>Do</th>
              <th className={cn(headCell, "bg-[#efe6d4] text-left")}>Sezona</th>
              <th className={cn(headCell, "bg-[#f3e6c8] text-right")}>Min</th>
              <th className={cn(headCell, "bg-[#f3e6c8] text-right")}>Max</th>
              <th className={cn(headCell, "bg-[#f3e6c8] text-right")}>Razpon</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_PERIODS.map((period) => {
              const price = prices[period.id];
              const gap = spread(price);
              const tone = period.id === "prazniki" ? "poletje-december" : period.season;
              const pending = price.min === null && price.max === null;
              return (
                <tr key={period.id} className={SEASON_SOFT[tone]}>
                  <td className={cn(bodyCell, "tabular-nums whitespace-nowrap")}>{formatDate(period.from2027)}</td>
                  <td className={cn(bodyCell, "tabular-nums whitespace-nowrap")}>{formatDate(period.to2027)}</td>
                  <td className={cn(bodyCell, "font-medium")}>{SEASON_LABEL[period.season]}</td>
                  <td className={cn(bodyCell, "text-right")}>
                    <EuroInput
                      label={`Beach Villa, ${SEASON_LABEL[period.season]} od ${period.from2027}, min`}
                      value={price.min}
                      pending={pending}
                      onChange={(min) => onChange(period.id, { ...price, min })}
                    />
                  </td>
                  <td className={cn(bodyCell, "text-right")}>
                    <EuroInput
                      label={`Beach Villa, ${SEASON_LABEL[period.season]} od ${period.from2027}, max`}
                      value={price.max}
                      pending={pending}
                      onChange={(max) => onChange(period.id, { ...price, max })}
                    />
                  </td>
                  <td className={numCell}>
                    {gap ? (
                      <>
                        {formatEuro(gap.euros)}
                        <span className="ml-1 text-xs text-muted-foreground">{formatPercent(gap.percent)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
