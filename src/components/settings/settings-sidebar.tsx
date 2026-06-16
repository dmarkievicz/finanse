"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Database,
  History,
  LineChart,
  Shield,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsTab = "account" | "analytics" | "automation" | "export" | "data" | "audit";

export const SETTINGS_NAV: {
  id: SettingsTab;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  { id: "account", label: "Konto i bezpieczeństwo", hint: "Email, MFA", icon: Shield },
  { id: "analytics", label: "Analizy finansowe", hint: "Start, cel", icon: LineChart },
  { id: "automation", label: "Automatyzacja", hint: "Reguły kategorii", icon: Wand2 },
  { id: "export", label: "Eksport i raporty", hint: "Backup, NBP", icon: BarChart3 },
  { id: "data", label: "Dane techniczne", hint: "Statystyki", icon: Database },
  { id: "audit", label: "Audit log", hint: "Historia zmian", icon: History },
];

interface SettingsSidebarProps {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

export function SettingsSidebar({ active, onChange }: SettingsSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="hidden w-[260px] shrink-0 lg:block"
        aria-label="Kategorie ustawień"
      >
        <ul className="space-y-0.5">
          {SETTINGS_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onChange(item.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition",
                    isActive
                      ? "bg-primary/8 text-primary"
                      : "text-foreground hover:bg-slate-100/80"
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isActive ? "text-primary" : "text-muted"
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{item.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile / tablet tabs */}
      <div className="lg:hidden">
        <label htmlFor="settings-tab-select" className="sr-only">
          Sekcja ustawień
        </label>
        <select
          id="settings-tab-select"
          value={active}
          onChange={(e) => onChange(e.target.value as SettingsTab)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm md:hidden"
        >
          {SETTINGS_NAV.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <div className="hidden gap-1 overflow-x-auto pb-1 md:flex">
          {SETTINGS_NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-muted hover:bg-slate-100 hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
