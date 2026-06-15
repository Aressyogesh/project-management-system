const { PrismaClient } = require('../node_modules/@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  const projectCols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'projects' ORDER BY ordinal_position
  `;
  console.log('projects columns:', projectCols.map(c => c.column_name));

  const wiCols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'work_items' ORDER BY ordinal_position
  `;
  console.log('work_items columns:', wiCols.map(c => c.column_name));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
