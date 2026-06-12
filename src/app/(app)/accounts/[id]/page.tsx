import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountDetailHero } from "@/components/accounts/account-detail-hero";
import { AccountSettingsSection } from "@/components/accounts/account-settings-section";
import { AccountTransactionsSection } from "@/components/accounts/account-transactions-section";
import { createClient } from "@/lib/supabase/server";
import { fetchAccountDetail } from "@/lib/queries/accounts";
import { fetchAccountTransactionCount } from "@/lib/queries/transactions";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import { rpcAllAccountBalances } from "@/lib/supabase/rpc";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const account = await fetchAccountDetail(supabase, id);
  if (!account) notFound();

  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);
  const today = new Date().toISOString().slice(0, 10);

  const [currentRows, fullRows, transactionCount] = await Promise.all([
    rpcAllAccountBalances(supabase, today, mode),
    rpcAllAccountBalances(supabase, today, "full"),
    fetchAccountTransactionCount(supabase, id),
  ]);

  const accountBalance = currentRows.find((b) => b.account_id === id);
  const historyBalance = fullRows.find((b) => b.account_id === id);

  return (
    <div>
      <Link
        href="/accounts"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wszystkie konta
      </Link>

      <AccountDetailHero
        account={account}
        currentBalance={Number(accountBalance?.balance_pln ?? 0)}
        historyBalance={Number(historyBalance?.balance_pln ?? 0)}
        transactionCount={transactionCount}
      />

      <AccountSettingsSection account={account} />

      <AccountTransactionsSection
        accountId={id}
        accountName={account.name}
        transactionCount={transactionCount}
      />
    </div>
  );
}
