import { PrismaClient } from '@prisma/client';

function generateWorkItemPrefix(projectName: string): string {
  const words = projectName
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  let prefix: string;
  if (words.length >= 3) {
    prefix = words[0][0] + words[1][0] + words[2][0];
  } else if (words.length === 2) {
    prefix = words[0].slice(0, 2) + words[1][0];
  } else {
    prefix = words[0].slice(0, 3);
  }

  return prefix.toUpperCase();
}

async function main() {
  const prisma = new PrismaClient();

  const projects = await prisma.project.findMany({
    include: {
      workItems: {
        where: { displayId: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      },
    },
  });

  for (const project of projects) {
    if (project.workItems.length === 0) continue;

    const prefix = generateWorkItemPrefix(project.name);
    let counter = project.workItemCounter;

    for (const item of project.workItems) {
      counter += 1;
      const displayId = `${prefix}${counter}`;
      await prisma.workItem.update({
        where: { id: item.id },
        data: { displayId },
      });
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { workItemCounter: counter },
    });

    console.log(`Project "${project.name}": assigned ${project.workItems.length} display IDs (${prefix}10001 – ${prefix}${counter})`);
  }

  await prisma.$disconnect();
  console.log('Backfill complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
