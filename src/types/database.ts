/**
 * Typy bazy danych — Faza 2
 * Po `supabase gen types typescript` zastąp tym plikiem wygenerowanym.
 */

export type AccountType =
  | "bank"
  | "cash"
  | "broker"
  | "deposit"
  | "loan"
  | "real_estate"
  | "investment"
  | "other";

export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "exchange"
  | "adjustment";

export type TransactionStatus =
  | "confirmed"
  | "pending"
  | "reconciled"
  | "needs_review";

export type CategoryType = "income" | "expense" | "both";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  is_base: boolean;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  default_currency: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  deleted_at: string | null;
}

export interface Subcategory {
  id: string;
  category_id: string;
  user_id: string;
  name: string;
  created_at: string;
  deleted_at: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  type: TransactionType;
  description: string | null;
  details: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  import_id: string | null;
  status: TransactionStatus;
  validation_issues: ValidationIssue[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface TransactionEntry {
  id: string;
  transaction_id: string;
  user_id: string;
  account_id: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  amount_pln: number;
  sort_order: number;
  created_at: string;
}

export interface Import {
  id: string;
  user_id: string;
  filename: string;
  file_hash: string | null;
  status: "staged" | "validated" | "imported" | "failed";
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  error_rows: number;
  started_at: string;
  completed_at: string | null;
  error_log: unknown;
}

export interface AccountBalance {
  account_id: string;
  account_name: string;
  account_type: AccountType;
  currency: string;
  balance_pln: number;
}

export interface MonthlyCashflow {
  income_pln: number;
  expense_pln: number;
  surplus_pln: number;
}

export interface CategoryBreakdown {
  category_id: string | null;
  category_name: string | null;
  total_pln: number;
  tx_count: number;
}

export interface Database {
  public: {
    Tables: {
      accounts: { Row: Account; Insert: Partial<Account>; Update: Partial<Account> };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> };
      transactions: { Row: Transaction; Insert: Partial<Transaction>; Update: Partial<Transaction> };
      transaction_entries: {
        Row: TransactionEntry;
        Insert: Partial<TransactionEntry>;
        Update: Partial<TransactionEntry>;
      };
      currencies: { Row: Currency; Insert: Partial<Currency>; Update: Partial<Currency> };
    };
  };
}
