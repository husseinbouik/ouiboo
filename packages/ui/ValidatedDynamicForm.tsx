'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  type DefaultValues,
  type FieldPath,
  type FieldValues,
  type SubmitHandler,
  type UseFormReturn,
  useForm,
} from 'react-hook-form'
import type { ZodType } from 'zod'
import { Button } from './Button'
import { FormField } from './FormField'
import { Input } from './Input'
import { Select } from './Select'
import { Textarea } from './Textarea'
import { cn } from './utils'

export type DynamicFormOption = {
  label: string
  value: string
  disabled?: boolean
}

export interface DynamicFormField<TValues extends FieldValues> {
  name: FieldPath<TValues>
  label: string
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'date'
    | 'tel'
    | 'url'
    | 'textarea'
    | 'select'
    | 'checkbox'
  placeholder?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  options?: DynamicFormOption[]
  className?: string
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  render?: (form: UseFormReturn<TValues>) => React.ReactNode
}

export interface DynamicFormProps<TValues extends FieldValues> {
  schema: ZodType<TValues, TValues>
  fields: DynamicFormField<TValues>[]
  onSubmit: SubmitHandler<TValues>
  defaultValues?: DefaultValues<TValues>
  submitLabel?: string
  submittingLabel?: string
  footer?: React.ReactNode
  className?: string
  fieldsClassName?: string
  mode?: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all'
}

const getError = (errors: Record<string, unknown>, path: string) => {
  const result = path.split('.').reduce<unknown>(
    (value, key) =>
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)[key]
        : undefined,
    errors
  )
  const message =
    result && typeof result === 'object'
      ? (result as { message?: unknown }).message
      : undefined
  return typeof message === 'string' ? message : undefined
}

export function DynamicForm<TValues extends FieldValues>({
  schema,
  fields,
  onSubmit,
  defaultValues,
  submitLabel = 'Submit',
  submittingLabel = 'Submitting…',
  footer,
  className,
  fieldsClassName,
  mode = 'onBlur',
}: DynamicFormProps<TValues>) {
  const form = useForm<TValues>({
    defaultValues,
    mode,
    resolver: zodResolver(schema),
  })
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className={cn('space-y-6', className)}
    >
      <div className={cn('grid gap-5', fieldsClassName)}>
        {fields.map((field) => {
          const error = getError(
            errors as Record<string, unknown>,
            field.name
          )
          const id = `field-${field.name.replace(/\./g, '-')}`
          const registration = register(field.name, {
            valueAsNumber: field.type === 'number',
          })

          return (
            <FormField
              key={field.name}
              label={field.label}
              htmlFor={id}
              hint={field.hint}
              error={error}
              required={field.required}
              className={field.className}
            >
              {field.render ? (
                field.render(form)
              ) : field.type === 'textarea' ? (
                <Textarea
                  id={id}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  aria-invalid={Boolean(error)}
                  {...registration}
                />
              ) : field.type === 'select' ? (
                <Select
                  id={id}
                  disabled={field.disabled}
                  aria-invalid={Boolean(error)}
                  {...registration}
                >
                  {field.placeholder ? (
                    <option value="">{field.placeholder}</option>
                  ) : null}
                  {field.options?.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : field.type === 'checkbox' ? (
                <input
                  id={id}
                  type="checkbox"
                  disabled={field.disabled}
                  className="h-4 w-4 rounded border-border accent-primary"
                  aria-invalid={Boolean(error)}
                  {...registration}
                />
              ) : (
                <Input
                  id={id}
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  aria-invalid={Boolean(error)}
                  {...field.inputProps}
                  {...registration}
                />
              )}
            </FormField>
          )
        })}
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {footer}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
