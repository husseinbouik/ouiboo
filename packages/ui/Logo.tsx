import * as React from "react";
import { cn } from "./utils";

/**
 * Final logo (#794): V1 "Route-End" symbol + W3 "Destination Tittle"
 * wordmark, founder-approved 2026-11-04. Geometry is copied EXACTLY
 * from the production masters (svg/ in the final-logo package):
 * an open ring on a 120-unit grid (centreline diameter 54, stroke 16,
 * centred at 60,60), the top carried by the sunset-orange route arc,
 * and the destination dot (r 8.5) floating just past the arc's end on
 * the same circular path. The wordmark's tittle (the dot over the "i")
 * is the destination point hiding in the name — sunset orange in the
 * primary lockup, letter-coloured in the small-size lockup used below
 * 24px height, where the orange tittle collapses to a 2px streak.
 *
 * Colourways (the only three): ring + letters are `currentColor`;
 * arc + destination dot + tittle stay #FF6B35. `tone` decides what
 * currentColor resolves to — "auto" follows the app theme
 * (deep blue on light, white on dark), "on-dark" forces white for
 * fixed navy/photo surfaces, "on-light" forces deep blue, and "tile"
 * (symbol only) renders the app-tile master verbatim: white symbol on
 * the deep-blue rounded tile at its adjusted small-size geometry
 * (stroke 17, dot r 9.25, scale 0.82). The Latin wordmark is used in
 * all locales, including Arabic — never mirrored, never recoloured
 * per app. The BETA pill is a separate badge (BetaBadge), never part
 * of the lockup. This replaces the interim Pin mark everywhere.
 */
export type LogoTone = "auto" | "on-dark" | "on-light" | "tile";

const ORANGE = "#FF6B35";
const NAVY = "#0A192F";
const WHITE = "#FFFFFF";

const RING_PATH = "M 86.41 54.39 A 27.0 27.0 0 1 1 41.24 40.58";
const ARC_PATH = "M 44.13 38.16 A 27.0 27.0 0 0 1 68.34 34.32";

function toneColor(tone: LogoTone): string | undefined {
  if (tone === "on-dark" || tone === "tile") return WHITE;
  if (tone === "on-light") return NAVY;
  return undefined;
}

function toneClassName(tone: LogoTone): string | undefined {
  return tone === "auto" ? "text-deep-blue dark:text-white" : undefined;
}

/** Route-End symbol paths at the given stroke width / dot radius. */
function SymbolPaths({
  strokeWidth,
  dotRadius,
  ringStroke,
}: {
  strokeWidth: number;
  dotRadius: number;
  ringStroke: string;
}) {
  return (
    <>
      <path
        d={RING_PATH}
        fill="none"
        stroke={ringStroke}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />
      <path
        d={ARC_PATH}
        fill="none"
        stroke={ORANGE}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />
      <circle cx="80.68" cy="42.64" r={dotRadius} fill={ORANGE} />
    </>
  );
}

/**
 * Wordmark glyphs (Poppins Bold outlines from the master), drawn in
 * the master's local coordinates — the group that sits at
 * translate(144 0) inside the lockup. Letters are currentColor; the
 * tittle fill is the caller's choice (orange, or currentColor for the
 * small-size lockup).
 */
function WordmarkGlyphs({ tittleFill }: { tittleFill: string }) {
  return (
    <>
      <circle
        cx="29.16"
        cy="67.58"
        r="19.51"
        fill="none"
        stroke="currentColor"
        strokeWidth="13.82"
      />
      <g transform="translate(58.33 94.0) scale(0.07420494699646643 -0.07420494699646643)">
        <path
          d="M613 558V0H442V76Q416 39 371.5 16.5Q327 -6 273 -6Q209 -6 160.0 22.5Q111 51 84.0 105.0Q57 159 57 232V558H227V255Q227 199 256.0 168.0Q285 137 334 137Q384 137 413.0 168.0Q442 199 442 255V558Z"
          fill="currentColor"
        />
      </g>
      <g transform="translate(108.34 94.0) scale(0.07420494699646643 -0.07420494699646643)">
        <path
          d="M46 708Q46 748 74.5 774.5Q103 801 148 801Q192 801 220.5 774.5Q249 748 249 708Q249 669 220.5 642.5Q192 616 148 616Q103 616 74.5 642.5Q46 669 46 708Z"
          fill={tittleFill}
        />
      </g>
      <g transform="translate(108.34 94.0) scale(0.07420494699646643 -0.07420494699646643)">
        <path d="M233 558V0H62V558Z" fill="currentColor" />
      </g>
      <g transform="translate(130.23 94.0) scale(0.07420494699646643 -0.07420494699646643)">
        <path
          d="M405 566Q474 566 530.0 531.0Q586 496 618.5 431.0Q651 366 651 280Q651 194 618.5 128.5Q586 63 530.0 27.5Q474 -8 405 -8Q346 -8 302.0 15.5Q258 39 233 78V0H62V740H233V479Q257 518 302.0 542.0Q347 566 405 566ZM354 417Q303 417 267.5 380.0Q232 343 232 279Q232 215 267.5 178.0Q303 141 354 141Q405 141 441.0 178.5Q477 216 477 280Q477 344 441.5 380.5Q406 417 354 417Z"
          fill="currentColor"
        />
      </g>
      <circle
        cx="204.25"
        cy="72.70"
        r="15.81"
        fill="none"
        stroke="currentColor"
        strokeWidth="10.98"
      />
      <circle
        cx="251.52"
        cy="72.70"
        r="15.81"
        fill="none"
        stroke="currentColor"
        strokeWidth="10.98"
      />
    </>
  );
}

export interface LogoProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
  tone?: LogoTone;
}

/** The V1 Route-End symbol alone (app icons, avatars, placeholders). */
export const Logo = React.forwardRef<SVGSVGElement, LogoProps>(
  ({ className, size = 32, tone = "auto", style, ...props }, ref) => {
    if (tone === "tile") {
      // App-tile master verbatim: navy rounded rect + white symbol at
      // the tile's adjusted geometry (stroke 17, dot r 9.25, scale 0.82).
      return (
        <svg
          ref={ref}
          width={size}
          height={size}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("shrink-0", className)}
          style={style}
          {...props}
        >
          <rect x="8" y="8" width="104" height="104" rx="27" fill={NAVY} />
          <g transform="translate(10.8 10.8) scale(0.82)">
            <SymbolPaths strokeWidth={17} dotRadius={9.25} ringStroke={WHITE} />
          </g>
        </svg>
      );
    }
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", toneClassName(tone), className)}
        style={{ color: toneColor(tone), ...style }}
        {...props}
      >
        <SymbolPaths strokeWidth={16} dotRadius={8.5} ringStroke="currentColor" />
      </svg>
    );
  }
);

Logo.displayName = "Logo";

export interface LogoWordmarkProps extends React.SVGAttributes<SVGSVGElement> {
  height?: number;
  tone?: Exclude<LogoTone, "tile">;
}

/** The W3 Destination Tittle wordmark alone. Latin in all locales. */
export const LogoWordmark = React.forwardRef<SVGSVGElement, LogoWordmarkProps>(
  ({ className, height = 28, tone = "auto", style, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={Math.round(((height * 283) / 120) * 100) / 100}
        height={height}
        viewBox="0 0 283 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Ouiboo"
        className={cn("shrink-0", toneClassName(tone), className)}
        style={{ color: toneColor(tone), ...style }}
        {...props}
      >
        <WordmarkGlyphs tittleFill={ORANGE} />
      </svg>
    );
  }
);

LogoWordmark.displayName = "LogoWordmark";

export interface LogoLockupProps extends React.SVGAttributes<SVGSVGElement> {
  height?: number;
  tone?: Exclude<LogoTone, "tile">;
}

/**
 * The primary lockup: symbol + wordmark from the 427×120 master.
 * Below the 24px minimum height it renders the SMALL master instead —
 * identical except the tittle takes the letter colour, because the
 * orange tittle no longer reads at that size.
 */
export const LogoLockup = React.forwardRef<SVGSVGElement, LogoLockupProps>(
  ({ className, height = 32, tone = "auto", style, ...props }, ref) => {
    const isSmall = height < 24;
    return (
      <svg
        ref={ref}
        width={Math.round(((height * 427) / 120) * 100) / 100}
        height={height}
        viewBox="0 0 427 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Ouiboo"
        className={cn("shrink-0", toneClassName(tone), className)}
        style={{ color: toneColor(tone), ...style }}
        {...props}
      >
        <g>
          <SymbolPaths strokeWidth={16} dotRadius={8.5} ringStroke="currentColor" />
        </g>
        <g transform="translate(144 0)">
          <WordmarkGlyphs tittleFill={isSmall ? "currentColor" : ORANGE} />
        </g>
      </svg>
    );
  }
);

LogoLockup.displayName = "LogoLockup";
