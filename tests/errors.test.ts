import { describe, it, expect } from 'vitest';
import { AppError, ErrorCode, toApiError } from '../app/main/utils/errors';

describe('errors', () => {
  describe('AppError', () => {
    it('should create an error with code and message', () => {
      const err = new AppError(ErrorCode.VALIDATION, 'test message');
      expect(err.code).toBe(ErrorCode.VALIDATION);
      expect(err.message).toBe('test message');
      expect(err.name).toBe('AppError');
    });
  });

  describe('toApiError', () => {
    it('should convert AppError to api format', () => {
      const appErr = new AppError(ErrorCode.NOT_FOUND, 'not found');
      const result = toApiError(appErr);
      expect(result).toEqual({ code: ErrorCode.NOT_FOUND, message: 'not found' });
    });

    it('should convert unknown errors to UNKNOWN', () => {
      const result = toApiError(new Error('random'));
      expect(result).toEqual({
        code: ErrorCode.UNKNOWN,
        message: 'Ocurrió un error inesperado. Intenta de nuevo.',
      });
    });

    it('should handle non-error values', () => {
      const result = toApiError(null);
      expect(result.code).toBe(ErrorCode.UNKNOWN);
    });
  });
});
