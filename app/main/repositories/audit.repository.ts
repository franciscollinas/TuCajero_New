import { Prisma } from '@prisma/client';

import { prisma } from './prisma';

export interface CreateAuditLogInput {
  userId: number;
  action: string;
  entity: string;
  entityId?: number;
  payload: unknown;
}

export type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        username: true;
        fullName: true;
        role: true;
      };
    };
  };
}>;

export class AuditRepository {
  async create(input: CreateAuditLogInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        payload: JSON.stringify(input.payload ?? {}),
      },
    });
  }

  list(limit = 100): Promise<AuditLogWithUser[]> {
    return prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }
}
