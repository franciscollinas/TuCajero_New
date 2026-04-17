/**
 * Shared Prisma utility functions.
 */
import { Prisma } from '../../../database/generated-client';
import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';

export function toNumber(value: Prisma.Decimal | null): number | null {
  return value ? Number(value) : null;
}

/**
 * Assert that a user has one of the required roles.
 * Throws UNAUTHORIZED or FORBIDDEN if check fails.
 */
export async function assertRoleAccess(
  userId: number,
  requiredRoles: string[],
  forbiddenMessage = 'No tienes permisos para realizar esta acción.',
): Promise<void> {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { active: true, role: true },
  });

  if (!actor || !actor.active) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Usuario inválido o inactivo.');
  }

  if (!requiredRoles.includes(actor.role)) {
    throw new AppError(ErrorCode.FORBIDDEN, forbiddenMessage);
  }
}
