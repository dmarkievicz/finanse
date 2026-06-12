import { BullionShell } from "@/components/investments/bullion/bullion-shell";
import { BullionHero } from "@/components/investments/bullion/bullion-hero";
import { BullionSpotTicker } from "@/components/investments/bullion/bullion-spot-ticker";
import { BullionPurchaseWizard } from "@/components/investments/bullion/bullion-purchase-wizard";
import { BullionVaultGrid } from "@/components/investments/bullion/bullion-vault-grid";
import { createClient } from "@/lib/supabase/server";
import { fetchBullionInventory } from "@/lib/queries/bullion";
import { fetchBullionPaymentAccounts } from "@/lib/queries/bullion-accounts";
import { fetchGoldSpotPrice } from "@/lib/gold/spot-price";

export const dynamic = "force-dynamic";

export default async function BullionInventoryPage() {
  const supabase = await createClient();

  let spot: Awaited<ReturnType<typeof fetchGoldSpotPrice>> | null = null;
  try {
    spot = await fetchGoldSpotPrice();
  } catch {
    spot = null;
  }

  const [data, bankAccounts] = await Promise.all([
    fetchBullionInventory(supabase, spot),
    fetchBullionPaymentAccounts(supabase),
  ]);

  return (
    <BullionShell>
      <BullionHero
        itemCount={data.items.length}
        totalInvested={data.totalInvested}
        totalSpotValue={data.totalSpotValue}
        totalFineGrams={data.totalFineGrams}
        totalSpotPnl={data.totalSpotPnl}
      />

      <BullionSpotTicker
        initialPricePerGram={data.spotPricePlnPerGram}
        initialSource={data.spotSource}
        initialFetchedAt={data.spotFetchedAt}
      />

      <BullionPurchaseWizard
        bankAccounts={bankAccounts}
        spotPricePerGram={data.spotPricePlnPerGram}
      />

      <BullionVaultGrid items={data.items} />
    </BullionShell>
  );
}
