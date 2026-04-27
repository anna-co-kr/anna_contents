import { Suspense } from "react";
import { listPairs } from "./actions";
import {
  getSignedPairResultUrlsBatch,
  getSignedThumbnailUrlsBatch,
  LIST_THUMBNAIL_TRANSFORM,
  PAIR_PREVIEW_TRANSFORM,
} from "@/lib/storage/signed-url";
import { PairComposer } from "@/components/pairs/pair-composer";
import { PairList, type PairListRow } from "@/components/pairs/pair-list";
import { SessionIndicator } from "@/components/pairs/session-indicator";
import { PageGuide } from "@/components/common/page-guide";

export default function PairsPage() {
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              프롬프트 페어 로그
            </h1>
            <PageGuide
              title="프롬프트 페어 로그"
              intro="내가 쓴 프롬프트와 그 프롬프트로 만든 결과 이미지·영상을 한 쌍으로 묶어 일기처럼 기록하는 곳이에요. 어떤 프롬프트가 잘 먹혔는지 점점 또렷이 보이게 돼요."
              steps={[
                "프롬프트 박스에 내가 직접 쓴 프롬프트를 붙여넣고 도구(MJ·NBP·Higgsfield)와 언어(en·ko)를 골라요.",
                "프롬프트 자체에 대한 만족도(별 1~5)를 표시해요 — 이게 1차 성공 지표예요.",
                "도구로 만든 결과 이미지·영상을 업로드해요.",
                "결과물 만족도(😞~🤩)를 표시해요 — 2차 지표.",
                "마음에 들면 '최종 선택'에 체크. 같은 레퍼런스로 N번째 시도인지 자동으로 세어줘요.",
              ]}
              whenToUse="MJ·NBP·Higgsfield로 무언가 만들 때마다 한 페어씩 쌓아두세요. 한 달치 쌓이면 '내가 쓴 프롬프트 중 별 4점 이상은 어떤 패턴이지?' 같은 진짜 답을 얻을 수 있어요."
              nextStep="잘 나온 페어 옆 'diff →' 버튼으로 두 페어의 프롬프트를 단어 단위로 비교할 수 있어요."
            />
          </div>
          <p className="text-sm text-muted-foreground">
            MJ · NBP · Higgsfield 프롬프트와 결과를 페어로 기록 — self_rating 1차
            지표, satisfaction 2차 지표로 분리 측정.
          </p>
        </div>
        <SessionIndicator />
      </header>

      <PairComposer />

      <Suspense fallback={<PairListSkeleton />}>
        <PairListShell />
      </Suspense>
    </section>
  );
}

async function PairListShell() {
  const result = await listPairs({ limit: 100 });
  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-ref-card border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        {result.error}
      </div>
    );
  }

  // 1번 호출로 result 이미지 N개 signed URL 일괄 발급 + 320px 리사이즈.
  const resultPaths = result.rows
    .map((r) => r.resultImagePath)
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  const refPaths = Array.from(
    new Set(
      result.rows
        .map((r) => r.referenceThumbnailPath)
        .filter((p): p is string => typeof p === "string" && p.length > 0),
    ),
  );

  // 두 버킷(pair-results, references-thumbnails)을 병렬 batch 발급.
  const [signedResultMap, signedRefMap] = await Promise.all([
    getSignedPairResultUrlsBatch(resultPaths, { transform: PAIR_PREVIEW_TRANSFORM }),
    getSignedThumbnailUrlsBatch(refPaths, { transform: LIST_THUMBNAIL_TRANSFORM }),
  ]);

  const rows: PairListRow[] = result.rows.map((r) => ({
    pairId: r.pairId,
    promptId: r.promptId,
    tool: r.tool,
    language: r.language,
    promptText: r.promptText,
    selfRating: r.selfRating,
    satisfaction: r.satisfaction,
    isFinalPick: r.isFinalPick,
    iterationCount: r.iterationCount,
    createdAt: r.createdAt,
    resultImageUrl: r.resultImagePath ? signedResultMap.get(r.resultImagePath) ?? null : null,
    referenceId: r.referenceId,
    referenceThumbnailUrl: r.referenceThumbnailPath
      ? signedRefMap.get(r.referenceThumbnailPath) ?? null
      : null,
    referenceSubject: r.referenceSubject,
  }));

  return <PairList rows={rows} />;
}

function PairListSkeleton() {
  return (
    <div className="rounded-ref-card border border-dashed border-border bg-muted/10 p-10 text-center text-sm text-muted-foreground">
      페어 목록 불러오는 중…
    </div>
  );
}
