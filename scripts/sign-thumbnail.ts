import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * 자동 분석 라우틴에서 사용 — references-thumbnails Storage 객체에
 * 1시간 signed URL 발급. service_role + supabase-js admin 통신.
 *
 * 사용:
 *   1건: npx tsx scripts/sign-thumbnail.ts <storage_path>
 *   N건: npx tsx scripts/sign-thumbnail.ts <path1> <path2> ... <pathN>
 *        → 입력 순서대로 줄바꿈 구분 URL 출력 (실패 행은 ERR:<msg>)
 *
 * tsx cold start가 ~1-2초라 N건을 한 번에 처리하면 N배 빠름.
 * (.env.local을 스크립트가 직접 로드하므로 source/set -a 불필요)
 */

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error("usage: tsx scripts/sign-thumbnail.ts <path> [<path> ...]");
    process.exit(1);
  }
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      JSON.stringify({
        error:
          "missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local 로드 실패?)",
      }),
    );
    process.exit(1);
  }
  const supabase = createClient(url, key);

  if (paths.length === 1) {
    const { data, error } = await supabase.storage
      .from("references-thumbnails")
      .createSignedUrl(paths[0], 3600);
    if (error) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
    console.log(data!.signedUrl);
    return;
  }

  const { data, error } = await supabase.storage
    .from("references-thumbnails")
    .createSignedUrls(paths, 3600);
  if (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
  for (const row of data!) {
    if (row.error || !row.signedUrl) {
      console.log(`ERR:${row.error ?? "no signedUrl"}`);
    } else {
      console.log(row.signedUrl);
    }
  }
}

main();
