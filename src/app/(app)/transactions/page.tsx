import { PageHeader } from "@/components/page-header";

export default function TransactionsPage() {
  return (
    <div>
      <PageHeader
        title="Transakcje"
        description="Lista przychodów, wydatków i transferów — Faza 4."
      />
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted">
        Moduł transakcji w przygotowaniu.
      </div>
    </div>
  );
}
