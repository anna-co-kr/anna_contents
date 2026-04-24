import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function LoginPage() {
  return (
    <div className="relative min-h-svh flex flex-col items-center justify-center bg-background text-foreground p-6 md:p-10">
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="text-sm font-semibold hover:text-foreground transition"
        >
          Prompt Studio
        </Link>
        <ThemeSwitcher />
      </header>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Prompt Studio v0.5
          </h1>
          <p className="text-xs text-muted-foreground">
            AI 이미지·영상 프롬프트 수렴 레버리지 도구
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
