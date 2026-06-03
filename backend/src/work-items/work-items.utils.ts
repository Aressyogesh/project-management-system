export function generateWorkItemPrefix(projectName: string): string {
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
