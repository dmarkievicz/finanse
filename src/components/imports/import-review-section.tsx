import Link from "next/link";
import { AlertCircle, Archive, CheckCircle2, Copy, FileWarning } from "lucide-react";

interface ImportReviewSectionProps {
  needsReviewCount: number;
  confirmedCount?: number;
  reconciledCount?: number;
  errorRows?: number;
  duplicateHashes?: number;
}

export function ImportReviewSection({
  needsReviewCount,
  confirmedCount,
  reconciledCount,
  errorRows = 0,
  duplicateHashes = 0,
}: ImportReviewSectionProps) {
  const cards = [
    {
      href: "/transactions/review",
      label: "Do sprawdzenia",
      description: "Uzupełnij konta i wpisy księgowe",
      count: needsReviewCount,
      icon: FileWarning,
      accent: needsReviewCount > 0 ? "border-amber-200 bg-amber-50" : "border-border bg-card",
      badge: needsReviewCount > 0 ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-600",
    },
    {
      href: "/imports/transactions?status=confirmed",
      label: "Potwierdzone",
      description: "Zaakceptowane po imporcie",
      count: confirmedCount,
      icon: CheckCircle2,
      accent: "border-border bg-card",
      badge: "bg-emerald-100 text-emerald-800",
    },
    {
      href: "/imports/transactions?status=reconciled",
      label: "Pominięte (archiwalne)",
      description: "Oznaczone „nie poprawiaj”",
      count: reconciledCount,
      icon: Archive,
      accent: "border-border bg-card",
      badge: "bg-slate-100 text-slate-700",
    },
    {
      href: "/imports/errors",
      label: "Błędy importu",
      description: "Wiersze z validation_errors",
      count: errorRows,
      icon: AlertCircle,
      accent: errorRows > 0 ? "border-red-200 bg-red-50/50" : "border-border bg-card",
      badge: errorRows > 0 ? "bg-red-600 text-white" : "bg-slate-200 text-slate-600",
    },
    {
      href: "/imports/errors",
      label: "Duplikaty (hash)",
      description: "Powtarzające się import_hash",
      count: duplicateHashes,
      icon: Copy,
      accent: "border-border bg-card",
      badge: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <h2 className="font-semibold text-foreground">Status importu transakcji</h2>
          <p className="mt-1 text-sm text-muted">
            Korekta i weryfikacja danych z Excela — poza głównym widokiem Transakcje.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`rounded-xl border p-4 transition hover:shadow-md ${c.accent}`}
          >
            <div className="flex items-start justify-between gap-2">
              <c.icon className="h-5 w-5 text-muted" />
              {c.count != null && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.badge}`}>
                  {c.count.toLocaleString("pl-PL")}
                </span>
              )}
            </div>
            <p className="mt-3 font-medium">{c.label}</p>
            <p className="mt-1 text-xs text-muted">{c.description}</p>
          </Link>
        ))}
      </div>

      {needsReviewCount > 0 && (
        <div className="mt-4">
          <Link
            href="/transactions/review"
            className="inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Przejdź do kolejki review ({needsReviewCount})
          </Link>
        </div>
      )}
    </section>
  );
}
