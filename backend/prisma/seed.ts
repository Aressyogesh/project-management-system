import { PrismaClient, ShiftType, SystemRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

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

  const digital    = await prisma.department.findUniqueOrThrow({ where: { name: 'Digital' } });
  const mobile     = await prisma.department.findUniqueOrThrow({ where: { name: 'Mobile' } });
  const salesforce = await prisma.department.findUniqueOrThrow({ where: { name: 'SalesForce' } });

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

  const dayShift = await prisma.shift.findUniqueOrThrow({ where: { shiftType: ShiftType.DAY } });

  // ─── Users ────────────────────────────────────────────────────────────────────
  // 1 Super User · 2 Admins · 2 PMs · 2 Team Leads · 5 Developers · 3 QAs = 15 users

  // Super User
  await prisma.user.upsert({
    where: { email: 'superadmin@pms.com' },
    update: { fullName: 'Super Admin' },
    create: {
      fullName:   'Super Admin',
      email:      'superadmin@pms.com',
      passwordHash,
      systemRole: SystemRole.SUPER_USER,
      isActive:   true,
    },
  });

  // Admins
  await prisma.user.upsert({
    where: { email: 'admin@pms.com' },
    update: { fullName: 'Sarah Johnson', departmentId: digital.id, shiftId: dayShift.id },
    create: {
      fullName:     'Sarah Johnson',
      email:        'admin@pms.com',
      passwordHash,
      systemRole:   SystemRole.ADMIN,
      departmentId: digital.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000001',
      joinDate:     new Date('2023-01-15'),
      isActive:     true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'michael.chen@pms.com' },
    update: {},
    create: {
      fullName:     'Michael Chen',
      email:        'michael.chen@pms.com',
      passwordHash,
      systemRole:   SystemRole.ADMIN,
      departmentId: mobile.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000002',
      joinDate:     new Date('2023-03-01'),
      isActive:     true,
    },
  });

  // Project Managers (system role = EMPLOYEE; project role assigned per project)
  await prisma.user.upsert({
    where: { email: 'employee@pms.com' },
    update: { fullName: 'John Carter', departmentId: digital.id, shiftId: dayShift.id },
    create: {
      fullName:     'John Carter',
      email:        'employee@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: digital.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000003',
      joinDate:     new Date('2022-06-01'),
      isActive:     true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'vikram.joshi@pms.com' },
    update: {},
    create: {
      fullName:     'Vikram Joshi',
      email:        'vikram.joshi@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: mobile.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000004',
      joinDate:     new Date('2022-09-15'),
      isActive:     true,
    },
  });

  // Team Leads
  await prisma.user.upsert({
    where: { email: 'arjun.patel@pms.com' },
    update: {},
    create: {
      fullName:     'Arjun Patel',
      email:        'arjun.patel@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: digital.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000005',
      joinDate:     new Date('2021-11-01'),
      isActive:     true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'ananya.desai@pms.com' },
    update: {},
    create: {
      fullName:     'Ananya Desai',
      email:        'ananya.desai@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: digital.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000006',
      joinDate:     new Date('2022-02-14'),
      isActive:     true,
    },
  });

  // Developers
  await prisma.user.upsert({
    where: { email: 'rahul.sharma@pms.com' },
    update: {},
    create: {
      fullName:     'Rahul Sharma',
      email:        'rahul.sharma@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: digital.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000007',
      joinDate:     new Date('2021-07-01'),
      isActive:     true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'priya.singh@pms.com' },
    update: {},
    create: {
      fullName:     'Priya Singh',
      email:        'priya.singh@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: digital.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000008',
      joinDate:     new Date('2023-05-10'),
      isActive:     true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'mohammed.ali@pms.com' },
    update: {},
    create: {
      fullName:     'Mohammed Ali',
      email:        'mohammed.ali@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: mobile.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000009',
      joinDate:     new Date('2023-08-01'),
      isActive:     true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'deepak.verma@pms.com' },
    update: {},
    create: {
      fullName:     'Deepak Verma',
      email:        'deepak.verma@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: salesforce.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000010',
      joinDate:     new Date('2024-01-15'),
      isActive:     true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'aisha.patel@pms.com' },
    update: {},
    create: {
      fullName:     'Aisha Patel',
      email:        'aisha.patel@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: digital.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000011',
      joinDate:     new Date('2023-11-01'),
      isActive:     true,
    },
  });

  // Kiran Nair (DevOps)
  await prisma.user.upsert({
    where: { email: 'kiran.nair@pms.com' },
    update: {},
    create: {
      fullName:     'Kiran Nair',
      email:        'kiran.nair@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: digital.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000012',
      joinDate:     new Date('2022-04-01'),
      isActive:     true,
    },
  });

  // QA Engineers
  await prisma.user.upsert({
    where: { email: 'sneha.khanna@pms.com' },
    update: {},
    create: {
      fullName:     'Sneha Khanna',
      email:        'sneha.khanna@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: salesforce.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000013',
      joinDate:     new Date('2022-07-01'),
      isActive:     true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'pooja.mehta@pms.com' },
    update: {},
    create: {
      fullName:     'Pooja Mehta',
      email:        'pooja.mehta@pms.com',
      passwordHash,
      systemRole:   SystemRole.EMPLOYEE,
      departmentId: digital.id,
      shiftId:      dayShift.id,
      phone:        '+91-9000000014',
      joinDate:     new Date('2021-09-01'),
      isActive:     true,
    },
  });

  console.log('✅ Seed complete.');
  console.log('   Departments : Digital · Mobile · SalesForce');
  console.log('   Shifts      : Day · Afternoon · Night');
  console.log('   Users (15)  : 1 Super User · 2 Admins · 5 Developers · 2 Team Leads · 2 Project Managers · 3 QAs');
  console.log('   Password    : Password@123 (all users)');
  console.log('');
  console.log('   Login credentials:');
  console.log('   superadmin@pms.com  → Super Admin');
  console.log('   admin@pms.com       → Sarah Johnson (Admin)');
  console.log('   michael.chen@pms.com → Michael Chen (Admin)');
  console.log('   employee@pms.com    → John Carter (Project Manager)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
