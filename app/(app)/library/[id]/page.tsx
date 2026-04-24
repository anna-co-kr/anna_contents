import { Suspense } from "react";
import { ReferenceDetail } from "@/components/library/reference-detail";

async function ReferenceDetailShell({
  idPromise,
}: {
  idPromise: Promise<string>;
}) {
  const id = await idPromise;
  return <ReferenceDetail referenceId={id} />;
}

export default function ReferenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const idPromise = params.then((p) => p.id);
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      }
    >
      <ReferenceDetailShell idPromise={idPromise} />
    </Suspense>
  );
}
