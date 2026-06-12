import type { AccountType } from "@/types/database";

export interface AccountMetadata {
  card_photo_storage_path?: string;
}

export function parseAccountMetadata(raw: Record<string, unknown> | null | undefined): AccountMetadata {
  if (!raw || typeof raw !== "object") return {};
  return {
    card_photo_storage_path:
      typeof raw.card_photo_storage_path === "string" ? raw.card_photo_storage_path : undefined,
  };
}

export function accountCardPhotoPath(userId: string, accountId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${accountId}/${Date.now()}-${safe}`;
}

export function accountPhotoLabel(accountType: AccountType): string {
  if (accountType === "credit_card") return "Zdjęcie karty kredytowej";
  if (accountType === "bank") return "Zdjęcie karty / bankowości";
  return "Zdjęcie konta";
}
