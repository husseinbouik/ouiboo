import * as React from 'react'
import { cn } from './utils'
import { Label } from './Label'

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  hint?: string
  error?: string
  htmlFor?: string
  required?: boolean
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({
    className,
    label,
    hint,
    error,
    htmlFor,
    required = false,
    children,
    ...props
  }, ref) => (
    <div ref={ref} className={cn('space-y-2', className)} {...props}>
      {label ? (
        <div className="flex items-center justify-between">
          <Label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
            {required ? <span className="text-red-500"> *</span> : null}
          </Label>
          {hint ? (
            <span className="text-xs text-muted-foreground">{hint}</span>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-1">
        {children}
        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
)
FormField.displayName = 'FormField'

export { FormField }
