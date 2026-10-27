import * as React from "react";
import { isBetaBadgeEnabled } from "@ouiboo/utils";
import { cn } from "./utils";

/**
 * "BETA" pill rendered next to the Ouiboo logo in every app while the
 * product is a closed testing version (founder request, 2026-10-27).
 *
 * Shared by the traveller, agency, admin and landing apps so the badge is
 * styled once and removed everywhere with a single per-app switch:
 * NEXT_PUBLIC_BETA_BADGE='false' (see isBetaBadgeEnabled in @ouiboo/utils).
 * The label stays "BETA" in en/fr/ar — a universal term — and as a plain
 * inline-flex span it follows the surrounding flex direction, so in the
 * Arabic (RTL) layout it sits beside the logo without extra markup.
 *
 * Decorative text only: not interactive, never a focus target. Amber with
 * near-black text keeps contrast comfortably above WCAG AA for small text.
 */
export interface BetaBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function BetaBadge({ className, ...props }: BetaBadgeProps) {
  if (!isBetaBadgeEnabled()) {
    return null;
  }

  return (
    <span
      data-testid="beta-badge"
      className={cn(
        "inline-flex shrink-0 select-none items-center rounded-full bg-amber-400 px-1.5 py-0.5 align-middle text-[10px] font-black uppercase leading-none tracking-[0.14em] text-amber-950",
        className
      )}
      {...props}
    >
      BETA
    </span>
  );
}
