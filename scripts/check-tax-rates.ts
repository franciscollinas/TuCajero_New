import { prisma } from '../app/main/repositories/prisma.js';

async function checkTaxRates() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      taxRate: true,
    },
    take: 10,
  });

  const ivaRate = await prisma.config.findUnique({
    where: { key: 'ivaRate' },
  });

  console.log('═══ CONFIGURACIÓN GLOBAL IVA ═══');
  console.log(`ivaRate en DB: ${ivaRate ? Number(ivaRate.value) : 'No configurado'} (${ivaRate ? (Number(ivaRate.value) * 100).toFixed(0) + '%' : 'N/A'})`);
  console.log('');

  console.log('═══ PRIMEROS 10 PRODUCTOS ═══');
  for (const p of products) {
    const rate = Number(p.taxRate);
    console.log(`${p.code} - ${p.name}: taxRate=${rate} (${(rate * 100).toFixed(0)}%)`);
  }
  console.log('');

  // Count products by tax rate
  const allProducts = await prisma.product.findMany({
    select: { taxRate: true },
  });

  const byRate: Record<string, number> = {};
  for (const p of allProducts) {
    const key = (Number(p.taxRate) * 100).toFixed(0) + '%';
    byRate[key] = (byRate[key] || 0) + 1;
  }

  console.log('═══ DISTRIBUCIÓN POR TASA ═══');
  for (const [rate, count] of Object.entries(byRate).sort()) {
    console.log(`${rate}: ${count} productos`);
  }

  await prisma.$disconnect();
}

checkTaxRates().catch(console.error);
