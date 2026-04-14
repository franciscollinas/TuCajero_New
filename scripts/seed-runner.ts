import { seedDatabase } from '../app/main/repositories/seed.js';
import { seedProducts } from '../app/main/repositories/seed-products.js';

async function main() {
  console.log('🌱 Running database seed...\n');

  console.log('1️⃣ Seeding base data (admin user, categories)...');
  await seedDatabase();
  console.log('✅ Base data seeded.\n');

  console.log('2️⃣ Seeding products...');
  await seedProducts();
  console.log('✅ Products seeded.\n');

  console.log('🎉 Database seed complete!');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
