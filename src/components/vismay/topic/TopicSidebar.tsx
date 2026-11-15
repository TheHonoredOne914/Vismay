"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useVismayStore } from "@/lib/store/useVismayStore";
import type { TopicData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TopicSidebarProps {
  topic: TopicData;
  className?: string;
}

const SECONDARY_LINKS = [
  { label: "Learning trail", view: "journey" as const },
  { label: "Connected ideas", view: "connected-concepts" as const },
];

/**
 * Left sidebar showing the topic's sections (numbered, clickable) plus
 * a "MY LEARNING" sub-section with two navigation shortcuts.
 *
 * Collapses into a Sheet on mobile.
 */
export function TopicSidebar({ topic, className }: TopicSidebarProps) {
  const activeSectionId = useVismayStore((s) => s.activeSectionId);
  const setActiveSection = useVismayStore((s) => s.setActiveSection);
  const setView = useVismayStore((s) => s.setView);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections = [...topic.sections].sort((a, b) => a.orderIndex - b.orderIndex);

  const SidebarBody = (
    <nav aria-label="Topic sections" className="flex h-full flex-col gap-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-sage">
          Your topic
        </p>
        <ul className="mt-5 space-y-3">
          {sections.map((section, i) => {
            const active = section.id === activeSectionId;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  aria-current={active ? "location" : undefined}
                  className={cn(
                    "w-full border-l-2 pl-3 text-left text-xs leading-snug transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                    active
                      ? "border-forest font-semibold text-forest"
                      : "border-transparent text-muted-foreground hover:text-forest"
                  )}
                >
                  <span className="mr-2 text-sage/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-sage">
          My learning
        </p>
        <ul className="mt-5 space-y-3">
          {SECONDARY_LINKS.map((link) => (
            <li key={link.view}>
              <button
                type="button"
                onClick={() => setView(link.view)}
                className={cn(
                  "w-full border-l-2 border-transparent pl-3 text-left text-xs text-muted-foreground transition-colors hover:text-forest",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                )}
              >
                {link.label} <span aria-hidden="true">&#8599;</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile trigger */}
      <div className={cn("lg:hidden", className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(true)}
          className="border-border bg-paper text-forest"
        >
          <PanelLeftOpen className="size-4" />
          Sections
        </Button>
      </div>

      {/* Desktop sticky sidebar */}
      <aside
        className={cn(
          "hidden border-r border-border bg-paper/40 px-5 py-8 lg:block",
          className
        )}
      >
        <div className="sticky top-[88px]">{SidebarBody}</div>
      </aside>

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 border-r border-border bg-paper p-0 sm:max-w-xs"
        >
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="font-serif text-xl text-forest">
              Sections
            </SheetTitle>
          </SheetHeader>
          <div className="px-5 py-6">{SidebarBody}</div>
          <div className="mt-auto px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMobileOpen(false)}
              className="w-full text-muted-foreground"
            >
              <PanelLeftClose className="size-4" />
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default TopicSidebar;
