import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { prisma } from './prisma';

const BCRYPT_ROUNDS = 12;

/**
 * Generates a cryptographically random default password.
 * The admin user will be forced to change this on first login.
 */
function generateDefaultPassword(): string {
  return randomBytes(16).toString('hex');
}

export async function seedDatabase(): Promise<void> {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  // Only create admin if it doesn't exist yet
  if (!existingAdmin) {
    const defaultPassword = generateDefaultPassword();
    const adminPassword = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);

    await prisma.user.create({
      data: {
        username: 'admin',
        password: adminPassword,
        fullName: 'Administrador',
        role: 'ADMIN',
        active: true,
        mustChangePassword: true,
      },
    });

    // Log the default password to console ONCE
    console.log('═══════════════════════════════════════════════════');
    console.log('  TuCajero - Default Admin Account Created');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Username: admin`);
    console.log(`  Password: ${defaultPassword}`);
    console.log('');
    console.log('  ⚠️  This password was auto-generated.');
    console.log('  You will be required to change it on first login.');
    console.log('═══════════════════════════════════════════════════');
  }

  // Create default category if it doesn't exist
  await prisma.category.upsert({
    where: { name: 'General' },
    update: {},
    create: {
      name: 'General',
      color: '#2563EB',
    },
  });
}
