import { prisma } from '../app/main/repositories/prisma.js';

async function checkSale() {
  const session = await prisma.cashSession.findFirst({
    where: { status: 'OPEN' },
    include: {
      user: true,
      sales: {
        include: {
          payments: true,
          items: { include: { product: true } },
        },
      },
    },
  });

  if (!session) {
    console.log('No hay sesión abierta');
    await prisma.$disconnect();
    return;
  }

  console.log('═══ SESIÓN DE CAJA ABIERTA ═══');
  console.log(`ID: ${session.id}`);
  console.log(`Usuario: ${session.user.fullName}`);
  console.log(`Base inicial: $${Number(session.initialCash).toLocaleString('es-CO')}`);
  console.log(`Expected Cash (DB): $${Number(session.expectedCash || 0).toLocaleString('es-CO')}`);
  console.log('');

  for (const sale of session.sales) {
    console.log('─── Venta ───');
    console.log(`Número: ${sale.saleNumber}`);
    console.log(`Total: $${Number(sale.total).toLocaleString('es-CO')}`);
    console.log('Items:');
    for (const item of sale.items) {
      console.log(`  ${item.quantity} x ${item.product.name} @ $${Number(item.unitPrice).toLocaleString('es-CO')} = $${(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('es-CO')}`);
    }
    console.log('Pagos:');
    for (const payment of sale.payments) {
      console.log(`  ${payment.method}: $${Number(payment.amount).toLocaleString('es-CO')}`);
    }
    console.log('');
  }

  const totalCashIn = session.sales.flatMap(s => s.payments)
    .filter(p => p.method === 'efectivo')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  console.log('═══ RESUMEN ═══');
  console.log(`Base inicial:           $${Number(session.initialCash).toLocaleString('es-CO')}`);
  console.log(`Total cobrado efectivo: $${totalCashIn.toLocaleString('es-CO')}`);
  console.log(`Debería haber en caja:  $${(Number(session.initialCash) + totalCashIn).toLocaleString('es-CO')}`);
  console.log(`Expected Cash en DB:    $${Number(session.expectedCash || 0).toLocaleString('es-CO')}`);
  console.log('');

  if (Number(session.expectedCash || 0) !== Number(session.initialCash) + totalCashIn) {
    console.log('⚠️  HAY UNA DISCREPANCIA!');
    console.log(`   Difference: $${Number(session.expectedCash || 0) - (Number(session.initialCash) + totalCashIn)}`);
  } else {
    console.log('✅ Los números cuadran correctamente.');
  }

  await prisma.$disconnect();
}

checkSale().catch(console.error);
