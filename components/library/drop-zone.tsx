"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import { resizeImage, formatBytes } from "@/lib/image/resize";
import {
  createReferenceFromImage,
  createReferenceFromUrl,
} from "@/app/(app)/library/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Stage =
  | { kind: "idle" }
  | { kind: "url-fetching"; url: string }
  | { kind: "image-resizing"; fileName: string }
  | { kind: "image-uploading"; fileName: string; bytes: number }
  | {
      kind: "success";
      referenceId: string;
      existing: boolean;
      source: "url" | "image";
      hint: string;
    }
  | { kind: "error"; message: string };

const STAGE_LABEL: Record<Stage["kind"], string> = {
  idle: "대기 중",
  "url-fetching": "URL에서 메타 가져오는 중...",
  "image-resizing": "이미지 리사이즈 중...",
  "image-uploading": "Supabase Storage에 업로드 중...",
  success: "완료",
  error: "오류",
};

export function DropZone() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [url, setUrl] = useState("");

  const isBusy =
    stage.kind === "url-fetching" ||
    stage.kind === "image-resizing" ||
    stage.kind === "image-uploading";

  const handleUrlSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim() || isBusy) return;
      setStage({ kind: "url-fetching", url: url.trim() });
      const result = await createReferenceFromUrl(url.trim());
      if (!result.ok) {
        setStage({ kind: "error", message: result.error });
        return;
      }
      setStage({
        kind: "success",
        referenceId: result.referenceId,
        existing: result.existing,
        source: "url",
        hint: result.existing
          ? "이미 라이브러리에 있는 URL입니다. 기존 항목을 엽니다."
          : "레퍼런스가 저장되었습니다. 다음 단계 — Claude Code에 분석 요청을 복사해주세요 (Task 008에서 구현 예정).",
      });
      setUrl("");
      router.refresh();
    },
    [url, isBusy, router],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        setStage({
          kind: "error",
          message:
            fileRejections[0].errors[0]?.message ??
            "파일을 받지 못했습니다 (이미지·단일 파일·10MB 이하만 허용)",
        });
        return;
      }
      const file = acceptedFiles[0];
      if (!file) return;

      setStage({ kind: "image-resizing", fileName: file.name });

      let resized;
      try {
        resized = await resizeImage(file);
      } catch (e) {
        setStage({
          kind: "error",
          message: `리사이즈 실패: ${(e as Error).message}`,
        });
        return;
      }

      setStage({
        kind: "image-uploading",
        fileName: file.name,
        bytes: resized.bytes,
      });

      const formData = new FormData();
      formData.append("image", resized.blob, file.name.replace(/\.[^.]+$/, ".jpg"));

      const result = await createReferenceFromImage(formData);
      if (!result.ok) {
        setStage({ kind: "error", message: result.error });
        return;
      }

      setStage({
        kind: "success",
        referenceId: result.referenceId,
        existing: false,
        source: "image",
        hint: `이미지가 저장되었습니다 (${formatBytes(resized.bytes)}, ${resized.width}x${resized.height}). 다음 단계 — Claude Code에 분석 요청을 복사해주세요 (Task 008에서 구현 예정).`,
      });
      router.refresh();
    },
    [router],
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    maxFiles: 1,
    maxSize: 10_000_000, // 원본 10MB까지 허용, 리사이즈 후 2MB 이하 목표
    disabled: isBusy,
  });

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleUrlSubmit}
        className="flex flex-col sm:flex-row gap-2"
      >
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="url"
            placeholder="Instagram · Pinterest · YouTube · Are.na URL 붙여넣기"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isBusy}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isBusy || !url.trim()}>
          URL 저장
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 border-t border-border" />
        <span>또는</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-ref-card p-10 text-center cursor-pointer transition",
          isBusy && "opacity-50 cursor-not-allowed",
          isDragActive && !isDragReject && "border-primary bg-accent/30",
          isDragReject && "border-destructive bg-destructive/5",
          !isDragActive && !isBusy && "border-border hover:border-ring/50 hover:bg-accent/20",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <UploadCloud className="size-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive
                ? "여기에 놓으세요"
                : "이미지 파일을 드래그하거나 클릭해서 선택"}
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG · PNG · WebP · GIF · 1건씩 · 원본 10MB 이하 (자동 리사이즈 후 {"<"} 2MB)
            </p>
          </div>
        </div>
      </div>

      {stage.kind !== "idle" && (
        <StageIndicator stage={stage} />
      )}
    </div>
  );
}

function StageIndicator({ stage }: { stage: Stage }) {
  if (stage.kind === "success") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-border bg-accent/20 p-3 text-sm">
        <CheckCircle2 className="size-4 text-token-lighting shrink-0 mt-0.5" />
        <div className="space-y-1 flex-1">
          <p className="font-medium">
            {stage.existing ? "기존 레퍼런스 감지" : "저장 완료"}
            <span className="text-xs text-muted-foreground ml-2 font-mono">
              {stage.referenceId.slice(0, 8)}...
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{stage.hint}</p>
        </div>
      </div>
    );
  }

  if (stage.kind === "error") {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm"
      >
        <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-destructive">{stage.message}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
      <span className="size-2 rounded-full bg-primary animate-pulse shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{STAGE_LABEL[stage.kind]}</p>
        {"fileName" in stage && (
          <p className="text-xs text-muted-foreground">
            {stage.fileName}
            {"bytes" in stage && ` · ${formatBytes(stage.bytes)}`}
          </p>
        )}
        {"url" in stage && (
          <p className="text-xs text-muted-foreground truncate max-w-md">
            {stage.url}
          </p>
        )}
      </div>
    </div>
  );
}
