import type { AccountsPageAccount } from "@/lib/queries/fetch-accounts-page";
import type { AccountType } from "@/types/database";
import { sortByNamePl } from "@/lib/locale-sort";
import { isGoldLedgerAccount } from "@/lib/accounts/classification";

export type AccountGroupId =
  | "bank"
  | "credit_card"
  | "foreign"
  | "cash"
  | "investments"
  | "other";

export interface AccountGroupSection {
  id: AccountGroupId;
  title: string;
  accounts: AccountsPageAccount[];
  totalPln: number;
}

const GROUP_ORDER: AccountGroupId[] = [
  "bank",
  "credit_card",
  "foreign",
  "cash",
  "investments",
  "other",
];

const GROUP_TITLES: Record<AccountGroupId, string> = {
  bank: "Konta bankowe",
  credit_card: "Karty kredytowe",
  foreign: "Konta walutowe",
  cash: "Gotówka",
  investments: "Inwestycje",
  other: "Inne / archiwalne",
};

const INVESTMENT_TYPES = new Set<AccountType>([
  "broker",
  "investment",
  "real_estate",
  "deposit",
]);

export type AccountsTabId = "active" | "archived" | "hidden" | "all";

export function filterAccountsByTab(
  accounts: AccountsPageAccount[],
  tab: AccountsTabId
): AccountsPageAccount[] {
  switch (tab) {
    case "active":
      return accounts.filter(
        (a) => a.lifecycle_status === "active" && a.show_on_dashboard
      );
    case "archived":
      return accounts.filter((a) => a.lifecycle_status === "archived");
    case "hidden":
      return accounts.filter(
        (a) =>
          a.lifecycle_status === "active" &&
          !a.show_on_dashboard
      );
    case "all":
      return accounts.filter((a) => a.lifecycle_status !== "inactive");
    default:
      return accounts;
  }
}

function assignGroup(account: AccountsPageAccount): AccountGroupId {
  if (
    account.lifecycle_status === "archived" ||
    account.lifecycle_status === "inactive"
  ) {
    return "other";
  }
  if (account.account_type === "credit_card") return "credit_card";
  if (account.account_type === "cash") return "cash";
  if (INVESTMENT_TYPES.has(account.account_type) || account.account_type === "loan") {
    return "investments";
  }
  if (account.currency !== "PLN") return "foreign";
  if (account.account_type === "bank" || account.account_type === "other") return "bank";
  return "other";
}

export function buildAccountGroups(accounts: AccountsPageAccount[]): AccountGroupSection[] {
  const visible = accounts.filter((a) => !isGoldLedgerAccount(a.account_name));
  const buckets = new Map<AccountGroupId, AccountsPageAccount[]>();
  for (const id of GROUP_ORDER) buckets.set(id, []);

  for (const account of visible) {
    buckets.get(assignGroup(account))!.push(account);
  }

  return GROUP_ORDER.flatMap((id) => {
    const items = sortByNamePl(buckets.get(id)!, (a) => a.account_name);
    if (items.length === 0) return [];
    return [
      {
        id,
        title: GROUP_TITLES[id],
        accounts: items,
        totalPln: items.reduce((s, a) => s + a.balance, 0),
      },
    ];
  });
}

export function computeAccountsMetrics(accounts: AccountsPageAccount[]) {
  const visible = accounts.filter((a) => !isGoldLedgerAccount(a.account_name));
  let assets = 0;
  let liabilities = 0;
  let cash = 0;
  let investments = 0;

  for (const a of visible) {
    if (a.balance > 0) assets += a.balance;
    else if (a.balance < 0) liabilities += a.balance;
    if (a.account_type === "cash") cash += a.balance;
    if (
      INVESTMENT_TYPES.has(a.account_type) ||
      a.account_type === "loan" ||
      a.account_type === "broker"
    ) {
      investments += a.balance;
    }
  }

  const activeCount = visible.filter(
    (a) => a.lifecycle_status === "active" && a.show_on_dashboard
  ).length;

  return { assets, liabilities, cash, investments, activeCount };
}
