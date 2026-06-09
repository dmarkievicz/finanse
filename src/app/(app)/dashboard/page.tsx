import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Podsumowanie finansów — dane pojawią się po imporcie (Faza 3–5)."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Majątek netto", value: "—", sub: "PLN" },
          { label: "Przychody (miesiąc)", value: "—", sub: "PLN" },
          { label: "Wydatki (miesiąc)", value: "—", sub: "PLN" },
          { label: "Stopa oszczędności", value: "—", sub: "%" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-sm text-muted">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
            <p className="text-xs text-muted">{kpi.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted">
          Zalogowany jako <span className="font-medium text-foreground">{user?.email}</span>
        </p>
        <p className="mt-2 text-sm text-muted">
          Faza 1 gotowa — następnie: schemat bazy i import 22 442 transakcji z Excela.
        </p>
      </div>
    </div>
  );
}
