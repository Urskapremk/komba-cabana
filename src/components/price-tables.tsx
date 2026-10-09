"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { YearEarnings } from "@/components/year-earnings";
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
  PERSON_RATE_CARDS,
  PERSON_SEASONS,
  type Offers,
  type PersonRates,
  type PersonSeasonId,
  type Prices,
  type WebLift,
  beachWeb2027FromFamily,
  childPrices,
  childStaySentence,
  clonePrices,
  datesDiffer,
  defaultPersonRates,
  discountSentence,
  emptyOffers,
  emptyPersonRates,
  emptyWebLift,
  floor2026,
  formatDate,
  formatEuro,
  formatSeasonRange,
  formatPercent,
  guestLabel,
  PERSON_FLOOR_2027,
  belowPersonFloor2027,
  personColumns,
  personRateCard,
  pricePerPerson,
  priceDelta,
  liftPersonUnit,
  afterDiscounts,
  parseCommission,
  parsePercent,
  readCenik,
  sameMoney,
  spread,
} from "@/lib/pricing";

const STORAGE_KEY = "komba-cabana-cenik-v1";

type Cenik = {
  prices: Prices;
  offers: Offers;
  personRates: PersonRates;
  web2027: PersonRates;
  webLift: WebLift;
  commission: WebLift;
  earlyBooking: WebLift;
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

function parseCenik(raw: string | null): Cenik | null {
  if (!raw) return null;
  try {
    return readCenik(JSON.parse(raw));
  } catch {
    return null;
  }
}

function mirrorBeach(cenik: Cenik): Cenik {
  const webLift = cenik.webLift ?? emptyWebLift();
  const beachLifted = webLift["beach-4"] != null;
  return {
    ...cenik,
    webLift,
    commission: cenik.commission ?? emptyWebLift(),
    earlyBooking: cenik.earlyBooking ?? emptyWebLift(),
    web2027: {
      ...cenik.web2027,
      "beach-4": beachLifted
        ? cenik.web2027["beach-4"]
        : beachWeb2027FromFamily(cenik.web2027, cenik.personRates),
    },
  };
}

function blankCenik(): Cenik {
  return {
    prices: clonePrices(),
    offers: emptyOffers(),
    personRates: defaultPersonRates(),
    web2027: emptyPersonRates(),
    webLift: emptyWebLift(),
    commission: emptyWebLift(),
    earlyBooking: emptyWebLift(),
  };
}

function EuroInput({
  value,
  onChange,
  label,
  pending,
  readOnly,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  label: string;
  pending?: boolean;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft === null || readOnly ? (value === null ? "" : String(value)) : draft;

  return (
    <div className="relative min-w-0">
      <Input
        aria-label={label}
        size={4}
        inputMode="numeric"
        autoComplete="off"
        readOnly={readOnly}
        value={text}
        placeholder="—"
        onFocus={() => {
          if (!readOnly) setDraft(value === null ? "" : String(value));
        }}
        onBlur={() => setDraft(null)}
        onChange={(event) => {
          if (readOnly) return;
          const raw = event.target.value.replace(/\D/g, "").slice(0, 6);
          setDraft(raw);
          onChange(raw === "" ? null : Number(raw));
        }}
        className={cn(
          "h-8 w-full min-w-0 rounded-md border-transparent bg-white px-1 pr-5 text-right text-sm tabular-nums shadow-none",
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
  const stored = useMemo(() => parseCenik(storedRaw), [storedRaw]);
  const [draft, setDraft] = useState<Cenik | null>(null);
  const cenik = mirrorBeach(draft ?? stored ?? blankCenik());
  const webLift = cenik.webLift ?? emptyWebLift();
  const commission = cenik.commission ?? emptyWebLift();
  const earlyBooking = cenik.earlyBooking ?? emptyWebLift();
  const prices = cenik.prices;

  function commit(next: Cenik) {
    const synced = mirrorBeach(next);
    setDraft(synced);
    let envelope: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) envelope = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      envelope = {};
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...envelope,
        prices: next.prices,
        offers: next.offers,
        personRates: next.personRates,
        web2027: synced.web2027,
        webLift: synced.webLift ?? emptyWebLift(),
        commission: synced.commission ?? emptyWebLift(),
        earlyBooking: synced.earlyBooking ?? emptyWebLift(),
      }),
    );
  }

  function setPrice(unitId: string, periodId: string, next: Money) {
    commit({
      ...cenik,
      prices: {
        ...prices,
        [unitId]: { ...prices[unitId], [periodId]: next },
      },
    });
  }

  function resetUnit(unitId: string) {
    commit({
      ...cenik,
      prices: {
        ...prices,
        [unitId]: Object.fromEntries(PERIODS.map((period) => [period.id, { ...OPTIMA_PRICES[unitId][period.id] }])),
      },
    });
  }

  function setPersonRate(unitId: string, seasonId: PersonSeasonId, guests: number, amount: number | null) {
    const row = cenik.personRates[unitId][seasonId];
    commit({
      ...cenik,
      personRates: {
        ...cenik.personRates,
        [unitId]: {
          ...cenik.personRates[unitId],
          [seasonId]: { ...row, [guests]: amount },
        },
      },
    });
  }

  function resetPersonRate(unitId: string) {
    commit({
      ...cenik,
      personRates: { ...cenik.personRates, [unitId]: defaultPersonRates()[unitId] },
    });
  }

  function setWeb2027(unitId: string, seasonId: PersonSeasonId, guests: number, amount: number | null) {
    const row = cenik.web2027[unitId][seasonId];
    commit({
      ...cenik,
      web2027: {
        ...cenik.web2027,
        [unitId]: {
          ...cenik.web2027[unitId],
          [seasonId]: { ...row, [guests]: amount },
        },
      },
    });
  }

  function resetWeb2027(unitId: string) {
    commit({
      ...cenik,
      web2027: { ...cenik.web2027, [unitId]: emptyPersonRates()[unitId] },
      webLift: { ...webLift, [unitId]: null },
    });
  }

  function setCommission(unitId: string, percent: number) {
    commit({
      ...cenik,
      commission: { ...commission, [unitId]: percent },
    });
  }

  function setEarlyBooking(unitId: string, percent: number) {
    commit({
      ...cenik,
      earlyBooking: { ...earlyBooking, [unitId]: percent },
    });
  }

  function liftWeb2027(unitId: string, percent: number) {
    const lifted = liftPersonUnit(unitId, cenik.personRates[unitId], percent);
    if (!lifted) return;
    commit({
      ...cenik,
      web2027: { ...cenik.web2027, [unitId]: lifted },
      webLift: { ...webLift, [unitId]: percent },
    });
  }

  const dirty = BUNGALOWS.some((bungalow) =>
    PERIODS.some((period) => !sameMoney(prices[bungalow.id][period.id], OPTIMA_PRICES[bungalow.id][period.id])),
  );
  const [tab, setTab] = useState<"cenik" | "zasluzek">("cenik");
  useEffect(() => {
    const read = () => setTab(window.location.hash === "#zasluzek" ? "zasluzek" : "cenik");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  function selectTab(next: "cenik" | "zasluzek") {
    const hash = next === "zasluzek" ? "#zasluzek" : "#cenik";
    if (window.location.hash !== hash) window.location.hash = hash;
    setTab(next);
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-border/80">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">Komba Cabana</p>
              <h1 className="font-heading mt-2 text-4xl tracking-tight md:text-5xl">Kalkulacije cen</h1>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {tab === "zasluzek" ? (
                <>
                  Polna zasedenost
                  <br />
                  odprto od marca
                </>
              ) : (
                <>
                  Fiksne cene WEB
                  <br />
                  2027 za vpis
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Pogled">
            <Button
              variant={tab === "cenik" ? "default" : "outline"}
              aria-selected={tab === "cenik"}
              onClick={() => selectTab("cenik")}
            >
              Cenik
            </Button>
            <Button
              variant={tab === "zasluzek" ? "default" : "outline"}
              aria-selected={tab === "zasluzek"}
              onClick={() => selectTab("zasluzek")}
            >
              Zaslužek
            </Button>
          </div>
          {tab === "cenik" ? (
            <p className="max-w-3xl text-base leading-relaxed text-foreground/80">
              Pri vsakem bungalovu so najprej fiksne cene WEB, pod njimi variabilne. Fiksne cene so na
              noč za spletno stran. Pri I, II in III je ista cena tudi na Bookingu, Airbnbju in Agodi.
              Polni penzion ni vključen. Leto 2027 je v isti tabeli, desno od trenutnih cen. Vpis ostane
              v brskalniku.
            </p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-12 px-4 py-8 md:px-6 md:py-10">
        {tab === "zasluzek" ? (
          <YearEarnings
            web={cenik.personRates}
            next={cenik.web2027}
            commission={commission}
            earlyBooking={earlyBooking}
          />
        ) : null}
        {tab === "cenik" ? (
        <>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Trenutna cena in leto 2027 sta v isti vrstici. Pod ceno bungalova je preračun na osebo, cena za odraslo osebo.
            Minimalna cena 2027 je {PERSON_FLOOR_2027} € na osebo.             Provizijo agencije in Early booking vpišeš v odstotkih. Pod ceno na osebo piše, koliko ostane.
            Pri 2027 vpišeš odstotek in dvigneš vse cene tega bungalova od trenutnega WEB, tudi pri
            Beach Villi. Dokler dviga ni, ima Beach Villa enake cene 2027 kot Bungalow I - Family. Prazniki
            2027 trajajo do 10. 1. 2028. Zimski december 2026 pri variabilnih cenah traja do 18. 12.,
            v predlogu 2027 do 27. 12.
          </p>
          <Button variant="outline" disabled={!dirty} onClick={() => commit({ ...cenik, prices: clonePrices() })}>
            Ponastavi predlog 2027
          </Button>
        </div>

        {PERSON_RATE_CARDS.map((card, index) => {
          const variable = COMPARE_UNITS.find((unit) => unit.id === card.id);
          return (
            <section
              key={card.id}
              id={card.id === "ocean-1" ? "web-2027" : card.id}
              className={cn(
                "flex w-full min-w-0 scroll-mt-6 flex-col gap-4",
                index > 0 && "border-t border-border/80 pt-10",
              )}
            >
              <h2 className="font-heading text-3xl tracking-tight">{card.name}</h2>
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Fiksne cene WEB</h3>
                <WebCompareCard
                  unitId={card.id}
                  current={cenik.personRates[card.id]}
                  next={cenik.web2027[card.id]}
                  lift={webLift[card.id] ?? null}
                  commission={commission[card.id] ?? null}
                  earlyBooking={earlyBooking[card.id] ?? null}
                  onCommission={(percent) => setCommission(card.id, percent)}
                  onEarlyBooking={(percent) => setEarlyBooking(card.id, percent)}
                  onChangeCurrent={(seasonId, guests, amount) => setPersonRate(card.id, seasonId, guests, amount)}
                  onChangeNext={(seasonId, guests, amount) => setWeb2027(card.id, seasonId, guests, amount)}
                  onResetCurrent={() => resetPersonRate(card.id)}
                  onResetNext={() => resetWeb2027(card.id)}
                  onLift={(percent) => liftWeb2027(card.id, percent)}
                />
              </div>
              <div id={card.id === "ocean-1" ? "primerjava" : undefined} className="flex flex-col gap-2">
                <h3 className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Variabilne cene</h3>
                {card.id === "beach-4" ? (
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Razpon za Booking in Airbnb. V izhodišču 2026 je ni. Obdobja so enaka kot pri
                    ostalih bungalovih v predlogu 2027.
                  </p>
                ) : null}
                {variable?.has2026 ? (
                  <CompareCard
                    unitId={card.id}
                    name={variable.name}
                    detail={variable.detail}
                    prices={prices[card.id]}
                    summary={shiftSentence(card.id, prices)}
                    capacity={card.capacity}
                    commission={commission[card.id] ?? null}
                    earlyBooking={earlyBooking[card.id] ?? null}
                    onChange={(periodId, next) => setPrice(card.id, periodId, next)}
                    onReset={() => resetUnit(card.id)}
                  />
                ) : (
                  <BeachCard
                    prices={prices["beach-4"]}
                    capacity={card.capacity}
                    commission={commission[card.id] ?? null}
                    earlyBooking={earlyBooking[card.id] ?? null}
                    onChange={(periodId, next) => setPrice("beach-4", periodId, next)}
                    onReset={() => resetUnit("beach-4")}
                  />
                )}
              </div>
            </section>
          );
        })}

        <Rules />
        </>
        ) : null}
      </main>
    </div>
  );
}

function WebCompareCard({
  unitId,
  current,
  next,
  lift,
  commission,
  earlyBooking,
  onCommission,
  onEarlyBooking,
  onChangeCurrent,
  onChangeNext,
  onResetCurrent,
  onResetNext,
  onLift,
}: {
  unitId: string;
  current: PersonRates[string];
  next: PersonRates[string];
  lift: number | null;
  commission: number | null;
  earlyBooking: number | null;
  onCommission: (percent: number) => void;
  onEarlyBooking: (percent: number) => void;
  onChangeCurrent: (seasonId: PersonSeasonId, guests: number, amount: number | null) => void;
  onChangeNext: (seasonId: PersonSeasonId, guests: number, amount: number | null) => void;
  onResetCurrent: () => void;
  onResetNext: () => void;
  onLift: (percent: number) => void;
}) {
  const card = personRateCard(unitId);
  if (!card || !current || !next) return null;
  const linkedToFamily = unitId === "beach-4";
  const guests = personColumns(card.capacity);
  const currentChanged = PERSON_SEASONS.some((season) =>
    guests.some((count) => current[season.id]?.[count] !== card.seasons[season.id][count]),
  );
  const nextChanged = webYearFilled(next, guests);
  const priceWidth = `${(100 - 18) / (guests.length * 2)}%`;

  return (
    <article className="w-full min-w-0 overflow-hidden rounded-2xl ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1915] px-4 py-3 text-[#f6f1e7]">
        <div>
          <h3 className="font-heading text-lg tracking-tight">{card.name}</h3>
          <p className="text-xs text-white/70">{card.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={!currentChanged} onClick={onResetCurrent}>
            Ponastavi WEB
          </Button>
          {linkedToFamily && lift == null ? null : (
            <Button size="sm" variant="secondary" disabled={!nextChanged} onClick={onResetNext}>
              Počisti 2027
            </Button>
          )}
        </div>
      </div>
      <p className="bg-[#f8f1e4] px-4 py-2.5 text-sm leading-relaxed text-[#3f3424]">
        {discountSentence(card)}
        {card.capacity >= 3 ? ` ${childStaySentence()}` : ""}
        {card.note ? ` ${card.note}` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#e6d5e0] bg-[#f6eef4] px-4 py-2">
        <p className="text-sm text-[#6b3058]">
          <span className="font-medium">Provizija agencije</span>
          <span className="ml-2">koliko ostane na osebo</span>
        </p>
        <PercentLift
          label={`${card.name}, provizija agencije`}
          value={commission}
          onApply={onCommission}
          action="Izračunaj"
          parse={parseCommission}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#d5e0e8] bg-[#e4eef2] px-4 py-2">
        <p className="text-sm text-[#1e3a46]">
          <span className="font-medium">Early booking</span>
          <span className="ml-2">popust na osebo</span>
        </p>
        <PercentLift
          label={`${card.name}, Early booking`}
          value={earlyBooking}
          onApply={onEarlyBooking}
          action="Izračunaj"
          parse={parseCommission}
        />
        <p className="w-full text-xs leading-relaxed text-[#1e3a46]">
          Ostanek = polna cena − agencija − early booking. Oba odbitka sta od polne cene. V celici je
          najprej bungalov, spodaj ista računica na osebo.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#e4d8c4] bg-[#f3e6c8] px-4 py-2">
        <p className="text-sm text-[#3f3424]">
          <span className="font-medium">2027</span>
          <span className="ml-2">
            {linkedToFamily && lift == null
              ? "enako kot Bungalow I - Family, ali dvigni od WEB"
              : "vse cene od WEB"}
          </span>
        </p>
        <PercentLift label={`${card.name}, odstotek dviga 2027`} value={lift} onApply={onLift} />
      </div>
      <div className="max-w-full overflow-hidden bg-card">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[18%]" />
            {guests.map((count) => (
              <col key={`web-${count}`} style={{ width: priceWidth }} />
            ))}
            {guests.map((count) => (
              <col key={`next-${count}`} style={{ width: priceWidth }} />
            ))}
          </colgroup>
          <thead>
            <tr className="text-xs tracking-wide text-[#5c5142] uppercase">
              <th rowSpan={2} className={cn(headCell, "bg-[#efe6d4] text-left")}>
                Obdobje
              </th>
              <th colSpan={guests.length} className={cn(headCell, "bg-[#e4eef2] text-center")}>
                WEB
              </th>
              <th colSpan={guests.length} className={cn(headCell, "bg-[#f3e6c8] text-center")}>
                2027
                <span className="mt-0.5 block text-[10px] font-normal tracking-normal normal-case">
                  min. {PERSON_FLOOR_2027} € na osebo
                </span>
              </th>
            </tr>
            <tr className="text-xs tracking-wide text-[#5c5142] uppercase">
              {guests.map((count) => (
                <th key={`web-${count}`} className={cn(headCell, "bg-[#e4eef2] text-right")}>
                  {guestLabel(count)}
                </th>
              ))}
              {guests.map((count) => (
                <th key={`next-${count}`} className={cn(headCell, "bg-[#f3e6c8] text-right")}>
                  {guestLabel(count)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERSON_SEASONS.map((season) => (
              <tr key={season.id} className={SEASON_SOFT[season.id]}>
                <td className={cn(bodyCell, "text-left")}>
                  <span className="font-medium">{season.label}</span>
                  {season.ranges.map((range) => (
                    <span key={`${range.from}-${range.to}`} className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                      {formatSeasonRange(range.from, range.to)}
                    </span>
                  ))}
                </td>
                {guests.map((count) => {
                  const amount = current[season.id]?.[count] ?? null;
                  return (
                    <td key={`web-${count}`} className={cn(bodyCell, "text-right")}>
                      <EuroInput
                        label={`${card.name}, WEB, ${season.label}, ${guestLabel(count)}`}
                        value={amount}
                        onChange={(value) => onChangeCurrent(season.id, count, value)}
                      />
                      {amount != null ? (
                        <DiscountLines
                          amount={amount}
                          commission={commission}
                          earlyBooking={earlyBooking}
                          who="za bungalov"
                        />
                      ) : null}
                      <PerPerson amount={amount} guests={count} commission={commission} earlyBooking={earlyBooking} />
                    </td>
                  );
                })}
                {guests.map((count) => {
                  const amount = next[season.id]?.[count] ?? null;
                  return (
                    <td key={`next-${count}`} className={cn(bodyCell, "text-right")}>
                      <EuroInput
                        label={`${card.name}, 2027, ${season.label}, ${guestLabel(count)}`}
                        value={amount}
                        pending={amount == null && !(linkedToFamily && lift == null)}
                        readOnly={linkedToFamily && lift == null}
                        onChange={(value) => onChangeNext(season.id, count, value)}
                      />
                      {amount != null ? (
                        <DiscountLines
                          amount={amount}
                          commission={commission}
                          earlyBooking={earlyBooking}
                          who="za bungalov"
                        />
                      ) : null}
                      <PerPerson amount={amount} guests={count} commission={commission} earlyBooking={earlyBooking} floor2027 />
                      {amount != null ? (
                        <span className="mt-0.5 block text-xs">
                          <Delta base={current[season.id]?.[count] ?? null} next={amount} />
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function PercentLift({
  value,
  onApply,
  label,
  action = "Dvigni",
  parse = parsePercent,
}: {
  value: number | null;
  onApply: (percent: number) => void;
  label: string;
  action?: string;
  parse?: (raw: string) => number | null;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft === null ? percentText(value) : draft;
  const parsed = parse(text);

  function apply() {
    if (parsed === null) return;
    onApply(parsed);
    setDraft(null);
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <Input
          aria-label={label}
          size={3}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          placeholder="0"
          onFocus={() => setDraft(percentText(value))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
          onChange={(event) => {
            const raw = event.target.value.replace(/[^\d,.-]/g, "").slice(0, 5);
            setDraft(raw);
          }}
          className="h-8 w-14 rounded-md border-transparent bg-white px-1.5 pr-5 text-right text-sm tabular-nums shadow-none"
        />
        <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[11px] text-muted-foreground">
          %
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={parsed === null}
        onMouseDown={(event) => event.preventDefault()}
        onClick={apply}
      >
        {action}
      </Button>
    </div>
  );
}

function percentText(value: number | null): string {
  if (value === null) return "";
  return new Intl.NumberFormat("sl-SI", { maximumFractionDigits: 1 }).format(value);
}

function PerPerson({
  amount,
  guests,
  floor2027,
  commission,
  earlyBooking,
}: {
  amount: number | null;
  guests: number;
  floor2027?: boolean;
  commission?: number | null;
  earlyBooking?: number | null;
}) {
  const each = pricePerPerson(amount, guests);
  const underFloor = floor2027 === true && belowPersonFloor2027(each);
  if (each == null) return null;
  return (
    <span className="mt-0.5 block text-right text-[11px] leading-tight text-muted-foreground tabular-nums">
      {formatEuro(each)}
      <span className="block">na osebo</span>
      <span className="block">cena za odraslo osebo</span>
      <DiscountLines
        amount={each}
        commission={commission ?? null}
        earlyBooking={earlyBooking ?? null}
        who="na osebo"
      />
      {underFloor ? (
        <span className="block font-medium text-[#8a3b28]">pod minimumom {PERSON_FLOOR_2027} €</span>
      ) : null}
      {guests >= 3 ? (
        <span className="mt-1 block border-t border-[#e4d8c4] pt-1 text-[10px] leading-snug">
          {childPrices(each).map((band) => (
            <span key={band.id} className="mt-0.5 block">
              {band.free ? `${band.label}: brezplačno` : `${band.label}: ${formatEuro(band.amount)} (−${band.offPercent} %)`}
              {band.free ? null : (
                <DiscountLines amount={band.amount} commission={commission ?? null} earlyBooking={earlyBooking ?? null} />
              )}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

function DiscountLines({
  amount,
  commission,
  earlyBooking,
  who,
}: {
  amount: number;
  commission: number | null;
  earlyBooking: number | null;
  who?: string;
}) {
  const priced = afterDiscounts(amount, earlyBooking, commission);
  if ((priced.agency == null && priced.early == null) || priced.left == null) return null;
  const both = priced.agency != null && priced.early != null;
  return (
    <span className="mt-1 block border-t border-[#e4d8c4] pt-1">
      {who ? <span className="block">{who}</span> : null}
      <span className="block">polna cena {formatEuro(amount)}</span>
      {priced.agency != null ? (
        <span className="block font-medium text-[#6b3058]">− agencija {formatEuro(priced.agency)}</span>
      ) : null}
      {priced.early != null ? (
        <span className="block font-medium text-[#1e3a46]">− early booking {formatEuro(priced.early)}</span>
      ) : null}
      <span className="block font-medium text-[#1c1915]">
        {both ? "ostane po obeh" : "ostane"} {formatEuro(priced.left)}
      </span>
    </span>
  );
}

function PersonNet({
  amount,
  guests,
  commission,
  earlyBooking,
}: {
  amount: number | null;
  guests: number;
  commission: number | null;
  earlyBooking: number | null;
}) {
  if (commission == null && earlyBooking == null) return null;
  const each = pricePerPerson(amount, guests);
  if (each == null) return null;
  return (
    <span className="mt-0.5 block text-right text-[11px] leading-tight text-muted-foreground">
      <DiscountLines amount={each} commission={commission} earlyBooking={earlyBooking} who="na osebo" />
    </span>
  );
}

function webYearFilled(rows: PersonRates[string], guests: number[]): boolean {
  return PERSON_SEASONS.some((season) => guests.some((count) => rows[season.id]?.[count] != null));
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
                <td className="px-4 py-3 font-medium">Bungalow I - Family · 4+0</td>
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
        <div className="border-t border-[#e4d8c4] bg-[#f3e6c8] px-4 py-3 text-sm leading-relaxed text-[#3f3424]">
          <p className="font-medium">Minimalna cena 2027</p>
          <p className="mt-1">{PERSON_FLOOR_2027} € na osebo, pri vseh bungalovih, celo leto.</p>
        </div>
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
  capacity,
  commission,
  earlyBooking,
  onChange,
  onReset,
}: {
  unitId: string;
  name: string;
  detail: string;
  prices: Record<string, Money>;
  summary: string;
  capacity: number;
  commission: number | null;
  earlyBooking: number | null;
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
        <table className="w-full table-fixed border-collapse text-sm">
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
                  <td className={cn(bodyCell, "text-right")}>
                    <span className="tabular-nums whitespace-nowrap">{formatEuro(base.min)}</span>
                    <PersonNet amount={base.min} guests={capacity} commission={commission} earlyBooking={earlyBooking} />
                  </td>
                  <td className={cn(bodyCell, "text-right")}>
                    <span className="tabular-nums whitespace-nowrap">{formatEuro(base.max)}</span>
                    <PersonNet amount={base.max} guests={capacity} commission={commission} earlyBooking={earlyBooking} />
                  </td>
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
                    <PersonNet amount={next.min} guests={capacity} commission={commission} earlyBooking={earlyBooking} />
                  </td>
                  <td className={cn(bodyCell, "text-right")}>
                    <EuroInput
                      label={`${name}, ${SEASON_LABEL[period.season]} od ${period.from2027}, max 2027`}
                      value={next.max}
                      onChange={(max) => onChange(period.id, { ...next, max })}
                    />
                    <PersonNet amount={next.max} guests={capacity} commission={commission} earlyBooking={earlyBooking} />
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
  capacity,
  commission,
  earlyBooking,
  onChange,
  onReset,
}: {
  prices: Record<string, Money>;
  capacity: number;
  commission: number | null;
  earlyBooking: number | null;
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
        <table className="w-full table-fixed border-collapse text-sm">
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
                    <PersonNet amount={price.min} guests={capacity} commission={commission} earlyBooking={earlyBooking} />
                  </td>
                  <td className={cn(bodyCell, "text-right")}>
                    <EuroInput
                      label={`Beach Villa, ${SEASON_LABEL[period.season]} od ${period.from2027}, max`}
                      value={price.max}
                      pending={pending}
                      onChange={(max) => onChange(period.id, { ...price, max })}
                    />
                    <PersonNet amount={price.max} guests={capacity} commission={commission} earlyBooking={earlyBooking} />
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
