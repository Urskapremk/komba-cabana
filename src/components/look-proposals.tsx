"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "cn";

type SeasonId = "zima" | "pomlad" | "poletje";
type UnitId = "i" | "ii" | "iii" | "iv";
type Field = "two" | "one";

const SEASONS: { id: SeasonId; label: string; when: string; wash: string; ink: string }[] = [
  { id: "zima", label: "Zima", when: "11. 1.–28. 3. · 1. 12.–18. 12.", wash: "bg-[#d7e8f5]", ink: "text-[#1d4e73]" },
  { id: "pomlad", label: "Pomlad + jesen", when: "29. 3.–13. 7. · 1. 10.–30. 11.", wash: "bg-[#dcecd6]", ink: "text-[#2d5a28]" },
  { id: "poletje", label: "Poletje + december", when: "9. 7.–30. 9. · prazniki", wash: "bg-[#f8e0c0]", ink: "text-[#8a4b12]" },
];

const UNITS: { id: UnitId; short: string; name: string; beds: string; where: string }[] = [
  { id: "i", short: "I", name: "Bungalow I", beds: "Family · galerija", where: "v galeriji" },
  { id: "ii", short: "II", name: "Bungalov II", beds: "1 dodatno ležišče", where: "na ležišču" },
  { id: "iii", short: "III", name: "Bungalov III", beds: "1 dodatno ležišče", where: "na ležišču" },
  { id: "iv", short: "IV", name: "Beach Villa IV", beds: "2 dodatni ležišči", where: "na ležišču" },
];

type Pair = { two: number; one: number };

const BASE: Record<UnitId, Record<SeasonId, { now: Pair; next: Pair }>> = {
  i: {
    zima: { now: { two: 420, one: 420 }, next: { two: 361, one: 288 } },
    pomlad: { now: { two: 530, one: 530 }, next: { two: 433, one: 361 } },
    poletje: { now: { two: 560, one: 560 }, next: { two: 464, one: 391 } },
  },
  ii: {
    zima: { now: { two: 350, one: 280 }, next: { two: 361, one: 288 } },
    pomlad: { now: { two: 420, one: 350 }, next: { two: 433, one: 361 } },
    poletje: { now: { two: 450, one: 380 }, next: { two: 464, one: 391 } },
  },
  iii: {
    zima: { now: { two: 330, one: 260 }, next: { two: 340, one: 268 } },
    pomlad: { now: { two: 390, one: 320 }, next: { two: 402, one: 330 } },
    poletje: { now: { two: 400, one: 330 }, next: { two: 412, one: 340 } },
  },
  iv: {
    zima: { now: { two: 380, one: 380 }, next: { two: 361, one: 288 } },
    pomlad: { now: { two: 490, one: 490 }, next: { two: 433, one: 361 } },
    poletje: { now: { two: 520, one: 520 }, next: { two: 464, one: 391 } },
  },
};

function euro(value: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function adultOnBed(two: number, percent: number) {
  return Math.max(0, Math.round((two / 2) * ((100 - percent) / 100)));
}

export function LookProposals() {
  const [unit, setUnit] = useState<UnitId>("i");
  const [season, setSeason] = useState<SeasonId>("zima");
  const [field, setField] = useState<Field>("two");
  const [percent, setPercent] = useState(20);
  const [typed, setTyped] = useState("");
  const [overrides, setOverrides] = useState<Record<string, Pair>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const place = UNITS.find((item) => item.id === unit)!;
  const tone = SEASONS.find((item) => item.id === season)!;
  const key = `${unit}:${season}`;
  const prices = overrides[key] ?? BASE[unit][season].next;
  const locked = BASE[unit][season].now;
  const shown = typed === "" ? prices[field] : Number(typed);
  const live = {
    two: field === "two" && typed !== "" ? shown : prices.two,
    one: field === "one" && typed !== "" ? shown : prices.one,
  };
  const adult = adultOnBed(live.two, percent);
  const childYoung = Math.round(adult * 0.5);
  const childOlder = Math.round(adult * 0.8);

  const ticket = useMemo(
    () => [
      { label: "2 osebi", now: locked.two, next: live.two },
      { label: "1 oseba", now: locked.one, next: live.one },
      { label: `Odrasla ${place.where}`, now: adultOnBed(locked.two, percent), next: adult },
    ],
    [adult, live.one, live.two, locked.one, locked.two, percent, place.where],
  );

  function press(digit: string) {
    setNotice(null);
    setTyped((current) => {
      const base = current === "" ? "" : current;
      const next = `${base}${digit}`.replace(/^0+(?=\d)/, "");
      return next.slice(0, 4);
    });
  }

  function commit(nextTyped = typed) {
    const amount = nextTyped === "" ? prices[field] : Number(nextTyped);
    if (!Number.isFinite(amount)) return;
    setOverrides((current) => ({ ...current, [key]: { ...prices, [field]: amount } }));
    setTyped("");
  }

  function savePreview() {
    commit();
    setNotice("To je predogled. Shranjene cene ostanejo na prvi strani.");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#10241f] text-[#f6f1e7] lg:h-dvh lg:overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#d4b483]/30 px-4 py-3 md:px-5">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.28em] text-[#d4b483] uppercase">Komba Cabana</p>
          <h1 className="font-heading truncate text-2xl leading-none tracking-tight md:text-3xl">POS · Cenik</h1>
        </div>
        <div className="hidden text-right text-sm text-[#f6f1e7]/70 sm:block">
          <p>Recepcija</p>
          <p className="text-xs text-[#d4b483]">Samo predogled</p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-xl bg-[#1b4338] px-3 py-2 text-sm text-[#f6f1e7] ring-1 ring-[#d4b483]/40"
        >
          Na cenik
        </Link>
      </header>

      <div className="flex flex-1 flex-col lg:min-h-0 lg:grid lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 p-3 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0">
          {UNITS.map((item) => {
            const on = item.id === unit;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  commit();
                  setUnit(item.id);
                  setNotice(null);
                }}
                className={cn(
                  "flex min-w-[148px] items-center gap-3 rounded-2xl px-3 py-3 text-left lg:min-w-0",
                  on ? "bg-[#d4b483] text-[#1c1915]" : "bg-[#1b4338] text-[#f6f1e7] hover:bg-[#245c4c]",
                )}
              >
                <span className={cn("font-heading grid size-11 shrink-0 place-items-center rounded-xl text-lg", on ? "bg-[#1c1915] text-[#d4b483]" : "bg-[#10241f] text-[#d4b483]")}>
                  {item.short}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{item.name}</span>
                  <span className={cn("block text-xs", on ? "text-[#1c1915]/70" : "text-[#f6f1e7]/65")}>{item.beds}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <main className="bg-[#f4efe6] p-3 text-[#1c1915] md:p-5 lg:min-h-0 lg:overflow-y-auto">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SEASONS.map((item) => {
              const on = item.id === season;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    commit();
                    setSeason(item.id);
                    setNotice(null);
                  }}
                  className={cn(
                    "rounded-2xl px-3 py-3 text-left ring-1 ring-black/5",
                    item.wash,
                    on && "ring-2 ring-[#1c1915]",
                  )}
                >
                  <span className={cn("block text-sm font-semibold", item.ink)}>{item.label}</span>
                  <span className="mt-1 block text-xs text-[#3f3424]/80">{item.when}</span>
                </button>
              );
            })}
          </div>

          <div className={cn("mt-3 rounded-3xl p-3 md:p-4", tone.wash)}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-heading text-2xl">{place.name}</h2>
                <p className="text-sm text-[#3f3424]/80">{place.beds}</p>
              </div>
              <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm shadow-sm">
                <span>Dva odrasla, popust</span>
                <input
                  aria-label="Odstotek popusta za dva odrasla na dodatnih ležiščih"
                  inputMode="numeric"
                  value={percent}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) setPercent(Math.min(100, Math.max(0, Math.round(next))));
                  }}
                  className="w-14 bg-transparent text-right text-lg font-semibold tabular-nums outline-none"
                />
                <span>%</span>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <PricePad
                label="2 osebi"
                yearNow={locked.two}
                yearNext={field === "two" && typed !== "" ? shown : prices.two}
                active={field === "two"}
                onPick={() => {
                  commit();
                  setField("two");
                }}
              />
              <PricePad
                label="1 oseba"
                yearNow={locked.one}
                yearNext={field === "one" && typed !== "" ? shown : prices.one}
                active={field === "one"}
                onPick={() => {
                  commit();
                  setField("one");
                }}
              />
            </div>

            <div className="mt-3 grid gap-2 rounded-2xl bg-white/80 p-3 text-sm sm:grid-cols-3">
              <p>
                <span className="block text-xs text-[#5c5142]">Odrasla {place.where}</span>
                <span className="font-heading text-xl tabular-nums">{euro(adult)}</span>
              </p>
              <p>
                <span className="block text-xs text-[#5c5142]">Otrok 5–10</span>
                <span className="font-heading text-xl tabular-nums">{euro(childYoung)}</span>
              </p>
              <p>
                <span className="block text-xs text-[#5c5142]">Otrok 10–15</span>
                <span className="font-heading text-xl tabular-nums">{euro(childOlder)}</span>
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <div className="grid grid-cols-3 gap-2">
              {["7", "8", "9", "4", "5", "6", "1", "2", "3", "C", "0", "←"].map((keycap) => (
                <button
                  key={keycap}
                  type="button"
                  onClick={() => {
                    if (keycap === "C") {
                      setTyped("");
                      setOverrides((current) => ({ ...current, [key]: { ...prices, [field]: 0 } }));
                      return;
                    }
                    if (keycap === "←") {
                      setTyped((current) => (current === "" ? String(prices[field]) : current).slice(0, -1));
                      return;
                    }
                    press(keycap);
                  }}
                  className="h-12 rounded-2xl bg-white text-lg font-semibold shadow-sm ring-1 ring-black/5 active:bg-[#d4b483]"
                >
                  {keycap}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={savePreview}
              className="w-28 rounded-2xl bg-[#10241f] px-3 text-sm font-semibold text-[#f6f1e7]"
            >
              Potrdi ceno
            </button>
          </div>
          {notice ? <p className="mt-3 text-sm text-[#5c5142]">{notice}</p> : null}
        </main>

        <aside className="flex shrink-0 flex-col border-t border-[#e7dcc8] bg-[#fffdf8] text-[#1c1915] lg:border-t-0 lg:border-l">
          <div className="border-b border-[#eadfcd] px-4 py-3">
            <p className="text-[11px] tracking-[0.22em] text-[#7a1f33] uppercase">Listič</p>
            <h2 className="font-heading text-2xl">{place.name}</h2>
            <p className="text-sm text-[#5c5142]">{tone.label}</p>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-4 py-2 text-[11px] tracking-wide text-[#5c5142] uppercase">
            <span />
            <span>2026</span>
            <span className="text-[#7a1f33]">2027</span>
          </div>
          <ul className="px-4">
            {ticket.map((row) => (
              <li key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-t border-[#eadfcd] py-2.5">
                <span className="text-sm">{row.label}</span>
                <span className="text-right tabular-nums">{euro(row.now)}</span>
                <span className="rounded-lg px-2 py-1 text-right font-semibold tabular-nums ring-1 ring-[#7a1f33]">{euro(row.next)}</span>
              </li>
            ))}
          </ul>
          <p className="px-4 py-3 text-xs leading-relaxed text-[#5c5142]">
            Otrok 0–5 je 0 €. 5–10 je {euro(childYoung)}, 10–15 je {euro(childOlder)}. Odrasla cena je polovica cene dveh oseb, znižana za {percent} %.
          </p>
          <div className="mt-auto border-t border-[#eadfcd] p-4">
            <button type="button" onClick={savePreview} className="h-12 w-full rounded-2xl bg-[#7a1f33] text-sm font-semibold text-white">
              Shrani bungalov
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PricePad({
  label,
  yearNow,
  yearNext,
  active,
  onPick,
}: {
  label: string;
  yearNow: number;
  yearNext: number;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5",
        active && "ring-2 ring-[#10241f]",
      )}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-3 grid grid-cols-2 gap-2">
        <span className="rounded-xl bg-[#f4efe6] px-3 py-2">
          <span className="block text-[11px] tracking-wide text-[#5c5142] uppercase">2026</span>
          <span className="font-heading block text-3xl tabular-nums">{yearNow}</span>
        </span>
        <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-[#7a1f33]">
          <span className="block text-[11px] tracking-wide text-[#7a1f33] uppercase">2027</span>
          <span className="font-heading block text-3xl tabular-nums">{yearNext}</span>
        </span>
      </span>
    </button>
  );
}
