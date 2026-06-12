import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Wspólny styl chipów filtrów (Transakcje, Kategorie, …). */
export const filterChipBase =
  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm";

/** Aktywny chip — ciemne wypełnienie, bez obwódki. */
export const filterChipActive = "bg-slate-800 text-white";

/** Nieaktywny chip — obwódka i jasne tło. */
export const filterChipIdle =
  "border border-border bg-card text-muted hover:border-slate-300 hover:text-foreground";

export function filterChipClass(active: boolean) {
  return cn(filterChipBase, active ? filterChipActive : filterChipIdle);
}

interface FilterChipLinkProps extends ComponentProps<typeof Link> {
  active?: boolean;
}

export function FilterChipLink({ active = false, className, ...props }: FilterChipLinkProps) {
  return <Link className={cn(filterChipClass(active), className)} {...props} />;
}

interface FilterChipButtonProps extends ComponentProps<"button"> {
  active?: boolean;
}

export function FilterChipButton({
  active = false,
  className,
  type = "button",
  ...props
}: FilterChipButtonProps) {
  return (
    <button type={type} className={cn(filterChipClass(active), className)} {...props} />
  );
}
