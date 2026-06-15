import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { InvestmentCategoryGroup } from "@/lib/queries/investments-overview";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface InvestmentsOverviewSectionsProps {
  groups: InvestmentCategoryGroup[];
}

export function InvestmentsOverviewSections({ groups }: InvestmentsOverviewSectionsProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted">
        Brak inwestycji. Zaimportuj transfery lub{" "}
        <Link href="/accounts/new" className="font-medium text-primary hover:underline">
          dodaj konto
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section
          key={group.category}
          className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm"
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3.5 sm:px-5"
            style={{
              background: `linear-gradient(90deg, ${group.color}14, transparent)`,
              borderColor: `${group.color}25`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="h-3 w-3 rounded-full ring-2 ring-white"
                style={{ background: group.color }}
              />
              <h3 className="text-[15px] font-semibold text-foreground">{group.category}</h3>
              <span className="text-[12px] text-muted">({group.items.length})</span>
            </div>
            <span className="text-base font-bold tabular-nums text-foreground">
              {formatPln(group.total)}
            </span>
          </div>

          <ul className="divide-y divide-border/50">
            {group.items.map((item) => (
              <li key={item.id}>
                <Row item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({
  item,
}: {
  item: InvestmentCategoryGroup["items"][number];
}) {
  const inner = (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50/80 sm:px-5">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{item.name}</p>
        {item.subtitle && (
          <p className="mt-0.5 text-[12px] text-muted">{item.subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-4 text-right">
        <div>
          <p className="text-base font-semibold tabular-nums text-foreground">
            {formatPln(item.value_pln)}
          </p>
          {item.pnl_pln != null && item.invested_pln != null && (
            <p
              className={cn(
                "text-[12px] font-medium tabular-nums",
                item.pnl_pln >= 0 ? "text-emerald-600" : "text-red-600"
              )}
            >
              {item.pnl_pln >= 0 ? "+" : ""}
              {formatPln(item.pnl_pln)}
            </p>
          )}
        </div>
        {item.href && (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-primary">
            Otwórz
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );

  if (item.href) {
    return <Link href={item.href}>{inner}</Link>;
  }
  return inner;
}
