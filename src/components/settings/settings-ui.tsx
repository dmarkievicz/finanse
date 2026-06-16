import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const btnPrimary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50";

export const btnSecondary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition hover:bg-slate-50 disabled:opacity-50";

export const inputClass =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

interface SettingsPanelProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsPanel({ title, description, children }: SettingsPanelProps) {
  return (
    <div>
      <header className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </header>
      {children}
    </div>
  );
}

interface SettingsGroupProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsGroup({ title, description, children, className }: SettingsGroupProps) {
  return (
    <section className={cn("mb-8 last:mb-0", className)}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <div className="divide-y divide-border/70 rounded-lg border border-border/80 bg-card">
        {children}
      </div>
    </section>
  );
}

interface SettingsRowProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function SettingsRow({ title, description, children, footer, className }: SettingsRowProps) {
  return (
    <div className={cn("px-4 py-3.5", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
        </div>
        <div className="shrink-0 sm:max-w-[55%] sm:text-right">{children}</div>
      </div>
      {footer && <div className="mt-2 text-xs text-muted">{footer}</div>}
    </div>
  );
}

interface SettingsActionRowProps {
  title: string;
  description?: string;
  action: ReactNode;
}

export function SettingsActionRow({ title, description, action }: SettingsActionRowProps) {
  return (
    <SettingsRow title={title} description={description}>
      {action}
    </SettingsRow>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger";

const BADGE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-800",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        BADGE_STYLES[tone]
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-primary/80 transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SettingsDivider() {
  return <div className="my-6 border-t border-border/60" />;
}

export function SettingsInlineForm({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border/80 bg-card px-4 py-4", className)}>
      {children}
    </div>
  );
}
