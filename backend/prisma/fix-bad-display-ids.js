/**
 * fix-bad-display-ids.js
 *
 * Finds work items whose displayId does NOT match the canonical [A-Z]{3}[0-9]{5}
 * pattern (e.g. hex UUIDs set by an earlier algorithm), clears them to NULL, then
 * reassigns correct IDs using the same prefix + counter logic as the service.
 *
 * Run: node prisma/fix-bad-display-ids.js
 */
const { PrismaClient } = require('../node_modules/@prisma/client');

function generatePrefix(name) {
  const words = name.trim().split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, '')).filter(w => w.length > 0);
  if (words.length === 0) return 'WRK';
  let prefix;
  if (words.length >= 3) prefix = words[0][0] + words[1][0] + words[2][0];
  else if (words.length === 2) prefix = words[0].slice(0, 2) + words[1][0];
  else prefix = words[0].slice(0, 3);
  return prefix.toUpperCase();
}

async function main() {
  const prisma = new PrismaClient();

  // 1. Find bad IDs
  const bad = await prisma.$queryRaw`
    SELECT wi.id, wi."displayId", p.id as "projectId", p.name as "projectName"
    FROM work_items wi
    JOIN projects p ON wi."projectId" = p.id
    WHERE wi."displayId" IS NOT NULL
    AND wi."displayId" !~ '^[A-Z]{3}[0-9]{5}$'
    ORDER BY wi."createdAt" ASC
  `;

  if (bad.length === 0) {
    console.log('No bad display IDs found — all items are in correct format.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${bad.length} item(s) with bad display IDs:`);
  bad.forEach(r => console.log(`  ${r.displayId} | ${r.projectName}`));

  // 2. NULL them out so the backfill loop below can reassign
  await prisma.$executeRaw`
    UPDATE work_items
    SET "displayId" = NULL
    WHERE "displayId" IS NOT NULL
    AND "displayId" !~ '^[A-Z]{3}[0-9]{5}$'
  `;
  console.log('\nCleared bad display IDs.');

  // 3. Group nulled items by project and reassign using max counter
  const projects = await prisma.project.findMany({
    include: {
      workItems: {
        where: { displayId: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      },
    },
  });

  let totalFixed = 0;
  for (const project of projects) {
    if (project.workItems.length === 0) continue;

    const prefix = generatePrefix(project.name);
    let counter = project.workItemCounter;

    for (const item of project.workItems) {
      counter += 1;
      const displayId = `${prefix}${counter}`;
      await prisma.workItem.update({ where: { id: item.id }, data: { displayId } });
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { workItemCounter: counter },
    });

    console.log(`Project "${project.name}": fixed ${project.workItems.length} IDs (last: ${prefix}${counter})`);
    totalFixed += project.workItems.length;
  }

  await prisma.$disconnect();
  console.log(`\nDone. Fixed ${totalFixed} display ID(s).`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
