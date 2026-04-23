import { AuditRepository, type AuditLogWithUser } from '../repositories/audit.repository';

const auditRepository = new AuditRepository();

export class AuditService {
  async log(input: {
    userId: number;
    action: string;
    entity: string;
    entityId?: number;
    payload: unknown;
  }): Promise<void> {
    await auditRepository.create(input);
  }

  getRecentLogs(limit = 100): Promise<AuditLogWithUser[]> {
    return auditRepository.list(limit);
  }

  async cleanOldLogs(monthsToKeep = 6): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
    return auditRepository.deleteOlderThan(cutoffDate);
  }
}
