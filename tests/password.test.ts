import { describe, it, expect } from 'vitest';
import { validatePassword } from '../app/main/utils/password';
import { AppError } from '../app/main/utils/errors';

describe('validatePassword', () => {
  it('should accept a valid password', () => {
    expect(() => validatePassword('ValidPass1')).not.toThrow();
    expect(() => validatePassword('MyStr0ngP@ss')).not.toThrow();
  });

  it('should reject passwords shorter than 8 chars', () => {
    expect(() => validatePassword('Short1')).toThrow(AppError);
  });

  it('should reject passwords without uppercase', () => {
    expect(() => validatePassword('nouppercase1')).toThrow(AppError);
  });

  it('should reject passwords without lowercase', () => {
    expect(() => validatePassword('NOLOWERCASE1')).toThrow(AppError);
  });

  it('should reject passwords without numbers', () => {
    expect(() => validatePassword('NoNumbersHere')).toThrow(AppError);
  });
});
