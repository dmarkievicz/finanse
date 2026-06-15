"use client";

import Link from "next/link";
import { Blocks } from "lucide-react";
import type { InstrumentDetail } from "@/lib/queries/instruments";
import { parseCollectibleMetadata } from "@/lib/collectibles/collectible-metadata";
import { formatPln } from "@/lib/format";

export function CollectibleDetailSection({ instrument }: { instrument: InstrumentDetail }) {
  const meta = parseCollectibleMetadata(instrument.metadata);
  if (!meta && instrument.instrument_type !== "COLLECTIBLE") return null;

  const m = meta ?? {
    purchase_price_pln: instrument.invested_pln,
    purchase_date: "",
    payment_account_id: "",
    payment_account_name: instrument.account_name ?? "",
  };

  return (
    <div className="rounded-xl border border-red-200/50 bg-red-50/30 p-4 dark:border-red-900/40 dark:bg-red-950/20">
      <div className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
        <Blocks className="h-4 w-4" />
        Kolekcja inwestycyjna
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {m.set_number && (
          <div>
            <dt className="text-muted">Numer zestawu</dt>
            <dd className="font-medium">{m.set_number}</dd>
          </div>
        )}
        {m.condition && (
          <div>
            <dt className="text-muted">Stan</dt>
            <dd className="font-medium">{m.condition}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted">Cena zakupu</dt>
          <dd className="font-medium tabular-nums">{formatPln(m.purchase_price_pln)}</dd>
        </div>
        <div>
          <dt className="text-muted">Płatność z</dt>
          <dd className="font-medium">{m.payment_account_name || "—"}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[12px] text-muted">
        Wydatek z banku, nie transfer na konto „LEGO”.{" "}
        <Link href="/investments/collectibles" className="text-red-700 hover:underline dark:text-red-400">
          Kolekcje LEGO →
        </Link>
      </p>
    </div>
  );
}
