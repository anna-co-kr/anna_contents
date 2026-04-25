import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * Task 030-1 — 데이터 export + 로컬 백업.
 *
 * Supabase free tier 일시정지·프로젝트 이관 리스크로부터 안나의 축적 자산을 보호.
 * 5개 테이블 JSON + 2개 Storage 버킷 이미지 → docs/backup/backup-YYYY-MM-DD.zip
 *
 * 사용: npm run backup
 *      또는 npx tsx scripts/export-data.ts
 *
 * .env.local의 SUPABASE_SERVICE_ROLE_KEY를 자체 로드 (라우틴·CLI 둘 다 OK).
 */

const TABLES = ["references", "reference_tokens", "tags", "prompts", "pairs"];
const BUCKETS = ["references-thumbnails", "pair-results"];

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

async function listAllFiles(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  prefix = "",
): Promise<string[]> {
  const result: string[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      // 폴더면 재귀, 파일이면 누적 (id 없는 항목 = 폴더)
      if (item.id) {
        result.push(fullPath);
      } else {
        const nested = await listAllFiles(supabase, bucket, fullPath);
        result.push(...nested);
      }
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return result;
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const date = new Date().toISOString().slice(0, 10);
  const baseDir = resolve("docs/backup");
  const outDir = resolve(baseDir, `backup-${date}`);
  mkdirSync(outDir, { recursive: true });
  console.log(`[backup] target: ${outDir}`);

  // 1) 테이블 JSON export
  console.log(`[backup] tables (${TABLES.length})...`);
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`  ${table}: ERROR — ${error.message}`);
      continue;
    }
    writeFileSync(
      resolve(outDir, `${table}.json`),
      JSON.stringify(data, null, 2),
    );
    console.log(`  ${table}: ${data?.length ?? 0} rows`);
  }

  // 2) Storage 버킷 이미지 다운로드
  console.log(`[backup] storage buckets (${BUCKETS.length})...`);
  for (const bucket of BUCKETS) {
    const bucketDir = resolve(outDir, bucket);
    mkdirSync(bucketDir, { recursive: true });
    let files: string[];
    try {
      files = await listAllFiles(supabase, bucket);
    } catch (e) {
      console.error(`  ${bucket}: list ERROR — ${(e as Error).message}`);
      continue;
    }
    let ok = 0;
    let fail = 0;
    for (const path of files) {
      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (error || !data) {
        console.error(`    ${path}: ${error?.message ?? "no data"}`);
        fail++;
        continue;
      }
      const localPath = resolve(bucketDir, path);
      mkdirSync(resolve(localPath, ".."), { recursive: true });
      const buffer = Buffer.from(await data.arrayBuffer());
      writeFileSync(localPath, buffer);
      ok++;
    }
    console.log(`  ${bucket}: ${ok} files (fail ${fail})`);
  }

  // 3) zip 압축 + 원본 디렉터리 정리
  const zipPath = resolve(baseDir, `backup-${date}.zip`);
  console.log(`[backup] zip → ${zipPath}`);
  execSync(`zip -rq "${zipPath}" "backup-${date}"`, { cwd: baseDir });
  rmSync(outDir, { recursive: true, force: true });

  // 4) 사이즈 보고
  const stat = readFileSync(zipPath);
  const mb = (stat.byteLength / 1024 / 1024).toFixed(2);
  console.log(`[backup] DONE — ${zipPath} (${mb} MB)`);
  console.log(
    `\n로컬 보관 전용 (gitignored). 매주 금요일 1회 실행 권장: npm run backup`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
