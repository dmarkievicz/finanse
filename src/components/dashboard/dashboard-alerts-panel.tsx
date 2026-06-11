import Link from "next/link";
import type { DashboardAlert } from "@/lib/dashboard/alerts";
import { cn } from "@/lib/utils";
import { DashboardEmpty, DashboardPanel, DashboardPanelHeader } from "@/components/dashboard/dashboard-ui";

interface DashboardAlertsPanelProps {
  alerts: DashboardAlert[];
}

const dotBySeverity = {
  error: "bg-rose-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
};

export function DashboardAlertsPanel({ alerts }: DashboardAlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <DashboardPanel className="h-full">
        <DashboardPanelHeader title="Jakość danych" subtitle="Brak problemów" />
        <DashboardEmpty>Wszystko wygląda w porządku</DashboardEmpty>
      </DashboardPanel>
    );
  }

  return (
    <DashboardPanel className="h-full">
      <DashboardPanelHeader
        title="Do sprawdzenia"
        subtitle={`${alerts.length} ${alerts.length === 1 ? "alert" : "alerty"}`}
      />
      <ul className="divide-y divide-slate-100">
        {alerts.slice(0, 5).map((alert) => (
          <li key={alert.id}>
            <Link
              href={alert.href}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 transition hover:bg-slate-50/80 -mx-2 px-2 rounded-lg"
            >
              <span
                className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotBySeverity[alert.severity])}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-slate-800">
                  {alert.title}
                  {alert.count != null && (
                    <span className="ml-1.5 font-normal text-slate-400">({alert.count})</span>
                  )}
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{alert.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </DashboardPanel>
  );
}
