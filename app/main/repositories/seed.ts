import bcrypt from 'bcryptjs';

import { prisma } from './prisma';

export async function seedDatabase(): Promise<void> {
  const adminPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      fullName: 'Administrador',
      role: 'ADMIN',
      active: true,
    },
  });

  await prisma.category.upsert({
    where: { name: 'General' },
    update: {},
    create: {
      name: 'General',
      color: '#2563EB',
    },
  });
}
