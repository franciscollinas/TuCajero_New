import { execSync } from 'child_process';
import path from 'path';

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Preparando plantilla limpia de base de datos...');

  const dbPath = path.resolve(process.cwd(), 'database', 'tucajero.db');

  // Ensure migrations are applied
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  } catch {
    // eslint-disable-next-line no-console
    console.log('Migraciones ya aplicadas o sin cambios.');
  }

  const { PrismaClient } = await import('../app/main/repositories/generated-client');

  let prisma;
  try {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`,
        },
      },
    });

    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.debt.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.cashSession.deleteMany();
    await prisma.purchaseOrderItem.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.config.deleteMany();
    await prisma.user.deleteMany();

    // eslint-disable-next-line no-console
    console.log('Base de datos lista.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error preparando plantilla:', error);
    process.exitCode = 1;
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

main();
