import type { AccountManageRow } from "@/types/database";
import type { InstrumentRow } from "@/lib/queries/instruments";

export type DashboardAlertSeverity = "error" | "warning" | "info";

export interface DashboardAlert {
  id: string;
  severity: DashboardAlertSeverity;
  title: string;
  description: string;
  href: string;
  count?: number;
}

interface BuildAlertsInput {
  needsReviewCount: number;
  accountsNeedsReviewCount: number;
  uncategorizedCount: number;
  importErrorRows: number;
  failedImports: number;
  accounts: AccountManageRow[];
  instruments: InstrumentRow[];
  negativeNonLoanAccounts: number;
  archivedInNetWorth: number;
}

export function buildDashboardAlerts(input: BuildAlertsInput): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (input.needsReviewCount > 0) {
    alerts.push({
      id: "tx-review",
      severity: "error",
      title: "Transakcje do poprawy",
      description: `${input.needsReviewCount} transakcji wymaga weryfikacji po imporcie.`,
      href: "/transactions/review",
      count: input.needsReviewCount,
    });
  }

  if (input.accountsNeedsReviewCount > 0) {
    alerts.push({
      id: "acc-review",
      severity: "warning",
      title: "Konta do weryfikacji",
      description: `${input.accountsNeedsReviewCount} kont oznaczonych jako wymagające przeglądu.`,
      href: "/accounts/manage",
      count: input.accountsNeedsReviewCount,
    });
  }

  const missingOpening = input.accounts.filter(
    (a) =>
      a.lifecycle_status === "active" &&
      a.include_in_net_worth &&
      !a.has_opening_balance &&
      a.tx_count > 0
  );
  if (missingOpening.length > 0) {
    alerts.push({
      id: "opening-balance",
      severity: "warning",
      title: "Brak sald początkowych",
      description: `${missingOpening.length} aktywnych kont bez ustawionego salda początkowego.`,
      href: "/accounts/opening",
      count: missingOpening.length,
    });
  }

  if (input.uncategorizedCount > 0) {
    alerts.push({
      id: "uncategorized",
      severity: "info",
      title: "Transakcje bez kategorii",
      description: `${input.uncategorizedCount} potwierdzonych transakcji bez przypisanej kategorii.`,
      href: "/transactions?period=this_month",
      count: input.uncategorizedCount,
    });
  }

  const missingPrices = input.instruments.filter(
    (i) => i.quantity !== 0 && i.last_price == null
  );
  if (missingPrices.length > 0) {
    alerts.push({
      id: "instrument-prices",
      severity: "warning",
      title: "Brak wycen inwestycji",
      description: `${missingPrices.length} instrumentów bez aktualnej ceny rynkowej.`,
      href: "/investments",
      count: missingPrices.length,
    });
  }

  if (input.negativeNonLoanAccounts > 0) {
    alerts.push({
      id: "negative-balance",
      severity: "warning",
      title: "Ujemne salda do sprawdzenia",
      description: `${input.negativeNonLoanAccounts} kont z ujemnym saldem (nie są zobowiązaniami).`,
      href: "/accounts/manage",
      count: input.negativeNonLoanAccounts,
    });
  }

  if (input.archivedInNetWorth > 0) {
    alerts.push({
      id: "archived-nw",
      severity: "info",
      title: "Konta archiwalne w majątku netto",
      description: `${input.archivedInNetWorth} kont archiwalnych nadal uwzględnianych w majątku netto.`,
      href: "/accounts/manage",
      count: input.archivedInNetWorth,
    });
  }

  if (input.importErrorRows > 0) {
    alerts.push({
      id: "import-errors",
      severity: "error",
      title: "Błędy importu",
      description: `${input.importErrorRows} wierszy importu z błędami walidacji.`,
      href: "/imports/errors",
      count: input.importErrorRows,
    });
  }

  if (input.failedImports > 0) {
    alerts.push({
      id: "failed-imports",
      severity: "warning",
      title: "Importy zakończone błędem",
      description: `${input.failedImports} importów wymaga uwagi.`,
      href: "/imports",
      count: input.failedImports,
    });
  }

  const severityOrder: Record<DashboardAlertSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };

  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
