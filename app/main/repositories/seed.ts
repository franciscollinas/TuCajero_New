import bcrypt from 'bcryptjs';

import { prisma } from './prisma';

const BCRYPT_ROUNDS = 12;

export async function seedDatabase(): Promise<void> {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!existingAdmin) {
    const adminPassword = await bcrypt.hash('admin123', BCRYPT_ROUNDS);

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

    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.log('  TuCajero - Default Admin Account Created');
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.log('  Username: admin');
    // eslint-disable-next-line no-console
    console.log('  Password: admin123');
    // eslint-disable-next-line no-console
    console.log('  You will be required to change it on first login.');
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════');
  }
}
