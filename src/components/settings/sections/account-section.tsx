"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  SettingsPanel,
  SettingsRow,
  StatusBadge,
} from "@/components/settings/settings-ui";

interface AccountSectionProps {
  email?: string | null;
  userId?: string | null;
}

export function AccountSection({ email, userId }: AccountSectionProps) {
  const [mfaActive, setMfaActive] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa
      .listFactors()
      .then(({ data, error }) => {
        if (error) {
          setMfaActive(false);
          return;
        }
        const verified =
          data?.totp?.some((f) => f.status === "verified") ||
          data?.phone?.some((f) => f.status === "verified");
        setMfaActive(Boolean(verified));
      })
      .catch(() => setMfaActive(false));
  }, []);

  async function copyId() {
    if (!userId) return;
    await navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SettingsPanel
      title="Konto i bezpieczeństwo"
      description="Dane użytkownika oraz ustawienia zabezpieczeń."
    >
      <div className="divide-y divide-border/70 rounded-lg border border-border/80 bg-card">
        <SettingsRow title="Email" description="Adres logowania do aplikacji.">
          <span className="text-sm text-foreground">{email ?? "—"}</span>
        </SettingsRow>

        <SettingsRow title="ID użytkownika" description="Identyfikator techniczny.">
          {userId ? (
            <div className="flex items-center justify-end gap-2">
              <code className="max-w-[12rem] truncate font-mono text-xs text-muted sm:max-w-xs">
                {userId}
              </code>
              <button
                type="button"
                onClick={() => void copyId()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted transition hover:bg-slate-50 hover:text-foreground"
                aria-label="Kopiuj ID"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          ) : (
            <span className="text-sm text-muted">—</span>
          )}
        </SettingsRow>

        <SettingsRow
          title="Uwierzytelnianie dwuskładnikowe (MFA)"
          description="MFA włączysz w Supabase Dashboard → Authentication → MFA."
        >
          <StatusBadge
            tone={
              mfaActive === null ? "neutral" : mfaActive ? "success" : "warning"
            }
          >
            {mfaActive === null ? "Sprawdzanie…" : mfaActive ? "Aktywne" : "Nieaktywne"}
          </StatusBadge>
        </SettingsRow>
      </div>
    </SettingsPanel>
  );
}
