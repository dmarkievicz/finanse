import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchCollectiblesInventory } from "@/lib/queries/collectibles";
import { fetchBullionPaymentAccounts } from "@/lib/queries/bullion-accounts";
import { CollectiblesShell } from "@/components/investments/collectibles/collectibles-shell";
import { CollectiblesHero } from "@/components/investments/collectibles/collectibles-hero";
import { CollectiblesPurchaseWizard } from "@/components/investments/collectibles/collectibles-purchase-wizard";
import { CollectiblesGrid } from "@/components/investments/collectibles/collectibles-grid";

export const dynamic = "force-dynamic";

export default async function CollectiblesPage() {
  const supabase = await createClient();
  const [data, bankAccounts] = await Promise.all([
    fetchCollectiblesInventory(supabase),
    fetchBullionPaymentAccounts(supabase),
  ]);

  return (
    <CollectiblesShell>
      <Link
        href="/investments"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-stone-500 hover:text-stone-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Inwestycje
      </Link>

      <CollectiblesHero
        itemCount={data.items.length}
        totalInvested={data.totalInvested}
        totalDisplayValue={data.totalDisplayValue}
      />

      <CollectiblesPurchaseWizard bankAccounts={bankAccounts} />
      <CollectiblesGrid items={data.items} />
    </CollectiblesShell>
  );
}
