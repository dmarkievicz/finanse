import type { ReactNode } from "react";

/** Spójny z resztą aplikacji — bez ciemnego „vault” motywu. */
export function BullionShell({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}
