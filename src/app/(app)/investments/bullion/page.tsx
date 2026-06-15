import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/layout";
import { BullionShell } from "@/components/investments/bullion/bullion-shell";
import { BullionHero } from "@/components/investments/bullion/bullion-hero";
import { BullionAddCoinForm } from "@/components/investments/bullion/bullion-add-coin-form";
import { BullionVaultCassette } from "@/components/investments/bullion/bullion-vault-cassette";
import { BullionSpotTicker } from "@/components/investments/bullion/bullion-spot-ticker";
import { fetchBullionVault } from "@/lib/queries/bullion-vault";

export const dynamic = "force-dynamic";

export default async function BullionInventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const data = await fetchBullionVault(supabase, user.id);
  const totalFineGrams = data.coins.reduce((s, c) => s + c.fine_grams, 0);

  return (
    <PageContainer>
      <BullionShell>
        <BullionHero
          portfolio={data.portfolio}
          coinCount={data.coins.length}
          totalFineGrams={totalFineGrams}
          vaultCurrentTotal={data.totalVaultCurrent}
        />

        <BullionSpotTicker
          initialPricePerGram={data.spot?.pricePlnPerGram ?? null}
          initialSource={data.spot?.source ?? null}
          initialFetchedAt={data.spot?.fetchedAt ?? null}
        />

        <BullionAddCoinForm />

        <BullionVaultCassette grid={data.grid} eagle={data.eagle} />
      </BullionShell>
    </PageContainer>
  );
}
