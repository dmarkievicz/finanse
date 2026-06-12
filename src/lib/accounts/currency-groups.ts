import type { AccountRow } from "@/lib/queries/accounts";
import type { AccountType } from "@/types/database";
import { sortByNamePl } from "@/lib/locale-sort";

export const BASE_CURRENCY = "PLN";

export type AccountSectionId = "bank" | "foreign" | "cash" | "investments";

export interface AccountListSection {
  id: AccountSectionId;
  title: string;
  subtitle: string;
  accounts: AccountRow[];
  totalPln: number;
  byType: Partial<Record<AccountType, AccountRow[]>>;
}

const INVESTMENT_TYPES: AccountType[] = ["broker", "investment", "real_estate", "other"];

const SECTION_META: Record<
  AccountSectionId,
  { title: string; subtitle: string; typeOrder: AccountType[] }
> = {
  bank: {
    title: "Konta bankowe",
    subtitle: "PLN · rachunki, karty i lokaty",
    typeOrder: ["bank", "credit_card", "deposit", "loan"],
  },
  foreign: {
    title: "Konta walutowe",
    subtitle: "EUR, USD i inne · salda przeliczone na PLN",
    typeOrder: ["bank", "credit_card", "cash", "broker", "deposit", "investment", "loan", "real_estate", "other"],
  },
  cash: {
    title: "Gotówka",
    subtitle: "PLN · portfel i kasa",
    typeOrder: ["cash"],
  },
  investments: {
    title: "Inwestycje i inne",
    subtitle: "Broker, inwestycje, nieruchomości",
    typeOrder: ["broker", "investment", "real_estate", "other"],
  },
};

export const ACCOUNT_SECTION_ORDER: AccountSectionId[] = [
  "bank",
  "foreign",
  "cash",
  "investments",
];

function classifyAccount(account: AccountRow): AccountSectionId {
  if (account.currency !== BASE_CURRENCY) return "foreign";
  if (account.account_type === "cash") return "cash";
  if (INVESTMENT_TYPES.includes(account.account_type)) return "investments";
  return "bank";
}

function groupByType(
  accounts: AccountRow[],
  typeOrder: AccountType[]
): Partial<Record<AccountType, AccountRow[]>> {
  const map = {} as Record<AccountType, AccountRow[]>;
  for (const type of typeOrder) {
    const items = sortByNamePl(
      accounts.filter((a) => a.account_type === type),
      (a) => a.account_name
    );
    if (items.length > 0) map[type] = items;
  }
  return map;
}

export function buildAccountSections(accounts: AccountRow[]): AccountListSection[] {
  const buckets = new Map<AccountSectionId, AccountRow[]>();
  for (const id of ACCOUNT_SECTION_ORDER) {
    buckets.set(id, []);
  }

  for (const account of accounts) {
    const section = classifyAccount(account);
    buckets.get(section)!.push(account);
  }

  return ACCOUNT_SECTION_ORDER.flatMap((id) => {
    const items = buckets.get(id)!;
    if (items.length === 0) return [];

    const meta = SECTION_META[id];
    return [
      {
        id,
        title: meta.title,
        subtitle: meta.subtitle,
        accounts: items,
        totalPln: items.reduce((s, a) => s + a.balance, 0),
        byType: groupByType(items, meta.typeOrder),
      },
    ];
  });
}

/** @deprecated użyj buildAccountSections */
export function buildCurrencySections(accounts: AccountRow[]): AccountListSection[] {
  return buildAccountSections(accounts);
}

export type CurrencyAccountSection = AccountListSection;
