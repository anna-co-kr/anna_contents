import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function UserGuard() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return null;
}

export default function ProtectedPage() {
  return (
    <Suspense>
      <UserGuard />
    </Suspense>
  );
}
