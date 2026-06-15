import type { ReactNode } from "react";

export function PortfolioPageShell({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}
