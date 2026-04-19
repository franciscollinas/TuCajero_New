const { PrismaClient } = require('./app/main/repositories/generated-client');
const path = require('path');
const fs = require('fs');

async function main() {
  const dbPath = path.join(process.cwd(), 'database', 'tucajero.db');
  console.log('Checking DB at:', dbPath);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
  });

  try {
    const count = await prisma.product.count();
    console.log('Total products in database:', count);
    
    const sample = await prisma.product.findMany({
      take: 5,
      select: { name: true, code: true }
    });
    console.log('Sample products:', sample);
  } catch (err) {
    console.error('Error counting products:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
