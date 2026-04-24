import { z } from "zod";

/**
 * 로그인 폼 입력 스키마 (Task 006).
 * 단일 계정 전용 — 회원가입·비밀번호 찾기 폼 없음.
 */
export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요")
    .email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
