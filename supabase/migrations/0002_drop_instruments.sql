-- 스타터 예제 테이블 제거 (2026-04-24)
-- Supabase Next.js 공식 스타터킷이 프로젝트 생성 시 자동으로 만들었던 예제 테이블.
-- Task 001에서 app/instruments/ 디렉터리는 이미 삭제됨. DB side 정리.

drop table if exists public.instruments cascade;
