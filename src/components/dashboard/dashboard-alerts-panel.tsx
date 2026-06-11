import Link from "next/link";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { DashboardAlert } from "@/lib/dashboard/alerts";
import { cn } from "@/lib/utils";

interface DashboardAlertsPanelProps {
  alerts: DashboardAlert[];
}

const iconBySeverity = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styleBySeverity = {
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export function DashboardAlertsPanel({ alerts }: DashboardAlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
        <p className="text-sm font-medium text-emerald-800">Dane w porządku</p>
        <p className="mt-0.5 text-xs text-emerald-700">
          Brak krytycznych alertów jakości danych.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Do sprawdzenia</h3>
      <div className="space-y-2">
        {alerts.slice(0, 6).map((alert) => {
          const Icon = iconBySeverity[alert.severity];
          return (
            <Link
              key={alert.id}
              href={alert.href}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition hover:opacity-90",
                styleBySeverity[alert.severity]
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">
                  {alert.title}
                  {alert.count != null && (
                    <span className="ml-1.5 rounded-full bg-white/60 px-1.5 py-0.5 text-xs">
                      {alert.count}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs opacity-90">{alert.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
