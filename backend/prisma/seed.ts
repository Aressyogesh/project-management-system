import { PrismaClient, ShiftType, SystemRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Seed departments
  const departments = ['Digital', 'Mobile', 'SalesForce'];
  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

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

  // Seed default shifts
  const defaultShifts = [
    { name: 'Day',       shiftType: ShiftType.DAY,       startTime: '10:00', endTime: '19:00', workHours: 8 },
    { name: 'Afternoon', shiftType: ShiftType.AFTERNOON,  startTime: '15:00', endTime: '00:00', workHours: 8 },
    { name: 'Night',     shiftType: ShiftType.NIGHT,      startTime: '23:00', endTime: '08:00', workHours: 8 },
  ];
  for (const shift of defaultShifts) {
    await prisma.shift.upsert({
      where: { shiftType: shift.shiftType },
      update: {},
      create: shift,
    });
  }

  console.log('Seed complete. Default password for all users: Password@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
