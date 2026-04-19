const { PrismaClient } = require('./database/generated-client');
const prisma = new PrismaClient();

async function main() {
  const productCount = await prisma.product.count();
  const activeProductCount = await prisma.product.count({ where: { isActive: true } });
  const categoryCount = await prisma.category.count();
  
  console.log('--- DATABASE STATS ---');
  console.log('Total Products:', productCount);
  console.log('Active Products:', activeProductCount);
  console.log('Categories:', categoryCount);
  
  const cocacola = await prisma.product.findFirst({
    where: {
      OR: [
        { name: { contains: 'cocacola', mode: 'insensitive' } },
        { name: { contains: 'COCA', mode: 'insensitive' } }
      ]
    }
  });
  
  console.log('Coca-cola Search Result:', cocacola ? 'FOUND' : 'NOT FOUND');
  if (cocacola) {
    console.log('Found product:', cocacola.name, 'Code:', cocacola.code);
  }

  const sampleProducts = await prisma.product.findMany({
    take: 10,
    select: { name: true, code: true }
  });
  console.log('Sample Products:', sampleProducts.map(p => p.name));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
