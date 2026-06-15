export interface CollectibleMetadata {
  set_number?: string;
  condition?: string;
  purchase_price_pln: number;
  purchase_date: string;
  payment_account_id: string;
  payment_account_name: string;
  estimated_value_pln?: number;
}

export function parseCollectibleMetadata(
  raw: Record<string, unknown>
): CollectibleMetadata | null {
  if (raw.collectible_kind !== "lego" && raw.purchase_price_pln == null) return null;
  const price = Number(raw.purchase_price_pln);
  if (!raw.purchase_date || Number.isNaN(price)) return null;
  return {
    set_number: raw.set_number ? String(raw.set_number) : undefined,
    condition: raw.condition ? String(raw.condition) : undefined,
    purchase_price_pln: price,
    purchase_date: String(raw.purchase_date),
    payment_account_id: String(raw.payment_account_id ?? ""),
    payment_account_name: String(raw.payment_account_name ?? ""),
    estimated_value_pln:
      raw.estimated_value_pln != null ? Number(raw.estimated_value_pln) : undefined,
  };
}

export function buildCollectibleMetadata(input: {
  set_number?: string;
  condition?: string;
  purchase_price_pln: number;
  purchase_date: string;
  payment_account_id: string;
  payment_account_name: string;
  estimated_value_pln?: number;
}): Record<string, unknown> {
  return {
    collectible_kind: "lego",
    set_number: input.set_number?.trim() || null,
    condition: input.condition?.trim() || null,
    purchase_price_pln: input.purchase_price_pln,
    purchase_date: input.purchase_date,
    payment_account_id: input.payment_account_id,
    payment_account_name: input.payment_account_name,
    estimated_value_pln: input.estimated_value_pln ?? input.purchase_price_pln,
  };
}

export function collectibleDisplayValue(meta: CollectibleMetadata): number {
  return meta.estimated_value_pln ?? meta.purchase_price_pln;
}
