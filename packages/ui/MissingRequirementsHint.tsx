import * as React from "react"
import { CircleAlert } from "lucide-react"
import { cn } from "./utils"

export interface MissingRequirementsHintProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Labels of the requirements still unmet. Empty = render nothing. */
  missing: string[]
  /** Optional lead-in, e.g. "To continue, you still need:". */
  title?: string
}

/**
 * Design Council 2026-11-24 (cross-cutting #2): the shared
 * "what's missing" pattern for disabled submits. A disabled button
 * alone is a silent dead end — render this next to it listing every
 * unmet requirement so the user can act without guessing. Pair it
 * with the submit via `aria-describedby` where the call site can.
 */
const MissingRequirementsHint = React.forwardRef<
  HTMLDivElement,
  MissingRequirementsHintProps
>(({ missing, title, className, ...props }, ref) => {
  if (!missing || missing.length === 0) return null
  return (
    <div
      ref={ref}
      role="status"
      data-testid="missing-requirements-hint"
      className={cn(
        "rounded-2xl border border-warning/40 bg-warning/10 px-5 py-4 text-sm text-foreground",
        className
      )}
      {...props}
    >
      {title ? (
        <p className="mb-2 flex items-center gap-2 font-bold">
          <CircleAlert className="h-4 w-4 shrink-0 text-warning-dark" aria-hidden="true" />
          {title}
        </p>
      ) : null}
      <ul className={cn("space-y-1", title ? "ps-6" : "ps-1")}>
        {missing.map((item) => (
          <li key={item} className="flex items-start gap-2">
            {!title ? (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-dark" aria-hidden="true" />
            ) : (
              <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-warning-dark" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
})
MissingRequirementsHint.displayName = "MissingRequirementsHint"

export { MissingRequirementsHint }
