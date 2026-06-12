export const TROY_OZ_GRAMS = 31.1034768;

export type BullionKind = "coin" | "bar";

export interface GoldBullionMetadata {
  bullion_kind?: BullionKind;
  weight_grams: number;
  purity?: number;
  mint?: string;
  year?: number;
  purchase_price_pln?: number;
  purchase_date?: string;
  payment_account_id?: string;
  payment_account_name?: string;
  photo_storage_path?: string;
}

export function parseGoldBullionMetadata(raw: Record<string, unknown>): GoldBullionMetadata | null {
  const weight = Number(raw.weight_grams);
  if (!Number.isFinite(weight) || weight <= 0) return null;

  return {
    bullion_kind: raw.bullion_kind === "bar" ? "bar" : raw.bullion_kind === "coin" ? "coin" : undefined,
    weight_grams: weight,
    purity: raw.purity != null ? Number(raw.purity) : undefined,
    mint: typeof raw.mint === "string" ? raw.mint : undefined,
    year: raw.year != null ? Number(raw.year) : undefined,
    purchase_price_pln:
      raw.purchase_price_pln != null ? Number(raw.purchase_price_pln) : undefined,
    purchase_date: typeof raw.purchase_date === "string" ? raw.purchase_date : undefined,
    payment_account_id:
      typeof raw.payment_account_id === "string" ? raw.payment_account_id : undefined,
    payment_account_name:
      typeof raw.payment_account_name === "string" ? raw.payment_account_name : undefined,
    photo_storage_path:
      typeof raw.photo_storage_path === "string" ? raw.photo_storage_path : undefined,
  };
}

export function buildGoldBullionMetadata(input: {
  bullion_kind?: BullionKind;
  weight_grams: number;
  purity?: number;
  mint?: string;
  year?: number;
  purchase_price_pln?: number;
  purchase_date?: string;
  payment_account_id?: string;
  payment_account_name?: string;
  photo_storage_path?: string;
}): GoldBullionMetadata {
  return {
    bullion_kind: input.bullion_kind,
    weight_grams: input.weight_grams,
    purity: input.purity,
    mint: input.mint || undefined,
    year: input.year,
    purchase_price_pln: input.purchase_price_pln,
    purchase_date: input.purchase_date,
    payment_account_id: input.payment_account_id,
    payment_account_name: input.payment_account_name,
    photo_storage_path: input.photo_storage_path,
  };
}

/** Premia nad ceną spot (np. 8.5 = +8,5% ponad metal) */
export function premiumOverSpotPercent(
  purchasePricePln: number,
  fineGrams: number,
  spotPlnPerGram: number
): number | null {
  if (fineGrams <= 0 || spotPlnPerGram <= 0) return null;
  const metalValue = fineGrams * spotPlnPerGram;
  if (metalValue <= 0) return null;
  return Math.round(((purchasePricePln / metalValue - 1) * 1000)) / 10;
}

export function fineGoldGrams(meta: GoldBullionMetadata): number {
  const purity = meta.purity != null && meta.purity > 0 && meta.purity <= 1 ? meta.purity : 1;
  return meta.weight_grams * purity;
}

export function bullionPhotoPath(userId: string, instrumentId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${instrumentId}/${Date.now()}-${safe}`;
}
