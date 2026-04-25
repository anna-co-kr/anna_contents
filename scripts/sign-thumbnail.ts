import { createClient } from "@supabase/supabase-js";

/**
 * 자동 분석 cron에서 사용 — 안나의 references-thumbnails Storage 객체에
 * 1시간 signed URL 발급. service_role + supabase-js admin 통신.
 *
 * 사용: source .env.local && npx tsx scripts/sign-thumbnail.ts <storage_path>
 */

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: tsx scripts/sign-thumbnail.ts <storage_path>");
    process.exit(1);
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await supabase.storage
    .from("references-thumbnails")
    .createSignedUrl(path, 3600);
  if (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
  console.log(data!.signedUrl);
}

main();
