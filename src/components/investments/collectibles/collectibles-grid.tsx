import Link from "next/link";
import { Blocks } from "lucide-react";
import type { CollectibleItem } from "@/lib/queries/collectibles";
import { formatPln } from "@/lib/format";

export function CollectiblesGrid({ items }: { items: CollectibleItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 py-16 text-center">
        <Blocks className="mx-auto h-12 w-12 text-red-700/50" />
        <p className="mt-4 text-lg font-medium text-stone-300">Brak pozycji</p>
        <p className="mt-1 text-[13px] text-stone-500">Dodaj pierwszy zestaw — płatność z banku, nie transfer na „LEGO”</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-stone-500">
        Inwentarz · {items.length} {items.length === 1 ? "pozycja" : "pozycji"}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/investments/${item.id}`}
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-red-500/30 hover:bg-white/10"
          >
            <p className="font-semibold text-stone-100">{item.name}</p>
            {item.collectible.set_number && (
              <p className="text-[12px] text-stone-500">#{item.collectible.set_number}</p>
            )}
            <div className="mt-3 flex justify-between text-sm tabular-nums">
              <span className="text-stone-400">Zakup {formatPln(item.invested_pln)}</span>
              <span className="font-medium text-stone-200">{formatPln(item.display_value_pln)}</span>
            </div>
            {item.collectible.payment_account_name && (
              <p className="mt-2 text-[11px] text-stone-600">z {item.collectible.payment_account_name}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
