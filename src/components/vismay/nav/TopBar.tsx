"use client";

import { type ReactNode } from "react";
import { ArrowLeft, Menu, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useVismayStore } from "@/lib/store/useVismayStore";
import type { ViewName } from "@/lib/types";
import { Logo } from "@/components/vismay/primitives/Logo";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  view: ViewName;
}

const PRIMARY_NAV: NavItem[] = [
  { label: "Home", view: "home" },
  { label: "My Learning", view: "my-learning" },
  { label: "Journey", view: "journey" },
  { label: "Library", view: "library" },
  { label: "Notes", view: "notes" },
  { label: "Uploads", view: "uploads" },
];

/**
 * Sticky top navigation for Vismay.
 *
 * - Logo on the left → returns to home view.
 * - When `view === "topic"`, a back link sits between the logo and the
 *   nav links so the user can return to their learning trail.
 * - Center nav links collapse into a dropdown on small screens.
 * - Right side has a settings glyph (opens the onboarding/preferences
 *   dialog) and a forest circle with the user's initial.
 */
export function TopBar() {
  const view = useVismayStore((s) => s.view);
  const setView = useVismayStore((s) => s.setView);
  const closeTopic = useVismayStore((s) => s.closeTopic);
  const setOnboardingOpen = useVismayStore((s) => s.setOnboardingOpen);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10",
        "border-b border-border bg-background/85 backdrop-blur-md"
      )}
    >
      {/* Left: logo + optional back link */}
      <div className="flex items-center gap-4">
        <Logo size="md" showDevanagari={false} onClick={() => setView("home")} />
        {view === "topic" && (
          <button
            type="button"
            onClick={closeTopic}
            className={cn(
              "hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-forest",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-md px-1 py-0.5",
              "sm:inline-flex"
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>
        )}
      </div>

      {/* Center: nav links (desktop) */}
      <nav
        aria-label="Primary"
        className="hidden items-center gap-7 md:flex"
      >
        {PRIMARY_NAV.map((item) => (
          <NavButton
            key={item.view}
            label={item.label}
            active={view === item.view}
            onClick={() => setView(item.view)}
          />
        ))}
      </nav>

      {/* Center: nav links (mobile, dropdown) */}
      <div className="flex flex-1 justify-center md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Open navigation"
              className="gap-2 text-forest"
            >
              <Menu className="size-4" />
              <span className="text-xs uppercase tracking-wider">
                {PRIMARY_NAV.find((n) => n.view === view)?.label ?? "Menu"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-44">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Navigate
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRIMARY_NAV.map((item) => (
              <DropdownMenuItem
                key={item.view}
                onSelect={() => setView(item.view)}
                className={cn(
                  "cursor-pointer",
                  view === item.view && "bg-cream/60 text-forest"
                )}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: settings + avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          aria-label="Open preferences"
          onClick={() => setOnboardingOpen(true)}
          className={cn(
            "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-cream hover:text-forest",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          )}
        >
          <Settings className="size-4" />
        </button>
        <span
          aria-label="Account"
          className="grid size-8 place-items-center rounded-full bg-forest text-xs font-semibold text-paper"
        >
          V
        </span>
      </div>
    </header>
  );
}

interface NavButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ label, active, onClick }: NavButtonProps): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative text-[13px] font-medium transition-colors",
        active ? "text-forest" : "text-muted-foreground hover:text-forest",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm px-1 py-0.5"
      )}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "mx-auto mt-1 block h-px bg-gold transition-all duration-300",
          active ? "w-4 opacity-100" : "w-0 opacity-0",
          "group-hover:w-4 group-hover:opacity-70"
        )}
      />
    </button>
  );
}

export default TopBar;
