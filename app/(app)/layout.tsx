import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/header/app-header";
import { createClient } from "@/lib/supabase/server";

async function UserGuard() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/login");
  }
  return null;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Suspense>
        <UserGuard />
      </Suspense>
      <AppHeader />
      <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-8">
        {children}
      </main>
    </div>
  );
}
