/**
 * Quick seed runner - uses dynamic import to load ts files.
 * Usage: node scripts/run-seed.mjs
 */

import { execSync } from 'child_process';

console.log('Seeding database...\n');

// Run the seed function via npx prisma's internal runner
// Since we don't have ts-node/tsx, we'll insert seed data directly via Prisma Studio
// or use the npm run dev which calls seed automatically

console.log('Installing tsx...');
try {
  execSync('npm install -D tsx', { stdio: 'inherit' });
  console.log('\nRunning seed...');
  execSync('npx tsx app/main/repositories/seed.ts', { stdio: 'inherit' });
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exit(1);
}
