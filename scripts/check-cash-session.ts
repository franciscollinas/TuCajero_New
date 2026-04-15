import { prisma } from '../app/main/repositories/prisma.js';

async function checkCashSession() {
  console.log('🔍 Verificando sesiones de caja...\n');

  const sessions = await prisma.cashSession.findMany({
    include: {
      user: { select: { username: true, fullName: true } },
    },
    orderBy: { openedAt: 'desc' },
    take: 5,
  });

  for (const s of sessions) {
    console.log('═══════════════════════════════════════');
    console.log(`Sesión #${s.id} - ${s.user.fullName}`);
    console.log('═══════════════════════════════════════');
    console.log(`Estado:         ${s.status}`);
    console.log(`Base inicial:   $${Number(s.initialCash).toLocaleString('es-CO')}`);
    console.log(`Expected Cash:  $${Number(s.expectedCash || 0).toLocaleString('es-CO')}`);
    console.log(`Final Cash:     ${s.finalCash ? '$' + Number(s.finalCash).toLocaleString('es-CO') : '—'}`);
    console.log(`Diferencia:     ${s.difference ? '$' + Number(s.difference).toLocaleString('es-CO') : '—'}`);
    console.log(`Abierta:        ${s.openedAt.toLocaleString('es-CO')}`);
    console.log(`Cerrada:        ${s.closedAt ? s.closedAt.toLocaleString('es-CO') : '—'}`);
    console.log('');

    // Get sales for this session
    const sales = await prisma.sale.findMany({
      where: { cashSessionId: s.id },
      select: { id: true, saleNumber: true, total: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`  📦 Ventas (${sales.length}):`);
    for (const sale of sales) {
      console.log(`    - ${sale.saleNumber}: $${Number(sale.total).toLocaleString('es-CO')} (${sale.status})`);
    }
    console.log('');

    // Get payments for this session
    const payments = await prisma.payment.findMany({
      where: { cashSessionId: s.id },
      select: { id: true, method: true, amount: true, saleId: true },
    });

    console.log(`  💰 Pagos (${payments.length}):`);
    let totalCash = 0;
    for (const p of payments) {
      const amt = Number(p.amount);
      if (p.method === 'efectivo') totalCash += amt;
      console.log(`    - ${p.method}: $${amt.toLocaleString('es-CO')} (venta #${p.saleId})`);
    }
    console.log(`  \n  Total efectivo: $${totalCash.toLocaleString('es-CO')}`);
    console.log(`  Expected (de DB): $${Number(s.expectedCash || s.initialCash).toLocaleString('es-CO')}`);
    console.log(`  Base + Efectivo:  $${(Number(s.initialCash) + totalCash).toLocaleString('es-CO')}`);
    console.log('\n');
  }

  await prisma.$disconnect();
}

checkCashSession().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
