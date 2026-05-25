import { PrismaClient, SystemRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  await prisma.user.upsert({
    where: { email: 'superadmin@pms.com' },
    update: {},
    create: {
      fullName: 'Super Admin',
      email: 'superadmin@pms.com',
      passwordHash,
      systemRole: SystemRole.SUPER_USER,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@pms.com' },
    update: {},
    create: {
      fullName: 'System Admin',
      email: 'admin@pms.com',
      passwordHash,
      systemRole: SystemRole.ADMIN,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'employee@pms.com' },
    update: {},
    create: {
      fullName: 'John Developer',
      email: 'employee@pms.com',
      passwordHash,
      systemRole: SystemRole.EMPLOYEE,
      isActive: true,
    },
  });

  console.log('Seed complete. Default password for all users: Password@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
