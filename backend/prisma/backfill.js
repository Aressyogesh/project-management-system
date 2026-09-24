const { PrismaClient } = require('../node_modules/@prisma/client');

function generatePrefix(name) {
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  let prefix;
  if (words.length >= 3) prefix = words[0][0] + words[1][0] + words[2][0];
  else if (words.length === 2) prefix = words[0].slice(0, 2) + words[1][0];
  else prefix = words[0].slice(0, 3);
  return prefix.toUpperCase();
}

async function main() {
  const prisma = new PrismaClient();

  const projects = await prisma.$queryRaw`SELECT id, name, "workItemCounter" FROM projects ORDER BY "createdAt"`;

  for (const proj of projects) {
    const items = await prisma.$queryRaw`
      SELECT id FROM work_items
      WHERE "projectId" = ${proj.id} AND "displayId" IS NULL
      ORDER BY "createdAt" ASC
    `;
    if (!items.length) continue;

    const prefix = generatePrefix(proj.name);
    let counter = parseInt(proj.workItemCounter, 10);

    for (const item of items) {
      counter++;
      const displayId = prefix + counter;
      await prisma.$executeRaw`UPDATE work_items SET "displayId" = ${displayId} WHERE id = ${item.id}`;
    }

    await prisma.$executeRaw`UPDATE projects SET "workItemCounter" = ${counter} WHERE id = ${proj.id}`;
    console.log(`Project: ${proj.name} - assigned ${items.length} IDs, last: ${prefix}${counter}`);
  }

  await prisma.$disconnect();
  console.log('Backfill complete');
}

main().catch(e => { console.error(e.message); process.exit(1); });
