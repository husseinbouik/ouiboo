import * as React from "react";
import { cn } from "./utils";

export interface LogoProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
}

export const Logo = React.forwardRef<SVGSVGElement, LogoProps>(
  ({ className, size = 32, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        {...props}
      >
        <rect width="32" height="32" rx="8" fill="#0A192F" />
        <path
          d="M16 8C11.5817 8 8 11.5817 8 16C8 20.4183 11.5817 24 16 24C20.4183 24 24 20.4183 24 16C24 11.5817 20.4183 8 16 8ZM16 22C12.6863 22 10 19.3137 10 16C10 12.6863 12.6863 10 16 10C19.3137 10 22 12.6863 22 16C22 19.3137 19.3137 22 16 22Z"
          fill="white"
        />
        {/* Council Session #3 P0-4 (#552) rework: the previous redraw
            (head r=4.6 centred (16, 14.4), tip y=23.2) painted OVER the
            white ring — the ring is an annulus with inner radius 6
            around (16, 16), and the tip sat at radius 7.2, so the pin
            read as an orange dot bursting out of the circle.
            Round 1 contained it (head r=3.4 at (16, 14.8), tip
            (16, 21.4), max radius 5.4) — but at the traveller navbar's
            ~30px the near-disc head still read as a target dot.
            Round 2 strengthens the SILHOUETTE while staying
            contained: smaller head (r=2.9) raised to (16, 13.8) and a
            longer taper to the tip at (16, 21.6) — sampled max radius
            5.6, still inside the ring's inner radius 6 — so the point
            protrudes visibly below the head at 20–30px (at-size
            renders verified locally before deploy). Navy centre dot
            (r=1.5) follows the head. Tile, ring and colours
            unchanged. */}
        <path
          d="M16 21.6C15.3 19.9 13.1 17.4 13.1 13.8A2.9 2.9 0 1 1 18.9 13.8C18.9 17.4 16.7 19.9 16 21.6Z"
          fill="#FF6B35"
        />
        <circle cx="16" cy="13.8" r="1.5" fill="#0A192F" />
      </svg>
    );
  }
);

Logo.displayName = "Logo";
