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
        {/* Council Session #3 P0-4 (#552): the pin was drawn at ~9 of 32
            units (head r=3.2, tip y=20.2) — a ~6px blob at navbar size
            that could not read as a pin. Redrawn to fill the ring: head
            r=4.6 centred (16, 14.4), tip to y=23.2 (height 13.4 units),
            with the navy centre dot of the adopted concept. Tile, ring
            and colours unchanged. */}
        <path
          d="M16 23.2C14.9 21 11.4 18.6 11.4 14.4A4.6 4.6 0 1 1 20.6 14.4C20.6 18.6 17.1 21 16 23.2Z"
          fill="#FF6B35"
        />
        <circle cx="16" cy="14.4" r="1.8" fill="#0A192F" />
      </svg>
    );
  }
);

Logo.displayName = "Logo";
