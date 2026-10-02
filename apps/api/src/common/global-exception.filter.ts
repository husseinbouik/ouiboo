import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { ExceptionFilter } from '@nestjs/common'
import type { Request, Response } from 'express'

export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  errors?: Record<string, string[]>
  timestamp: string
}

const statusTitles: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
}

const validationErrors = (
  message: unknown
): Record<string, string[]> | undefined => {
  if (!Array.isArray(message)) return undefined
  return {
    validation: message.filter(
      (item): item is string => typeof item === 'string'
    ),
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp()
    const response = context.getResponse<Response>()
    const request = context.getRequest<Request>()
    const isHttpException = exception instanceof HttpException
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR
    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined
    const responseRecord =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? (exceptionResponse as Record<string, unknown>)
        : undefined
    const rawMessage =
      responseRecord?.message ??
      (typeof exceptionResponse === 'string' ? exceptionResponse : undefined)
    const detail =
      status === HttpStatus.INTERNAL_SERVER_ERROR
        ? 'An unexpected error occurred.'
        : Array.isArray(rawMessage)
          ? rawMessage.join('; ')
          : typeof rawMessage === 'string'
            ? rawMessage
            : isHttpException
              ? exception.message
              : statusTitles[status] || 'Request failed'

    if (!isHttpException) {
      const stack = exception instanceof Error ? exception.stack : String(exception)
      this.logger.error('Unhandled request exception', stack)
    }

    const problem: ProblemDetails = {
      type: `https://api.ouiboo.com/problems/${status}`,
      title: statusTitles[status] || 'Request Failed',
      status,
      detail,
      instance: request.originalUrl || request.url,
      errors: validationErrors(rawMessage),
      timestamp: new Date().toISOString(),
    }

    if (!problem.errors) delete problem.errors

    response
      .status(status)
      .type('application/problem+json')
      .json(problem)
  }
}
