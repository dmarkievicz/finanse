import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";
import { rpcNeedsReviewCount } from "@/lib/supabase/rpc";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const reviewCount = await rpcNeedsReviewCount(supabase);

  return (
    <div className="flex min-h-screen">
      <Sidebar needsReviewCount={reviewCount} />
      <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-background to-slate-100/80 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
