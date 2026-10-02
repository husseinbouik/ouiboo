import * as React from 'react'
import { cn } from './utils'

export const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>(
  ({ children, ...props }, ref) => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        ...(children.props as object),
        className: cn(props.className, (children.props as any).className),
        // @ts-ignore
        ref: children.ref || ref,
      } as any)
    }
    return null
  }
)
