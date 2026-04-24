import { Suspense } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold">Prompt Studio v0.5</h1>
        <div>
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </div>
        <ThemeSwitcher />
      </div>
    </main>
  );
}
