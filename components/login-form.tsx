"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { loginFormSchema, type LoginFormValues } from "@/lib/schemas/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

/**
 * 단일 계정 전용 로그인 폼 (ROADMAP Task 006).
 * - React Hook Form + Zod 검증
 * - 성공 시 /library 이동 + router.refresh()로 layout 재렌더 (UserGuard 통과)
 * - 실패 시 서버 에러를 한국어로 변환해 인라인 표시
 * - 회원가입·비밀번호 찾기 링크 없음 (계정 사전 생성, 복구는 콘솔 직접)
 */
export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setServerError(translateAuthError(error.message));
      return;
    }
    // layout(UserGuard)가 새 세션을 보도록 refresh 후 이동
    router.refresh();
    router.push("/library");
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>
            Prompt Studio에 접근하려면 이메일·비밀번호를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
              noValidate
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serverError && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-sm text-destructive"
                >
                  {serverError}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Supabase Auth 에러 메시지를 한국어로 변환.
 * 완전 매핑이 아닌 안나 1인 사용 맥락 중심 핵심 케이스만 커버.
 */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (m.includes("email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다. Supabase 콘솔에서 확인해주세요.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "네트워크 오류가 발생했습니다. 연결을 확인해주세요.";
  }
  return `로그인 실패: ${message}`;
}
