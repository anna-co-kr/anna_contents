"use client";

import Link from "next/link";
import Image from "next/image";
import { ImageIcon, Star, Tag as TagIcon, Pencil } from "lucide-react";
import type { ReferenceCardData } from "@/app/(app)/library/actions";
import { TOKEN_KEYS, type Token } from "@/lib/schemas/tokens";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TOKEN_COLOR_CLASS: Record<(typeof TOKEN_KEYS)[number], string> = {
  subject: "bg-token-subject/15 text-token-subject border-token-subject/30",
  style: "bg-token-style/15 text-token-style border-token-style/30",
  lighting: "bg-token-lighting/15 text-token-lighting border-token-lighting/30",
  composition:
    "bg-token-composition/15 text-token-composition border-token-composition/30",
  medium: "bg-token-medium/15 text-token-medium border-token-medium/30",
  mood: "bg-token-mood/15 text-token-mood border-token-mood/30",
};

const TAG_KIND_COLOR_CLASS: Record<
  ReferenceCardData["tags"][number]["kind"],
  string
> = {
  category: "border-border bg-background",
  mood: "border-token-mood/30 bg-token-mood/10 text-token-mood",
  color: "border-token-composition/30 bg-token-composition/10 text-token-composition",
  purpose: "border-token-lighting/30 bg-token-lighting/10 text-token-lighting",
};

export type ReferenceCardProps = {
  card: ReferenceCardData;
};

export function ReferenceCard({ card }: ReferenceCardProps) {
  const { id, signedThumbnailUrl, favoriteScore, tokens, tags } = card;
  const hasTokens = tokens !== null;

  return (
    <article
      data-testid={`reference-card-${id}`}
      className="group relative overflow-hidden rounded-ref-card border border-border bg-card transition hover:border-ring/50 hover:shadow-sm"
    >
      <Link
        href={`/library/${id}`}
        className="block"
        aria-label="레퍼런스 상세로 이동"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {signedThumbnailUrl ? (
            <Image
              src={signedThumbnailUrl}
              alt={card.notes ?? "레퍼런스 썸네일"}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover transition group-hover:scale-[1.02]"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground/40" />
            </div>
          )}

          {favoriteScore !== null && (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium shadow-sm backdrop-blur">
              <Star className="size-3 fill-token-lighting text-token-lighting" />
              {favoriteScore}
            </div>
          )}

          {!hasTokens && (
            <div className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur">
              분석 대기
            </div>
          )}
        </div>
      </Link>

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <CardActionButton label="태그 편집" disabled>
          <TagIcon className="size-3.5" />
        </CardActionButton>
        <CardActionButton label="상세 편집" disabled>
          <Pencil className="size-3.5" />
        </CardActionButton>
      </div>

      <div className="space-y-2.5 p-3">
        {hasTokens ? (
          <div className="flex flex-wrap gap-1">
            {TOKEN_KEYS.map((key) => (
              <TokenChip key={key} keyName={key} value={tokens[key]} />
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            6차원 토큰 미분석 — 카드 클릭 후 Claude Code에 분석 요청
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t border-border pt-2">
            {tags.slice(0, 6).map((tag) => (
              <span
                key={tag.id}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  TAG_KIND_COLOR_CLASS[tag.kind],
                )}
                title={`${tag.kind}: ${tag.label}`}
              >
                {tag.label}
              </span>
            ))}
            {tags.length > 6 && (
              <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                +{tags.length - 6}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function TokenChip({
  keyName,
  value,
}: {
  keyName: keyof Token;
  value: string;
}) {
  return (
    <span
      className={cn(
        "max-w-full truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        TOKEN_COLOR_CLASS[keyName],
      )}
      title={`${keyName}: ${value}`}
    >
      <span className="opacity-60">{keyName.slice(0, 3)}</span>{" "}
      <span>{value}</span>
    </span>
  );
}

function CardActionButton({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className="size-7 rounded-full bg-background/90 shadow-sm backdrop-blur hover:bg-background"
      disabled={disabled}
      aria-label={label}
      onClick={(e) => e.preventDefault()}
    >
      {children}
    </Button>
  );
}
