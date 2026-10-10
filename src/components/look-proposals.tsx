"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "cn";

type Variant = "kartice" | "pult" | "seznam";
type SeasonId = "zima" | "pomlad" | "poletje";
type UnitId = "i" | "ii" | "iii" | "iv";

const VARIANTS: { id: Variant; name: string; line: string }[] = [
  {
    id: "kartice",
    name: "Kartice",
    line: "Vsaka sezona je svoja kartica. Leti sta drug ob drugem, brez mreže stolpcev.",
  },
  {
    id: "pult",
    name: "Pult",
    line: "En bungalov na zaslon. Sezono izbereš zgoraj, ceni vpišeš v veliki polji.",
  },
  {
    id: "seznam",
    name: "Seznam",
    line: "Cene tečejo navzdol, kot nastavitve. 2026 in 2027 sta v isti vrstici, ne v tabeli.",
  },
];

const SEASONS: { id: SeasonId; label: string; when: string; wash: string; dot: string }[] = [
  { id: "zima", label: "Zima", when: "11. 1.–28. 3. in 1. 12.–18. 12.", wash: "bg-[#d7e8f5]", dot: "bg-[#7ea6c8]" },
  { id: "pomlad", label: "Pomlad + jesen", when: "29. 3.–13. 7. in 1. 10.–30. 11.", wash: "bg-[#dcecd6]", dot: "bg-[#7da872]" },
  { id: "poletje", label: "Poletje + december", when: "9. 7.–30. 9. in prazniki", wash: "bg-[#f8e0c0]", dot: "bg-[#e0a85a]" },
];

const UNITS: { id: UnitId; name: string; note: string }[] = [
  { id: "i", name: "Bungalow I", note: "Družinski, galerija" },
  { id: "ii", name: "Bungalov II", note: "Eno dodatno ležišče" },
  { id: "iii", name: "Bungalov III", note: "Eno dodatno ležišče" },
  { id: "iv", name: "Beach Villa", note: "Dve dodatni ležišči" },
];

type Money = { two: number; one: number; adult: number; child: string };

const SAMPLE: Record<UnitId, Record<SeasonId, { now: Money; next: Money }>> = {
  i: {
    zima: { now: { two: 420, one: 420, adult: 168, child: "0 € · 105 € · 168 €" }, next: { two: 361, one: 288, adult: 145, child: "0 € · 91 € · 145 €" } },
    pomlad: { now: { two: 530, one: 530, adult: 212, child: "0 € · 133 € · 212 €" }, next: { two: 433, one: 361, adult: 173, child: "0 € · 108 € · 173 €" } },
    poletje: { now: { two: 560, one: 560, adult: 224, child: "0 € · 140 € · 224 €" }, next: { two: 464, one: 391, adult: 186, child: "0 € · 116 € · 186 €" } },
  },
  ii: {
    zima: { now: { two: 350, one: 280, adult: 175, child: "0 € · 88 € · 140 €" }, next: { two: 361, one: 288, adult: 181, child: "0 € · 91 € · 145 €" } },
    pomlad: { now: { two: 420, one: 350, adult: 210, child: "0 € · 105 € · 168 €" }, next: { two: 433, one: 361, adult: 217, child: "0 € · 109 € · 174 €" } },
    poletje: { now: { two: 450, one: 380, adult: 225, child: "0 € · 113 € · 180 €" }, next: { two: 464, one: 391, adult: 232, child: "0 € · 116 € · 186 €" } },
  },
  iii: {
    zima: { now: { two: 330, one: 260, adult: 165, child: "0 € · 83 € · 132 €" }, next: { two: 340, one: 268, adult: 170, child: "0 € · 85 € · 136 €" } },
    pomlad: { now: { two: 390, one: 320, adult: 195, child: "0 € · 98 € · 156 €" }, next: { two: 402, one: 330, adult: 201, child: "0 € · 101 € · 161 €" } },
    poletje: { now: { two: 400, one: 330, adult: 200, child: "0 € · 100 € · 160 €" }, next: { two: 412, one: 340, adult: 206, child: "0 € · 103 € · 165 €" } },
  },
  iv: {
    zima: { now: { two: 380, one: 380, adult: 190, child: "0 € · 95 € · 152 €" }, next: { two: 361, one: 288, adult: 145, child: "0 € · 91 € · 145 €" } },
    pomlad: { now: { two: 490, one: 490, adult: 245, child: "0 € · 123 € · 196 €" }, next: { two: 433, one: 361, adult: 173, child: "0 € · 108 € · 173 €" } },
    poletje: { now: { two: 520, one: 520, adult: 260, child: "0 € · 130 € · 208 €" }, next: { two: 464, one: 391, adult: 186, child: "0 € · 116 € · 186 €" } },
  },
};

function euro(value: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export function LookProposals() {
  const [variant, setVariant] = useState<Variant>("kartice");
  const [unit, setUnit] = useState<UnitId>("i");
  const [season, setSeason] = useState<SeasonId>("zima");
  const current = VARIANTS.find((item) => item.id === variant)!;
  const place = UNITS.find((item) => item.id === unit)!;
  const tone = SEASONS.find((item) => item.id === season)!;
  const prices = SAMPLE[unit][season];

  return (
    <div className="min-h-full bg-[#f4f1ea] text-[#241e18]">
      <header className="border-b border-[#e4d8c4] bg-[#faf7f1]">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-[#3f6f66] uppercase">Predlog, cenik ostane</p>
              <h1 className="font-heading mt-1 text-3xl tracking-tight">Kako bi lahko izgledalo</h1>
            </div>
            <Link href="/" className="text-sm text-[#3f6f66] underline-offset-4 hover:underline">
              Nazaj na cenik
            </Link>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-[#5c5142]">
            Tri smeri za isti vnos: bungalov, sezona, cena 2026 in 2027, zraven odrasla oseba in otrok.
            Številke so primer iz zimskih cen. Tukaj se nič ne shrani.
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            {VARIANTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setVariant(item.id)}
                className={cn(
                  "rounded-2xl px-4 py-3 text-left ring-1 transition",
                  variant === item.id ? "bg-[#1c1915] text-[#f6f1e7] ring-[#1c1915]" : "bg-white ring-[#e4d8c4] hover:bg-[#faf7f1]",
                )}
              >
                <span className="font-heading block text-lg">{item.name}</span>
                <span className={cn("mt-1 block text-sm leading-snug", variant === item.id ? "text-white/75" : "text-[#5c5142]")}>
                  {item.line}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
        <p className="mb-4 text-sm text-[#5c5142]">{current.line}</p>
        {variant === "kartice" ? <Cards unit={unit} onUnit={setUnit} /> : null}
        {variant === "pult" ? (
          <Desk unit={unit} onUnit={setUnit} season={season} onSeason={setSeason} place={place} tone={tone} prices={prices} />
        ) : null}
        {variant === "seznam" ? (
          <ListView unit={unit} onUnit={setUnit} season={season} onSeason={setSeason} place={place} tone={tone} prices={prices} />
        ) : null}
      </main>
    </div>
  );
}

function UnitPills({ unit, onUnit }: { unit: UnitId; onUnit: (id: UnitId) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {UNITS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onUnit(item.id)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-sm",
            unit === item.id ? "bg-[#1c1915] text-[#f6f1e7]" : "bg-white text-[#3f3424] ring-1 ring-[#e4d8c4]",
          )}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}

function YearPair({ now, next }: { now: number; next: number }) {
  const delta = next - now;
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-white/80 px-3 py-2">
        <p className="text-[11px] tracking-wide text-[#5c5142] uppercase">2026</p>
        <p className="font-heading text-2xl tabular-nums">{euro(now)}</p>
      </div>
      <div className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-[#7a1f33]">
        <p className="text-[11px] tracking-wide text-[#7a1f33] uppercase">2027</p>
        <p className="font-heading text-2xl tabular-nums">{euro(next)}</p>
        <p className={cn("text-xs tabular-nums", delta > 0 ? "text-[#1d6b45]" : "text-[#8a3b28]")}>
          {delta > 0 ? "+" : ""}
          {euro(delta)}
        </p>
      </div>
    </div>
  );
}

function ExtraNote({ money, place }: { money: Money; place: string }) {
  return (
    <p className="text-sm leading-relaxed text-[#3f3424]">
      <span className="font-medium">Odrasla {place} {euro(money.adult)}</span>
      <span className="mt-0.5 block text-[#5c5142]">Otrok 0–5, 5–10, 10–15: {money.child}</span>
    </p>
  );
}

function Cards({ unit, onUnit }: { unit: UnitId; onUnit: (id: UnitId) => void }) {
  const place = unit === "i" ? "v galeriji" : "na ležišču";
  return (
    <div className="flex flex-col gap-4">
      <UnitPills unit={unit} onUnit={onUnit} />
      {SEASONS.map((item) => {
        const prices = SAMPLE[unit][item.id];
        return (
          <article key={item.id} className={cn("rounded-3xl p-4 ring-1 ring-black/5 md:p-5", item.wash)}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-2xl">{item.label}</h2>
              <p className="text-xs text-[#5c5142]">{item.when}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-[#5c5142] uppercase">2 osebi</p>
                <YearPair now={prices.now.two} next={prices.next.two} />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-[#5c5142] uppercase">1 oseba</p>
                <YearPair now={prices.now.one} next={prices.next.one} />
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-white/70 px-3 py-3">
              <ExtraNote money={prices.next} place={place} />
              <p className="mt-1 text-xs text-[#5c5142]">Otroške cene so za leto 2027. Odstotek za odrasle ostane polje nad kartico.</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Desk({
  unit,
  onUnit,
  season,
  onSeason,
  place,
  tone,
  prices,
}: {
  unit: UnitId;
  onUnit: (id: UnitId) => void;
  season: SeasonId;
  onSeason: (id: SeasonId) => void;
  place: { name: string; note: string };
  tone: (typeof SEASONS)[number];
  prices: { now: Money; next: Money };
}) {
  const where = unit === "i" ? "v galeriji" : "na dodatnem ležišču";
  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-[#e4d8c4] md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-[#efe6d4] p-3 md:border-r md:border-b-0">
        <p className="px-2 py-2 text-[11px] tracking-wide text-[#5c5142] uppercase">Bungalovi</p>
        <div className="flex gap-2 overflow-x-auto md:flex-col">
          {UNITS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onUnit(item.id)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-left md:w-full",
                unit === item.id ? "bg-[#1c1915] text-[#f6f1e7]" : "hover:bg-[#f6f1e7]",
              )}
            >
              <span className="block text-sm font-medium">{item.name}</span>
              <span className={cn("block text-xs", unit === item.id ? "text-white/70" : "text-[#5c5142]")}>{item.note}</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl">{place.name}</h2>
            <p className="text-sm text-[#5c5142]">{place.note}</p>
          </div>
          <button type="button" className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-[#f6f1e7]" disabled>
            Shrani
          </button>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto">
          {SEASONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSeason(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 ring-[#e4d8c4]",
                season === item.id ? item.wash : "bg-[#faf7f1]",
              )}
            >
              <span className={cn("size-2 rounded-full", item.dot)} />
              {item.label}
            </button>
          ))}
        </div>
        <div className={cn("mt-5 rounded-3xl p-4", tone.wash)}>
          <p className="text-xs text-[#5c5142]">{tone.when}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <PriceField year="2026" label="2 osebi" value={prices.now.two} />
            <PriceField year="2027" label="2 osebi" value={prices.next.two} framed />
            <PriceField year="2026" label="1 oseba" value={prices.now.one} />
            <PriceField year="2027" label="1 oseba" value={prices.next.one} framed />
          </div>
          <div className="mt-4 rounded-2xl bg-white px-3 py-3">
            <ExtraNote money={prices.next} place={where} />
          </div>
        </div>
      </section>
    </div>
  );
}

function PriceField({ year, label, value, framed }: { year: string; label: string; value: number; framed?: boolean }) {
  return (
    <label className={cn("block rounded-2xl bg-white px-3 py-3", framed && "ring-1 ring-[#7a1f33]")}>
      <span className="flex items-baseline justify-between text-xs text-[#5c5142]">
        <span>{label}</span>
        <span className={framed ? "text-[#7a1f33]" : undefined}>{year}</span>
      </span>
      <span className="mt-2 flex items-baseline justify-end gap-1">
        <span className="font-heading text-3xl tabular-nums">{value}</span>
        <span className="text-sm text-[#5c5142]">€</span>
      </span>
    </label>
  );
}

function ListView({
  unit,
  onUnit,
  season,
  onSeason,
  place,
  tone,
  prices,
}: {
  unit: UnitId;
  onUnit: (id: UnitId) => void;
  season: SeasonId;
  onSeason: (id: SeasonId) => void;
  place: { name: string; note: string };
  tone: (typeof SEASONS)[number];
  prices: { now: Money; next: Money };
}) {
  const where = unit === "i" ? "v galeriji" : "na ležišču";
  const rows = [
    { label: "2 osebi", now: prices.now.two, next: prices.next.two },
    { label: "1 oseba", now: prices.now.one, next: prices.next.one },
  ];
  return (
    <div className="flex flex-col gap-4">
      <UnitPills unit={unit} onUnit={onUnit} />
      <div className="flex gap-2 overflow-x-auto">
        {SEASONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSeason(item.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm ring-1 ring-[#e4d8c4]",
              season === item.id ? item.wash : "bg-white",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <article className="overflow-hidden rounded-3xl bg-white ring-1 ring-[#e4d8c4]">
        <div className={cn("px-4 py-4", tone.wash)}>
          <h2 className="font-heading text-2xl">{place.name}</h2>
          <p className="text-sm text-[#5c5142]">{place.note} · {tone.when}</p>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-2 text-[11px] tracking-wide text-[#5c5142] uppercase">
          <span>Kdo</span>
          <span>2026</span>
          <span className="text-[#7a1f33]">2027</span>
        </div>
        <ul>
          {rows.map((row) => (
            <li key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-t border-[#efe6d4] px-4 py-3">
              <span className="font-medium">{row.label}</span>
              <span className="text-right text-lg tabular-nums">{euro(row.now)}</span>
              <span className="rounded-lg px-2 py-1 text-right text-lg tabular-nums ring-1 ring-[#7a1f33]">{euro(row.next)}</span>
            </li>
          ))}
          <li className="border-t border-[#efe6d4] px-4 py-3">
            <ExtraNote money={prices.next} place={where} />
          </li>
        </ul>
      </article>
    </div>
  );
}
