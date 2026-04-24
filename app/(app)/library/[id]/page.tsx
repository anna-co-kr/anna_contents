import { Suspense } from "react";

async function ReferenceDetail({ idPromise }: { idPromise: Promise<string> }) {
  const id = await idPromise;
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">레퍼런스 상세</h1>
        <p className="text-sm text-muted-foreground font-mono">{id}</p>
        <p className="text-sm text-muted-foreground">
          원본 이미지 · 토큰 편집 · 태그 · 스니펫 CRUD (Task 013에서 구현 예정)
        </p>
      </header>
    </section>
  );
}

export default function ReferenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const idPromise = params.then((p) => p.id);
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중...</p>}>
      <ReferenceDetail idPromise={idPromise} />
    </Suspense>
  );
}
