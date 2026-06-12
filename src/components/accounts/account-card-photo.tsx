"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, CreditCard, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import type { AccountType } from "@/types/database";
import { accountPhotoLabel } from "@/lib/accounts/account-metadata";
import { ACCOUNT_TYPE_LABELS } from "@/lib/queries/accounts";
import { cn } from "@/lib/utils";

interface AccountCardPhotoProps {
  accountId: string;
  accountType: AccountType;
  accountName: string;
  hasPhoto?: boolean;
  className?: string;
  variant?: "panel" | "compact";
}

export function AccountCardPhoto({
  accountId,
  accountType,
  accountName,
  hasPhoto: initialHasPhoto,
  className,
  variant = "panel",
}: AccountCardPhotoProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [hasPhoto, setHasPhoto] = useState(initialHasPhoto ?? false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = accountPhotoLabel(accountType);
  const isCreditCard = accountType === "credit_card";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounts/${accountId}/photo`);
        const data = await res.json();
        if (!cancelled) {
          setUrl(data.url ?? null);
          setHasPhoto(Boolean(data.path));
        }
      } catch {
        if (!cancelled) {
          setUrl(null);
          setHasPhoto(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/accounts/${accountId}/photo`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd uploadu");

      const urlRes = await fetch(`/api/accounts/${accountId}/photo`);
      const urlData = await urlRes.json();
      setUrl(urlData.url ?? null);
      setHasPhoto(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    if (!confirm("Usunąć zdjęcie karty?")) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/photo`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setUrl(null);
      setHasPhoto(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setUploading(false);
    }
  }

  if (variant === "compact") {
    return (
      <div className={cn("relative h-10 w-16 overflow-hidden rounded-md bg-slate-100", className)}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : url ? (
          <Image src={url} alt={accountName} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <CreditCard className="h-4 w-4" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        isCreditCard ? "border-orange-200/80" : "border-border",
        className
      )}
    >
      <div
        className={cn(
          "border-b px-4 py-3",
          isCreditCard
            ? "border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50"
            : "border-border bg-slate-50/80"
        )}
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {isCreditCard ? (
            <CreditCard className="h-4 w-4 text-orange-600" />
          ) : (
            <Camera className="h-4 w-4 text-slate-500" />
          )}
          {label}
        </h3>
        <p className="mt-0.5 text-[12px] text-muted">
          {ACCOUNT_TYPE_LABELS[accountType]} · {accountName}
        </p>
      </div>

      <div className="p-4">
        <div className="relative mx-auto aspect-[1.586/1] max-w-sm overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg ring-1 ring-black/10">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : url ? (
            <Image src={url} alt={label} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
              <ImageIcon className="h-10 w-10 opacity-40" />
              <span className="text-[11px] uppercase tracking-wider opacity-60">Brak zdjęcia</span>
            </div>
          )}
          {isCreditCard && !url && !loading && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50",
              isCreditCard
                ? "bg-orange-600 text-white hover:bg-orange-700"
                : "bg-primary text-primary-foreground hover:opacity-90"
            )}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {hasPhoto ? "Zmień zdjęcie" : "Dodaj zdjęcie"}
          </button>
          {hasPhoto && (
            <button
              type="button"
              onClick={() => void removePhoto()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Usuń
            </button>
          )}
        </div>

        <p className="mt-2 text-[11px] text-muted">
          JPG, PNG lub WebP · max 5 MB. Zdjęcie jest prywatne — tylko Twoje konto.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
