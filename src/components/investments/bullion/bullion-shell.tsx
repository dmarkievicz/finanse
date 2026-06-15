import type { ReactNode } from "react";

export function BullionShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">{children}</div>
  );
}
