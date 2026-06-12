"use client";

import { AccountEditForm } from "@/components/accounts/account-edit-form";
import { AccountCardPhoto } from "@/components/accounts/account-card-photo";
import { parseAccountMetadata } from "@/lib/accounts/account-metadata";
import type { Account } from "@/types/database";

interface AccountDetailPanelsProps {
  account: Account;
}

export function AccountDetailPanels({ account }: AccountDetailPanelsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <AccountCardPhoto
          accountId={account.id}
          accountType={account.account_type}
          accountName={account.name}
          hasPhoto={Boolean(parseAccountMetadata(account.metadata).card_photo_storage_path)}
        />
      </div>
      <div className="lg:col-span-3">
        <AccountEditForm account={account} />
      </div>
    </div>
  );
}
