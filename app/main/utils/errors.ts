export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  DUPLICATE_CODE = 'DUPLICATE_CODE',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  PRODUCT_EXPIRED = 'PRODUCT_EXPIRED',
  NO_OPEN_SESSION = 'NO_OPEN_SESSION',
  SESSION_ALREADY_OPEN = 'SESSION_ALREADY_OPEN',
  EMPTY_CART = 'EMPTY_CART',
  PAYMENT_MISMATCH = 'PAYMENT_MISMATCH',
  DATABASE_ERROR = 'DATABASE_ERROR',
  LICENSE_INVALID = 'LICENSE_INVALID',
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toApiError(err: unknown): { code: string; message: string } {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message };
  }

  return {
    code: ErrorCode.UNKNOWN,
    message: 'Ocurrió un error inesperado. Intenta de nuevo.',
  };
}
