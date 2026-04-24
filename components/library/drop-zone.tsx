"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, Link2, CheckCircle2, AlertCircle, Copy, Sparkles } from "lucide-react";
import { resizeImage, formatBytes } from "@/lib/image/resize";
import {
  createReferenceFromImage,
  createReferenceFromUrl,
} from "@/app/(app)/library/actions";
import { buildAnalysisRequest } from "@/lib/claude-code/prompt-builder";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalysisPasteForm } from "@/components/library/analysis-paste-form";
import { ManualTokensDialog } from "@/components/library/manual-tokens-dialog";

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
      sourceUrl?: string | null;
      fileName?: string | null;
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
        sourceUrl: url.trim(),
        hint: result.existing
          ? "이미 라이브러리에 있는 URL입니다. 기존 항목에 토큰을 덮어쓰거나 새로 저장할 수 있습니다."
          : "레퍼런스가 저장되었습니다. 이제 Claude Code로 6차원 분석을 받아오세요.",
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
        fileName: file.name,
        hint: `이미지가 저장되었습니다 (${formatBytes(resized.bytes)}, ${resized.width}x${resized.height}). 이제 Claude Code로 6차원 분석을 받아오세요.`,
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

      {stage.kind !== "idle" && <StageIndicator stage={stage} />}

      {stage.kind === "success" && !stage.existing && (
        <AnalysisSection
          referenceId={stage.referenceId}
          sourceUrl={stage.sourceUrl}
          fileName={stage.fileName}
        />
      )}
    </div>
  );
}

function AnalysisSection({
  referenceId,
  sourceUrl,
  fileName,
}: {
  referenceId: string;
  sourceUrl?: string | null;
  fileName?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    const prompt = buildAnalysisRequest({ sourceUrl, fileName });
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // 비HTTPS·권한 거부 폴백 — textarea로 드러내기
      const fallback = prompt;
      const ta = document.createElement("textarea");
      ta.value = fallback;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // 완전 실패: user에게 수동 복사 유도 (별도 dialog는 V1.5로 미룸)
        window.prompt("Claude Code 분석 요청 프롬프트를 수동으로 복사하세요:", fallback);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <div className="rounded-ref-card border border-border bg-accent/10 p-4 space-y-4">
      <div className="flex items-start gap-2">
        <Sparkles className="size-4 text-token-style shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Claude Code로 6차원 분석 받기</p>
          <p className="text-xs text-muted-foreground">
            아래 버튼으로 요청 프롬프트를 복사 → Claude Code CLI에서 이미지와
            함께 붙여넣고 JSON 응답을 받아 아래 폼에 다시 붙여넣으세요.
          </p>
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleCopyPrompt}
        className="gap-1.5"
      >
        <Copy className="size-3" />
        {copied ? "복사 완료!" : "Claude Code 분석 요청 복사"}
      </Button>

      <AnalysisPasteForm referenceId={referenceId} />

      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground">Claude Code 안 쓰실 경우 →</p>
        <ManualTokensDialog referenceId={referenceId} />
      </div>
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
