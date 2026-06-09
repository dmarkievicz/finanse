import { PageHeader } from "@/components/page-header";

export default function InvestmentsPage() {
  return (
    <div>
      <PageHeader
        title="Inwestycje"
        description="ETF, obligacje, złoto, lokaty — Faza 7."
      />
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted">
        Moduł inwestycji w przygotowaniu.
      </div>
    </div>
  );
}
