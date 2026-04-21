import { seedDatabase } from '../app/main/repositories/seed.js';

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🌱 Running database seed...\n');

  // eslint-disable-next-line no-console
  console.log('1️⃣ Seeding base data (admin user, categories)...');
  await seedDatabase();
  // eslint-disable-next-line no-console
  console.log('✅ Base data seeded.\n');

  // eslint-disable-next-line no-console
  console.log('🎉 Database seed complete!');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
