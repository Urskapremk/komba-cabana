"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "cn";
import {
  PERSON_RATE_CARDS,
  PERSON_SEASONS,
  type PersonRates,
  type WebLift,
  formatEuro,
  formatSeasonRange,
  guestLabel,
  optimaGuestNote,
  web2027Columns,
} from "@/lib/pricing";

const BORDO = "#7a1f33";

const SEASON_SOFT: Record<string, string> = {
  zima: "bg-[#eef5fb]",
  "pomlad-jesen": "bg-[#f3f8ef]",
  "poletje-december": "bg-[#fdf6eb]",
};

function seasonWhen(season: (typeof PERSON_SEASONS)[number]): string {
  return season.ranges.map((range) => formatSeasonRange(range.from, range.to, 2027)).join(", ");
}

export function resolvedOptimaNotes(notes: Record<string, string>, pairPercents: WebLift): Record<string, string> {
  const next: Record<string, string> = {};
  for (const card of PERSON_RATE_CARDS) {
    const saved = notes[card.id];
    next[card.id] = saved?.trim() ? saved : optimaGuestNote(card.id, pairPercents[card.id] ?? null);
  }
  return next;
}

export function optimaMessage(web2027: PersonRates, note: string, notes: Record<string, string>): string {
  const lines: string[] = ["Cene WEB 2027", "Komba Cabana", ""];
  const explanation = note.trim();
  if (explanation) {
    lines.push("Obrazložitev cen", explanation, "");
  }
  for (const card of PERSON_RATE_CARDS) {
    lines.push(card.name);
    for (const season of PERSON_SEASONS) {
      const prices = web2027Columns(card.id)
        .map((count) => {
          const amount = web2027[card.id]?.[season.id]?.[count] ?? null;
          return `${guestLabel(count)}: ${formatEuro(amount)}`;
        })
        .join(" · ");
      lines.push(`${season.label} (${seasonWhen(season)})`);
      lines.push(prices);
    }
    const unitNote = notes[card.id]?.trim();
    if (unitNote) lines.push(`Opomba: ${unitNote}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

export function OptimaPlus({
  web2027,
  note,
  notes,
  pairPercents,
  onNote,
  onUnitNote,
}: {
  web2027: PersonRates;
  note: string;
  notes: Record<string, string>;
  pairPercents: WebLift;
  onNote: (text: string) => void;
  onUnitNote: (unitId: string, text: string) => void;
}) {
  const shownNotes = resolvedOptimaNotes(notes, pairPercents);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function copyMessage() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(optimaMessage(web2027, note, shownNotes));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <Label htmlFor="optima-note">Obrazložitev cen</Label>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Velja za ves cenik WEB 2027. Optima Plus jo vidi skupaj s cenami bungalovov.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void copyMessage()}>
            {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
            {copied ? "Kopirano" : "Kopiraj sporočilo"}
          </Button>
        </div>
        <Textarea
          id="optima-note"
          value={note}
          maxLength={4000}
          placeholder="Zakaj so cene take in kaj naj Optima Plus upošteva v letu 2027."
          onChange={(event) => onNote(event.target.value)}
        />
        {copyError ? (
          <p className="text-sm text-destructive" role="status">
            Kopiranje ni uspelo. Besedilo lahko označiš in kopiraš ročno.
          </p>
        ) : null}
      </div>

      {PERSON_RATE_CARDS.map((card) => {
        const columns = web2027Columns(card.id);
        return (
          <section key={card.id} className="flex flex-col gap-3">
            <h2 className="font-heading text-3xl tracking-tight">{card.name}</h2>
            <p className="text-sm text-muted-foreground">Cena WEB na noč, leto 2027. Polni penzion ni vključen.</p>
            <div className="max-w-full overflow-x-auto rounded-xl bg-card" style={{ border: `3px solid ${BORDO}` }}>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f3e6c8] text-xs tracking-wide text-[#5c5142] uppercase">
                    <th className="px-3 py-2 text-left font-medium">Obdobje 2027</th>
                    {columns.map((count) => (
                      <th key={count} className="w-[5.5rem] px-3 py-2 text-right font-medium">
                        {guestLabel(count)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERSON_SEASONS.map((season) => (
                    <tr key={season.id} className={cn("border-t border-[#eadfce]", SEASON_SOFT[season.id])}>
                      <th className="px-3 py-3 text-left font-medium">
                        <span className="block">{season.label}</span>
                        <span className="mt-1 block text-xs font-normal tracking-normal text-[#3f3424] normal-case">
                          {season.ranges.map((range) => (
                            <span key={`${range.from}-${range.to}`} className="block">
                              {formatSeasonRange(range.from, range.to, 2027)}
                            </span>
                          ))}
                        </span>
                      </th>
                      {columns.map((count) => {
                        const amount = web2027[card.id]?.[season.id]?.[count] ?? null;
                        return (
                          <td key={count} className="px-3 py-3 text-right align-top font-medium tabular-nums">
                            {formatEuro(amount)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`optima-note-${card.id}`}>Opomba</Label>
              <Textarea
                id={`optima-note-${card.id}`}
                value={shownNotes[card.id] ?? ""}
                maxLength={2000}
                placeholder={`Opomba za ${card.name}.`}
                onChange={(event) => onUnitNote(card.id, event.target.value)}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
