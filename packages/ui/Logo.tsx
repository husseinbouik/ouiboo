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
            read as an orange dot bursting out of the circle. Redrawn
            CONTAINED inside the ring: head r=3.4 centred (16, 14.8),
            tip at (16, 21.4) — every point of the pin stays within
            radius 5.4 of (16, 16), inside the ring's inner radius 6 —
            bold and centred so it still reads as a pin at 20–35px,
            with the navy centre dot (r=1.5). Tile, ring and colours
            unchanged. */}
        <path
          d="M16 21.4C15.3 19.8 12.6 17.9 12.6 14.8A3.4 3.4 0 1 1 19.4 14.8C19.4 17.9 16.7 19.8 16 21.4Z"
          fill="#FF6B35"
        />
        <circle cx="16" cy="14.8" r="1.5" fill="#0A192F" />
      </svg>
    );
  }
);

Logo.displayName = "Logo";
