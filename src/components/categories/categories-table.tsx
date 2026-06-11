import Link from "next/link";
import type { CategoryListItem } from "@/lib/queries/categories";
import { formatPln } from "@/lib/format";

export function CategoriesTable({ items, monthLabel }: { items: CategoryListItem[]; monthLabel: string }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
        Brak kategorii
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3 text-xs text-muted">
        Wydatki w {monthLabel}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Kategoria</th>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="px-4 py-3 text-right font-medium">Transakcje</th>
              <th className="px-4 py-3 text-right font-medium">Suma PLN</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/categories/${c.id}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{c.type}</td>
                <td className="px-4 py-3 text-right text-muted">{c.txCount}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {c.monthSpent > 0 ? formatPln(c.monthSpent) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
