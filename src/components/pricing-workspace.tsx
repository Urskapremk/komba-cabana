"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "cn";
import {
  BUNGALOWS,
  CALENDAR_END,
  CALENDAR_START,
  OPTIMA_PRICES,
  PERIODS,
  PRESETS,
  SEASON_LABEL,
  type Bungalow,
  type Money,
  type OverlapRule,
  type Period,
  type StayQuote,
  addDays,
  calendarLength,
  clonePrices,
  dayOffset,
  formatDate,
  nightsBetween,
  formatEuro,
  formatPercent,
  nightLabel,
  positionLabel,
  quoteStay,
  resolvedSegments,
  sameMoney,
  sanitizePrices,
  segmentLabel,
  spread,
} from "@/lib/pricing";

const STORAGE_KEY = "komba-cabana-cenik-v1";

type Prices = Record<string, Record<string, Money>>;

type Workspace = {
  prices: Prices;
  bungalowId: string;
  arrival: string;
  departure: string;
  position: number;
  overlap: OverlapRule;
};

const INITIAL: Workspace = {
  prices: clonePrices(),
  bungalowId: "ocean-1",
  arrival: "2027-08-02",
  departure: "2027-08-09",
  position: 50,
  overlap: "praznicna",
};

const SEASON_BAR: Record<string, string> = {
  zima: "bg-[#d5e2ea] text-[#1c3b4c]",
  "pomlad-jesen": "bg-[#ead9ae] text-[#5a4314]",
  "poletje-december": "bg-[#e7c27a] text-[#5c3d08]",
  prazniki: "bg-[#d4893c] text-[#3d2306]",
};

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

function parseWorkspace(raw: string | null): Workspace | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Workspace>;
    const prices = sanitizePrices(parsed.prices);
    if (!prices) return null;
    const bungalowId = BUNGALOWS.some((item) => item.id === parsed.bungalowId)
      ? parsed.bungalowId!
      : INITIAL.bungalowId;
    const arrival = typeof parsed.arrival === "string" ? parsed.arrival : INITIAL.arrival;
    const departure = typeof parsed.departure === "string" ? parsed.departure : INITIAL.departure;
    const position =
      typeof parsed.position === "number" && parsed.position >= 0 && parsed.position <= 100
        ? Math.round(parsed.position)
        : INITIAL.position;
    const overlap: OverlapRule = parsed.overlap === "prejsnja" ? "prejsnja" : "praznicna";
    return { prices, bungalowId, arrival, departure, position, overlap };
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
  pending: boolean;
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
          "h-9 bg-white/80 pr-7 text-right tabular-nums",
          pending && "border-dashed",
        )}
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
        €
      </span>
    </div>
  );
}

function quoteFor(prices: Prices, bungalowId: string, workspace: Workspace): StayQuote {
  return quoteStay(
    prices[bungalowId],
    workspace.arrival,
    workspace.departure,
    workspace.position,
    workspace.overlap,
  );
}

export function PricingWorkspace() {
  const storedRaw = useSyncExternalStore(subscribeStore, readStore, () => null);
  const stored = useMemo(() => parseWorkspace(storedRaw), [storedRaw]);
  const [draft, setDraft] = useState<Workspace | null>(null);
  const workspace = draft ?? stored ?? INITIAL;
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  function commit(next: Workspace) {
    setDraft(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const quote = useMemo(
    () => quoteFor(workspace.prices, workspace.bungalowId, workspace),
    [workspace],
  );
  const comparisons = useMemo(
    () =>
      BUNGALOWS.map((bungalow) => ({
        bungalow,
        quote: quoteFor(workspace.prices, bungalow.id, workspace),
      })),
    [workspace],
  );
  const segments = useMemo(() => resolvedSegments(workspace.overlap), [workspace.overlap]);
  const selected = BUNGALOWS.find((item) => item.id === workspace.bungalowId) ?? BUNGALOWS[0];
  const dirty = BUNGALOWS.some((bungalow) =>
    PERIODS.some(
      (period) =>
        !sameMoney(workspace.prices[bungalow.id][period.id], OPTIMA_PRICES[bungalow.id][period.id]),
    ),
  );

  function patch(partial: Partial<Workspace>) {
    commit({ ...workspace, ...partial });
  }

  function setPrice(bungalowId: string, periodId: string, next: Money) {
    commit({
      ...workspace,
      prices: {
        ...workspace.prices,
        [bungalowId]: { ...workspace.prices[bungalowId], [periodId]: next },
      },
    });
  }

  function resetBungalow(bungalowId: string) {
    commit({
      ...workspace,
      prices: {
        ...workspace.prices,
        [bungalowId]: Object.fromEntries(
          PERIODS.map((period) => [period.id, { ...OPTIMA_PRICES[bungalowId][period.id] }]),
        ),
      },
    });
  }

  async function copyQuote() {
    const lines = [
      `Komba Cabana — ${selected.short}`,
      `Prihod ${formatDate(workspace.arrival)}, odhod ${formatDate(workspace.departure)} (${nightLabel(quote.nights)})`,
      positionLabel(workspace.position),
      workspace.overlap === "praznicna"
        ? "Prekrivanje: praznična sezona"
        : "Prekrivanje: prejšnje obdobje",
      "",
    ];
    if (quote.nights === 0) {
      lines.push("Ni noči za obračun.");
    } else {
      for (const group of quote.groups) {
        lines.push(
          `${segmentLabel(PERIODS.find((period) => period.id === group.periodId)!)} · ${formatDate(group.stayFrom)} – ${formatDate(group.stayCheckout)} · ${nightLabel(group.nights)} · ${formatEuro(group.min)} – ${formatEuro(group.max)} · izbrano ${formatEuro(group.chosen)} / noč`,
        );
      }
      if (quote.uncovered.length > 0) {
        lines.push(`Brez cene: ${quote.uncovered.map(formatDate).join(", ")}`);
      }
      lines.push(
        `Skupaj min ${formatEuro(quote.minTotal)} · max ${formatEuro(quote.maxTotal)} · izbrano ${formatEuro(quote.chosenTotal)}`,
      );
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-border/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
                Komba Cabana
              </p>
              <h1 className="font-heading mt-2 text-4xl tracking-tight md:text-5xl">
                Kalkulacije cen
              </h1>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Sezona 2027/28
              <br />
              Predlog Optima Plus, cene na noč
            </p>
          </div>
          <p className="max-w-3xl text-base leading-relaxed text-foreground/80">
            Ocean Bungalov I, Ocean Bungalow II in Garden Bungalov III imajo predlagani min in
            max. Beach Villa IV ima ista obdobja — cene vpišeš sama, izračun jih takoj uporabi.
            Shranjeno je v tem brskalniku.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 md:py-10">
        <SeasonTimeline
          segments={segments}
          arrival={workspace.arrival}
          departure={workspace.departure}
          overlap={workspace.overlap}
        />

        <section className="rounded-2xl bg-card p-4 shadow-[0_1px_0_rgba(40,32,18,0.06)] ring-1 ring-foreground/10 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl tracking-tight">Izračun bivanja</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Zadnji dan je odhod in se ne obračuna. Izbrana cena na noč je min + (max − min) ×
                pozicija, zaokroženo na evro.
              </p>
            </div>
            <Button variant="outline" onClick={copyQuote} disabled={quote.nights === 0}>
              {copyState === "copied" ? "Kopirano" : copyState === "failed" ? "Kopiranje ni uspelo" : "Kopiraj izračun"}
            </Button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bungalow">Bungalov</Label>
                <Select
                  value={workspace.bungalowId}
                  items={BUNGALOWS.map((bungalow) => ({
                    value: bungalow.id,
                    label: bungalow.short,
                  }))}
                  onValueChange={(value) => {
                    if (value) patch({ bungalowId: value });
                  }}
                >
                  <SelectTrigger id="bungalow" className="w-full" size="default">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUNGALOWS.map((bungalow) => (
                      <SelectItem key={bungalow.id} value={bungalow.id}>
                        {bungalow.short}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="arrival">Prihod</Label>
                  <Input
                    id="arrival"
                    type="date"
                    min="2027-01-01"
                    max="2028-01-20"
                    value={workspace.arrival}
                    onChange={(event) => patch({ arrival: event.target.value })}
                    className="h-9 bg-white/70"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="departure">Odhod</Label>
                  <Input
                    id="departure"
                    type="date"
                    min="2027-01-01"
                    max="2028-01-21"
                    value={workspace.departure}
                    onChange={(event) => patch({ departure: event.target.value })}
                    className="h-9 bg-white/70"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Hitri termini</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => {
                    const active =
                      workspace.arrival === preset.arrival && workspace.departure === preset.departure;
                    return (
                      <Button
                        key={preset.id}
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() => patch({ arrival: preset.arrival, departure: preset.departure })}
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor="position">Pozicija v razponu</Label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {positionLabel(workspace.position)}
                  </span>
                </div>
                <Slider
                  id="position"
                  aria-label="Pozicija med min in max ceno"
                  min={0}
                  max={100}
                  step={1}
                  value={[workspace.position]}
                  onValueChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    patch({ position: next });
                  }}
                />
                <div className="flex gap-1.5">
                  {[
                    { label: "Min", value: 0 },
                    { label: "Sredina", value: 50 },
                    { label: "Max", value: 100 },
                  ].map((item) => (
                    <Button
                      key={item.label}
                      size="sm"
                      variant={workspace.position === item.value ? "secondary" : "ghost"}
                      onClick={() => patch({ position: item.value })}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Če noč pade v dve obdobji</legend>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant={workspace.overlap === "praznicna" ? "default" : "outline"}
                    onClick={() => patch({ overlap: "praznicna" })}
                  >
                    Praznična sezona
                  </Button>
                  <Button
                    size="sm"
                    variant={workspace.overlap === "prejsnja" ? "default" : "outline"}
                    onClick={() => patch({ overlap: "prejsnja" })}
                  >
                    Prejšnje obdobje
                  </Button>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  19.–27. december je v ceniku dvakrat: zima do 27. 12. in poletje + december od
                  19. 12. Privzeto velja praznična cena.
                </p>
              </fieldset>
            </div>

            <QuotePanel
              bungalow={selected}
              arrival={workspace.arrival}
              departure={workspace.departure}
              quote={quote}
              overlap={workspace.overlap}
            />
          </div>

          <div className="mt-6 border-t border-border/80 pt-5">
            <h3 className="text-sm font-medium">Primerjava za iste datume</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {comparisons.map(({ bungalow, quote: itemQuote }) => {
                const active = bungalow.id === workspace.bungalowId;
                return (
                  <button
                    key={bungalow.id}
                    type="button"
                    onClick={() => patch({ bungalowId: bungalow.id })}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background/40 hover:bg-muted/60",
                    )}
                  >
                    <span className="block text-sm font-medium">{bungalow.short}</span>
                    <span className="mt-2 block font-heading text-2xl tabular-nums tracking-tight">
                      {itemQuote.chosenTotal === null ? "—" : formatEuro(itemQuote.chosenTotal)}
                    </span>
                    <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                      {itemQuote.complete
                        ? `${formatEuro(itemQuote.minTotal)} – ${formatEuro(itemQuote.maxTotal)}`
                        : bungalow.source === "rocno" && !hasAnyPrice(workspace.prices[bungalow.id])
                          ? "Cene še niso vpisane"
                          : "Izračun ni popoln"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl tracking-tight">Cenik</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Min in max lahko prilagodiš. Razpon je razlika, ki jo Optima Plus pusti med
                spodnjo in zgornjo ceno.
              </p>
            </div>
            <Button
              variant="outline"
              disabled={!dirty}
              onClick={() => patch({ prices: clonePrices() })}
            >
              Ponastavi vse
            </Button>
          </div>

          {BUNGALOWS.map((bungalow) => (
            <RateCard
              key={bungalow.id}
              bungalow={bungalow}
              prices={workspace.prices[bungalow.id]}
              onChange={(periodId, next) => setPrice(bungalow.id, periodId, next)}
              onReset={() => resetBungalow(bungalow.id)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

function hasAnyPrice(prices: Record<string, Money>): boolean {
  return Object.values(prices).some((price) => price.min !== null || price.max !== null);
}

function SeasonTimeline({
  segments,
  arrival,
  departure,
  overlap,
}: {
  segments: ReturnType<typeof resolvedSegments>;
  arrival: string;
  departure: string;
  overlap: OverlapRule;
}) {
  const total = calendarLength();
  const stay = stayMarker(arrival, departure);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-2xl tracking-tight">Sezone</h2>
        <p className="text-sm text-muted-foreground">
          {formatDate(CALENDAR_START)} – {formatDate(CALENDAR_END)}
          {overlap === "praznicna" ? " · prazniki preglasijo zimo" : " · zima velja do 27. 12."}
        </p>
      </div>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="relative h-11 overflow-hidden rounded-lg">
          <div className="flex h-full">
            {segments.map((segment) => {
              const width = ((dayOffset(addDays(segment.to, 1)) - dayOffset(segment.from)) / total) * 100;
              const tone = segment.period.id === "prazniki" ? "prazniki" : segment.period.season;
              return (
                <div
                  key={`${segment.period.id}-${segment.from}`}
                  className={cn("flex h-full items-center justify-center overflow-hidden text-[11px] font-medium", SEASON_BAR[tone])}
                  style={{ width: `${width}%` }}
                  title={`${segmentLabel(segment.period)} · ${formatDate(segment.from)} – ${formatDate(segment.to)}`}
                >
                  {width > 9 ? <span className="truncate px-1">{segmentLabel(segment.period)}</span> : null}
                </div>
              );
            })}
          </div>
          {stay ? (
            <div
              className="pointer-events-none absolute inset-y-0 border-x-2 border-[#1c1915] bg-[#1c1915]/20"
              style={{ left: `${stay.left}%`, width: `${stay.width}%` }}
            />
          ) : null}
        </div>
        <div className="relative mt-2 h-4 text-[11px] text-muted-foreground">
          {[
            ["2027-01-11", "jan"],
            ["2027-04-01", "apr"],
            ["2027-07-01", "jul"],
            ["2027-10-01", "okt"],
            ["2027-12-01", "dec"],
            ["2028-01-01", "jan"],
          ].map(([date, label]) => (
            <span
              key={date}
              className="absolute -translate-x-1/2"
              style={{ left: `${(dayOffset(date) / total) * 100}%` }}
            >
              {label}
            </span>
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <Legend swatch="bg-[#d5e2ea]" label="Zima" />
          <Legend swatch="bg-[#ead9ae]" label="Pomlad + jesen" />
          <Legend swatch="bg-[#e7c27a]" label="Poletje" />
          <Legend swatch="bg-[#d4893c]" label="Prazniki, 19. 12.–10. 1." />
          <Legend swatch="bg-[#1c1915]/30 border border-[#1c1915]" label="Izbrano bivanje" />
        </ul>
      </div>
    </section>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cn("size-3 rounded-sm", swatch)} />
      {label}
    </li>
  );
}

function stayMarker(arrival: string, departure: string): { left: number; width: number } | null {
  if (nightsBetween(arrival, departure).length === 0) return null;
  const end = addDays(CALENDAR_END, 1);
  if (departure <= CALENDAR_START || arrival >= end) return null;
  const start = dayOffset(arrival < CALENDAR_START ? CALENDAR_START : arrival);
  const stop = dayOffset(departure > end ? end : departure);
  if (stop <= start) return null;
  const total = calendarLength();
  return { left: (start / total) * 100, width: ((stop - start) / total) * 100 };
}

function QuotePanel({
  bungalow,
  arrival,
  departure,
  quote,
  overlap,
}: {
  bungalow: Bungalow;
  arrival: string;
  departure: string;
  quote: StayQuote;
  overlap: OverlapRule;
}) {
  if (quote.nights === 0) {
    return (
      <div className="flex min-h-64 items-center rounded-xl bg-muted/50 px-5 py-8">
        <p className="max-w-sm text-sm leading-relaxed">
          Odhod mora biti za prihodom. Obračunajo se noči med datumoma, dan odhoda ostane zunaj.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{bungalow.short}</p>
          <p className="font-heading text-4xl tabular-nums tracking-tight">
            {formatEuro(quote.chosenTotal)}
          </p>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            min {formatEuro(quote.minTotal)} · max {formatEuro(quote.maxTotal)} · {nightLabel(quote.nights)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(arrival)} – {formatDate(departure)}
        </p>
      </div>

      {quote.uncovered.length > 0 ? (
        <p className="rounded-lg bg-[#f8ebe3] px-3 py-2 text-sm leading-relaxed text-[#6b3a22]">
          Brez cene: {quote.uncovered.map(formatDate).join(", ")}. Skupni znesek je skrit, dokler
          vsaka noč nima min in max.
        </p>
      ) : null}

      {bungalow.source === "rocno" && quote.chosenTotal === null && quote.uncovered.length === 0 ? (
        <p className="rounded-lg bg-[#f8ebe3] px-3 py-2 text-sm leading-relaxed text-[#6b3a22]">
          Beach Villa še nima cen za to bivanje.{" "}
          <a href="#beach-villa" className="font-medium underline underline-offset-2">
            Vpiši jih v ceniku
          </a>
          .
        </p>
      ) : null}

      {quote.overlapNights > 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {nightLabel(quote.overlapNights)}{" "}
          {quote.overlapNights === 1 ? "spada" : "spadajo"} v dve obdobji in{" "}
          {quote.overlapNights === 1 ? "je obračunana" : "so obračunane"} po{" "}
          {overlap === "praznicna" ? "praznični sezoni" : "prejšnjem obdobju"}.
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="py-2 pr-3 font-medium">Obdobje</th>
              <th className="py-2 pr-3 font-medium">Bivanje</th>
              <th className="py-2 pr-3 text-right font-medium">Noči</th>
              <th className="py-2 pr-3 text-right font-medium">Min</th>
              <th className="py-2 pr-3 text-right font-medium">Max</th>
              <th className="py-2 text-right font-medium">Izbrana</th>
            </tr>
          </thead>
          <tbody>
            {quote.groups.map((group) => (
              <tr key={`${group.periodId}-${group.stayFrom}`} className="border-b border-border/70">
                <td className="py-3 pr-3">
                  <span className="block font-medium">{SEASON_LABEL[group.season]}</span>
                  <span className="text-xs text-muted-foreground">
                    cenik {formatDate(group.periodFrom)} – {formatDate(group.periodTo)}
                  </span>
                </td>
                <td className="py-3 pr-3 tabular-nums">
                  {formatDate(group.stayFrom)} – {formatDate(group.stayCheckout)}
                </td>
                <td className="py-3 pr-3 text-right tabular-nums">{group.nights}</td>
                <td className="py-3 pr-3 text-right tabular-nums">
                  {formatEuro(group.min === null ? null : group.min * group.nights)}
                  <span className="block text-xs text-muted-foreground">{formatEuro(group.min)} / noč</span>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums">
                  {formatEuro(group.max === null ? null : group.max * group.nights)}
                  <span className="block text-xs text-muted-foreground">{formatEuro(group.max)} / noč</span>
                </td>
                <td className="py-3 text-right tabular-nums">
                  {formatEuro(group.chosen === null ? null : group.chosen * group.nights)}
                  <span className="block text-xs text-muted-foreground">{formatEuro(group.chosen)} / noč</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RateCard({
  bungalow,
  prices,
  onChange,
  onReset,
}: {
  bungalow: Bungalow;
  prices: Record<string, Money>;
  onChange: (periodId: string, next: Money) => void;
  onReset: () => void;
}) {
  const changed = PERIODS.some(
    (period) => !sameMoney(prices[period.id], OPTIMA_PRICES[bungalow.id][period.id]),
  );

  return (
    <article
      id={bungalow.id === "beach-4" ? "beach-villa" : undefined}
      className="scroll-mt-6 overflow-hidden rounded-2xl ring-1 ring-foreground/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1915] px-4 py-3 text-[#f6f1e7]">
        <h3 className="font-heading text-lg tracking-tight">{bungalow.title}</h3>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">
            {bungalow.source === "optima" ? "Predlog Optima Plus" : "Sezone enake, cene za vnos"}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={!changed}
            onClick={onReset}
          >
            {bungalow.source === "optima" ? "Ponastavi" : "Počisti"}
          </Button>
        </div>
      </div>
      {bungalow.source === "rocno" ? (
        <p className="bg-[#f8f1e4] px-4 py-3 text-sm leading-relaxed text-[#3f3424]">
          Optima Plus za Beach Villo cen ni predlagal. Obdobja so enaka kot pri ostalih
          bungalovih, vključno s prazničnim oknom 19. 12. 2027–10. 1. 2028.
        </p>
      ) : null}
      <div className="overflow-x-auto bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-[#efe6d4] text-left text-xs tracking-wide text-[#5c5142] uppercase">
              <th className="px-4 py-2 font-medium">Od</th>
              <th className="px-3 py-2 font-medium">Do</th>
              <th className="px-3 py-2 font-medium">Sezona</th>
              <th className="px-3 py-2 font-medium">Min cena</th>
              <th className="px-3 py-2 font-medium">Max cena</th>
              <th className="px-4 py-2 text-right font-medium">Razpon</th>
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => (
              <RateRow
                key={period.id}
                bungalow={bungalow}
                period={period}
                price={prices[period.id]}
                onChange={(next) => onChange(period.id, next)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function RateRow({
  bungalow,
  period,
  price,
  onChange,
}: {
  bungalow: Bungalow;
  period: Period;
  price: Money;
  onChange: (next: Money) => void;
}) {
  const tone = period.id === "prazniki" ? "poletje-december" : period.season;
  const original = OPTIMA_PRICES[bungalow.id][period.id];
  const edited = !sameMoney(price, original);
  const gap = spread(price);
  const inverted = price.min !== null && price.max !== null && price.min > price.max;
  const pending = bungalow.source === "rocno" && price.min === null && price.max === null;

  return (
    <tr className={cn(SEASON_SOFT[tone], inverted && "outline outline-1 outline-[#a24b32]")}>
      <td className="px-4 py-2.5 tabular-nums whitespace-nowrap">{formatDate(period.from)}</td>
      <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">{formatDate(period.to)}</td>
      <td className="px-3 py-2.5">
        <span className="font-medium">{SEASON_LABEL[period.season]}</span>
        {edited ? <span className="mt-0.5 block text-xs text-primary">prilagojeno</span> : null}
        {inverted ? (
          <span className="mt-0.5 block text-xs text-[#8a3b28]">min je višji od max</span>
        ) : null}
      </td>
      <td className="px-3 py-2.5">
        <EuroInput
          label={`${bungalow.short}, ${SEASON_LABEL[period.season]}, min cena`}
          value={price.min}
          pending={pending}
          onChange={(min) => onChange({ ...price, min })}
        />
      </td>
      <td className="px-3 py-2.5">
        <EuroInput
          label={`${bungalow.short}, ${SEASON_LABEL[period.season]}, max cena`}
          value={price.max}
          pending={pending}
          onChange={(max) => onChange({ ...price, max })}
        />
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
        {gap ? (
          <>
            {formatEuro(gap.euros)}
            <span className="block text-xs text-muted-foreground">{formatPercent(gap.percent)}</span>
          </>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
