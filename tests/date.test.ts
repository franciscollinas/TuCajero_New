import { describe, it, expect } from 'vitest';
import { toFileDate, startOfDay, endOfDay, toIsoDate } from '../app/main/utils/date';

describe('date utils', () => {
  describe('toFileDate', () => {
    it('should convert date to file-safe string', () => {
      const date = new Date('2026-04-13T10:30:45.123Z');
      const result = toFileDate(date);
      expect(result).toBe('2026-04-13T10-30-45-123Z');
    });
  });

  describe('startOfDay', () => {
    it('should set time to 00:00:00.000', () => {
      const date = new Date('2026-04-13T15:30:45.123Z');
      const result = startOfDay(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe('endOfDay', () => {
    it('should set time to 23:59:59.999', () => {
      const date = new Date('2026-04-13T10:00:00.000Z');
      const result = endOfDay(date);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });
  });

  describe('toIsoDate', () => {
    it('should return YYYY-MM-DD', () => {
      const date = new Date('2026-04-13T15:30:45.123Z');
      const result = toIsoDate(date);
      expect(result).toBe('2026-04-13');
    });
  });
});
