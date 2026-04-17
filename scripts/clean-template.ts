import { PrismaClient } from '../app/main/repositories/generated-client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:../database/tucajero.db`,
    },
  },
});

async function main() {
  console.log('🧹 Preparando plantilla limpia de base de datos...');

  try {
    // 1. Datos operativos
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

    // 2. Solo el admin
    await prisma.user.deleteMany({
      where: { username: { not: 'admin' } }
    });

    console.log('✅ Base de datos lista.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
