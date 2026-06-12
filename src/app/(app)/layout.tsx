import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { createClient } from "@/lib/supabase/server";
import { getReviewCountForLayout } from "@/lib/layout/review-count";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const reviewCount = user
    ? await getReviewCountForLayout(supabase, user.id)
    : 0;

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:contents">
        <Sidebar needsReviewCount={reviewCount} />
      </div>
      <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-background to-slate-100/80 p-4 pb-24 md:p-6 md:pb-6 lg:p-8">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
