import { createClient } from "@/lib/supabase/server";
import { BullionShell } from "@/components/investments/bullion/bullion-shell";
import { BullionHero } from "@/components/investments/bullion/bullion-hero";
import { BullionAddCoinForm } from "@/components/investments/bullion/bullion-add-coin-form";
import { BullionVaultCassette } from "@/components/investments/bullion/bullion-vault-cassette";
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
    <BullionShell>
      <BullionHero
        portfolio={data.portfolio}
        coinCount={data.coins.length}
        totalFineGrams={totalFineGrams}
        vaultCurrentTotal={data.totalVaultCurrent}
      />

      <BullionAddCoinForm />

      <BullionVaultCassette grid={data.grid} eagle={data.eagle} />
    </BullionShell>
  );
}
