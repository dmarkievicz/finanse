/**
 * Typy bazy danych — Faza 2
 * Po `supabase gen types typescript` zastąp tym plikiem wygenerowanym.
 */

export type AccountType =
  | "bank"
  | "cash"
  | "credit_card"
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

export type AccountLifecycleStatus = "active" | "inactive" | "archived";

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
  account_number: string | null;
  account_type: AccountType;
  default_currency: string;
  is_active: boolean;
  lifecycle_status: AccountLifecycleStatus;
  show_on_dashboard: boolean;
  include_in_net_worth: boolean;
  needs_review: boolean;
  imported_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AccountManageRow extends AccountBalance {
  lifecycle_status: AccountLifecycleStatus;
  show_on_dashboard: boolean;
  include_in_net_worth: boolean;
  needs_review: boolean;
  tx_count: number;
  opening_balance_pln: number | null;
  has_opening_balance: boolean;
  history_balance_pln: number;
  balance: number;
}

export interface UserSettingsRow {
  user_id: string;
  analysis_start_date: string | null;
  default_view_mode: "current" | "full_history";
  base_currency: string;
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
  is_opening_balance: boolean;
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

export type Database = {
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
      goals: {
        Row: {
          id: string;
          name: string;
          target_amount: number | null;
          current_amount: number;
          target_date: string | null;
          is_active: boolean;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      subcategories: {
        Row: Subcategory;
        Insert: Partial<Subcategory>;
        Update: Partial<Subcategory>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      user_settings: {
        Row: UserSettingsRow;
        Insert: Partial<UserSettingsRow>;
        Update: Partial<UserSettingsRow>;
      };
      get_net_worth: {
        Args: { p_as_of_date?: string; p_mode?: string };
        Returns: number;
      };
      get_account_balances: {
        Args: { p_as_of_date?: string; p_mode?: string };
        Returns: AccountBalance[];
      };
      get_monthly_cashflow: {
        Args: { p_year: number; p_month: number; p_mode?: string };
        Returns: MonthlyCashflow[];
      };
      get_category_breakdown: {
        Args: { p_from: string; p_to: string; p_mode?: string };
        Returns: CategoryBreakdown[];
      };
      get_needs_review_count: { Args: Record<string, never>; Returns: number };
      get_all_account_balances: {
        Args: { p_as_of_date?: string };
        Returns: AccountManageRow[];
      };
      get_accounts_needs_review_count: { Args: Record<string, never>; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
