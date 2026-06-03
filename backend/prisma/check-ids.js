const { PrismaClient } = require('../node_modules/@prisma/client');
async function main() {
  const prisma = new PrismaClient();

  const sample = await prisma.$queryRaw`
    SELECT wi."displayId", wi.title, p.name as project_name
    FROM work_items wi
    JOIN projects p ON wi."projectId" = p.id
    WHERE wi."displayId" IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 10
  `;
  console.log('Sample IDs:');
  sample.forEach(r => console.log(` ${r.displayId} | ${r.project_name} | ${r.title.slice(0, 40)}`));

  // Check for any IDs that don't match 3-letter + 5-digit pattern
  const badIds = await prisma.$queryRaw`
    SELECT wi."displayId", p.name as project_name
    FROM work_items wi
    JOIN projects p ON wi."projectId" = p.id
    WHERE wi."displayId" IS NOT NULL
    AND wi."displayId" !~ '^[A-Z]{3}[0-9]{5}$'
    LIMIT 20
  `;
  console.log('\nIDs NOT matching [A-Z]{3}[0-9]{5} pattern:');
  if (badIds.length === 0) console.log('  None — all IDs are in correct format');
  else badIds.forEach(r => console.log(` ${r.displayId} | ${r.project_name}`));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
