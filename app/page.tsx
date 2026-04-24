import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

async function RootRedirect() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    redirect("/library");
  } else {
    redirect("/login");
  }
  return null;
}

export default function Home() {
  return (
    <Suspense>
      <RootRedirect />
    </Suspense>
  );
}
