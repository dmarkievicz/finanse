import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export const btnPrimary = cn(btnBase, "bg-primary text-primary-foreground hover:bg-primary/90");

export const btnSecondary = cn(
  btnBase,
  "border border-border bg-card text-foreground hover:bg-slate-50"
);

export const btnGhost = cn(btnBase, "text-muted hover:bg-slate-50 hover:text-foreground");

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

export function ButtonLink({
  variant = "secondary",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const variantClass =
    variant === "primary" ? btnPrimary : variant === "ghost" ? btnGhost : btnSecondary;
  return (
    <Link className={cn(variantClass, className)} {...props}>
      {children}
    </Link>
  );
}

interface IconButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

export function IconButton({
  variant = "secondary",
  className,
  children,
  ...props
}: IconButtonProps) {
  const variantClass =
    variant === "primary" ? btnPrimary : variant === "ghost" ? btnGhost : btnSecondary;
  return (
    <button type="button" className={cn(variantClass, className)} {...props}>
      {children}
    </button>
  );
}

/** Grupa przycisków akcji w nagłówku strony. */
export function PageToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
  );
}
