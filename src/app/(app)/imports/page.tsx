import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { ImportStats } from "@/components/imports/import-stats";
import { ImportUpload } from "@/components/imports/import-upload";
import { ClearDataPanel } from "@/components/imports/clear-data-panel";
import { ImportHistory } from "@/components/imports/import-history";
import { ImportReviewSection } from "@/components/imports/import-review-section";
import { createClient } from "@/lib/supabase/server";
import { fetchImportsPage } from "@/lib/queries/imports";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const supabase = await createClient();
  const data = await fetchImportsPage(supabase);

  return (
    <PageContainer>
      <PageHeader
        title="Import"
        description="Wyczyść dane, zaimportuj ponownie z Excela, przeglądaj historię"
      />
      <ImportStats
        transactions={data.stats.transactions}
        accounts={data.stats.accounts}
        categories={data.stats.categories}
        importRows={data.stats.importRows}
      />
      <ImportReviewSection
        needsReviewCount={data.stats.needsReview}
        confirmedCount={data.stats.confirmed}
        reconciledCount={data.stats.reconciled}
        errorRows={data.stats.errorRows}
        duplicateHashes={data.stats.duplicateHashes}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ImportUpload />
        <ClearDataPanel />
      </div>
      <ImportHistory imports={data.imports} />
    </PageContainer>
  );
}
