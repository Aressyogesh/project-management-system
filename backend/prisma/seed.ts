import { PrismaClient, ShiftType, SystemRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Remove all existing users
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // ─── Departments ─────────────────────────────────────────────────────────────
  const departments = [
    { name: 'Digital' },
    { name: 'Mobile' },
    { name: 'SalesForce' },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
  }

  // ─── Shifts ───────────────────────────────────────────────────────────────────
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

  // ─── Super Admin ──────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'superadmin@aress.com' },
    update: { fullName: 'Super Admin', systemRole: SystemRole.SUPER_USER, isActive: true },
    create: {
      fullName:   'Super Admin',
      email:      'superadmin@aress.com',
      passwordHash,
      systemRole: SystemRole.SUPER_USER,
      isActive:   true,
    },
  });

  console.log('✅ Seed complete.');
  console.log('   Departments : Digital · Mobile · SalesForce');
  console.log('   Shifts      : Day · Afternoon · Night');
  console.log('   Users (1)   : superadmin@aress.com → Super Admin (SUPER_USER)');
  console.log('   Password    : Password@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
