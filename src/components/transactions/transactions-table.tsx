"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react";
import type { TransactionListItem } from "@/lib/queries/transactions";
import {
  buildTransactionsPageUrl,
  type TransactionFilterState,
} from "@/lib/transactions/filter-state";
import { formatDate, formatPln, formatPlnSigned } from "@/lib/format";
import { accumulateFlows } from "@/lib/transactions/cashflow-amounts";
import { TransactionsEmptyState } from "@/components/transactions/transactions-empty-state";
import { cn } from "@/lib/utils";

interface TransactionsTableProps {
  items: TransactionListItem[];
  total: number;
  page: number;
  pageSize: number;
  filterState: TransactionFilterState;
  grouped?: boolean;
  onSelect?: (id: string) => void;
  pageHref?: (page: number) => string;
  onPageChange?: (page: number) => void;
}

const typeConfig = {
  income: { icon: ArrowDownLeft, color: "text-emerald-700 bg-emerald-50", label: "Przychód" },
  expense: { icon: ArrowUpRight, color: "text-red-700 bg-red-50", label: "Wydatek" },
  transfer: { icon: ArrowLeftRight, color: "text-blue-700 bg-blue-50", label: "Transfer" },
  exchange: { icon: ArrowLeftRight, color: "text-violet-700 bg-violet-50", label: "Wymiana" },
  adjustment: { icon: ArrowLeftRight, color: "text-slate-700 bg-slate-100", label: "Korekta" },
};

interface DayGroup {
  date: string;
  items: TransactionListItem[];
  income: number;
  expense: number;
  net: number;
}

function groupItemsByDay(items: TransactionListItem[]): DayGroup[] {
  const map = new Map<string, TransactionListItem[]>();
  for (const t of items) {
    const list = map.get(t.date) ?? [];
    list.push(t);
    map.set(t.date, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayItems]) => {
      const { income, expense, net } = accumulateFlows(dayItems);
      return { date, items: dayItems, income, expense, net };
    });
}

function TransactionRow({
  t,
  onSelect,
}: {
  t: TransactionListItem;
  onSelect?: (id: string) => void;
}) {
  const cfg = typeConfig[t.type] ?? typeConfig.adjustment;
  const Icon = cfg.icon;
  const displayAmount = t.amountPln ?? t.pendingAmountPln;
  const amountPending = t.amountPln == null && t.pendingAmountPln != null;
  const originalAmount = t.originalAmount ?? (t.pendingAmount != null ? Math.abs(t.pendingAmount) : null);
  const currency = t.currency ?? t.pendingCurrency ?? "PLN";
  const rate = t.exchangeRate ?? t.pendingExchangeRate ?? 1;

  const isInflow =
    displayAmount != null &&
    (t.type === "income"
      ? displayAmount > 0
      : t.type === "expense"
        ? displayAmount > 0
        : false);

  const amountDisplay =
    t.type === "transfer" && displayAmount != null
      ? formatPlnSigned(displayAmount).replace("+", "")
      : formatPlnSigned(displayAmount);

  const source =
    t.sourceAccount ?? (t.pendingSourceAccount || null);
  const target =
    t.targetAccount ?? (t.pendingTargetAccount || null);

  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-slate-50/60">
      <td className="whitespace-nowrap px-3 py-2.5 text-muted sm:px-4">
        {formatDate(t.date)}
      </td>
      <td className="px-3 py-2.5 sm:px-4">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
            cfg.color
          )}
        >
          <Icon className="h-3 w-3" />
          <span className="hidden sm:inline">{cfg.label}</span>
        </span>
      </td>
      <td className="hidden px-4 py-2.5 md:table-cell">
        <div className="font-medium text-foreground">{t.category ?? "—"}</div>
        {t.subcategory && (
          <div className="text-xs text-muted">{t.subcategory}</div>
        )}
      </td>
      <td className="hidden max-w-[120px] truncate px-4 py-2.5 text-muted lg:table-cell">
        {source ?? (t.type !== "transfer" ? t.accountLabel : "—")}
      </td>
      <td className="hidden max-w-[120px] truncate px-4 py-2.5 text-muted lg:table-cell">
        {target ?? (t.type === "transfer" ? "—" : "")}
      </td>
      <td
        className="max-w-[140px] truncate px-3 py-2.5 text-muted sm:max-w-[200px] sm:px-4"
        title={t.details ?? ""}
      >
        {t.details || "—"}
      </td>
      <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted xl:table-cell">
        {originalAmount != null ? originalAmount.toLocaleString("pl-PL") : "—"}
      </td>
      <td className="hidden px-4 py-2.5 text-muted xl:table-cell">{currency}</td>
      <td className="hidden px-4 py-2.5 text-right text-muted xl:table-cell">
        {currency !== "PLN" ? rate : "—"}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums sm:px-4",
          amountPending
            ? "text-amber-700"
            : isInflow
              ? "text-emerald-600"
              : t.type === "income" || t.type === "expense"
                ? "text-red-600"
                : "text-foreground"
        )}
      >
        {amountDisplay}
      </td>
      <td className="px-2 py-2.5 sm:px-3">
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(t.id)}
            className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-foreground"
            title="Szczegóły"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ) : (
          <Link
            href={`/transactions/${t.id}`}
            className="rounded-lg p-1.5 text-muted hover:bg-slate-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Link>
        )}
      </td>
    </tr>
  );
}

function MobileCard({ t, onSelect }: { t: TransactionListItem; onSelect?: (id: string) => void }) {
  const cfg = typeConfig[t.type] ?? typeConfig.adjustment;
  const displayAmount = t.amountPln ?? t.pendingAmountPln;

  const content = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs text-muted">{formatDate(t.date)}</p>
        <p className="mt-0.5 font-medium">{t.category ?? cfg.label}</p>
        <p className="text-xs text-muted">{t.details || t.accountLabel}</p>
      </div>
      <p
        className={cn(
          "text-lg font-bold tabular-nums",
          displayAmount != null && displayAmount > 0
            ? "text-emerald-600"
            : t.type === "income" || t.type === "expense"
              ? "text-red-600"
              : "text-foreground"
        )}
      >
        {formatPlnSigned(displayAmount)}
      </p>
    </div>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(t.id)}
        className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/30 hover:shadow"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={`/transactions/${t.id}`}
      className="block w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/30 hover:shadow"
    >
      {content}
    </Link>
  );
}

export function TransactionsTable({
  items,
  total,
  page,
  pageSize,
  filterState,
  grouped = true,
  onSelect,
  pageHref,
  onPageChange,
}: TransactionsTableProps) {
  const hrefForPage = pageHref ?? ((p: number) => buildTransactionsPageUrl(filterState, p));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const groups = grouped ? groupItemsByDay(items) : null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Kategoria</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Konto źr.</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Konto doc.</th>
              <th className="px-4 py-3 font-medium">Szczegóły</th>
              <th className="hidden px-4 py-3 text-right font-medium xl:table-cell">Kwota</th>
              <th className="hidden px-4 py-3 font-medium xl:table-cell">Wal.</th>
              <th className="hidden px-4 py-3 text-right font-medium xl:table-cell">Kurs</th>
              <th className="px-4 py-3 text-right font-medium">PLN</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <TransactionsEmptyState filterState={filterState} />
                </td>
              </tr>
            ) : grouped && groups ? (
              groups.map((g) => (
                <Fragment key={g.date}>
                  <tr className="bg-slate-50/90">
                    <td colSpan={11} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          {formatDate(g.date)}
                        </span>
                        <div className="flex flex-wrap gap-3 text-xs text-muted">
                          <span className="text-emerald-700">
                            przychody {formatPlnSigned(g.income)}
                          </span>
                          <span className="text-red-700">
                            wydatki {formatPln(g.expense)}
                          </span>
                          <span>
                            {g.items.length}{" "}
                            {g.items.length === 1 ? "transakcja" : "transakcji"}
                          </span>
                          <span
                            className={
                              g.net >= 0 ? "text-emerald-700" : "text-red-700"
                            }
                          >
                            saldo {formatPlnSigned(g.net)}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {g.items.map((t) => (
                    <TransactionRow key={t.id} t={t} onSelect={onSelect} />
                  ))}
                </Fragment>
              ))
            ) : (
              items.map((t) => <TransactionRow key={t.id} t={t} onSelect={onSelect} />)
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {items.length === 0 ? (
          <TransactionsEmptyState filterState={filterState} compact />
        ) : (
          items.map((t) => <MobileCard key={t.id} t={t} onSelect={onSelect} />)
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          {total.toLocaleString("pl-PL")} transakcji · strona {page} z {totalPages} · po{" "}
          {pageSize} na stronę
        </p>
        <div className="flex gap-2">
          {page > 1 &&
            (onPageChange ? (
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
              >
                ← Poprzednia
              </button>
            ) : (
              <Link
                href={hrefForPage(page - 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
              >
                ← Poprzednia
              </Link>
            ))}
          {page < totalPages &&
            (onPageChange ? (
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
              >
                Następna →
              </button>
            ) : (
              <Link
                href={hrefForPage(page + 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
              >
                Następna →
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
