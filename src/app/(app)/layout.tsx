import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-background to-slate-100/80 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
