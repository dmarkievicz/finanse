"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import {
  groupInstrumentsByType,
  type InstrumentRow,
} from "@/lib/queries/instruments";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface InstrumentsRegistryProps {
  instruments: InstrumentRow[];
}

export function InstrumentsRegistry({ instruments }: InstrumentsRegistryProps) {
  const groups = groupInstrumentsByType(instruments);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Rejestr instrumentów</h3>
          <p className="text-xs text-muted">ETF, obligacje, lokaty — z cenami i historią operacji</p>
        </div>
        <Link
          href="/investments/new"
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Nowy instrument
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
          Brak instrumentów.{" "}
          <Link href="/investments/new" className="font-medium text-accent hover:underline">
            Dodaj pierwszy
          </Link>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.type} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-slate-50/80 px-4 py-3">
              <div>
                <h4 className="font-semibold text-foreground">{group.label}</h4>
                <span className="text-xs text-muted">{group.items.length} pozycji</span>
              </div>
              <span className="text-sm font-semibold">{formatPln(group.total)}</span>
            </div>
            <ul className="divide-y divide-border/60">
              {group.items.map((inst) => (
                <li
                  key={inst.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{inst.name}</p>
                    {inst.symbol && <p className="text-xs text-muted">{inst.symbol}</p>}
                    {inst.account_name && (
                      <p className="text-xs text-muted">Konto: {inst.account_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-semibold">{formatPln(inst.market_value_pln)}</p>
                      <p
                        className={cn(
                          "text-xs font-medium",
                          inst.pnl_pln > 0
                            ? "text-emerald-600"
                            : inst.pnl_pln < 0
                              ? "text-red-600"
                              : "text-muted"
                        )}
                      >
                        {inst.invested_pln !== 0 || inst.last_price != null
                          ? formatPln(inst.pnl_pln)
                          : "—"}
                      </p>
                    </div>
                    <Link
                      href={`/investments/${inst.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      Szczegóły
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
