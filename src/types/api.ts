export type Result<T, E = ApiError> = { ok: true; value: T } | { ok: false; error: E }

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

export function success<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function failure<E extends ApiError>(error: E): Result<never, E> {
  return { ok: false, error }
}

export function apiError(code: string, message: string, details?: Record<string, unknown>): ApiError {
  return { code, message, details }
}

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(error: ApiError, status = 400): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
