import { ACTIVE_ACCOUNT_DEFAULTS } from "@/lib/import/account-defaults";
import type { AccountLifecycleStatus, AccountType } from "@/types/database";
import { ACCOUNT_TYPE_ORDER } from "@/lib/queries/accounts";

export const ACCOUNT_CURRENCIES = ["PLN", "EUR", "USD", "GBP", "CHF"] as const;

const VALID_LIFECYCLE: AccountLifecycleStatus[] = ["active", "inactive", "archived"];

export interface AccountPatchInput {
  name?: string;
  account_number?: string | null;
  account_type?: AccountType;
  default_currency?: string;
  notes?: string | null;
  lifecycle_status?: AccountLifecycleStatus;
  show_on_dashboard?: boolean;
  include_in_net_worth?: boolean;
  needs_review?: boolean;
}

export function buildAccountUpdate(
  body: AccountPatchInput
): { fields: Record<string, unknown>; error?: string } {
  const fields: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return { fields: {}, error: "Podaj nazwę konta" };
    fields.name = name;
  }

  if (body.account_number !== undefined) {
    const num = body.account_number?.trim() || null;
    fields.account_number = num;
  }

  if (body.account_type !== undefined) {
    if (!ACCOUNT_TYPE_ORDER.includes(body.account_type)) {
      return { fields: {}, error: "Niepoprawny typ konta" };
    }
    fields.account_type = body.account_type;
  }

  if (body.default_currency !== undefined) {
    const currency = body.default_currency.trim().toUpperCase();
    if (!ACCOUNT_CURRENCIES.includes(currency as (typeof ACCOUNT_CURRENCIES)[number])) {
      return { fields: {}, error: "Niepoprawna waluta" };
    }
    fields.default_currency = currency;
  }

  if (body.notes !== undefined) {
    fields.notes = body.notes?.trim() || null;
  }

  if (body.lifecycle_status !== undefined) {
    if (!VALID_LIFECYCLE.includes(body.lifecycle_status)) {
      return { fields: {}, error: "Niepoprawny status konta" };
    }
    fields.lifecycle_status = body.lifecycle_status;
    if (body.lifecycle_status === "active") {
      Object.assign(fields, ACTIVE_ACCOUNT_DEFAULTS);
    } else if (body.lifecycle_status === "archived") {
      fields.is_active = false;
      fields.show_on_dashboard = false;
      fields.include_in_net_worth = false;
    } else if (body.lifecycle_status === "inactive") {
      fields.is_active = false;
    }
  }

  if (body.show_on_dashboard !== undefined) {
    fields.show_on_dashboard = body.show_on_dashboard;
  }
  if (body.include_in_net_worth !== undefined) {
    fields.include_in_net_worth = body.include_in_net_worth;
  }
  if (body.needs_review !== undefined) {
    fields.needs_review = body.needs_review;
  }

  return { fields };
}
