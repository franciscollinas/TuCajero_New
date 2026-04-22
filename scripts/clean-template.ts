import path from 'path';

import { PrismaClient } from '../app/main/repositories/generated-client';

const dbPath = path.resolve(process.cwd(), 'database', 'tucajero.db');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

async function getExistingTables(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
  `;

  return new Set(rows.map((row) => row.name));
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Preparando plantilla limpia de base de datos...');

  try {
    const existingTables = await getExistingTables();

    if (existingTables.has('AuditLog')) await prisma.auditLog.deleteMany();
    if (existingTables.has('Session')) await prisma.session.deleteMany();
    if (existingTables.has('Payment')) await prisma.payment.deleteMany();
    if (existingTables.has('SaleItem')) await prisma.saleItem.deleteMany();
    if (existingTables.has('StockMovement')) await prisma.stockMovement.deleteMany();
    if (existingTables.has('Debt')) await prisma.debt.deleteMany();
    if (existingTables.has('Sale')) await prisma.sale.deleteMany();
    if (existingTables.has('CashSession')) await prisma.cashSession.deleteMany();
    if (existingTables.has('PurchaseOrderItem')) await prisma.purchaseOrderItem.deleteMany();
    if (existingTables.has('PurchaseOrder')) await prisma.purchaseOrder.deleteMany();
    if (existingTables.has('Supplier')) await prisma.supplier.deleteMany();
    if (existingTables.has('Product')) await prisma.product.deleteMany();
    if (existingTables.has('Category')) await prisma.category.deleteMany();
    if (existingTables.has('Customer')) await prisma.customer.deleteMany();
    if (existingTables.has('Config')) await prisma.config.deleteMany();

    if (existingTables.has('User')) {
      await prisma.user.deleteMany({
        where: { username: { not: 'admin' } },
      });
    }

    // eslint-disable-next-line no-console
    console.log('Base de datos lista.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error preparando plantilla:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
