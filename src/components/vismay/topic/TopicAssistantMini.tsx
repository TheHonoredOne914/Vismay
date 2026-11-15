"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextualHint } from "@/components/vismay/primitives/ContextualHint";
import { useVismayStore } from "@/lib/store/useVismayStore";
import type { TopicData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TopicAssistantMiniProps {
  topic: TopicData;
  className?: string;
}

/**
 * Small assistant prompt at the top of the right sidebar.
 *
 * If the first section has a `contextualHint`, we render a `<ContextualHint />`
 * (with an `onOpen` that opens the assistant drawer with that hint's body).
 * Otherwise we render the default "Vismay is here" card.
 */
export function TopicAssistantMini({ topic, className }: TopicAssistantMiniProps) {
  const openDrawer = useVismayStore((s) => s.openDrawer);

  const hint = topic.sections[0]?.contextualHint;

  if (hint) {
    return (
      <div className={cn("", className)}>
        <ContextualHint
          label={hint.label}
          onOpen={() =>
            openDrawer({ title: topic.title, body: hint.body })
          }
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-gradient-to-br from-cream/60 to-paper px-4 py-4 text-xs text-muted-foreground",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-serif text-lg text-forest">Vismay is here.</p>
          <p className="mt-1 leading-relaxed">
            Ask for help only when you want it.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => openDrawer({ title: topic.title, body: "" })}
        className="mt-3 border-border bg-paper text-forest hover:bg-cream/70"
      >
        Ask a question
        <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}

export default TopicAssistantMini;
