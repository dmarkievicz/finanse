import type { ReactNode } from "react";

export function CollectiblesShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative -m-2 min-h-full overflow-hidden bg-[#1a0f0a] p-2 text-stone-100 lg:-m-4 lg:p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(220,38,38,0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(234,88,12,0.1), transparent)",
        }}
      />
      <div className="relative mx-auto max-w-[1280px]">{children}</div>
    </div>
  );
}
