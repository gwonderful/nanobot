import { useEffect, useRef, useState } from "react";
import { Check, CircleDashed } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MarkdownText, preloadMarkdownText } from "@/components/MarkdownText";
import { cn } from "@/lib/utils";

import { ActivityStep } from "./ActivityStep";

export function ReasoningRow({
  text,
  streaming,
  onOpenFilePreview,
}: {
  text: string;
  streaming: boolean;
  onOpenFilePreview?: (path: string) => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    if (text.length > 0) preloadMarkdownText();
  }, [text.length]);
  return (
    <ActivityStep
      marker={<ReasoningMarker streaming={streaming} />}
      active={streaming}
      tone={streaming ? "active" : "success"}
      label={streaming
        ? t("message.reasoningStreaming", { defaultValue: "Thinking…" })
        : t("message.reasoning", { defaultValue: "Thinking" })}
    >
      {text.trim() ? (
        <MarkdownText
          streaming={streaming}
          onOpenFilePreview={onOpenFilePreview}
          className={cn(
            "min-w-0 text-[12.5px] italic text-muted-foreground/78",
            "prose-p:my-1 prose-li:my-0.5",
            "prose-headings:mt-2 prose-headings:mb-1 prose-headings:font-medium",
            "prose-headings:text-muted-foreground/88 prose-strong:text-muted-foreground",
            "prose-h1:text-[15px] prose-h2:text-[13.5px] prose-h3:text-[12.5px] prose-h4:text-[12px]",
            "prose-a:text-foreground/70 prose-a:underline hover:prose-a:text-foreground dark:prose-a:text-foreground/72 dark:hover:prose-a:text-foreground",
            "prose-code:text-[0.92em]",
          )}
        >
          {text}
        </MarkdownText>
      ) : null}
    </ActivityStep>
  );
}

function ReasoningMarker({ streaming }: { streaming: boolean }) {
  const wasStreamingRef = useRef(streaming);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (wasStreamingRef.current && !streaming) {
      setJustCompleted(true);
      const timeout = window.setTimeout(() => setJustCompleted(false), 650);
      wasStreamingRef.current = streaming;
      return () => window.clearTimeout(timeout);
    }
    wasStreamingRef.current = streaming;
    return undefined;
  }, [streaming]);

  if (streaming) {
    return (
      <span
        data-testid="activity-reasoning-marker"
        data-state="thinking"
        className="activity-step__mark grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border border-muted-foreground/24 bg-background text-muted-foreground/60"
        aria-hidden
      >
        <CircleDashed
          className="h-2.5 w-2.5 animate-spin"
          strokeWidth={1.9}
        />
      </span>
    );
  }
  return (
    <span
      data-testid="activity-reasoning-marker"
      data-state="done"
      className={cn(
        "activity-step__mark grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border bg-background",
        "transition-[border-color,background-color,box-shadow,transform] duration-300 ease-out",
        justCompleted
          && "animate-in fade-in-0 zoom-in-75 motion-reduce:animate-none",
      )}
      aria-hidden
    >
      <Check
        className={cn(
          "h-2.5 w-2.5 stroke-[2.4]",
          justCompleted && "animate-in fade-in-0 zoom-in-50 duration-300 motion-reduce:animate-none",
        )}
      />
    </span>
  );
}
