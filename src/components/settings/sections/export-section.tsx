"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/format";
import {
  btnPrimary,
  btnSecondary,
  SettingsActionRow,
  SettingsGroup,
  SettingsPanel,
} from "@/components/settings/settings-ui";

const EXPORTS = [
  {
    href: "/api/export?format=zip",
    download: (date: string) => `finanse-backup-${date}.zip`,
    label: "Pełny backup ZIP",
    hint: "Pełna kopia danych",
    primary: true,
  },
  {
    href: "/api/export?format=json",
    download: (date: string) => `finanse-backup-${date}.json`,
    label: "JSON",
    hint: "Dane techniczne",
    primary: false,
  },
  {
    href: "/api/export?format=csv",
    download: (date: string) => `finanse-transakcje-${date}.csv`,
    label: "Transakcje CSV",
    hint: "Lista transakcji",
    primary: false,
  },
  {
    href: "/api/export?format=csv-audit",
    download: (date: string) => `finanse-audit-${date}.csv`,
    label: "Audit log CSV",
    hint: "Historia zmian",
    primary: false,
  },
] as const;

interface ExportSectionProps {
  lastNbpSyncDate: string | null;
}

export function ExportSection({ lastNbpSyncDate }: ExportSectionProps) {
  const date = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);

  const [loading, setLoading] = useState(false);
  const [nbpResult, setNbpResult] = useState<string | null>(null);
  const [nbpError, setNbpError] = useState<string | null>(null);

  async function syncNbp() {
    setLoading(true);
    setNbpError(null);
    setNbpResult(null);
    try {
      const res = await fetch("/api/exchange-rates", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setNbpResult(`Zsynchronizowano ${data.synced} kursów na dzień ${data.date}.`);
    } catch (e) {
      setNbpError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsPanel
      title="Eksport i raporty"
      description="Kopie zapasowe, raporty miesięczne i synchronizacja kursów NBP."
    >
      <SettingsGroup
        title="Eksport danych"
        description="Kopia zapasowa przed czyszczeniem danych lub do audytu."
      >
        {EXPORTS.map((item) => (
          <SettingsActionRow
            key={item.label}
            title={item.label}
            description={item.hint}
            action={
              <a
                href={item.href}
                download={item.download(date)}
                className={item.primary ? btnPrimary : btnSecondary}
              >
                Pobierz
              </a>
            }
          />
        ))}
      </SettingsGroup>

      <SettingsGroup
        title="Raporty miesięczne"
        description="Raport za aktualnie wybrany miesiąc."
        className="mt-8"
      >
        <SettingsActionRow
          title="Raport XLSX"
          description="Przychody, wydatki i kategorie w arkuszu."
          action={
            <a href={`/api/reports/monthly?month=${month}&format=xlsx`} className={btnSecondary}>
              Pobierz
            </a>
          }
        />
        <SettingsActionRow
          title="Raport PDF"
          description="Podsumowanie miesiąca do druku lub archiwum."
          action={
            <a href={`/api/reports/monthly?month=${month}&format=pdf`} className={btnSecondary}>
              Pobierz
            </a>
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Kursy walut NBP" className="mt-8">
        <SettingsActionRow
          title="Synchronizacja kursów"
          description={
            lastNbpSyncDate
              ? `Ostatnia synchronizacja w bazie: ${formatDate(lastNbpSyncDate)}. Kursy EUR, USD, GBP, CHF, CZK.`
              : "Brak zapisanych kursów NBP w bazie. Kursy służą do wyceny portfela i transakcji walutowych."
          }
          action={
            <button type="button" onClick={() => void syncNbp()} disabled={loading} className={btnSecondary}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Synchronizuj
            </button>
          }
        />
        {(nbpResult || nbpError) && (
          <div className="border-t border-border/70 px-4 py-2.5">
            {nbpResult && <p className="text-xs text-emerald-700">{nbpResult}</p>}
            {nbpError && <p className="text-xs text-red-600">{nbpError}</p>}
          </div>
        )}
      </SettingsGroup>
    </SettingsPanel>
  );
}
