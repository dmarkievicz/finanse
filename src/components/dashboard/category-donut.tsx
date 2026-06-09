import type { CategorySlice } from "@/lib/queries/dashboard";
import { formatPln } from "@/lib/format";

interface CategoryDonutProps {
  categories: CategorySlice[];
  total: number;
}

function buildConic(categories: CategorySlice[]) {
  let acc = 0;
  return categories
    .map((c) => {
      const start = acc;
      acc += c.pct;
      return `${c.color} ${start}% ${acc}%`;
    })
    .join(", ");
}

export function CategoryDonut({ categories, total }: CategoryDonutProps) {
  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground">Wydatki wg kategorii</h3>
          <p className="text-xs text-muted">Bieżący miesiąc</p>
        </div>
        <p className="py-8 text-center text-sm text-muted">Brak wydatków w tym miesiącu</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Wydatki wg kategorii</h3>
        <p className="text-xs text-muted">Bieżący miesiąc</p>
      </div>
      <div className="flex items-center gap-6">
        <div
          className="relative h-36 w-36 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${buildConic(categories)})` }}
        >
          <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-card text-center">
            <span className="text-lg font-bold text-foreground">
              {formatPln(total).replace(/\s*zł$/, "")}
            </span>
            <span className="text-[10px] text-muted">zł łącznie</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2">
          {categories.map((c) => (
            <li key={c.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-foreground">{c.name}</span>
              </span>
              <span className="font-medium text-muted">{c.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
