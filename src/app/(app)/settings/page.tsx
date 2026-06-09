import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <PageHeader title="Ustawienia" description="Konto, bezpieczeństwo i MFA." />
      <div className="max-w-lg space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium">Konto</h2>
          <p className="mt-2 text-sm text-muted">Email: {user?.email}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium">MFA (uwierzytelnianie dwuskładnikowe)</h2>
          <p className="mt-2 text-sm text-muted">
            Konfiguracja TOTP (Google Authenticator) — Faza 1b. Włącz w Supabase Dashboard →
            Authentication → MFA.
          </p>
        </div>
      </div>
    </div>
  );
}
