import Link from "next/link";
import {
  SettingsPanel,
  SettingsRow,
  StatusBadge,
} from "@/components/settings/settings-ui";

interface DataSectionProps {
  transactionCount: number;
  reviewCount: number;
}

export function DataSection({ transactionCount, reviewCount }: DataSectionProps) {
  return (
    <SettingsPanel
      title="Dane techniczne"
      description="Statystyki importu i stan weryfikacji transakcji."
    >
      <div className="divide-y divide-border/70 rounded-lg border border-border/80 bg-card">
        <SettingsRow title="Transakcje w bazie" description="Potwierdzone i historyczne wpisy.">
          <span className="text-sm font-medium tabular-nums text-foreground">
            {transactionCount.toLocaleString("pl-PL")}
          </span>
        </SettingsRow>

        <SettingsRow
          title="Do poprawy"
          description="Transakcje wymagające weryfikacji po imporcie."
        >
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm font-medium tabular-nums text-foreground">
              {reviewCount.toLocaleString("pl-PL")}
            </span>
            {reviewCount > 0 && <StatusBadge tone="warning">Wymaga uwagi</StatusBadge>}
          </div>
        </SettingsRow>
      </div>

      {reviewCount > 0 && (
        <p className="mt-4 text-sm">
          <Link href="/transactions/review" className="font-medium text-accent hover:underline">
            Przejdź do weryfikacji transakcji →
          </Link>
        </p>
      )}
    </SettingsPanel>
  );
}
