import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { InstrumentDetailPanel } from "@/components/investments/instrument-detail-panel";
import { createClient } from "@/lib/supabase/server";
import { fetchInstrumentDetail } from "@/lib/queries/instruments";

export const dynamic = "force-dynamic";

export default async function InstrumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const instrument = await fetchInstrumentDetail(supabase, id);

  if (!instrument) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/investments"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Inwestycje
      </Link>
      <PageHeader title={instrument.name} description={instrument.symbol ?? undefined} />
      <InstrumentDetailPanel instrument={instrument} />
    </div>
  );
}
