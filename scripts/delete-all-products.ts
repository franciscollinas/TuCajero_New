import { prisma } from '../app/main/repositories/prisma.js';

async function deleteAllProducts() {
  console.log('🗑️  Eliminando todos los productos del inventario...\n');

  // Delete stock movements first (foreign key constraint)
  const movementsResult = await prisma.stockMovement.deleteMany();
  console.log(`✅ Stock movements eliminados: ${movementsResult.count}`);

  // Delete sale items (foreign key constraint)
  const saleItemsResult = await prisma.saleItem.deleteMany();
  console.log(`✅ Sale items eliminados: ${saleItemsResult.count}`);

  // Delete products
  const productsResult = await prisma.product.deleteMany();
  console.log(`✅ Products eliminados: ${productsResult.count}`);

  console.log('\n🎉 Inventario limpio. No quedan productos.');
  
  await prisma.$disconnect();
}

deleteAllProducts().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
