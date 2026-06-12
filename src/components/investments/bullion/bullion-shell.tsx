import type { ReactNode } from "react";

export function BullionShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative -m-2 min-h-full overflow-hidden bg-[#0a0908] p-2 text-stone-100 lg:-m-4 lg:p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(217,119,6,0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(180,83,9,0.12), transparent)",
        }}
      />
      <div className="relative mx-auto max-w-[1280px]">{children}</div>
    </div>
  );
}
