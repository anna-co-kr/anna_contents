import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  ImageIcon,
  Star,
} from "lucide-react";
import {
  getReferenceDetail,
  listReferenceSnippets,
} from "@/app/(app)/library/actions";
import { TOKEN_KEYS } from "@/lib/schemas/tokens";
import { cn } from "@/lib/utils";
import { TagPopover } from "@/components/library/tag-popover";
import { ReferenceEditDialog } from "@/components/library/reference-edit-dialog";
import { ManualTokensDialog } from "@/components/library/manual-tokens-dialog";
import { DeleteReferenceButton } from "@/components/library/delete-reference-button";
import { SnippetList } from "@/components/library/snippet-list";
import { PageGuide } from "@/components/common/page-guide";

const TOKEN_COLOR_CLASS: Record<(typeof TOKEN_KEYS)[number], string> = {
  subject: "border-token-subject/40 bg-token-subject/10 text-token-subject",
  style: "border-token-style/40 bg-token-style/10 text-token-style",
  lighting: "border-token-lighting/40 bg-token-lighting/10 text-token-lighting",
  composition:
    "border-token-composition/40 bg-token-composition/10 text-token-composition",
  medium: "border-token-medium/40 bg-token-medium/10 text-token-medium",
  mood: "border-token-mood/40 bg-token-mood/10 text-token-mood",
};

// SSR/CSR 로케일 차이로 인한 hydration mismatch를 피하기 위해 deterministic 포맷 사용.
function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
}

const TOKEN_LABEL_KO: Record<(typeof TOKEN_KEYS)[number], string> = {
  subject: "피사체",
  style: "스타일 DNA",
  lighting: "조명 톤",
  composition: "구도",
  medium: "매체·재질",
  mood: "분위기",
};

export async function ReferenceDetail({ referenceId }: { referenceId: string }) {
  const result = await getReferenceDetail(referenceId);
  if (!result.ok) {
    if (result.error.includes("찾을 수 없")) notFound();
    return (
      <div
        role="alert"
        className="rounded-ref-card border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        {result.error}
      </div>
    );
  }

  const { detail } = result;
  const snippets = await listReferenceSnippets(referenceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/library"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> 라이브러리로 돌아가기
          </Link>
          <PageGuide
            title="레퍼런스 상세"
            intro="한 카드의 6가지 토큰을 자세히 보고, 컴퓨터가 자동 분석한 내용을 내가 직접 정정하는 곳이에요. 정정한 카드는 'manual' 도장이 찍혀 다음에 더 신뢰도 높게 쓰여요."
            steps={[
              "왼쪽 큰 이미지 — 원본 출처가 인스타·핀터레스트·유튜브면 우상단 외부 링크 버튼으로 본편을 바로 볼 수 있어요.",
              "6가지 색깔 칩(피사체·스타일·조명·구도·매체·분위기)이 자동 분석 결과예요.",
              "'토큰 편집' 버튼으로 자동 분석을 영어 그대로 정정할 수 있어요. 한 글자라도 바꾸면 source가 manual로 승급해요.",
              "태그를 추가하면 /search 페이지에서 빠르게 찾을 수 있어요.",
              "이 카드로 만든 프롬프트 스니펫 기록도 아래에서 확인할 수 있어요.",
            ]}
            whenToUse="자동 분석이 어색하거나 영상의 motion·shot 정보가 빠졌을 때 직접 채워주세요. 검수 모드에서 '내가 본 진짜 토큰'을 만드는 곳이에요."
            nextStep="잘 정리된 카드는 /remix 페이지에서 새 그림 만들 때 기준 카드로 골라 쓰세요."
          />
        </div>
        <DeleteReferenceButton referenceId={detail.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* 좌측 — 원본 이미지 */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-ref-card border border-border bg-muted">
            {detail.signedThumbnailUrl ? (
              <Image
                src={detail.signedThumbnailUrl}
                alt={detail.notes ?? "레퍼런스 원본"}
                width={1600}
                height={1600}
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="h-auto max-h-[80vh] w-full object-contain"
                unoptimized
                priority
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center">
                <ImageIcon className="size-12 text-muted-foreground/40" />
              </div>
            )}
          </div>
          {detail.sourceUrl && (
            <a
              href={detail.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
            >
              <ExternalLink className="size-3" />
              원본 출처: {detail.sourceUrl}
            </a>
          )}
          {detail.notes && (
            <p className="text-sm text-muted-foreground">{detail.notes}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            업로드 {formatUploadedAt(detail.uploadedAt)}
          </p>
        </div>

        {/* 우측 — 메타 편집 */}
        <aside className="space-y-5">
          {/* 점수 + 편집 Dialog 트리거 */}
          <section className="space-y-2 rounded-ref-card border border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">즐겨찾기 점수</h2>
              <ReferenceEditDialog
                referenceId={detail.id}
                initialScore={detail.favoriteScore}
              />
            </div>
            {detail.favoriteScore !== null ? (
              <p className="flex items-center gap-1 text-lg font-semibold tabular-nums">
                <Star className="size-4 fill-token-lighting text-token-lighting" />
                {detail.favoriteScore} <span className="text-sm text-muted-foreground">/ 10</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                아직 점수를 매기지 않았어요
              </p>
            )}
          </section>

          {/* 6차원 토큰 */}
          <section className="space-y-2 rounded-ref-card border border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">6차원 토큰</h2>
              <ManualTokensDialog
                referenceId={detail.id}
                initialTokens={detail.tokens}
              />
            </div>
            {detail.tokens ? (
              <dl className="space-y-1.5 text-xs">
                {TOKEN_KEYS.map((key) => {
                  const value = detail.tokens![key];
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex items-baseline gap-2 rounded-md border px-2 py-1.5",
                        TOKEN_COLOR_CLASS[key],
                      )}
                    >
                      <dt className="min-w-[56px] font-mono text-[10px] opacity-70">
                        {key}
                      </dt>
                      <dd className="flex-1 font-medium">{value}</dd>
                      <span className="text-[10px] opacity-60">
                        {TOKEN_LABEL_KO[key]}
                      </span>
                    </div>
                  );
                })}
              </dl>
            ) : (
              <p className="text-xs text-muted-foreground">
                Claude Code 응답 paste 또는 수동 입력으로 6차원을 채워보세요
              </p>
            )}
          </section>

          {/* 태그 */}
          <section className="space-y-2 rounded-ref-card border border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">태그</h2>
              <TagPopover referenceId={detail.id} tags={detail.tags} />
            </div>
            {detail.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {detail.tags.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px]"
                    title={t.kind}
                  >
                    {t.label}
                    <span className="ml-1 opacity-50">· {t.kind}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                아직 태그가 없어요 — 우측 🏷 버튼으로 추가
              </p>
            )}
          </section>

          {/* 스니펫 전체 CRUD (PRD § 레퍼런스 상세 페이지) */}
          <section className="space-y-3 rounded-ref-card border border-border p-4">
            <h2 className="text-sm font-medium">프롬프트 스니펫</h2>
            <SnippetList
              referenceId={detail.id}
              loadMode="mount"
              initialSnippets={snippets.ok ? snippets.snippets : undefined}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
