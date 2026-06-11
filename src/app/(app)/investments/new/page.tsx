import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { InstrumentCreateForm } from "@/components/investments/instrument-create-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewInstrumentPage() {
  const supabase = await createClient();
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, name")
    .is("deleted_at", null)
    .in("lifecycle_status", ["active", "archived"])
    .order("name");

  if (error) throw error;

  return (
    <div className="space-y-6">
      <Link
        href="/investments"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Inwestycje
      </Link>
      <PageHeader
        title="Nowy instrument"
        description="Dodaj ETF, obligację, lokatę lub inny składnik portfela"
      />
      <InstrumentCreateForm accounts={(accounts ?? []) as { id: string; name: string }[]} />
    </div>
  );
}
