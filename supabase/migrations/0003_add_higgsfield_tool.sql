-- prompt_tool enum에 'higgsfield' 추가 (2026-04-24)
-- 안나 실사용 확인: NBP > Higgsfield > MJ 빈도 순서.
-- Higgsfield는 영상 작업 주력, 공식 권장 프롬프트 언어는 영어(짧고 명령형).

alter type prompt_tool add value if not exists 'higgsfield';
